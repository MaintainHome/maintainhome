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
  let monthlyPriceId = monthlyPrices.data.find((p: any) => p.recurring?.interval === "month")?.id;
  if (!monthlyPriceId) {
    const mp = await stripe.prices.create({
      product: proProd.id, unit_amount: 499, currency: "usd",
      recurring: { interval: "month" }, nickname: "Pro Monthly",
    });
    monthlyPriceId = mp.id;
  }

  const annualPrices = await stripe.prices.list({ product: proProd.id, active: true, type: "recurring" });
  let annualPriceId = annualPrices.data.find((p: any) => p.recurring?.interval === "year")?.id;
  if (!annualPriceId) {
    const ap = await stripe.prices.create({
      product: proProd.id, unit_amount: 3999, currency: "usd",
      recurring: { interval: "year" }, nickname: "Pro Annual",
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
  let giftPriceId = giftPrices.data.find((p: any) => p.unit_amount === 2900)?.id;
  if (!giftPriceId) {
    const gp = await stripe.prices.create({
      product: giftProd.id, unit_amount: 2900, currency: "usd", nickname: "Gift Code $29",
    });
    giftPriceId = gp.id;
  }

  res.json({
    ok: true,
    priceIds: {
      STRIPE_PRICE_MONTHLY: monthlyPriceId,
      STRIPE_PRICE_ANNUAL: annualPriceId,
      STRIPE_PRICE_GIFT_CODE: giftPriceId,
    },
  });
});

export default router;
