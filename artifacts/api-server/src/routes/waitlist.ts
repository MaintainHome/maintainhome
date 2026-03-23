import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { waitlistTable } from "@workspace/db";
import { JoinWaitlistBody } from "@workspace/api-zod";
import { eq, count } from "drizzle-orm";
import { Resend } from "resend";

const router: IRouter = Router();

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("[email] RESEND_API_KEY not set — skipping email");
    return null;
  }
  return new Resend(key);
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "MaintainHome.ai <onboarding@resend.dev>";
}

async function sendOwnerNotification(entry: {
  name: string;
  email: string;
  zip: string | null;
  userType: string | null;
  signupNumber: number;
}) {
  const resend = getResend();
  const ownerEmail = process.env.NOTIFY_EMAIL;
  if (!resend) return;
  if (!ownerEmail) {
    console.log("[email] NOTIFY_EMAIL not set — skipping owner notification");
    return;
  }

  console.log(`[email] Sending owner notification to ${ownerEmail} for signup #${entry.signupNumber}`);

  const result = await resend.emails.send({
    from: getFromAddress(),
    to: ownerEmail,
    subject: `New waitlist signup #${entry.signupNumber} — ${entry.name}`,
    html: `
      <h2>New Waitlist Signup</h2>
      <table style="border-collapse:collapse;font-family:sans-serif">
        <tr><td style="padding:6px 12px;font-weight:bold">Signup #</td><td style="padding:6px 12px">${entry.signupNumber}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold">Name</td><td style="padding:6px 12px">${entry.name}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold">Email</td><td style="padding:6px 12px">${entry.email}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold">ZIP</td><td style="padding:6px 12px">${entry.zip ?? "—"}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold">Type</td><td style="padding:6px 12px">${entry.userType ?? "—"}</td></tr>
      </table>
    `,
  });

  if (result.error) {
    console.error("[email] Owner notification failed:", JSON.stringify(result.error));
  } else {
    console.log("[email] Owner notification sent, id:", result.data?.id);
  }
}

async function sendConfirmationEmail(name: string, email: string, signupNumber: number) {
  const resend = getResend();
  if (!resend) return;

  console.log(`[email] Sending confirmation to ${email} for signup #${signupNumber}`);

  const result = await resend.emails.send({
    from: getFromAddress(),
    to: email,
    subject: "You're on the MaintainHome.ai waitlist!",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1a1a2e">Hi ${name}, you're in! 🎉</h2>
        <p>You're <strong>#${signupNumber}</strong> on the MaintainHome.ai waitlist and have locked in your <strong>50% early bird discount</strong> for life.</p>
        <p>We'll reach out as soon as early access is ready.</p>
        <p style="color:#888;font-size:13px">— The MaintainHome.ai Team</p>
      </div>
    `,
  });

  if (result.error) {
    console.error("[email] Confirmation email failed:", JSON.stringify(result.error));
  } else {
    console.log("[email] Confirmation sent, id:", result.data?.id);
  }
}

router.post("/waitlist", async (req, res) => {
  if (req.body.website) {
    console.log("[honeypot] Bot submission blocked");
    res.status(200).json({ ok: true });
    return;
  }

  const parsed = JoinWaitlistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { name, email, zip, userType } = parsed.data;

  const existing = await db
    .select()
    .from(waitlistTable)
    .where(eq(waitlistTable.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const countResult = await db.select({ count: count() }).from(waitlistTable);
  const currentCount = Number(countResult[0]?.count ?? 0);
  const signupNumber = currentCount + 1;

  const [entry] = await db
    .insert(waitlistTable)
    .values({
      name,
      email: email.toLowerCase(),
      zip: zip ?? null,
      userType: userType ?? null,
      signupNumber,
    })
    .returning();

  console.log(`[waitlist] New signup #${signupNumber}: ${name} <${email}>`);

  sendOwnerNotification({ ...entry, zip: entry.zip, userType: entry.userType });
  sendConfirmationEmail(entry.name, entry.email, entry.signupNumber);

  res.status(201).json({
    id: entry.id,
    name: entry.name,
    email: entry.email,
    zip: entry.zip,
    userType: entry.userType,
    signupNumber: entry.signupNumber,
    createdAt: entry.createdAt,
  });
});

router.get("/waitlist", async (_req, res) => {
  const result = await db.select({ count: count() }).from(waitlistTable);
  res.json({ count: Number(result[0]?.count ?? 0) });
});

export default router;
