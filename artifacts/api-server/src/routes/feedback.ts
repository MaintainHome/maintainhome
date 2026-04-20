import { Router, type Response } from "express";
import { Resend } from "resend";
import { db, feedbackReportsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";
import { createRateLimiter } from "../middleware/rateLimit";

const router = Router();

const ADMIN_EMAIL = "consultingjohnwalker@gmail.com";
const VALID_CATEGORIES = ["bug", "suggestion", "other"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFromAddress() {
  return process.env.RESEND_FROM_EMAIL ?? "MaintainHome.ai <onboarding@resend.dev>";
}

const feedbackRateLimit = createRateLimiter({
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
  keyPrefix: "feedback",
  message: "You've submitted several reports recently. Please wait a few minutes before trying again.",
});

router.post("/feedback", requireAuth, feedbackRateLimit as any, async (req: AuthRequest, res: Response) => {
  try {
    const { category, description, pageUrl, fileData, fileName } = req.body as {
      category?: string;
      description?: string;
      pageUrl?: string;
      fileData?: string;
      fileName?: string;
    };

    if (!category || !VALID_CATEGORIES.includes(category as Category)) {
      res.status(400).json({ error: "Please choose a valid category." });
      return;
    }
    if (!description || !description.trim()) {
      res.status(400).json({ error: "Please describe what happened." });
      return;
    }
    if (description.trim().length > 5000) {
      res.status(400).json({ error: "Description must be under 5000 characters." });
      return;
    }

    const userId = req.userId ?? null;
    const userEmail = req.userEmail ?? "unknown";

    let userName: string | null = null;
    if (userId) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      userName = u?.name ?? null;
    }

    const hasAttachment = !!(fileData && fileName);

    await db.insert(feedbackReportsTable).values({
      userId,
      userEmail,
      userName,
      category: category as Category,
      description: description.trim(),
      pageUrl: pageUrl?.slice(0, 500) ?? null,
      hasScreenshot: hasAttachment,
      screenshotFileName: hasAttachment ? fileName ?? null : null,
    });

    const resend = getResend();
    if (resend) {
      const labels: Record<Category, string> = {
        bug: "🐛 Bug Report",
        suggestion: "💡 Suggestion",
        other: "💬 Feedback",
      };
      const now = new Date().toLocaleString("en-US", {
        timeZone: "America/New_York",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      const safeDescription = description
        .trim()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const emailBody = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e">
          <div style="background:#1f9e6e;padding:20px 24px;border-radius:10px 10px 0 0">
            <img src="https://maintainhome.ai/images/logo-icon.png" alt="MaintainHome.ai" style="width:36px;height:36px" />
            <h2 style="color:white;margin:8px 0 0;font-size:18px">${labels[category as Category]}</h2>
          </div>
          <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#64748b;width:90px">From:</td><td style="padding:6px 0;font-weight:600">${userName ? `${userName} ` : ""}&lt;${userEmail}&gt;</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Category:</td><td style="padding:6px 0;font-weight:600">${category}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">User ID:</td><td style="padding:6px 0">${userId ?? "—"}</td></tr>
              ${pageUrl ? `<tr><td style="padding:6px 0;color:#64748b">Page:</td><td style="padding:6px 0;font-family:monospace;font-size:12px">${pageUrl.replace(/</g, "&lt;")}</td></tr>` : ""}
              <tr><td style="padding:6px 0;color:#64748b">Received:</td><td style="padding:6px 0">${now} ET</td></tr>
            </table>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0" />
            <h3 style="margin:0 0 10px;font-size:14px;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Description</h3>
            <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;white-space:pre-wrap;font-size:14px;line-height:1.6;color:#334155">${safeDescription}</div>
            ${hasAttachment ? `<p style="margin:12px 0 0;font-size:13px;color:#64748b">📎 Screenshot attached: <strong>${fileName}</strong></p>` : ""}
          </div>
          <div style="background:#f1f5f9;padding:12px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;font-size:12px;color:#94a3b8;text-align:center">
            Reply directly to this email to respond to ${userName ?? userEmail}.
          </div>
        </div>
      `;

      const attachments: { filename: string; content: Buffer }[] = [];
      if (hasAttachment && fileData && fileName) {
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
        replyTo: userEmail,
        subject: `[${labels[category as Category]}] ${description.trim().slice(0, 60)}${description.length > 60 ? "…" : ""}`,
        html: emailBody,
        ...(attachments.length > 0 ? { attachments } : {}),
      });
    } else {
      console.warn("[feedback] RESEND_API_KEY not set — email not sent, report stored in DB only.");
    }

    res.json({ ok: true, message: "Thanks! Your feedback was received." });
  } catch (err) {
    console.error("[feedback] POST /feedback error:", err);
    res.status(500).json({ error: "Failed to submit feedback. Please try again." });
  }
});

export default router;
