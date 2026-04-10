import { Router, type Response } from "express";
import { db, whiteLabelConfigsTable, usersTable, savedCalendarsTable, maintenanceLogTable, brokerPrecreationsTable, maintenanceDocumentsTable, homeProfilesTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";
import { getStripeClient } from "../stripeClient";
import { generateCalendarFromAnswers, type QuizAnswers } from "../lib/calendarGen";
import { ObjectStorageService } from "../lib/objectStorage";
import multer from "multer";
import crypto from "crypto";

const router = Router();
const objectStorage = new ObjectStorageService();

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function getBaseUrl(req: any): string {
  const proto = (req.headers["x-forwarded-proto"] as string) ?? req.protocol ?? "https";
  const host = (req.headers["x-forwarded-host"] as string) ?? req.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

async function getBrokerConfig(userEmail: string) {
  const [config] = await db
    .select()
    .from(whiteLabelConfigsTable)
    .where(
      and(
        eq(whiteLabelConfigsTable.contactEmail, userEmail),
        eq(whiteLabelConfigsTable.status, "approved"),
      ),
    )
    .limit(1);
  return config ?? null;
}

router.get("/broker/me", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const config = await getBrokerConfig(req.userEmail!);
    if (!config) {
      res.status(404).json({ error: "No approved broker account found for this email." });
      return;
    }
    res.json({ config });
  } catch (err) {
    console.error("[broker] GET /broker/me error:", err);
    res.status(500).json({ error: "Failed to load broker profile" });
  }
});

// ─── Big-ticket imminent forecast helpers ─────────────────────────────────────
const BIG_TICKET_ITEMS_BROKER = [
  { key: "roof",       name: "Roof",            avgLife: 25, costRange: "$12,000–$25,000" },
  { key: "hvac",       name: "HVAC System",      avgLife: 17, costRange: "$8,000–$15,000" },
  { key: "water",      name: "Water Heater",     avgLife: 12, costRange: "$1,200–$3,500" },
  { key: "windows",    name: "Windows",          avgLife: 25, costRange: "$8,000–$20,000" },
  { key: "paint",      name: "Exterior Paint",   avgLife: 8,  costRange: "$3,000–$8,000" },
  { key: "panel",      name: "Electrical Panel", avgLife: 30, costRange: "$2,500–$6,000" },
  { key: "garage",     name: "Garage Door",      avgLife: 15, costRange: "$1,000–$3,500" },
  { key: "appliances", name: "Major Appliances", avgLife: 12, costRange: "$1,000–$3,000 ea" },
];

function computeImminentForecasts(yearBuilt: number, currentYear: number, recentUpgrades: string[] = []): string[] {
  return BIG_TICKET_ITEMS_BROKER
    .map((item) => {
      let dueYear = yearBuilt + item.avgLife;
      if (recentUpgrades.includes(item.key)) {
        dueYear = Math.max(dueYear, currentYear + 7);
      }
      const yearsLeft = dueYear - currentYear;
      return { ...item, dueYear, yearsLeft };
    })
    .filter((item) => item.yearsLeft <= 1)
    .map((item) =>
      item.yearsLeft < 0
        ? `${item.name} — overdue (est. ${item.costRange})`
        : item.yearsLeft === 0
        ? `${item.name} — due this year (est. ${item.costRange})`
        : `${item.name} — due ~${item.dueYear} (est. ${item.costRange})`
    );
}

