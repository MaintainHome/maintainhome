import { Router, type Request, type Response } from "express";
import { db, usersTable, magicLinkTokensTable, sessionsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import { Resend } from "resend";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";

const router = Router();

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

// Request magic link — accepts optional name, zipCode, promoCode
router.post("/auth/request-link", async (req: Request, res: Response) => {
  const { email, name, zipCode, promoCode } = req.body;
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

  if (!user) {
    // New user — name is required
    if (!trimmedName) {
      res.json({ needsProfile: true });
      return;
    }
    [user] = await db
      .insert(usersTable)
      .values({
        email: normalizedEmail,
        name: trimmedName,
        zipCode: trimmedZip,
        fullAccess: promoGrantsAccess,
        subscriptionStatus: promoGrantsAccess ? "promo_pro" : "free",
      })
      .returning();
    console.log(`[auth] New user created: ${normalizedEmail} (${trimmedName}) subscriptionStatus=${promoGrantsAccess ? "promo_pro" : "free"}`);
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
  const magicLink = `${baseUrl}/api/auth/verify?token=${token}`;
  console.log(`[auth] Magic link for ${normalizedEmail}: ${magicLink}`);

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
  const { token } = req.query as { token: string };
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
    console.log(`[auth] Existing user signed in: ${linkRecord.email}`);
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(sessionsTable).values({
    token: sessionToken,
    userId: user.id,
    expiresAt: sessionExpires,
  });

  res.cookie("mh_session", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    expires: sessionExpires,
    path: "/",
  });

  const baseUrl = getBaseUrl(req);
  res.redirect(`${baseUrl}/?loggedIn=1`);
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
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

router.post("/auth/logout", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const token = req.cookies?.mh_session;
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.clearCookie("mh_session", { path: "/" });
  res.json({ ok: true });
});

export default router;
