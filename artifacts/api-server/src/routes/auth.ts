import { Router, type Request, type Response } from "express";
import { db, usersTable, magicLinkTokensTable, sessionsTable, whiteLabelConfigsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import { Resend } from "resend";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";

const router = Router();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFromAddress() {
  return process.env.RESEND_FROM_EMAIL ?? "MaintainHome.ai <onboarding@resend.dev>";
}

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

function setSessionCookie(res: Response, token: string, staySignedIn: boolean, isHttps: boolean) {
  res.cookie("mh_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isHttps,
    ...(staySignedIn ? { maxAge: THIRTY_DAYS_MS } : {}),
  });
}

async function sendMagicLinkEmail(
  req: Request,
  email: string,
  name: string | null,
  magicLink: string,
) {
  const resend = getResend();
  const greeting = name ? `Hi ${name},` : "Hi there,";

  if (resend) {
    console.log(`[auth] Sending magic link email to: ${email}`);
    const result = await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject: "Sign in to MaintainHome.ai",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <img src="https://maintainhome.ai/images/logo-icon.png" alt="MaintainHome.ai" style="width:48px;height:48px;margin-bottom:16px" />
          <h2 style="color:#1a1a2e;margin-bottom:8px">Sign in to MaintainHome.ai</h2>
          <p style="color:#555">${greeting} Click the button below to sign in. This link expires in 15 minutes.</p>
          <a href="${magicLink}" style="display:inline-block;padding:14px 28px;background:#1f9e6e;color:white;text-decoration:none;border-radius:10px;font-weight:bold;font-size:16px;margin:20px 0">
            Sign In Now
          </a>
          <p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
    if (result.error) {
      console.error("[auth] Email send failed:", result.error);
    } else {
      console.log("[auth] Email sent, id:", result.data?.id);
    }
  }
}

// Check if email is registered (used by frontend two-step flow)
router.post("/auth/check-email", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }
  const normalizedEmail = email.toLowerCase().trim();
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);
  res.json({ exists: !!existing });
});

const VALID_PROMO_CODE = "BETA2026";

// Request magic link — accepts optional name, zipCode, promoCode, staySignedIn, referralSubdomain
router.post("/auth/request-link", async (req: Request, res: Response) => {
  const { email, name, zipCode, promoCode, staySignedIn, referralSubdomain } = req.body;
  const stay = staySignedIn !== false;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email address required" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName = typeof name === "string" ? name.trim() : null;
  const trimmedZip = typeof zipCode === "string" ? zipCode.trim() : null;
  const promoGrantsAccess =
    typeof promoCode === "string" &&
    promoCode.trim().toUpperCase() === VALID_PROMO_CODE;

  // Look up existing user
  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);

  const isNewUser = !user;

  const trimmedReferral = typeof referralSubdomain === "string" ? referralSubdomain.trim().toLowerCase() : null;

  if (!user) {
    // New user — create account with email (name/zip collected later via quiz)
    [user] = await db
      .insert(usersTable)
      .values({
        email: normalizedEmail,
        name: trimmedName ?? null,
        zipCode: trimmedZip ?? null,
        fullAccess: promoGrantsAccess,
        subscriptionStatus: promoGrantsAccess ? "promo_pro" : "free",
        referralSubdomain: trimmedReferral || null,
      })
      .returning();
    console.log(`[auth] New user created: ${normalizedEmail} subscriptionStatus=${promoGrantsAccess ? "promo_pro" : "free"} referral=${trimmedReferral || "none"}`);
  } else {
    // Returning user — update fields as needed
    const updates: Record<string, unknown> = {};
    if (trimmedName) updates.name = trimmedName;
    if (trimmedZip) updates.zipCode = trimmedZip;
    if (promoGrantsAccess && !user.fullAccess) {
      updates.fullAccess = true;
      updates.subscriptionStatus = "promo_pro";
    }

    if (Object.keys(updates).length > 0) {
      await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));
      user = { ...user, ...updates } as typeof user;
    }
    console.log(`[auth] Existing user requesting link: ${normalizedEmail} subscriptionStatus=${user.subscriptionStatus}`);
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await db.insert(magicLinkTokensTable).values({ email: normalizedEmail, token, expiresAt });

  const baseUrl = getBaseUrl(req);
  const redirect = isNewUser ? "quiz" : "dashboard";
  const magicLink = `${baseUrl}/api/auth/verify?token=${token}&stay=${stay ? "1" : "0"}&redirect=${redirect}`;
  console.log(`[auth] Magic link for ${normalizedEmail}: ${magicLink} stay=${stay}`);

  await sendMagicLinkEmail(req, normalizedEmail, user.name ?? trimmedName, magicLink);

  const isDev = process.env.NODE_ENV !== "production";
  res.json({
    ok: true,
    message: "Magic link sent! Check your email.",
    fullAccessGranted: promoGrantsAccess,
    ...(isDev ? { debugLink: magicLink } : {}),
  });
});

