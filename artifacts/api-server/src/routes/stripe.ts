import { Router, type Request, type Response } from "express";
import { db, usersTable, giftCodesTable, stripeTransactionsTable, sessionsTable, whiteLabelConfigsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";
import { getStripeClient } from "../stripeClient";
import crypto from "crypto";

const router = Router();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPriceIds() {
  return {
    monthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
    annual: process.env.STRIPE_PRICE_ANNUAL ?? "",
    giftCode: process.env.STRIPE_PRICE_GIFT_CODE ?? "",
  };
}

/**
 * Build the base URL using the ACTUAL request headers (forwarded host),
 * not the REPLIT_DOMAINS env var which may not match the current access domain.
 */
function getBaseUrl(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string) ?? req.protocol ?? "https";
  const host = (req.headers["x-forwarded-host"] as string) ?? req.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

function isRequestHttps(req: Request): boolean {
  const forwarded = req.headers["x-forwarded-proto"] as string | undefined;
  if (forwarded) return forwarded === "https";
  return req.secure;
}

function setSessionCookie(res: Response, token: string, isHttps: boolean) {
  res.cookie("mh_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isHttps,
    maxAge: THIRTY_DAYS_MS,
  });
}

function generateGiftCode(): string {
  return crypto.randomBytes(5).toString("hex").toUpperCase().replace(/(.{4})/g, "$1-").slice(0, 14);
}

/**
 * Creates a DB session and sets the cookie — auto-logs in the user.
 * Called after verifying a successful Stripe payment.
 */
async function autoLoginUser(res: Response, userId: number, isHttps: boolean) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
  await db.insert(sessionsTable).values({ token, userId, expiresAt, staySignedIn: true });
  setSessionCookie(res, token, isHttps);
  return token;
}

// ── GET /api/stripe/config ────────────────────────────────────────────────────
router.get("/stripe/config", (_req, res: Response) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "" });
});

// ── GET /api/stripe/prices ────────────────────────────────────────────────────
router.get("/stripe/prices", (_req, res: Response) => {
  const ids = getPriceIds();
  res.json({
    monthly: { priceId: ids.monthly, amount: 499, interval: "month" },
    annual: { priceId: ids.annual, amount: 3999, interval: "year" },
    giftCode: { priceId: ids.giftCode, amount: 2900 },
  });
});

// ── POST /api/stripe/checkout ─────────────────────────────────────────────────
router.post("/stripe/checkout", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const { plan } = req.body as { plan?: "monthly" | "annual" };
  if (!plan || !["monthly", "annual"].includes(plan)) {
    res.status(400).json({ error: "plan must be 'monthly' or 'annual'" });
    return;
  }

  const ids = getPriceIds();
  const priceId = plan === "monthly" ? ids.monthly : ids.annual;
  if (!priceId) {
    res.status(500).json({ error: "Stripe prices not yet configured." });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, stripeCustomerId: usersTable.stripeCustomerId })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);

  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const stripe = getStripeClient();
  const base = getBaseUrl(req);

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: String(user.id) },
    });
    customerId = customer.id;
    await db.update(usersTable).set({ stripeCustomerId: customerId }).where(eq(usersTable.id, user.id));
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    // Store user identity so verify-session can auto-login without a cookie
    metadata: { userId: String(user.id), email: user.email, type: "subscription", plan },
    success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/#pricing`,
  });

  await db.insert(stripeTransactionsTable).values({
    userId: user.id,
    type: "subscription",
    stripeSessionId: session.id,
    stripeCustomerId: customerId,
    amountCents: plan === "monthly" ? 499 : 3999,
    status: "pending",
    metadata: { plan },
  }).onConflictDoNothing();

  res.json({ url: session.url });
});

