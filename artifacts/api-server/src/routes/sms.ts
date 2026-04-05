import { Router, type Response } from "express";
import { db, usersTable, savedCalendarsTable, smsLogTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";

const router = Router();

// ── Critical task keywords that trigger SMS reminders ──────────────────────────
const CRITICAL_KEYWORDS = [
  "smoke detector", "smoke alarm", "carbon monoxide",
  "air filter", "hvac filter", "furnace filter", "ac filter",
  "drip faucet", "winterize", "insulate pipe", "freeze pipe",
  "winter prep", "fire alarm", "batteries", "battery",
  "gutter", "storm drain", "water shut",
];

export function isCriticalTask(taskName: string): boolean {
  const lower = taskName.toLowerCase();
  return CRITICAL_KEYWORDS.some((kw) => lower.includes(kw));
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

function isValidPhone(raw: string): boolean {
  const formatted = formatPhone(raw);
  return /^\+1[2-9]\d{9}$/.test(formatted);
}

async function sendTwilioSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.log("[sms] Twilio not configured — would send to", to, ":", body.slice(0, 60));
    return { ok: false, error: "Twilio not configured" };
  }

  try {
    const twilio = await import("twilio");
    const client = twilio.default(accountSid, authToken);
    await client.messages.create({ to, from, body });
    return { ok: true };
  } catch (err: any) {
    console.error("[sms] Twilio send error:", err.message ?? err);
    return { ok: false, error: err.message ?? "SMS send failed" };
  }
}

// ── GET /api/user/sms-settings ────────────────────────────────────────────────
router.get("/user/sms-settings", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const [user] = await db
    .select({ smsEnabled: usersTable.smsEnabled, smsPhone: usersTable.smsPhone })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);

  if (!user) { res.status(401).json({ error: "User not found." }); return; }
  res.json({ smsEnabled: user.smsEnabled, smsPhone: user.smsPhone ?? "" });
});

// ── PUT /api/user/sms-settings ────────────────────────────────────────────────
router.put("/user/sms-settings", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const { smsEnabled, smsPhone } = req.body as { smsEnabled?: boolean; smsPhone?: string };

  const phone = (smsPhone ?? "").trim();

  if (smsEnabled && phone && !isValidPhone(phone)) {
    res.status(400).json({ error: "Invalid US phone number. Use format: (555) 867-5309 or +15558675309" });
    return;
  }

  const formatted = phone ? formatPhone(phone) : null;

  await db
    .update(usersTable)
    .set({
      smsEnabled: smsEnabled ?? false,
      smsPhone: formatted,
    })
    .where(eq(usersTable.id, req.userId!));

  res.json({ ok: true, smsEnabled: smsEnabled ?? false, smsPhone: formatted });
});