router.get("/broker/clients", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const config = await getBrokerConfig(req.userEmail!);
    if (!config) {
      res.status(403).json({ error: "Not authorized as broker" });
      return;
    }

    const rawClients = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        subscriptionStatus: usersTable.subscriptionStatus,
        createdAt: usersTable.createdAt,
        lastActiveAt: usersTable.updatedAt,
        brokerPreCreated: usersTable.brokerPreCreated,
      })
      .from(usersTable)
      .where(eq(usersTable.referralSubdomain, config.subdomain));

    if (rawClients.length === 0) {
      res.json({ clients: [], subdomain: config.subdomain });
      return;
    }

    const userIds = rawClients.map((c) => c.id);

    const [calendarRows, logRows, precreationRows, homeProfileRows] = await Promise.all([
      db
        .select({ userId: savedCalendarsTable.userId, calendarData: savedCalendarsTable.calendarData, quizAnswers: savedCalendarsTable.quizAnswers })
        .from(savedCalendarsTable)
        .where(inArray(savedCalendarsTable.userId, userIds)),
      db
        .select({ userId: maintenanceLogTable.userId, count: sql<number>`cast(count(*) as int)` })
        .from(maintenanceLogTable)
        .where(inArray(maintenanceLogTable.userId, userIds))
        .groupBy(maintenanceLogTable.userId),
      db
        .select({ clientUserId: brokerPrecreationsTable.clientUserId, activatedAt: brokerPrecreationsTable.activatedAt, activationToken: brokerPrecreationsTable.activationToken })
        .from(brokerPrecreationsTable)
        .where(and(
          eq(brokerPrecreationsTable.brokerUserId, req.userId!),
          inArray(brokerPrecreationsTable.clientUserId as any, userIds),
        )),
      db
        .select({ userId: homeProfilesTable.userId, yearBuilt: homeProfilesTable.yearBuilt })
        .from(homeProfilesTable)
        .where(inArray(homeProfilesTable.userId, userIds)),
    ]);

    const calendarMap = new Map(calendarRows.map((r) => [r.userId, { calendarData: r.calendarData, quizAnswers: r.quizAnswers }]));
    const logCountMap = new Map(logRows.map((r) => [r.userId, r.count]));
    const precreationMap = new Map(
      precreationRows
        .filter((r) => r.clientUserId != null)
        .map((r) => [r.clientUserId!, r]),
    );
    const homeProfileMap = new Map(homeProfileRows.map((r) => [r.userId, r.yearBuilt]));
    const currentYear = new Date().getFullYear();

    const clients = rawClients.map((c) => {
      const calEntry = calendarMap.get(c.id);
      const calData = calEntry?.calendarData as Record<string, unknown> | undefined;
      const quizAnswers = calEntry?.quizAnswers as Record<string, unknown> | undefined;
      const hasCalendar = !!calData;
      const logCount = logCountMap.get(c.id) ?? 0;
      const activityScore = Math.min((hasCalendar ? 60 : 0) + Math.min(logCount * 8, 40), 100);

      const precreation = precreationMap.get(c.id);
      const isPrecreated = c.brokerPreCreated;
      const isActivated = !!precreation?.activatedAt;
      const activationToken = isPrecreated && !isActivated ? precreation?.activationToken ?? null : null;

      const yearBuilt = homeProfileMap.get(c.id);
      const recentUpgradesRaw: string = (quizAnswers?.recentUpgrades as string) ?? "";
      const recentUpgradesArr = recentUpgradesRaw ? recentUpgradesRaw.split(",").filter(Boolean) : [];
      const imminentAlerts: string[] = yearBuilt ? computeImminentForecasts(yearBuilt, currentYear, recentUpgradesArr) : [];
      const imminentAlertCount = imminentAlerts.length;

      return {
        ...c,
        hasCalendar,
        logCount,
        activityScore,
        imminentAlertCount,
        imminentAlerts,
        isPrecreated,
        isActivated,
        activationToken,
      };
    });

    res.json({ clients, subdomain: config.subdomain });
  } catch (err) {
    console.error("[broker] GET /broker/clients error:", err);
    res.status(500).json({ error: "Failed to load client list" });
  }
});

router.patch("/broker/branding", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const config = await getBrokerConfig(req.userEmail!);
    if (!config) {
      res.status(403).json({ error: "Not authorized as an approved broker" });
      return;
    }

    const { logoUrl, agentPhotoUrl, phoneNumber, tagline, welcomeMessage } = req.body as Record<string, string | undefined>;
    const updates: Record<string, string | null> = {};
    if (logoUrl !== undefined)        updates.logoUrl       = logoUrl?.trim()        || null;
    if (agentPhotoUrl !== undefined)  updates.agentPhotoUrl = agentPhotoUrl?.trim()  || null;
    if (phoneNumber !== undefined)    updates.phoneNumber   = phoneNumber?.trim()    || null;
    if (tagline !== undefined)        updates.tagline       = tagline?.trim()        || null;
    if (welcomeMessage !== undefined) updates.welcomeMessage = welcomeMessage?.trim() || null;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    await db.update(whiteLabelConfigsTable).set(updates).where(eq(whiteLabelConfigsTable.id, config.id));
    res.json({ message: "Branding updated successfully. Changes are live." });
  } catch (err) {
    console.error("[broker] PATCH /broker/branding error:", err);
    res.status(500).json({ error: "Failed to update branding" });
  }
});