router.get("/auth/verify", async (req: Request, res: Response) => {
  const { token, stay, redirect: redirectParam } = req.query as { token: string; stay?: string; redirect?: string };
  const staySignedIn = stay !== "0";
  if (!token) {
    res.status(400).send("Missing token. Please request a new sign-in link.");
    return;
  }

  const [linkRecord] = await db
    .select()
    .from(magicLinkTokensTable)
    .where(
      and(
        eq(magicLinkTokensTable.token, token),
        eq(magicLinkTokensTable.used, false),
        gt(magicLinkTokensTable.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!linkRecord) {
    res.status(400).send(
      "<p style='font-family:sans-serif'>This sign-in link is invalid or has expired. Please <a href='/'>go back</a> and request a new one.</p>",
    );
    return;
  }

  await db
    .update(magicLinkTokensTable)
    .set({ used: true })
    .where(eq(magicLinkTokensTable.id, linkRecord.id));

  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, linkRecord.email))
    .limit(1);

  if (!user) {
    [user] = await db.insert(usersTable).values({ email: linkRecord.email }).returning();
    console.log(`[auth] New user created via verify: ${linkRecord.email}`);
  } else {
    console.log(`[auth] Existing user signed in: ${linkRecord.email} staySignedIn=${staySignedIn}`);
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessionExpires = new Date(Date.now() + THIRTY_DAYS_MS);
  const https = isRequestHttps(req);

  await db.insert(sessionsTable).values({
    token: sessionToken,
    userId: user.id,
    expiresAt: sessionExpires,
    staySignedIn,
  });

  setSessionCookie(res, sessionToken, staySignedIn, https);

  const baseUrl = getBaseUrl(req);
  const destination = redirectParam === "dashboard" ? "/" : "/quiz";
  res.redirect(`${baseUrl}${destination}`);
});

router.get("/auth/me", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      zipCode: usersTable.zipCode,
      fullAccess: usersTable.fullAccess,
      subscriptionStatus: usersTable.subscriptionStatus,
      smsEnabled: usersTable.smsEnabled,
      smsPhone: usersTable.smsPhone,
      hasSeenDashboardTour: usersTable.hasSeenDashboardTour,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  // Refresh persistent cookies so 30-day window slides forward on activity
  const currentToken = req.cookies?.mh_session;
  if (currentToken && req.sessionStaySignedIn) {
    const newExpiry = new Date(Date.now() + THIRTY_DAYS_MS);
    await db
      .update(sessionsTable)
      .set({ expiresAt: newExpiry })
      .where(eq(sessionsTable.token, currentToken));
    setSessionCookie(res, currentToken, true, isRequestHttps(req));
  }

  // Check if this user also has an approved broker account
  const [brokerRecord] = await db
    .select({ id: whiteLabelConfigsTable.id })
    .from(whiteLabelConfigsTable)
    .where(
      and(
        eq(whiteLabelConfigsTable.contactEmail, user.email),
        eq(whiteLabelConfigsTable.status, "approved"),
      ),
    )
    .limit(1);

  res.json({ ...user, isBroker: !!brokerRecord });
});

// Mark dashboard tour as completed (permanent flag, never resets)
router.post("/user/complete-tour", requireAuth as any, async (req: AuthRequest, res: Response) => {
  await db
    .update(usersTable)
    .set({ hasSeenDashboardTour: true })
    .where(eq(usersTable.id, req.userId!));
  res.json({ ok: true });
});

router.post("/auth/redeem-promo", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const { code } = req.body as { code?: string };
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Promo code required." });
    return;
  }
  if (code.trim().toUpperCase() !== VALID_PROMO_CODE) {
    res.status(400).json({ error: "Invalid promo code." });
    return;
  }
  const [user] = await db
    .select({ id: usersTable.id, subscriptionStatus: usersTable.subscriptionStatus, fullAccess: usersTable.fullAccess })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found." });
    return;
  }
  await db
    .update(usersTable)
    .set({ subscriptionStatus: "promo_pro", fullAccess: true })
    .where(eq(usersTable.id, user.id));
  console.log(`[auth] Promo code redeemed by user ${user.id}`);
  res.json({ ok: true, subscriptionStatus: "promo_pro" });
});

router.delete("/auth/delete-account", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    await db.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    res.clearCookie("mh_session", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isRequestHttps(req),
    });
    console.log(`[auth] Account deleted for userId=${userId}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("[auth] Delete account error:", err);
    res.status(500).json({ error: "Failed to delete account. Please try again." });
  }
});

router.post("/auth/logout", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const token = req.cookies?.mh_session;
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.clearCookie("mh_session", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isRequestHttps(req),
  });
  res.json({ ok: true });
});

export default router;
