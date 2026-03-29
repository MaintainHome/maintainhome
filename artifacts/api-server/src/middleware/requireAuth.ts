import { Request, Response, NextFunction } from "express";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
  userSubscriptionStatus?: string;
  userFullAccess?: boolean;
}

function isProStatus(status: string | undefined, fullAccess: boolean | undefined): boolean {
  return (
    fullAccess === true ||
    status === "pro_monthly" ||
    status === "pro_annual" ||
    status === "promo_pro"
  );
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.mh_session;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [session] = await db
    .select({ userId: sessionsTable.userId })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())))
    .limit(1);

  if (!session) {
    res.status(401).json({ error: "Session expired or invalid" });
    return;
  }

  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      subscriptionStatus: usersTable.subscriptionStatus,
      fullAccess: usersTable.fullAccess,
    })
    .from(usersTable)
    .where(eq(usersTable.id, session.userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.userId = user.id;
  req.userEmail = user.email;
  req.userSubscriptionStatus = user.subscriptionStatus;
  req.userFullAccess = user.fullAccess;
  next();
}

export async function requirePro(req: AuthRequest, res: Response, next: NextFunction) {
  if (!isProStatus(req.userSubscriptionStatus, req.userFullAccess)) {
    res.status(403).json({ error: "Pro subscription required" });
    return;
  }
  next();
}
