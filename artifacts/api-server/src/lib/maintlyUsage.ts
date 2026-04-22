import { db, usersTable, stripeTransactionsTable } from "@workspace/db";
import { and, eq, ne } from "drizzle-orm";

export const MONTHLY_PRO_QUOTA = 200;
export const POWER_UP_QUANTITY = 200;

export type UsageInfo = {
  isPro: boolean;
  monthlyQuota: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  powerUpRemaining: number;
  totalRemaining: number;
  period: string;
};

function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const PRO_STATUSES = ["pro_monthly", "pro_annual", "promo_pro"];

/**
 * Read usage info for the user. Lazily resets the monthly counter when the period rolls over.
 */
export async function getUsageInfo(userId: number): Promise<UsageInfo | null> {
  const [row] = await db
    .select({
      subscriptionStatus: usersTable.subscriptionStatus,
      monthlyMessagesUsed: usersTable.monthlyMessagesUsed,
      monthlyMessagesPeriod: usersTable.monthlyMessagesPeriod,
      powerUpMessagesRemaining: usersTable.powerUpMessagesRemaining,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!row) return null;

  const period = currentPeriod();
  let used = row.monthlyMessagesUsed ?? 0;
  let powerUpRemaining = row.powerUpMessagesRemaining ?? 0;

  // Lazy monthly reset: zero both monthly counter AND any leftover Power Up balance,
  // since Power Ups are for the current month only and do not roll over.
  if (row.monthlyMessagesPeriod !== period) {
    used = 0;
    powerUpRemaining = 0;
    await db
      .update(usersTable)
      .set({
        monthlyMessagesUsed: 0,
        monthlyMessagesPeriod: period,
        powerUpMessagesRemaining: 0,
      })
      .where(eq(usersTable.id, userId));
  }

  const isPro = PRO_STATUSES.includes(row.subscriptionStatus);
  const monthlyRemaining = isPro ? Math.max(0, MONTHLY_PRO_QUOTA - used) : 0;

  return {
    isPro,
    monthlyQuota: isPro ? MONTHLY_PRO_QUOTA : 0,
    monthlyUsed: used,
    monthlyRemaining,
    powerUpRemaining,
    totalRemaining: monthlyRemaining + powerUpRemaining,
    period,
  };
}

/**
 * Check if a user can send a Maintly message and consume one credit if allowed.
 * Returns { allowed, info, reason }.
 *  - reason "not_pro": free user — must upgrade
 *  - reason "limit_reached": pro user out of quota + power-ups
 */
export async function consumeMaintlyMessage(userId: number): Promise<{
  allowed: boolean;
  reason?: "not_pro" | "limit_reached";
  info: UsageInfo | null;
}> {
  const info = await getUsageInfo(userId);
  if (!info) return { allowed: false, info: null };

  if (!info.isPro) {
    return { allowed: false, reason: "not_pro", info };
  }

  if (info.totalRemaining <= 0) {
    return { allowed: false, reason: "limit_reached", info };
  }

  // Spend monthly quota first; fall back to power-ups.
  if (info.monthlyRemaining > 0) {
    await db
      .update(usersTable)
      .set({ monthlyMessagesUsed: info.monthlyUsed + 1 })
      .where(eq(usersTable.id, userId));
  } else {
    await db
      .update(usersTable)
      .set({ powerUpMessagesRemaining: Math.max(0, info.powerUpRemaining - 1) })
      .where(eq(usersTable.id, userId));
  }

  // Return updated counts
  const updated = await getUsageInfo(userId);
  return { allowed: true, info: updated };
}

/**
 * Idempotently finalize a Power Up purchase for a Stripe session.
 *
 * Atomically transitions the matching `stripe_transactions` row from
 * any non-"paid" status to "paid". Only when that transition actually
 * happens (i.e. this is the first time the session is being fulfilled)
 * are credits added to the user. Safe to call from both the
 * verify-session redirect path and the webhook — only the first call
 * for a given session will credit the account.
 */
export async function finalizePowerUpPurchase(
  sessionId: string,
  userId: number,
  amount: number = POWER_UP_QUANTITY,
): Promise<{ credited: boolean }> {
  // Atomic conditional flip: only succeeds if the row exists AND was not already paid.
  const flipped = await db
    .update(stripeTransactionsTable)
    .set({ status: "paid" })
    .where(
      and(
        eq(stripeTransactionsTable.stripeSessionId, sessionId),
        ne(stripeTransactionsTable.status, "paid"),
      ),
    )
    .returning({ id: stripeTransactionsTable.id });

  if (flipped.length === 0) {
    // Either no transaction row, or already paid — do not credit again.
    return { credited: false };
  }

  // Read current balance and add credits.
  const [row] = await db
    .select({ powerUpMessagesRemaining: usersTable.powerUpMessagesRemaining })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!row) return { credited: false };

  await db
    .update(usersTable)
    .set({ powerUpMessagesRemaining: (row.powerUpMessagesRemaining ?? 0) + amount })
    .where(eq(usersTable.id, userId));

  return { credited: true };
}