// ── POST /api/stripe/gift-checkout ────────────────────────────────────────────
router.post("/stripe/gift-checkout", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const { quantity } = req.body as { quantity?: number };
  const qty = Number(quantity ?? 1);
  if (!qty || qty < 1 || qty > 50) {
    res.status(400).json({ error: "quantity must be between 1 and 50" });
    return;
  }

  const ids = getPriceIds();
  if (!ids.giftCode) {
    res.status(500).json({ error: "Stripe prices not yet configured." });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, stripeCustomerId: usersTable.stripeCustomerId })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);

  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const stripe = getStripeClient();
  const base = getBaseUrl(req);

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: String(user.id) },
    });
    customerId = customer.id;
    await db.update(usersTable).set({ stripeCustomerId: customerId }).where(eq(usersTable.id, user.id));
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: ids.giftCode, quantity: qty }],
    mode: "payment",
    metadata: { userId: String(user.id), email: user.email, type: "gift_code", quantity: String(qty) },
    success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/broker-dashboard`,
  });

  await db.insert(stripeTransactionsTable).values({
    userId: user.id,
    type: "gift_code",
    stripeSessionId: session.id,
    stripeCustomerId: customerId,
    amountCents: 2900 * qty,
    status: "pending",
    metadata: { quantity: qty },
  }).onConflictDoNothing();

  res.json({ url: session.url });
});

// ── GET /api/stripe/verify-session ────────────────────────────────────────────
// Called from the success page after Stripe redirects back.
// Does NOT require auth — it auto-logs in the user using Stripe metadata,
// because the session cookie may have been dropped in the Stripe cross-site redirect.
router.get("/stripe/verify-session", async (req: Request, res: Response) => {
  const { session_id } = req.query as { session_id?: string };
  if (!session_id) {
    res.status(400).json({ error: "session_id is required." });
    return;
  }

  const stripe = getStripeClient();

  let stripeSession: any;
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription"],
    });
  } catch {
    res.status(400).json({ error: "Invalid or expired session ID. Please contact support if you were charged." });
    return;
  }

  if (stripeSession.payment_status !== "paid" && stripeSession.status !== "complete") {
    res.json({ status: "pending", message: "Payment not yet complete — please wait a moment and refresh." });
    return;
  }

  const meta = stripeSession.metadata ?? {};
  const userId = Number(meta.userId);

  if (!userId) {
    res.status(400).json({
      error: "Could not identify the user for this session. Please sign in and contact support.",
    });
    return;
  }

  // Fetch the user
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User account not found. Please contact support." });
    return;
  }

  const https = isRequestHttps(req);

  // ── Handle subscription upgrade ───────────────────────────────────────────
  if (meta.type === "subscription") {
    const plan = meta.plan as "monthly" | "annual";
    const status = plan === "annual" ? "pro_annual" : "pro_monthly";

    await db.update(usersTable).set({
      subscriptionStatus: status,
      fullAccess: true,
      stripeCustomerId: stripeSession.customer ?? user.stripeCustomerId,
    }).where(eq(usersTable.id, userId));

    await db.update(stripeTransactionsTable)
      .set({ status: "paid" })
      .where(eq(stripeTransactionsTable.stripeSessionId, session_id))
      .catch(() => {});

    // Auto-login: create a fresh session so the user is authenticated
    await autoLoginUser(res, userId, https);

    res.json({
      status: "ok",
      type: "subscription",
      plan,
      message: `You're now on Pro ${plan === "annual" ? "Annual" : "Monthly"}! Welcome.`,
    });
    return;
  }

  // ── Handle gift code purchase ─────────────────────────────────────────────
  if (meta.type === "gift_code") {
    const qty = Number(meta.quantity ?? 1);

    await db.update(stripeTransactionsTable)
      .set({ status: "paid" })
      .where(eq(stripeTransactionsTable.stripeSessionId, session_id))
      .catch(() => {});

    // Check if codes were already generated (idempotency)
    const existing = await db
      .select({ code: giftCodesTable.code })
      .from(giftCodesTable)
      .where(eq(giftCodesTable.stripeSessionId, session_id));

    let codes: string[];
    if (existing.length > 0) {
      codes = existing.map((r) => r.code);
    } else {
      codes = [];
      for (let i = 0; i < qty; i++) {
        const code = generateGiftCode();
        codes.push(code);
        await db.insert(giftCodesTable).values({
          code,
          purchasedByUserId: userId,
          stripeSessionId: session_id,
          priceCents: 2900,
        }).catch(() => {});
      }
    }

    // Auto-login
    await autoLoginUser(res, userId, https);

    res.json({
      status: "ok",
      type: "gift_code",
      codes,
      quantity: codes.length,
      message: `${codes.length} gift code${codes.length > 1 ? "s" : ""} generated successfully!`,
    });
    return;
  }

  // Fallback — unknown type but payment succeeded
  await autoLoginUser(res, userId, https);
  res.json({ status: "ok", message: "Payment confirmed." });
});

