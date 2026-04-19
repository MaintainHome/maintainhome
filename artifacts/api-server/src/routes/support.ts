import { Router, type Response } from "express";
import { Resend } from "resend";
import { db, supportTicketsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";
import { createRateLimiter } from "../middleware/rateLimit";

const router = Router();

const ADMIN_EMAIL = "consultingjohnwalker@gmail.com";
const SUBJECT_OPTIONS = [
  "General Question",
  "Billing & Subscription",
  "Account Access",
  "Feature Request",
  "Bug Report",
  "Other",
];

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFromAddress() {
  return process.env.RESEND_FROM_EMAIL ?? "MaintainHome.ai <onboarding@resend.dev>";
}

const supportRateLimit = createRateLimiter({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
  keyPrefix: "support",
  message: "You've submitted several requests recently. Please wait a few minutes before trying again.",
});

router.post("/support/contact", supportRateLimit as any, async (req: AuthRequest, res: Response) => {
  try {
    const { name, subject, message, fileData, fileName, fileType } = req.body;
    let { email } = req.body;

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      res.status(400).json({ error: "Name, email, subject, and message are required." });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }

    if (message.trim().length > 5000) {
      res.status(400).json({ error: "Message must be under 5000 characters." });
      return;
    }

    const hasAttachment = !!(fileData && fileName);

    const now = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const userId = req.userId ?? null;

    await db.insert(supportTicketsTable).values({
      userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      hasAttachment,
      attachmentFileName: hasAttachment ? fileName : null,
    });

    const resend = getResend();
    if (resend) {
      const emailBody = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e">
          <div style="background:#1f9e6e;padding:20px 24px;border-radius:10px 10px 0 0">
            <img src="https://maintainhome.ai/images/logo-icon.png" alt="MaintainHome.ai" style="width:36px;height:36px" />
            <h2 style="color:white;margin:8px 0 0;font-size:18px">New Support Request</h2>
          </div>
          <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#64748b;width:90px">From:</td><td style="padding:6px 0;font-weight:600">${name} &lt;${email}&gt;</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Subject:</td><td style="padding:6px 0;font-weight:600">${subject}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">User ID:</td><td style="padding:6px 0">${userId ?? "Guest (not signed in)"}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Received:</td><td style="padding:6px 0">${now} ET</td></tr>
            </table>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0" />
            <h3 style="margin:0 0 10px;font-size:14px;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Message</h3>
            <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;white-space:pre-wrap;font-size:14px;line-height:1.6;color:#334155">${message.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
            ${hasAttachment ? `<p style="margin:12px 0 0;font-size:13px;color:#64748b">📎 Attachment: <strong>${fileName}</strong></p>` : ""}
          </div>
          <div style="background:#f1f5f9;padding:12px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;font-size:12px;color:#94a3b8;text-align:center">
            Reply directly to this email to respond to ${name}.
          </div>
        </div>
      `;

      const attachments: { filename: string; content: Buffer }[] = [];
      if (hasAttachment && fileData) {
        try {
          const base64 = fileData.replace(/^data:[^;]+;base64,/, "");
          attachments.push({ filename: fileName, content: Buffer.from(base64, "base64") });
        } catch {
          // ignore attachment errors — still send the email without it
        }
      }

      await resend.emails.send({
        from: getFromAddress(),
        to: ADMIN_EMAIL,
        replyTo: email.trim(),
        subject: `[Support] ${subject} — from ${name}`,
        html: emailBody,
        ...(attachments.length > 0 ? { attachments } : {}),
      });
    } else {
      console.warn("[support] RESEND_API_KEY not set — email not sent, ticket stored in DB only.");
    }

    res.json({ ok: true, message: "Message sent — we'll reply soon." });
  } catch (err) {
    console.error("[support] POST /support/contact error:", err);
    res.status(500).json({ error: "Failed to send message. Please try again." });
  }
});

export default router;
