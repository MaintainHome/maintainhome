import { Router, type Request, type Response, type NextFunction } from "express";
import {
  db,
  usersTable,
  whiteLabelConfigsTable,
  magicLinkTokensTable,
  testChecklistStatusTable,
} from "@workspace/db";
import { eq, like, inArray } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function requireAdminToken(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    res.status(503).json({ error: "Admin access not configured" });
    return;
  }
  const provided =
    (req.headers["x-admin-token"] as string) ||
    (req.query.token as string);
  if (!provided || provided !== secret) {
    res.status(401).json({ error: "Invalid admin token" });
    return;
  }
  next();
}

function getBaseUrl(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0] ?? "https";
  const host =
    (req.headers["x-forwarded-host"] as string) ||
    (req.headers.host as string) ||
    "maintainhome.ai";
  return `${proto}://${host}`;
}

router.get("/admin/testing/checklist", requireAdminToken, async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(testChecklistStatusTable);
    res.json({ items: rows });
  } catch (err) {
    console.error("[admin-testing] GET checklist error:", err);
    res.status(500).json({ error: "Failed to load checklist" });
  }
});

router.post("/admin/testing/checklist/:key", requireAdminToken, async (req: Request, res: Response) => {
  try {
    const key = req.params.key;
    const { tested, notes } = req.body as { tested?: boolean; notes?: string };
    const isTested = tested === true;

    const existing = await db
      .select()
      .from(testChecklistStatusTable)
      .where(eq(testChecklistStatusTable.itemKey, key))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(testChecklistStatusTable).values({
        itemKey: key,
        tested: isTested,
        testedAt: isTested ? new Date() : null,
        notes: notes ?? null,
        updatedAt: new Date(),
      });
    } else {
      await db
        .update(testChecklistStatusTable)
        .set({
          tested: isTested,
          testedAt: isTested ? new Date() : null,
          notes: notes ?? existing[0].notes,
          updatedAt: new Date(),
        })
        .where(eq(testChecklistStatusTable.itemKey, key));
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[admin-testing] POST checklist error:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

interface TestAccountResult {
  role: "homeowner" | "broker" | "builder";
  email: string;
  name: string;
  subdomain?: string;
  magicLinkUrl: string;
}

async function ensureUser(email: string, name: string): Promise<{ id: number; created: boolean }> {
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    return { id: existing[0].id, created: false };
  }
  const [inserted] = await db
    .insert(usersTable)
    .values({ email, name, hasAcceptedTerms: true })
    .returning();
  return { id: inserted.id, created: true };
}

async function ensureWhiteLabel(opts: {
  subdomain: string;
  brokerName: string;
  contactEmail: string;
  accountType: "broker" | "builder";
  tagline?: string;
  welcomeMessage?: string;
}): Promise<void> {
  const existing = await db
    .select()
    .from(whiteLabelConfigsTable)
    .where(eq(whiteLabelConfigsTable.subdomain, opts.subdomain))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(whiteLabelConfigsTable)
      .set({
        brokerName: opts.brokerName,
        contactEmail: opts.contactEmail,
        accountType: opts.accountType,
        tagline: opts.tagline ?? null,
        welcomeMessage: opts.welcomeMessage ?? null,
        status: "approved",
        warrantyPeriodMonths: opts.accountType === "builder" ? 12 : null,
        updatedAt: new Date(),
      })
      .where(eq(whiteLabelConfigsTable.subdomain, opts.subdomain));
    return;
  }
  await db.insert(whiteLabelConfigsTable).values({
    subdomain: opts.subdomain,
    brokerName: opts.brokerName,
    contactEmail: opts.contactEmail,
    accountType: opts.accountType,
    tagline: opts.tagline ?? null,
    welcomeMessage: opts.welcomeMessage ?? null,
    status: "approved",
    type: opts.accountType === "builder" ? "team_leader" : "individual_agent",
    monetizationModel: opts.accountType === "builder" ? "closing_gift" : "private_label",
    warrantyPeriodMonths: opts.accountType === "builder" ? 12 : null,
  });
}

async function createMagicLink(email: string, baseUrl: string, redirect: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h for testing
  await db.insert(magicLinkTokensTable).values({ email, token, expiresAt });
  return `${baseUrl}/api/auth/verify?token=${token}&stay=1&redirect=${redirect}`;
}

router.post("/admin/testing/create-test-accounts", requireAdminToken, async (req: Request, res: Response) => {
  try {
    const baseUrl = getBaseUrl(req);
    const results: TestAccountResult[] = [];

    const homeowners = [
      { email: "test.homeowner1@maintainhome.ai", name: "Hannah Homeowner" },
      { email: "test.homeowner2@maintainhome.ai", name: "Henry Homeowner" },
      { email: "test.homeowner3@maintainhome.ai", name: "Helen Homeowner" },
    ];
    const brokers = [
      {
        email: "test.broker1@maintainhome.ai",
        name: "Bridget Broker",
        subdomain: "test-broker-1",
        brokerName: "Bridget Broker Realty",
        tagline: "Your home, our priority — for life.",
        welcomeMessage: "Welcome! I'm thrilled to be your trusted real-estate partner.",
      },
      {
        email: "test.broker2@maintainhome.ai",
        name: "Brandon Broker",
        subdomain: "test-broker-2",
        brokerName: "Brandon Broker Group",
        tagline: "Smart homes. Smarter agents.",
        welcomeMessage: "Thanks for trusting us with your home — let's make it easy.",
      },
    ];
    const builders = [
      {
        email: "test.builder1@maintainhome.ai",
        name: "Bella Builder",
        subdomain: "test-builder-1",
        brokerName: "Bella Builder Homes",
        tagline: "Quality construction. Lifetime support.",
        welcomeMessage: "Welcome to your beautiful new home — we're here for the next year and beyond.",
      },
      {
        email: "test.builder2@maintainhome.ai",
        name: "Bart Builder",
        subdomain: "test-builder-2",
        brokerName: "Bart Builder Co.",
        tagline: "Built right. Backed by us.",
        welcomeMessage: "Congratulations on your new home — your 1-year warranty journey starts here.",
      },
    ];

    // Clean up previously issued test magic links so repeat runs don't accumulate
    // active tokens (each call still returns a single fresh link per account).
    const allTestEmails = [
      "test.homeowner1@maintainhome.ai", "test.homeowner2@maintainhome.ai", "test.homeowner3@maintainhome.ai",
      "test.broker1@maintainhome.ai", "test.broker2@maintainhome.ai",
      "test.builder1@maintainhome.ai", "test.builder2@maintainhome.ai",
    ];
    await db.delete(magicLinkTokensTable).where(inArray(magicLinkTokensTable.email, allTestEmails));

    for (const h of homeowners) {
      await ensureUser(h.email, h.name);
      const magicLinkUrl = await createMagicLink(h.email, baseUrl, "quiz");
      results.push({ role: "homeowner", email: h.email, name: h.name, magicLinkUrl });
    }

    for (const b of brokers) {
      await ensureUser(b.email, b.name);
      await ensureWhiteLabel({
        subdomain: b.subdomain,
        brokerName: b.brokerName,
        contactEmail: b.email,
        accountType: "broker",
        tagline: b.tagline,
        welcomeMessage: b.welcomeMessage,
      });
      const magicLinkUrl = await createMagicLink(b.email, baseUrl, "dashboard");
      results.push({ role: "broker", email: b.email, name: b.name, subdomain: b.subdomain, magicLinkUrl });
    }

    for (const b of builders) {
      await ensureUser(b.email, b.name);
      await ensureWhiteLabel({
        subdomain: b.subdomain,
        brokerName: b.brokerName,
        contactEmail: b.email,
        accountType: "builder",
        tagline: b.tagline,
        welcomeMessage: b.welcomeMessage,
      });
      const magicLinkUrl = await createMagicLink(b.email, baseUrl, "dashboard");
      results.push({ role: "builder", email: b.email, name: b.name, subdomain: b.subdomain, magicLinkUrl });
    }

    res.json({
      ok: true,
      created: results.length,
      accounts: results,
    });
  } catch (err) {
    console.error("[admin-testing] create-test-accounts error:", err);
    res.status(500).json({ error: "Failed to create test accounts" });
  }
});

router.delete("/admin/testing/test-accounts", requireAdminToken, async (_req: Request, res: Response) => {
  try {
    const testEmails = [
      "test.homeowner1@maintainhome.ai", "test.homeowner2@maintainhome.ai", "test.homeowner3@maintainhome.ai",
      "test.broker1@maintainhome.ai", "test.broker2@maintainhome.ai",
      "test.builder1@maintainhome.ai", "test.builder2@maintainhome.ai",
    ];

    await db.delete(magicLinkTokensTable).where(inArray(magicLinkTokensTable.email, testEmails));
    await db.delete(whiteLabelConfigsTable).where(like(whiteLabelConfigsTable.subdomain, "test-%"));

    res.json({ ok: true, message: "Test white-label configs and magic links cleared." });
  } catch (err) {
    console.error("[admin-testing] delete test-accounts error:", err);
    res.status(500).json({ error: "Failed to clear test accounts" });
  }
});

router.get("/admin/testing/feedback", requireAdminToken, async (_req: Request, res: Response) => {
  try {
    const { feedbackReportsTable } = await import("@workspace/db");
    const { desc } = await import("drizzle-orm");
    const rows = await db
      .select()
      .from(feedbackReportsTable)
      .orderBy(desc(feedbackReportsTable.createdAt))
      .limit(100);
    res.json({ reports: rows });
  } catch (err) {
    console.error("[admin-testing] GET feedback error:", err);
    res.status(500).json({ error: "Failed to load feedback" });
  }
});

export default router;