// ── POST /api/stripe/webhook ──────────────────────────────────────────────────
router.post(
  "/stripe/webhook",
  async (req: any, res: Response) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    if (webhookSecret && sig) {
      try {
        const stripe = getStripeClient();
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error("[stripe webhook] signature error:", err.message);
        res.status(400).json({ error: "Invalid signature" });
        return;
      }
    } else {
      try {
        event = JSON.parse(req.body.toString());
      } catch {
        res.status(400).json({ error: "Invalid payload" });
        return;
      }
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.payment_status !== "paid" && session.status !== "complete") {
        res.json({ received: true }); return;
      }

      const meta = session.metadata ?? {};
      const userId = Number(meta.userId);
      if (!userId) { res.json({ received: true }); return; }

      await db.update(stripeTransactionsTable)
        .set({ status: "paid" })
        .where(eq(stripeTransactionsTable.stripeSessionId, session.id))
        .catch(() => {});

      if (meta.type === "subscription") {
        const plan = meta.plan as "monthly" | "annual";
        await db.update(usersTable)
          .set({ subscriptionStatus: plan === "annual" ? "pro_annual" : "pro_monthly", fullAccess: true })
          .where(eq(usersTable.id, userId))
          .catch(() => {});
      }

      if (meta.type === "gift_code") {
        const qty = Number(meta.quantity ?? 1);
        const existing = await db.select({ id: giftCodesTable.id })
          .from(giftCodesTable)
          .where(eq(giftCodesTable.stripeSessionId, session.id))
          .limit(1);

        if (existing.length === 0) {
          for (let i = 0; i < qty; i++) {
            await db.insert(giftCodesTable).values({
              code: generateGiftCode(),
              purchasedByUserId: userId,
              stripeSessionId: session.id,
              priceCents: 2900,
            }).catch(() => {});
          }
        }
      }
    }

    res.json({ received: true });
  }
);

// ── GET /api/stripe/my-gift-codes ─────────────────────────────────────────────
router.get("/stripe/my-gift-codes", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const redeemerAlias = usersTable;
  const codes = await db
    .select({
      id: giftCodesTable.id,
      code: giftCodesTable.code,
      createdAt: giftCodesTable.createdAt,
      redeemedAt: giftCodesTable.redeemedAt,
      redeemedByUserId: giftCodesTable.redeemedByUserId,
      redeemerName: redeemerAlias.name,
      redeemerEmail: redeemerAlias.email,
    })
    .from(giftCodesTable)
    .leftJoin(redeemerAlias, eq(giftCodesTable.redeemedByUserId, redeemerAlias.id))
    .where(eq(giftCodesTable.purchasedByUserId, req.userId!));
  res.json(codes);
});

// ── Shared gift code application logic ────────────────────────────────────────
export async function applyGiftCode(
  userId: number,
  code: string,
): Promise<{ ok: boolean; message: string; alreadyRedeemed?: boolean }> {
  const normalizedCode = code.trim().toUpperCase();

  const [gift] = await db
    .select()
    .from(giftCodesTable)
    .where(eq(giftCodesTable.code, normalizedCode))
    .limit(1);

  if (!gift) {
    return { ok: false, message: "Invalid gift code. Please check the code and try again." };
  }
  if (gift.redeemedByUserId) {
    return { ok: false, message: "This gift code has already been redeemed.", alreadyRedeemed: true };
  }

  const proExpiresAt = new Date();
  proExpiresAt.setFullYear(proExpiresAt.getFullYear() + 1);

  await db.update(giftCodesTable).set({
    redeemedByUserId: userId,
    redeemedAt: new Date(),
  }).where(eq(giftCodesTable.id, gift.id));

  const userUpdates: Partial<typeof usersTable.$inferInsert> = {
    subscriptionStatus: "pro_annual",
    fullAccess: true,
    proExpiresAt,
  };

  if (gift.purchasedByUserId) {
    const [purchaser] = await db
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, gift.purchasedByUserId))
      .limit(1);

    if (purchaser) {
      const [brokerConfig] = await db
        .select({ subdomain: whiteLabelConfigsTable.subdomain })
        .from(whiteLabelConfigsTable)
        .where(eq(whiteLabelConfigsTable.contactEmail, purchaser.email))
        .limit(1);

      if (brokerConfig) {
        userUpdates.referralSubdomain = brokerConfig.subdomain;
      }
    }
  }

  await db.update(usersTable).set(userUpdates).where(eq(usersTable.id, userId));

  console.log(`[gift] Code ${normalizedCode} redeemed by user ${userId}. Pro until ${proExpiresAt.toISOString()}`);
  return { ok: true, message: "Gift code redeemed successfully! You now have 1 year of Pro access." };
}

// ── POST /api/auth/redeem-gift ─────────────────────────────────────────────────
router.post("/auth/redeem-gift", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const { code } = req.body as { code?: string };
  if (!code?.trim()) { res.status(400).json({ error: "Gift code required." }); return; }

  const result = await applyGiftCode(req.userId!, code);
  if (!result.ok) {
    const status = result.alreadyRedeemed ? 400 : 404;
    res.status(status).json({ error: result.message });
    return;
  }

  res.json({ ok: true, subscriptionStatus: "pro_annual", message: result.message });
});

export default router;
