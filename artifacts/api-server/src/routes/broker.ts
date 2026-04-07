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

    const [calendarRows, logRows, precreationRows] = await Promise.all([
      db
        .select({ userId: savedCalendarsTable.userId, calendarData: savedCalendarsTable.calendarData })
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
    ]);

    const calendarMap = new Map(calendarRows.map((r) => [r.userId, r.calendarData]));
    const logCountMap = new Map(logRows.map((r) => [r.userId, r.count]));
    const precreationMap = new Map(
      precreationRows
        .filter((r) => r.clientUserId != null)
        .map((r) => [r.clientUserId!, r]),
    );

    const clients = rawClients.map((c) => {
      const calData = calendarMap.get(c.id) as Record<string, unknown> | undefined;
      const hasCalendar = !!calData;
      const bigTicketAlertCount = Array.isArray((calData as any)?.big_ticket_alerts)
        ? (calData as any).big_ticket_alerts.length : 0;
      const bigTicketAlerts: string[] = Array.isArray((calData as any)?.big_ticket_alerts)
        ? (calData as any).big_ticket_alerts.slice(0, 3) : [];
      const logCount = logCountMap.get(c.id) ?? 0;
      const activityScore = Math.min((hasCalendar ? 60 : 0) + Math.min(logCount * 8, 40), 100);

      const precreation = precreationMap.get(c.id);
      const isPrecreated = c.brokerPreCreated;
      const isActivated = !!precreation?.activatedAt;
      const activationToken = isPrecreated && !isActivated ? precreation?.activationToken ?? null : null;

      return {
        ...c,
        hasCalendar,
        logCount,
        activityScore,
        bigTicketAlertCount,
        bigTicketAlerts,
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
// Creates a Stripe checkout session ($36, one-time) + pending precreation record.
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
    } = req.body as {
      clientEmail?: string;
      clientName?: string;
      propertyData?: Record<string, unknown>;
      quizAnswers?: QuizAnswers;
      documentPaths?: Array<{ objectPath: string; fileName: string; contentType: string; fileSizeBytes?: number; displayName?: string }>;
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

    const [pending] = await db.insert(brokerPrecreationsTable).values({
      brokerUserId: req.userId!,
      clientEmail: clientEmail.trim().toLowerCase(),
      clientName: clientName?.trim() || null,
      propertyData: propertyData ?? null,
      quizAnswers: quizAnswers ?? null,
      documentPaths: documentPaths ?? null,
      status: "pending_payment",
      priceCents: 3600,
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
          unit_amount: 3600,
          product_data: {
            name: "MaintainHome Pre-Created Client Account",
            description: `13 months Pro access for ${clientEmail.trim()} — pre-configured by broker`,
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
  proExpiresAt.setMonth(proExpiresAt.getMonth() + 13);

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

      if (propData) {
        await db.insert(homeProfilesTable).values({
          userId: clientUserId,
          fullAddress: (propData.fullAddress as string) || null,
          yearBuilt: (propData.yearBuilt as number) || null,
          bedrooms: (propData.bedrooms as number) || null,
          bathrooms: (propData.bathrooms as string) || null,
          finishedBasement: (propData.finishedBasement as string) || null,
          poolOrHotTub: (propData.poolOrHotTub as string) || null,
          lastRenovationYear: (propData.lastRenovationYear as number) || null,
        }).onConflictDoUpdate({
          target: homeProfilesTable.userId,
          set: {
            fullAddress: (propData.fullAddress as string) || null,
            yearBuilt: (propData.yearBuilt as number) || null,
            bedrooms: (propData.bedrooms as number) || null,
            bathrooms: (propData.bathrooms as string) || null,
            finishedBasement: (propData.finishedBasement as string) || null,
            poolOrHotTub: (propData.poolOrHotTub as string) || null,
            lastRenovationYear: (propData.lastRenovationYear as number) || null,
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