// ── POST /api/broker/precreate-doc-upload ─────────────────────────────────────
// Broker uploads a document (before checkout). Returns { objectPath, fileName, contentType, fileSizeBytes }
router.post(
  "/broker/precreate-doc-upload",
  requireAuth as any,
  docUpload.single("document"),
  async (req: AuthRequest, res: Response) => {
    try {
      const config = await getBrokerConfig(req.userEmail!);
      if (!config) {
        res.status(403).json({ error: "Not authorized as broker" });
        return;
      }
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }
      const objectPath = await objectStorage.uploadFile(file.buffer, file.mimetype, "broker-client-docs");
      res.json({
        objectPath,
        fileName: file.originalname,
        contentType: file.mimetype,
        fileSizeBytes: file.size,
        displayName: file.originalname.replace(/\.[^.]+$/, ""),
      });
    } catch (err) {
      console.error("[broker] precreate-doc-upload error:", err);
      res.status(500).json({ error: "Document upload failed" });
    }
  },
);

// ── POST /api/broker/precreate-checkout ──────────────────────────────────────
// Creates a Stripe checkout session ($36 1yr / $99 3yr) + pending precreation record.
router.post("/broker/precreate-checkout", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const config = await getBrokerConfig(req.userEmail!);
    if (!config) {
      res.status(403).json({ error: "Not authorized as broker" });
      return;
    }

    const {
      clientEmail, clientName,
      propertyData, quizAnswers,
      documentPaths,
      duration = "1year",
      newConstructionData,
    } = req.body as {
      clientEmail?: string;
      clientName?: string;
      propertyData?: Record<string, unknown>;
      quizAnswers?: QuizAnswers;
      documentPaths?: Array<{ objectPath: string; fileName: string; contentType: string; fileSizeBytes?: number; displayName?: string }>;
      duration?: "1year" | "3years";
      newConstructionData?: Record<string, unknown> | null;
    };

    if (!clientEmail?.trim()) {
      res.status(400).json({ error: "Client email is required" });
      return;
    }
    if (!quizAnswers?.zip) {
      res.status(400).json({ error: "Property ZIP code is required" });
      return;
    }

    const [brokerUser] = await db.select({ id: usersTable.id, email: usersTable.email, stripeCustomerId: usersTable.stripeCustomerId })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!brokerUser) { res.status(401).json({ error: "User not found" }); return; }

    const is3Year = duration === "3years";
    const priceCents = is3Year ? 9900 : 3600;
    const proMonths = is3Year ? 37 : 13;

    const [pending] = await db.insert(brokerPrecreationsTable).values({
      brokerUserId: req.userId!,
      clientEmail: clientEmail.trim().toLowerCase(),
      clientName: clientName?.trim() || null,
      propertyData: propertyData ?? null,
      quizAnswers: quizAnswers ?? null,
      documentPaths: documentPaths ?? null,
      newConstructionData: newConstructionData ?? null,
      status: "pending_payment",
      priceCents,
    }).returning();

    const stripe = getStripeClient();
    const base = getBaseUrl(req);

    let customerId = brokerUser.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: brokerUser.email,
        metadata: { userId: String(brokerUser.id) },
      });
      customerId = customer.id;
      await db.update(usersTable).set({ stripeCustomerId: customerId }).where(eq(usersTable.id, brokerUser.id));
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: priceCents,
          product_data: {
            name: is3Year
              ? "MaintainHome 3-Year Client Account"
              : "MaintainHome Pre-Created Client Account",
            description: is3Year
              ? `37 months Pro access for ${clientEmail.trim()} — pre-configured by broker`
              : `13 months Pro access for ${clientEmail.trim()} — pre-configured by broker`,
          },
        },
        quantity: 1,
      }],
      mode: "payment",
      metadata: {
        userId: String(brokerUser.id),
        email: brokerUser.email,
        type: "broker_precreate",
        precreationId: String(pending.id),
        brokerSubdomain: config.subdomain,
        duration,
        proMonths: String(proMonths),
      },
      success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/broker-dashboard`,
    });

    await db.update(brokerPrecreationsTable)
      .set({ stripeSessionId: session.id })
      .where(eq(brokerPrecreationsTable.id, pending.id));

    res.json({ url: session.url });
  } catch (err) {
    console.error("[broker] precreate-checkout error:", err);
    res.status(500).json({ error: "Failed to start checkout" });
  }
});

// ── POST /api/broker/client-renew-checkout ────────────────────────────────────
// Creates a $36 Stripe session to renew a specific client's Pro by 13 months.
router.post("/broker/client-renew-checkout", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const config = await getBrokerConfig(req.userEmail!);
    if (!config) { res.status(403).json({ error: "Not authorized as broker" }); return; }

    const { clientUserId, clientEmail } = req.body as { clientUserId?: number; clientEmail?: string };
    if (!clientUserId && !clientEmail) {
      res.status(400).json({ error: "clientUserId or clientEmail required" });
      return;
    }

    const [brokerUser] = await db.select({ id: usersTable.id, email: usersTable.email, stripeCustomerId: usersTable.stripeCustomerId })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!brokerUser) { res.status(401).json({ error: "User not found" }); return; }

    const stripe = getStripeClient();
    const base = getBaseUrl(req);

    let customerId = brokerUser.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: brokerUser.email, metadata: { userId: String(brokerUser.id) } });
      customerId = customer.id;
      await db.update(usersTable).set({ stripeCustomerId: customerId }).where(eq(usersTable.id, brokerUser.id));
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: 3600,
          product_data: {
            name: "MaintainHome Client Pro Renewal",
            description: `1-year Pro renewal for ${clientEmail ?? `client #${clientUserId}`}`,
          },
        },
        quantity: 1,
      }],
      mode: "payment",
      metadata: {
        userId: String(brokerUser.id),
        email: brokerUser.email,
        type: "broker_client_renew",
        clientUserId: String(clientUserId ?? ""),
        clientEmail: clientEmail ?? "",
        brokerSubdomain: config.subdomain,
      },
      success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/broker-dashboard`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("[broker] client-renew-checkout error:", err);
    res.status(500).json({ error: "Failed to start renewal checkout" });
  }
});

