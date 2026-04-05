import { Router, type Response } from "express";
import { db, usersTable, giftCodesTable, stripeTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";
import { getStripeClient } from "../stripeClient";
import crypto from "crypto";

const router = Router();

// ── Price IDs — set after running seed-stripe script ─────────────────────────
// These are read from env so the seed script can write them without code changes
function getPriceIds() {
  return {
    monthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
    annual: process.env.STRIPE_PRICE_ANNUAL ?? "",
    giftCode: process.env.STRIPE_PRICE_GIFT_CODE ?? "",
  };
}

function getBaseUrl(req: any): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}`;
  return `${req.protocol}://${req.get("host")}`;
}

function generateGiftCode(): string {
  return crypto.randomBytes(5).toString("hex").toUpperCase().replace(/(.{4})/g, "$1-").slice(0, 14);
}

// ── GET /api/stripe/config ─────────────────────────────────────────────────
// Returns the publishable key so the frontend doesn't need a separate secret
router.get("/stripe/config", (_req, res: Response) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "" });
});

// ── GET /api/stripe/prices ─────────────────────────────────────────────────
router.get("/stripe/prices", (_req, res: Response) => {
  const ids = getPriceIds();
  res.json({
    monthly: { priceId: ids.monthly, amount: 499, interval: "month" },
    annual: { priceId: ids.annual, amount: 3999, interval: "year" },
    giftCode: { priceId: ids.giftCode, amount: 2900 },
  });
});

// ── POST /api/stripe/checkout ─────────────────────────────────────────────
// Subscription checkout for homeowners
router.post("/stripe/checkout", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const { plan } = req.body as { plan?: "monthly" | "annual" };
  if (!plan || !["monthly", "annual"].includes(plan)) {
    res.status(400).json({ error: "plan must be 'monthly' or 'annual'" });
    return;
  }

  const ids = getPriceIds();
  const priceId = plan === "monthly" ? ids.monthly : ids.annual;

  if (!priceId) {
    res.status(500).json({ error: "Stripe prices not yet configured. Run the seed script." });
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
    success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/checkout/cancel`,
    metadata: { userId: String(user.id), type: "subscription", plan },
  });

  await db.insert(stripeTransactionsTable).values({
    userId: user.id,
    type: "subscription",
    stripeSessionId: session.id,
    stripeCustomerId: customerId,
    amountCents: plan === "monthly" ? 499 : 3999,
    status: "pending",
    metadata: { plan },
  });

  res.json({ url: session.url });
});

// ── POST /api/stripe/gift-checkout ──────────────────────────────────────────
// One-time purchase of gift codes for brokers
router.post("/stripe/gift-checkout", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const { quantity } = req.body as { quantity?: number };
  const qty = Number(quantity ?? 1);
  if (!qty || qty < 1 || qty > 50) {
    res.status(400).json({ error: "quantity must be between 1 and 50" });
    return;
  }

  const ids = getPriceIds();
  if (!ids.giftCode) {
    res.status(500).json({ error: "Stripe prices not yet configured. Run the seed script." });
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
    success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/checkout/cancel`,
    metadata: { userId: String(user.id), type: "gift_code", quantity: String(qty) },
  });

  await db.insert(stripeTransactionsTable).values({
    userId: user.id,
    type: "gift_code",
    stripeSessionId: session.id,
    stripeCustomerId: customerId,
    amountCents: 2900 * qty,
    status: "pending",
    metadata: { quantity: qty },
  });

  res.json({ url: session.url });
});

// ── GET /api/stripe/verify-session ──────────────────────────────────────────
// Called from success page to confirm payment and update user/DB
router.get("/stripe/verify-session", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const { session_id } = req.query as { session_id?: string };
  if (!session_id) { res.status(400).json({ error: "session_id required" }); return; }

  const stripe = getStripeClient();

  let session: any;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription"],
    });
  } catch {
    res.status(400).json({ error: "Invalid session ID." });
    return;
  }

  if (session.payment_status !== "paid" && session.status !== "complete") {
    res.json({ status: "pending", message: "Payment not yet complete." });
    return;
  }

  const meta = session.metadata ?? {};
  const userId = req.userId!;

  // Verify this session belongs to the requesting user
  if (meta.userId && Number(meta.userId) !== userId) {
    res.status(403).json({ error: "Session does not belong to this user." });
    return;
  }

  // Mark transaction as paid
  await db
    .update(stripeTransactionsTable)
    .set({ status: "paid" })
    .where(eq(stripeTransactionsTable.stripeSessionId, session_id));

  if (meta.type === "subscription") {
    const plan = meta.plan as "monthly" | "annual";
    const status = plan === "annual" ? "pro_annual" : "pro_monthly";
    await db
      .update(usersTable)
      .set({
        subscriptionStatus: status,
        fullAccess: true,
        stripeCustomerId: session.customer ?? undefined,
      })
      .where(eq(usersTable.id, userId));

    res.json({ status: "ok", type: "subscription", plan, message: `You're now on Pro ${plan === "annual" ? "Annual" : "Monthly"}!` });
    return;
  }

  if (meta.type === "gift_code") {
    const qty = Number(meta.quantity ?? 1);
    const codes: string[] = [];

    for (let i = 0; i < qty; i++) {
      const code = generateGiftCode();
      codes.push(code);
      await db.insert(giftCodesTable).values({
        code,
        purchasedByUserId: userId,
        stripeSessionId: session_id,
        priceCents: 2900,
      });
    }

    res.json({
      status: "ok",
      type: "gift_code",
      codes,
      quantity: qty,
      message: `${qty} gift code${qty > 1 ? "s" : ""} generated successfully!`,
    });
    return;
  }

  res.json({ status: "ok", message: "Payment confirmed." });
});

// ── POST /api/stripe/webhook ──────────────────────────────────────────────
// Stripe sends events here — used as async backup to verify-session
// Registered BEFORE express.json() in app.ts
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
        console.error("[stripe webhook] signature verification failed:", err.message);
        res.status(400).json({ error: "Invalid signature" });
        return;
      }
    } else {
      // No webhook secret — parse raw body manually (test mode convenience)
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
        res.json({ received: true });
        return;
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

// ── GET /api/stripe/my-gift-codes ──────────────────────────────────────────
router.get("/stripe/my-gift-codes", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const codes = await db
    .select()
    .from(giftCodesTable)
    .where(eq(giftCodesTable.purchasedByUserId, req.userId!));
  res.json(codes);
});

// ── POST /api/auth/redeem-gift ───────────────────────────────────────────────
// Homeowner redeems a gift code for 1-year Pro access
router.post("/auth/redeem-gift", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const { code } = req.body as { code?: string };
  if (!code?.trim()) { res.status(400).json({ error: "Gift code required." }); return; }

  const [gift] = await db
    .select()
    .from(giftCodesTable)
    .where(eq(giftCodesTable.code, code.trim().toUpperCase()))
    .limit(1);

  if (!gift) { res.status(404).json({ error: "Gift code not found." }); return; }
  if (gift.redeemedByUserId) { res.status(400).json({ error: "This gift code has already been redeemed." }); return; }

  await db.update(giftCodesTable).set({
    redeemedByUserId: req.userId!,
    redeemedAt: new Date(),
  }).where(eq(giftCodesTable.id, gift.id));

  await db.update(usersTable).set({
    subscriptionStatus: "pro_annual",
    fullAccess: true,
  }).where(eq(usersTable.id, req.userId!));

  res.json({ ok: true, message: "Gift code redeemed! You now have 1 year of Pro access." });
});

export default router;
