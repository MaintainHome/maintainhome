/**
 * Creates MaintainHome Stripe products and prices (test mode).
 * Run: npx tsx scripts/seed-stripe.ts
 * Idempotent — safe to run multiple times.
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) { console.error("STRIPE_SECRET_KEY not set"); process.exit(1); }

const stripe = new Stripe(key, { apiVersion: "2025-04-30.basil" });

async function findOrCreate(name: string, create: () => Promise<Stripe.Product>) {
  const list = await stripe.products.search({ query: `name:'${name}' AND active:'true'` });
  if (list.data.length > 0) {
    console.log(`✓ Found existing product: ${name} (${list.data[0].id})`);
    return list.data[0];
  }
  const p = await create();
  console.log(`✓ Created product: ${name} (${p.id})`);
  return p;
}

async function main() {
  console.log("Setting up Stripe products for MaintainHome.ai...\n");

  // ── 1. Pro Subscription product ──────────────────────────────────────────
  const proProd = await findOrCreate("MaintainHome Pro", () =>
    stripe.products.create({
      name: "MaintainHome Pro",
      description: "Full 12-month AI maintenance calendar, Maintly AI chat, document uploads, and more.",
    })
  );

  // Monthly price
  const monthlyPrices = await stripe.prices.list({ product: proProd.id, active: true, type: "recurring" });
  let monthlyPriceId = monthlyPrices.data.find((p) => (p.recurring?.interval === "month"))?.id;
  if (!monthlyPriceId) {
    const mp = await stripe.prices.create({
      product: proProd.id,
      unit_amount: 499,
      currency: "usd",
      recurring: { interval: "month" },
      nickname: "Pro Monthly",
    });
    monthlyPriceId = mp.id;
    console.log(`✓ Created monthly price: $4.99/month (${monthlyPriceId})`);
  } else {
    console.log(`✓ Found existing monthly price (${monthlyPriceId})`);
  }

  // Annual price
  const annualPrices = await stripe.prices.list({ product: proProd.id, active: true, type: "recurring" });
  let annualPriceId = annualPrices.data.find((p) => (p.recurring?.interval === "year"))?.id;
  if (!annualPriceId) {
    const ap = await stripe.prices.create({
      product: proProd.id,
      unit_amount: 3999,
      currency: "usd",
      recurring: { interval: "year" },
      nickname: "Pro Annual",
    });
    annualPriceId = ap.id;
    console.log(`✓ Created annual price: $39.99/year (${annualPriceId})`);
  } else {
    console.log(`✓ Found existing annual price (${annualPriceId})`);
  }

  // ── 2. Gift Code product ─────────────────────────────────────────────────
  const giftProd = await findOrCreate("MaintainHome Gift Code", () =>
    stripe.products.create({
      name: "MaintainHome Gift Code",
      description: "1-year Pro access gift code for a homeowner. Redeemable at maintainhome.ai.",
    })
  );

  const giftPrices = await stripe.prices.list({ product: giftProd.id, active: true, type: "one_time" });
  let giftPriceId = giftPrices.data.find((p) => p.unit_amount === 2900)?.id;
  if (!giftPriceId) {
    const gp = await stripe.prices.create({
      product: giftProd.id,
      unit_amount: 2900,
      currency: "usd",
      nickname: "Gift Code $29",
    });
    giftPriceId = gp.id;
    console.log(`✓ Created gift code price: $29.00/each (${giftPriceId})`);
  } else {
    console.log(`✓ Found existing gift code price (${giftPriceId})`);
  }

  console.log("\n📋 Add these to your environment variables:\n");
  console.log(`STRIPE_PRICE_MONTHLY=${monthlyPriceId}`);
  console.log(`STRIPE_PRICE_ANNUAL=${annualPriceId}`);
  console.log(`STRIPE_PRICE_GIFT_CODE=${giftPriceId}`);
  console.log("\nDone! ✓");
}

main().catch((e) => { console.error(e); process.exit(1); });