// ── GET /api/broker/precreations ─────────────────────────────────────────────
router.get("/broker/precreations", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const config = await getBrokerConfig(req.userEmail!);
    if (!config) {
      res.status(403).json({ error: "Not authorized as broker" });
      return;
    }

    const records = await db
      .select()
      .from(brokerPrecreationsTable)
      .where(eq(brokerPrecreationsTable.brokerUserId, req.userId!));

    res.json(records);
  } catch (err) {
    console.error("[broker] GET /broker/precreations error:", err);
    res.status(500).json({ error: "Failed to load precreations" });
  }
});

// ── Internal: process broker precreation after payment ────────────────────────
// Called from stripe.ts verify-session / webhook
export async function processBrokerPrecreation(
  precreationId: number,
  brokerSubdomain: string,
  baseUrl: string,
  proMonths: number = 13,
): Promise<{ ok: boolean; activationLink: string; clientEmail: string; clientName: string | null }> {
  const [precreation] = await db
    .select()
    .from(brokerPrecreationsTable)
    .where(eq(brokerPrecreationsTable.id, precreationId))
    .limit(1);

  if (!precreation) throw new Error(`Precreation ${precreationId} not found`);

  if (precreation.status === "active" && precreation.activationToken) {
    return {
      ok: true,
      activationLink: `${baseUrl}/activate?token=${precreation.activationToken}`,
      clientEmail: precreation.clientEmail,
      clientName: precreation.clientName,
    };
  }

  await db.update(brokerPrecreationsTable)
    .set({ status: "processing" })
    .where(eq(brokerPrecreationsTable.id, precreationId));

  const clientEmail = precreation.clientEmail;
  const clientName = precreation.clientName;
  const proExpiresAt = new Date();
  proExpiresAt.setMonth(proExpiresAt.getMonth() + proMonths);

  let clientUserId: number;

  const [existingUser] = await db.select({ id: usersTable.id })
    .from(usersTable).where(eq(usersTable.email, clientEmail)).limit(1);

  if (existingUser) {
    clientUserId = existingUser.id;
    await db.update(usersTable).set({
      subscriptionStatus: "pro_annual",
      fullAccess: true,
      proExpiresAt,
      referralSubdomain: brokerSubdomain,
      brokerPreCreated: true,
      name: clientName || undefined,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, clientUserId));
  } else {
    const [newUser] = await db.insert(usersTable).values({
      email: clientEmail,
      name: clientName || null,
      subscriptionStatus: "pro_annual",
      fullAccess: true,
      proExpiresAt,
      referralSubdomain: brokerSubdomain,
      brokerPreCreated: true,
    }).returning({ id: usersTable.id });
    clientUserId = newUser.id;
  }

  const quizAnswers = precreation.quizAnswers as QuizAnswers | null;
  let calendarData: Record<string, unknown> | null = null;

  if (quizAnswers?.zip) {
    try {
      const propData = precreation.propertyData as Record<string, unknown> | null;
      calendarData = await generateCalendarFromAnswers(quizAnswers, {
        yearBuilt: (propData?.yearBuilt as number) || quizAnswers.yearBuilt,
        bedrooms: propData?.bedrooms as number | undefined,
        bathrooms: propData?.bathrooms as string | undefined,
        finishedBasement: propData?.finishedBasement as string | undefined,
        poolOrHotTub: propData?.poolOrHotTub as string | undefined,
        lastRenovationYear: propData?.lastRenovationYear as number | undefined,
      });

      await db.insert(savedCalendarsTable).values({
        userId: clientUserId,
        quizAnswers,
        calendarData,
      }).onConflictDoNothing();

      const ncData = precreation.newConstructionData as Record<string, unknown> | null;
      if (propData || ncData) {
        await db.insert(homeProfilesTable).values({
          userId: clientUserId,
          fullAddress: (propData?.fullAddress as string) || null,
          yearBuilt: (propData?.yearBuilt as number) || null,
          bedrooms: (propData?.bedrooms as number) || null,
          bathrooms: (propData?.bathrooms as string) || null,
          finishedBasement: (propData?.finishedBasement as string) || null,
          poolOrHotTub: (propData?.poolOrHotTub as string) || null,
          lastRenovationYear: (propData?.lastRenovationYear as number) || null,
          newConstructionData: ncData ?? null,
        }).onConflictDoUpdate({
          target: homeProfilesTable.userId,
          set: {
            fullAddress: (propData?.fullAddress as string) || null,
            yearBuilt: (propData?.yearBuilt as number) || null,
            bedrooms: (propData?.bedrooms as number) || null,
            bathrooms: (propData?.bathrooms as string) || null,
            finishedBasement: (propData?.finishedBasement as string) || null,
            poolOrHotTub: (propData?.poolOrHotTub as string) || null,
            lastRenovationYear: (propData?.lastRenovationYear as number) || null,
            newConstructionData: ncData ?? null,
            updatedAt: new Date(),
          },
        });
      }

      console.log(`[broker] Calendar generated for pre-created client ${clientEmail}`);
    } catch (err) {
      console.error(`[broker] Calendar generation failed for ${clientEmail}:`, err);
    }
  }

  const docPaths = precreation.documentPaths as Array<{ objectPath: string; fileName: string; contentType: string; fileSizeBytes?: number; displayName?: string }> | null;
  if (docPaths && docPaths.length > 0) {
    for (const doc of docPaths) {
      await db.insert(maintenanceDocumentsTable).values({
        userId: clientUserId,
        fileName: doc.fileName,
        objectPath: doc.objectPath,
        contentType: doc.contentType,
        fileSizeBytes: doc.fileSizeBytes ?? null,
        displayName: doc.displayName ?? doc.fileName,
        docType: "document",
      }).catch(() => {});
    }
    console.log(`[broker] Transferred ${docPaths.length} document(s) to client ${clientEmail}`);
  }

  const activationToken = crypto.randomBytes(32).toString("hex");

  await db.update(brokerPrecreationsTable).set({
    status: "active",
    clientUserId,
    calendarData,
    activationToken,
    activatedAt: null,
  }).where(eq(brokerPrecreationsTable.id, precreationId));

  const activationLink = `${baseUrl}/activate?token=${activationToken}`;
  console.log(`[broker] Precreation ${precreationId} complete. Client: ${clientEmail}, link: ${activationLink}`);

  return { ok: true, activationLink, clientEmail, clientName };
}

export default router;
