/**
 * Temporary admin-only endpoint to seed Stripe products.
 * Call: POST /api/admin/stripe-seed  with header X-Admin-Token: <ADMIN_SECRET>
 */
import { Router, type Request, type Response } from "express";
import { getStripeClient } from "../stripeClient";

const router = Router();

function requireAdmin(req: Request, res: Response, next: any) {
  const token = req.headers["x-admin-token"];
  if (!token || token !== process.env.ADMIN_SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

router.post("/admin/stripe-seed", requireAdmin, async (_req: Request, res: Response) => {
  const stripe = getStripeClient();

  async function findOrCreate(name: string, creator: () => Promise<any>) {
    const list = await stripe.products.search({ query: `name:'${name}' AND active:'true'` });
    if (list.data.length > 0) return list.data[0];
    return creator();
  }

  const proProd = await findOrCreate("MaintainHome Pro", () =>
    stripe.products.create({
      name: "MaintainHome Pro",
      description: "Full 12-month AI maintenance calendar, Maintly AI chat, document uploads.",
    })
  );

  const monthlyPrices = await stripe.prices.list({ product: proProd.id, active: true, type: "recurring" });
  let monthlyPriceId = monthlyPrices.data.find((p: any) => p.recurring?.interval === "month" && p.unit_amount === 599)?.id;
  if (!monthlyPriceId) {
    const mp = await stripe.prices.create({
      product: proProd.id, unit_amount: 599, currency: "usd",
      recurring: { interval: "month" }, nickname: "Pro Monthly $5.99",
    });
    monthlyPriceId = mp.id;
  }

  const annualPrices = await stripe.prices.list({ product: proProd.id, active: true, type: "recurring" });
  let annualPriceId = annualPrices.data.find((p: any) => p.recurring?.interval === "year" && p.unit_amount === 4900)?.id;
  if (!annualPriceId) {
    const ap = await stripe.prices.create({
      product: proProd.id, unit_amount: 4900, currency: "usd",
      recurring: { interval: "year" }, nickname: "Pro Annual $49",
    });
    annualPriceId = ap.id;
  }

  const giftProd = await findOrCreate("MaintainHome Gift Code", () =>
    stripe.products.create({
      name: "MaintainHome Gift Code",
      description: "1-year Pro access gift code for a homeowner.",
    })
  );

  const giftPrices = await stripe.prices.list({ product: giftProd.id, active: true, type: "one_time" });
  let giftPriceId = giftPrices.data.find((p: any) => p.unit_amount === 4500)?.id;
  if (!giftPriceId) {
    const gp = await stripe.prices.create({
      product: giftProd.id, unit_amount: 4500, currency: "usd", nickname: "Gift Code $45",
    });
    giftPriceId = gp.id;
  }

  // Power Up — $4.99 for 200 additional Maintly messages
  const powerUpProd = await findOrCreate("Maintly Power Up", () =>
    stripe.products.create({
      name: "Maintly Power Up",
      description: "200 additional Maintly messages for the current month.",
    })
  );
  const powerUpPrices = await stripe.prices.list({ product: powerUpProd.id, active: true, type: "one_time" });
  let powerUpPriceId = powerUpPrices.data.find((p: any) => p.unit_amount === 499)?.id;
  if (!powerUpPriceId) {
    const pp = await stripe.prices.create({
      product: powerUpProd.id, unit_amount: 499, currency: "usd", nickname: "Maintly Power Up $4.99",
    });
    powerUpPriceId = pp.id;
  }

  res.json({
    ok: true,
    priceIds: {
      STRIPE_PRICE_MONTHLY: monthlyPriceId,
      STRIPE_PRICE_ANNUAL: annualPriceId,
      STRIPE_PRICE_GIFT_CODE: giftPriceId,
      STRIPE_PRICE_POWER_UP: powerUpPriceId,
    },
  });
});

export default router;