// ── POST /api/sms/trigger-check ───────────────────────────────────────────────
// Called from dashboard on load. Checks if user needs a monthly reminder, sends if so.
router.post("/sms/trigger-check", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const [user] = await db
    .select({ smsEnabled: usersTable.smsEnabled, smsPhone: usersTable.smsPhone, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);

  if (!user || !user.smsEnabled || !user.smsPhone) {
    res.json({ skipped: true, reason: "SMS not enabled or no phone" });
    return;
  }

  const currentMonth = new Date().toLocaleString("default", { month: "long" });
  const now = new Date();

  // Rate limit: don't send if already sent in last 6 days
  const [recentLog] = await db
    .select({ sentAt: smsLogTable.sentAt })
    .from(smsLogTable)
    .where(eq(smsLogTable.userId, req.userId!))
    .orderBy(desc(smsLogTable.sentAt))
    .limit(1);

  if (recentLog) {
    const daysSince = (now.getTime() - new Date(recentLog.sentAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 6) {
      res.json({ skipped: true, reason: `Rate limited — last SMS ${daysSince.toFixed(1)} days ago` });
      return;
    }
  }

  // Only send in first 7 days of the month (monthly cadence)
  const dayOfMonth = now.getDate();
  if (dayOfMonth > 7) {
    res.json({ skipped: true, reason: "Past send window (day 1–7 of month)" });
    return;
  }

  // Check if already sent for this month
  const [monthLog] = await db
    .select({ id: smsLogTable.id })
    .from(smsLogTable)
    .where(and(eq(smsLogTable.userId, req.userId!), eq(smsLogTable.month, currentMonth)))
    .orderBy(desc(smsLogTable.sentAt))
    .limit(1);

  if (monthLog) {
    res.json({ skipped: true, reason: `Already sent for ${currentMonth}` });
    return;
  }

  // Get current month's critical tasks from saved calendar
  const [calendar] = await db
    .select({ calendarData: savedCalendarsTable.calendarData })
    .from(savedCalendarsTable)
    .where(eq(savedCalendarsTable.userId, req.userId!))
    .orderBy(desc(savedCalendarsTable.createdAt))
    .limit(1);

  if (!calendar?.calendarData) {
    res.json({ skipped: true, reason: "No saved calendar" });
    return;
  }

  const calData = calendar.calendarData as {
    calendar: { month: string; tasks: { task: string }[] }[];
  };
  const monthData = calData.calendar?.find((m) => m.month === currentMonth);
  if (!monthData?.tasks?.length) {
    res.json({ skipped: true, reason: "No tasks for current month" });
    return;
  }

  const criticalTasks = monthData.tasks.filter((t) => isCriticalTask(t.task));

  if (!criticalTasks.length) {
    res.json({ skipped: true, reason: "No critical tasks this month" });
    return;
  }

  const taskBullets = criticalTasks
    .slice(0, 3)
    .map((t) => `• ${t.task}`)
    .join("\n");

  const message = [
    `🏠 MaintainHome.ai — ${currentMonth} Reminders`,
    "",
    "Your critical home tasks this month:",
    taskBullets,
    "",
    "View your full plan at maintainhome.ai",
    "Msg & data rates may apply. Reply STOP to opt out.",
  ].join("\n");

  const result = await sendTwilioSms(user.smsPhone, message);

  await db.insert(smsLogTable).values({
    userId: req.userId!,
    phone: user.smsPhone,
    taskNames: criticalTasks.map((t) => t.task).join(", "),
    month: currentMonth,
    status: result.ok ? "sent" : "failed",
  });

  if (result.ok) {
    res.json({ sent: true, taskCount: criticalTasks.length, month: currentMonth });
  } else {
    res.json({ sent: false, reason: result.error });
  }
});

// ── POST /api/sms/test ────────────────────────────────────────────────────────
// Sends a test message to the user's saved phone number. No rate limiting.
router.post("/sms/test", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const [user] = await db
    .select({ smsPhone: usersTable.smsPhone, smsEnabled: usersTable.smsEnabled })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);

  if (!user) { res.status(401).json({ error: "User not found." }); return; }
  if (!user.smsPhone) {
    res.status(400).json({ error: "No phone number saved. Add a phone number and save your settings first." });
    return;
  }
  if (!isValidPhone(user.smsPhone)) {
    res.status(400).json({ error: "Saved phone number is not valid. Please update it and save again." });
    return;
  }

  const body = [
    "✅ Test message from MaintainHome.ai!",
    "",
    "Your SMS reminders are working. You'll receive monthly alerts for critical home maintenance tasks like smoke detector checks and air filter replacements.",
    "",
    "Reply STOP at any time to opt out. Msg & data rates may apply.",
  ].join("\n");

  const result = await sendTwilioSms(user.smsPhone, body);

  if (result.ok) {
    res.json({ ok: true, message: `Test SMS sent to ${user.smsPhone}` });
  } else {
    res.status(500).json({ ok: false, error: result.error ?? "Failed to send test SMS." });
  }
});

// ── GET /api/sms/log ──────────────────────────────────────────────────────────
router.get("/sms/log", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const logs = await db
    .select()
    .from(smsLogTable)
    .where(eq(smsLogTable.userId, req.userId!))
    .orderBy(desc(smsLogTable.sentAt))
    .limit(20);
  res.json(logs);
});

export default router;
