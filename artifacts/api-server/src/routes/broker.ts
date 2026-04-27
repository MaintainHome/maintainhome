import { Router, type Response } from "express";
import { db, whiteLabelConfigsTable, usersTable, savedCalendarsTable, maintenanceLogTable, brokerPrecreationsTable, maintenanceDocumentsTable, homeProfilesTable, brokerServiceProvidersTable, teamMembersTable, magicLinkTokensTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";
import { getStripeClient } from "../stripeClient";
import { generateCalendarFromAnswers, type QuizAnswers } from "../lib/calendarGen";
import { ObjectStorageService } from "../lib/objectStorage";
import multer from "multer";
import crypto from "crypto";

const router = Router();
const objectStorage = new ObjectStorageService();

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function getBaseUrl(req: any): string {
  const proto = (req.headers["x-forwarded-proto"] as string) ?? req.protocol ?? "https";
  const host = (req.headers["x-forwarded-host"] as string) ?? req.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

// ─── Broker context helpers ────────────────────────────────────────────────────

async function getBrokerConfig(userEmail: string) {
  const [config] = await db
    .select()
    .from(whiteLabelConfigsTable)
    .where(
      and(
        eq(whiteLabelConfigsTable.contactEmail, userEmail),
        eq(whiteLabelConfigsTable.status, "approved"),
      ),
    )
    .limit(1);
  return config ?? null;
}

async function getTeamMembership(userId: number) {
  const [membership] = await db
    .select()
    .from(teamMembersTable)
    .where(
      and(
        eq(teamMembersTable.memberUserId, userId),
        eq(teamMembersTable.status, "active"),
      ),
    )
    .limit(1);
  return membership ?? null;
}

async function getTeamConfig(teamSubdomain: string) {
  const [config] = await db
    .select()
    .from(whiteLabelConfigsTable)
    .where(
      and(
        eq(whiteLabelConfigsTable.subdomain, teamSubdomain),
        eq(whiteLabelConfigsTable.status, "approved"),
      ),
    )
    .limit(1);
  return config ?? null;
}

// Returns broker context for both team leaders and team members.
// For team leaders: { config, isTeamLeader, isTeamMember: false }
// For team members: { config (team leader's), isTeamMember: true, isTeamLeader: false, membership }
async function getBrokerContext(userId: number, userEmail: string) {
  const config = await getBrokerConfig(userEmail);
  if (config) {
    return { config, isTeamLeader: config.type === "team_leader", isTeamMember: false, membership: null };
  }
  const membership = await getTeamMembership(userId);
  if (membership) {
    const teamConfig = await getTeamConfig(membership.teamSubdomain);
    if (teamConfig) {
      return { config: teamConfig, isTeamLeader: false, isTeamMember: true, membership };
    }
  }
  return null;
}

// ─── Big-ticket imminent forecast helpers ─────────────────────────────────────
const BIG_TICKET_ITEMS_BROKER = [
  { key: "roof",       name: "Roof",            avgLife: 25, costRange: "$12,000–$25,000" },
  { key: "hvac",       name: "HVAC System",      avgLife: 17, costRange: "$8,000–$15,000" },
  { key: "water",      name: "Water Heater",     avgLife: 12, costRange: "$1,200–$3,500" },
  { key: "windows",    name: "Windows",          avgLife: 25, costRange: "$8,000–$20,000" },
  { key: "paint",      name: "Exterior Paint",   avgLife: 8,  costRange: "$3,000–$8,000" },
  { key: "panel",      name: "Electrical Panel", avgLife: 30, costRange: "$2,500–$6,000" },
  { key: "garage",     name: "Garage Door",      avgLife: 15, costRange: "$1,000–$3,500" },
  { key: "appliances", name: "Major Appliances", avgLife: 12, costRange: "$1,000–$3,000 ea" },
];

function computeImminentForecasts(yearBuilt: number, currentYear: number, recentUpgrades: string[] = []): string[] {
  return BIG_TICKET_ITEMS_BROKER
    .map((item) => {
      let dueYear = yearBuilt + item.avgLife;
      if (recentUpgrades.includes(item.key)) {
        dueYear = Math.max(dueYear, currentYear + 7);
      }
      const yearsLeft = dueYear - currentYear;
      return { ...item, dueYear, yearsLeft };
    })
    .filter((item) => item.yearsLeft <= 1)
    .map((item) =>
      item.yearsLeft < 0
        ? `${item.name} — overdue (est. ${item.costRange})`
        : item.yearsLeft === 0
        ? `${item.name} — due this year (est. ${item.costRange})`
        : `${item.name} — due ~${item.dueYear} (est. ${item.costRange})`
    );
}

// ── GET /api/broker/me ─────────────────────────────────────────────────────────
router.get("/broker/me", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const ctx = await getBrokerContext(req.userId!, req.userEmail!);
    if (!ctx) {
      res.status(404).json({ error: "No approved broker account found for this email." });
      return;
    }

    // For team leaders: also return team members list
    let teamMembers: any[] = [];
    if (ctx.isTeamLeader) {
      teamMembers = await db
        .select()
        .from(teamMembersTable)
        .where(eq(teamMembersTable.teamSubdomain, ctx.config.subdomain))
        .orderBy(teamMembersTable.invitedAt);
    }

    res.json({
      config: ctx.config,
      isTeamLeader: ctx.isTeamLeader,
      isTeamMember: ctx.isTeamMember,
      membership: ctx.membership,
      teamMembers,
    });
  } catch (err) {
    console.error("[broker] GET /broker/me error:", err);
    res.status(500).json({ error: "Failed to load broker profile" });
  }
});

// ── GET /api/broker/clients ───────────────────────────────────────────────────
router.get("/broker/clients", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const ctx = await getBrokerContext(req.userId!, req.userEmail!);
    if (!ctx) {
      res.status(403).json({ error: "Not authorized as broker" });
      return;
    }

    // Team members see only their assigned clients
    // Team leaders see ALL clients under their subdomain
    let rawClients;
    if (ctx.isTeamMember) {
      rawClients = await db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          name: usersTable.name,
          subscriptionStatus: usersTable.subscriptionStatus,
          createdAt: usersTable.createdAt,
          lastActiveAt: usersTable.updatedAt,
          brokerPreCreated: usersTable.brokerPreCreated,
          assignedMemberId: usersTable.assignedMemberId,
        })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.referralSubdomain, ctx.config.subdomain),
            eq(usersTable.assignedMemberId, req.userId!),
          ),
        );
    } else {
      rawClients = await db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          name: usersTable.name,
          subscriptionStatus: usersTable.subscriptionStatus,
          createdAt: usersTable.createdAt,
          lastActiveAt: usersTable.updatedAt,
          brokerPreCreated: usersTable.brokerPreCreated,
          assignedMemberId: usersTable.assignedMemberId,
        })
        .from(usersTable)
        .where(eq(usersTable.referralSubdomain, ctx.config.subdomain));
    }

    if (rawClients.length === 0) {
      res.json({ clients: [], subdomain: ctx.config.subdomain });
      return;
    }

    const userIds = rawClients.map((c) => c.id);

    const [calendarRows, logRows, precreationRows, homeProfileRows] = await Promise.all([
      db
        .select({ userId: savedCalendarsTable.userId, calendarData: savedCalendarsTable.calendarData, quizAnswers: savedCalendarsTable.quizAnswers })
        .from(savedCalendarsTable)
        .where(inArray(savedCalendarsTable.userId, userIds)),
      db
        .select({ userId: maintenanceLogTable.userId, count: sql<number>`cast(count(*) as int)` })
        .from(maintenanceLogTable)
        .where(inArray(maintenanceLogTable.userId, userIds))
        .groupBy(maintenanceLogTable.userId),
      db
        .select({ clientUserId: brokerPrecreationsTable.clientUserId, activatedAt: brokerPrecreationsTable.activatedAt, activationToken: brokerPrecreationsTable.activationToken, brokerUserId: brokerPrecreationsTable.brokerUserId, closingDate: brokerPrecreationsTable.closingDate, clientBirthday1: brokerPrecreationsTable.clientBirthday1, clientBirthday2: brokerPrecreationsTable.clientBirthday2 })
        .from(brokerPrecreationsTable)
        .where(inArray(brokerPrecreationsTable.clientUserId as any, userIds)),
      db
        .select({ userId: homeProfilesTable.userId, yearBuilt: homeProfilesTable.yearBuilt })
        .from(homeProfilesTable)
        .where(inArray(homeProfilesTable.userId, userIds)),
    ]);

    const calendarMap = new Map(calendarRows.map((r) => [r.userId, { calendarData: r.calendarData, quizAnswers: r.quizAnswers }]));
    const logCountMap = new Map(logRows.map((r) => [r.userId, r.count]));
    const precreationMap = new Map(
      precreationRows
        .filter((r) => r.clientUserId != null)
        .map((r) => [r.clientUserId!, r]),
    );
    const homeProfileMap = new Map(homeProfileRows.map((r) => [r.userId, r.yearBuilt]));
    const currentYear = new Date().getFullYear();

    const clients = rawClients.map((c) => {
      const calEntry = calendarMap.get(c.id);
      const calData = calEntry?.calendarData as Record<string, unknown> | undefined;
      const quizAnswers = calEntry?.quizAnswers as Record<string, unknown> | undefined;
      const hasCalendar = !!calData;
      const logCount = logCountMap.get(c.id) ?? 0;
      const activityScore = Math.min((hasCalendar ? 60 : 0) + Math.min(logCount * 8, 40), 100);

      const precreation = precreationMap.get(c.id);
      const isPrecreated = c.brokerPreCreated;
      const isActivated = !!precreation?.activatedAt;
      const activationToken = isPrecreated && !isActivated ? precreation?.activationToken ?? null : null;
      const closingDate = precreation?.closingDate ?? null;
      const clientBirthday1 = precreation?.clientBirthday1 ?? null;
      const clientBirthday2 = precreation?.clientBirthday2 ?? null;

      const yearBuilt = homeProfileMap.get(c.id);
      const recentUpgradesRaw: string = (quizAnswers?.recentUpgrades as string) ?? "";
      const recentUpgradesArr = recentUpgradesRaw ? recentUpgradesRaw.split(",").filter(Boolean) : [];
      const imminentAlerts: string[] = yearBuilt ? computeImminentForecasts(yearBuilt, currentYear, recentUpgradesArr) : [];
      const imminentAlertCount = imminentAlerts.length;

      let warrantyExpiresAt: string | null = null;
      if (ctx.config.accountType === "builder" && ctx.config.warrantyPeriodMonths) {
        const d = new Date(c.createdAt);
        d.setMonth(d.getMonth() + ctx.config.warrantyPeriodMonths);
        warrantyExpiresAt = d.toISOString();
      }

      // Warranty milestone badges for builder accounts
      // Milestones: 30-day, 6-month, 11-month walkthroughs
      // Show badge when the milestone falls in the current or next month
      const WARRANTY_MILESTONES = [
        { label: "30-Day Walkthrough", months: 1 },
        { label: "6-Month Walkthrough", months: 6 },
        { label: "11-Month Walkthrough", months: 11 },
      ];

      type CalendarTask = { task: string; difficulty?: string; cost?: string; why?: string; tip?: string };
      type WarrantyMilestone = {
        label: string;
        date: string;
        monthsFromStart: number;
        calendarMonthName: string;
        monthTasks: CalendarTask[];
      };
      let warrantyMilestones: WarrantyMilestone[] = [];

      if (ctx.config.accountType === "builder") {
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth();
        const nextRef = new Date(curYear, curMonth + 1, 1);
        const nextYear = nextRef.getFullYear();
        const nextMonth = nextRef.getMonth();

        // Prefer closingDate as the warranty start, fall back to account createdAt
        const startDate = closingDate
          ? new Date(closingDate + "T00:00:00")
          : new Date(c.createdAt);

        // Extract calendar months array from saved calendar data (if available)
        const calMonths = (calData?.calendar as Array<{ month: string; tasks: CalendarTask[] }> | undefined) ?? [];

        for (const m of WARRANTY_MILESTONES) {
          const mDate = new Date(startDate);
          mDate.setMonth(mDate.getMonth() + m.months);
          const mYear = mDate.getFullYear();
          const mMonthIdx = mDate.getMonth();
          if (
            (mYear === curYear && mMonthIdx === curMonth) ||
            (mYear === nextYear && mMonthIdx === nextMonth)
          ) {
            // Month name as it appears in the AI-generated calendar (e.g. "April")
            const calendarMonthName = mDate.toLocaleDateString("en-US", { month: "long" });
            // Pull the matching month's tasks from the saved calendar
            const monthEntry = calMonths.find(
              (entry) => entry.month.toLowerCase() === calendarMonthName.toLowerCase(),
            );
            warrantyMilestones.push({
              label: m.label,
              date: mDate.toISOString(),
              monthsFromStart: m.months,
              calendarMonthName,
              monthTasks: monthEntry?.tasks ?? [],
            });
          }
        }
      }

      return {
        ...c,
        hasCalendar,
        logCount,
        activityScore,
        imminentAlertCount,
        imminentAlerts,
        isPrecreated,
        isActivated,
        activationToken,
        closingDate,
        clientBirthday1,
        clientBirthday2,
        warrantyExpiresAt,
        warrantyMilestones,
      };
    });

    res.json({ clients, subdomain: ctx.config.subdomain });
  } catch (err) {
    console.error("[broker] GET /broker/clients error:", err);
    res.status(500).json({ error: "Failed to load client list" });
  }
});

// ── PATCH /api/broker/branding ─────────────────────────────────────────────────
// Only team leaders and individual agents can change team branding.
// Team members CANNOT change the main team logo.
router.patch("/broker/branding", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const config = await getBrokerConfig(req.userEmail!);
    if (!config) {
      res.status(403).json({ error: "Not authorized to change team branding" });
      return;
    }

    const {
      logoUrl, agentPhotoUrl, phoneNumber, tagline, welcomeMessage,
      warrantyRepName, warrantyRepPhone, warrantyRepEmail,
    } = req.body as Record<string, string | undefined>;
    const updates: Record<string, string | null> = {};
    if (logoUrl !== undefined)          updates.logoUrl          = logoUrl?.trim()        || null;
    if (agentPhotoUrl !== undefined)    updates.agentPhotoUrl    = agentPhotoUrl?.trim()  || null;
    if (phoneNumber !== undefined)      updates.phoneNumber      = phoneNumber?.trim()    || null;
    if (tagline !== undefined)          updates.tagline          = tagline?.trim()        || null;
    if (welcomeMessage !== undefined)   updates.welcomeMessage   = welcomeMessage?.trim() || null;
    // Warranty rep fields are only meaningful for builder accounts, but we still
    // accept the writes — non-builder rows simply won't be read on the dashboard.
    if (warrantyRepName !== undefined)  updates.warrantyRepName  = warrantyRepName?.trim()  || null;
    if (warrantyRepPhone !== undefined) updates.warrantyRepPhone = warrantyRepPhone?.trim() || null;
    if (warrantyRepEmail !== undefined) updates.warrantyRepEmail = warrantyRepEmail?.trim().toLowerCase() || null;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    await db.update(whiteLabelConfigsTable).set(updates).where(eq(whiteLabelConfigsTable.id, config.id));
    res.json({ message: "Branding updated successfully. Changes are live." });
  } catch (err) {
    console.error("[broker] PATCH /broker/branding error:", err);
    res.status(500).json({ error: "Failed to update branding" });
  }
});

// ── PATCH /api/broker/member/profile ──────────────────────────────────────────
// Team members update their personal headshot/contact info (not the team logo).
router.patch("/broker/member/profile", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const membership = await getTeamMembership(req.userId!);
    if (!membership) {
      res.status(403).json({ error: "Not a team member" });
      return;
    }

    const { displayName, phone, headshotUrl } = req.body as Record<string, string | undefined>;
    const updates: Record<string, string | null> = {};
    if (displayName !== undefined) updates.displayName = displayName?.trim() || null;
    if (phone !== undefined)       updates.phone        = phone?.trim()       || null;
    if (headshotUrl !== undefined) updates.headshotUrl  = headshotUrl?.trim() || null;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [updated] = await db
      .update(teamMembersTable)
      .set(updates as any)
      .where(eq(teamMembersTable.id, membership.id))
      .returning();

    res.json({ ok: true, membership: updated });
  } catch (err) {
    console.error("[broker] PATCH /broker/member/profile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────
function slugifyHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30) || "agent";
}

async function uniqueAgentHandle(teamSubdomain: string, base: string): Promise<string> {
  const existing = await db
    .select({ agentHandle: teamMembersTable.agentHandle })
    .from(teamMembersTable)
    .where(eq(teamMembersTable.teamSubdomain, teamSubdomain));
  const taken = new Set(existing.map((r) => r.agentHandle).filter(Boolean));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

// ── POST /api/broker/team/invite ──────────────────────────────────────────────
// Team leader creates a team member invite link.
router.post("/broker/team/invite", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const config = await getBrokerConfig(req.userEmail!);
    if (!config || config.type !== "team_leader") {
      res.status(403).json({ error: "Only team leaders can invite team members" });
      return;
    }

    const { displayName, email } = req.body as { displayName?: string; email?: string };
    if (!displayName?.trim()) {
      res.status(400).json({ error: "Display name is required" });
      return;
    }
    if (!email?.trim() || !email.includes("@")) {
      res.status(400).json({ error: "Valid email is required" });
      return;
    }

    const inviteToken = crypto.randomBytes(32).toString("hex");

    // Generate a unique agent handle from the display name
    const baseHandle = slugifyHandle(displayName.trim().split(/\s+/)[0]);
    const agentHandle = await uniqueAgentHandle(config.subdomain, baseHandle);

    const [invite] = await db.insert(teamMembersTable).values({
      teamSubdomain: config.subdomain,
      displayName: displayName.trim(),
      email: email.trim().toLowerCase(),
      inviteToken,
      agentHandle,
      status: "invited",
    }).returning();

    const base = getBaseUrl(req);
    const inviteLink = `${base}/team-join?token=${inviteToken}`;
    const clientInviteLink = `${base}/${config.subdomain}/${agentHandle}`;

    res.json({ ok: true, invite, inviteLink, clientInviteLink });
  } catch (err) {
    console.error("[broker] POST /broker/team/invite error:", err);
    res.status(500).json({ error: "Failed to create invite" });
  }
});

// ── GET /api/broker/team/members ──────────────────────────────────────────────
// Team leader lists their team members.
router.get("/broker/team/members", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const config = await getBrokerConfig(req.userEmail!);
    if (!config || config.type !== "team_leader") {
      res.status(403).json({ error: "Only team leaders can view team members" });
      return;
    }

    const members = await db
      .select()
      .from(teamMembersTable)
      .where(eq(teamMembersTable.teamSubdomain, config.subdomain))
      .orderBy(teamMembersTable.invitedAt);

    res.json({ members });
  } catch (err) {
    console.error("[broker] GET /broker/team/members error:", err);
    res.status(500).json({ error: "Failed to load team members" });
  }
});

// ── DELETE /api/broker/team/members/:id ───────────────────────────────────────
router.delete("/broker/team/members/:id", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const config = await getBrokerConfig(req.userEmail!);
    if (!config || config.type !== "team_leader") {
      res.status(403).json({ error: "Only team leaders can remove team members" });
      return;
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    await db.delete(teamMembersTable).where(
      and(
        eq(teamMembersTable.id, id),
        eq(teamMembersTable.teamSubdomain, config.subdomain),
      ),
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("[broker] DELETE /broker/team/members/:id error:", err);
    res.status(500).json({ error: "Failed to remove team member" });
  }
});

// ── GET /api/broker/team/member-by-handle ─────────────────────────────────────
// Public endpoint: look up a team member by subdomain + agentHandle.
// Used by the invite landing page at /:teamHandle/:agentHandle
router.get("/broker/team/member-by-handle", async (req: any, res: Response) => {
  try {
    const { subdomain, agentHandle } = req.query as { subdomain?: string; agentHandle?: string };
    if (!subdomain || !agentHandle) {
      res.status(400).json({ error: "subdomain and agentHandle are required" });
      return;
    }

    const [member] = await db
      .select({
        id: teamMembersTable.id,
        memberUserId: teamMembersTable.memberUserId,
        displayName: teamMembersTable.displayName,
        headshotUrl: teamMembersTable.headshotUrl,
        phone: teamMembersTable.phone,
        agentHandle: teamMembersTable.agentHandle,
        status: teamMembersTable.status,
      })
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.teamSubdomain, subdomain.toLowerCase().trim()),
          eq(teamMembersTable.agentHandle, agentHandle.toLowerCase().trim()),
        ),
      )
      .limit(1);

    if (!member) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    res.json({ member });
  } catch (err) {
    console.error("[broker] GET /broker/team/member-by-handle error:", err);
    res.status(500).json({ error: "Failed to look up agent" });
  }
});

// ── GET /api/broker/team/invite-info ──────────────────────────────────────────
// Public endpoint: returns team info for a given invite token (for the team-join page).
router.get("/broker/team/invite-info", async (req: any, res: Response) => {
  try {
    const { token } = req.query as { token?: string };
    if (!token) {
      res.status(400).json({ error: "Token required" });
      return;
    }

    const [invite] = await db
      .select()
      .from(teamMembersTable)
      .where(eq(teamMembersTable.inviteToken, token))
      .limit(1);

    if (!invite) {
      res.status(404).json({ error: "Invalid or expired invite link" });
      return;
    }

    if (invite.status === "active") {
      res.status(400).json({ error: "This invite has already been used" });
      return;
    }

    const teamConfig = await getTeamConfig(invite.teamSubdomain);
    if (!teamConfig) {
      res.status(404).json({ error: "Team not found" });
      return;
    }

    res.json({
      invite: {
        id: invite.id,
        displayName: invite.displayName,
        email: invite.email,
        teamSubdomain: invite.teamSubdomain,
        status: invite.status,
      },
      team: {
        brokerName: teamConfig.brokerName,
        logoUrl: teamConfig.logoUrl,
        tagline: teamConfig.tagline,
        subdomain: teamConfig.subdomain,
      },
    });
  } catch (err) {
    console.error("[broker] GET /broker/team/invite-info error:", err);
    res.status(500).json({ error: "Failed to load invite info" });
  }
});

// ── POST /api/broker/team/join ─────────────────────────────────────────────────
// New agent activates their team membership. Sends magic link email.
router.post("/broker/team/join", async (req: any, res: Response) => {
  try {
    const { token, displayName, phone, headshotUrl } = req.body as {
      token?: string;
      displayName?: string;
      phone?: string;
      headshotUrl?: string;
    };

    if (!token) {
      res.status(400).json({ error: "Token required" });
      return;
    }

    const [invite] = await db
      .select()
      .from(teamMembersTable)
      .where(eq(teamMembersTable.inviteToken, token))
      .limit(1);

    if (!invite) {
      res.status(404).json({ error: "Invalid invite token" });
      return;
    }

    if (invite.status === "active") {
      res.status(400).json({ error: "This invite has already been activated" });
      return;
    }

    // Update invite with provided info
    const updateData: Record<string, any> = {};
    if (displayName?.trim()) updateData.displayName = displayName.trim();
    if (phone?.trim())       updateData.phone        = phone.trim();
    if (headshotUrl?.trim()) updateData.headshotUrl  = headshotUrl.trim();

    if (Object.keys(updateData).length > 0) {
      await db.update(teamMembersTable).set(updateData).where(eq(teamMembersTable.id, invite.id));
    }

    // Issue a magic link for the invite email, carrying the team join token
    const { Resend } = await import("resend");
    const resendKey = process.env.RESEND_API_KEY;
    const fromAddr = process.env.RESEND_FROM_EMAIL ?? "MaintainHome.ai <onboarding@resend.dev>";

    const proto = (req.headers["x-forwarded-proto"] as string) ?? req.protocol ?? "https";
    const host = (req.headers["x-forwarded-host"] as string) ?? req.get("host") ?? "localhost";
    const baseUrl = `${proto}://${host}`;

    const magicToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.insert(magicLinkTokensTable).values({
      email: invite.email,
      token: magicToken,
      expiresAt,
      pendingTeamJoinToken: invite.inviteToken,
    });

    const magicLink = `${baseUrl}/api/auth/verify?token=${magicToken}&stay=1&redirect=broker-dashboard`;

    console.log(`[broker] Team join magic link for ${invite.email}: ${magicLink}`);

    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: fromAddr,
        to: invite.email,
        subject: "You've been invited to join a team on MaintainHome.ai",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <img src="https://maintainhome.ai/images/logo-icon.png" alt="MaintainHome.ai" style="width:48px;height:48px;margin-bottom:16px" />
            <h2 style="color:#1a1a2e;margin-bottom:8px">Welcome to the Team!</h2>
            <p style="color:#555">Hi ${invite.displayName}, you've been invited to join the team on MaintainHome.ai. Click the button below to activate your account. This link expires in 15 minutes.</p>
            <a href="${magicLink}" style="display:inline-block;padding:14px 28px;background:#1f9e6e;color:white;text-decoration:none;border-radius:10px;font-weight:bold;font-size:16px;margin:20px 0">
              Activate My Account
            </a>
            <p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      }).catch((e: any) => console.error("[broker] team join email failed:", e));
    }

    const isDev = process.env.NODE_ENV !== "production";
    res.json({
      ok: true,
      message: "Activation link sent! Check your email.",
      ...(isDev ? { debugLink: magicLink } : {}),
    });
  } catch (err) {
    console.error("[broker] POST /broker/team/join error:", err);
    res.status(500).json({ error: "Failed to process team join" });
  }
});

// ── PATCH /api/broker/clients/:clientId/assign ────────────────────────────────
// Team leader assigns or re-assigns a client to a team member.
router.patch("/broker/clients/:clientId/assign", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const config = await getBrokerConfig(req.userEmail!);
    if (!config || config.type !== "team_leader") {
      res.status(403).json({ error: "Only team leaders can assign clients" });
      return;
    }

    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) { res.status(400).json({ error: "Invalid client id" }); return; }

    const { memberId } = req.body as { memberId?: number | null };

    // Verify the client belongs to this team
    const [client] = await db.select({ id: usersTable.id, referralSubdomain: usersTable.referralSubdomain })
      .from(usersTable)
      .where(eq(usersTable.id, clientId))
      .limit(1);

    if (!client || client.referralSubdomain !== config.subdomain) {
      res.status(404).json({ error: "Client not found in your team" });
      return;
    }

    if (memberId !== null && memberId !== undefined) {
      // Verify the member belongs to this team
      const [member] = await db.select({ id: teamMembersTable.id })
        .from(teamMembersTable)
        .where(
          and(
            eq(teamMembersTable.memberUserId, memberId),
            eq(teamMembersTable.teamSubdomain, config.subdomain),
            eq(teamMembersTable.status, "active"),
          ),
        )
        .limit(1);

      if (!member) {
        res.status(404).json({ error: "Team member not found" });
        return;
      }
    }

    await db.update(usersTable)
      .set({ assignedMemberId: memberId ?? null })
      .where(eq(usersTable.id, clientId));

    res.json({ ok: true });
  } catch (err) {
    console.error("[broker] PATCH /broker/clients/:clientId/assign error:", err);
    res.status(500).json({ error: "Failed to assign client" });
  }
});

// ── POST /api/broker/precreate-doc-upload ─────────────────────────────────────
router.post(
  "/broker/precreate-doc-upload",
  requireAuth as any,
  docUpload.single("document"),
  async (req: AuthRequest, res: Response) => {
    try {
      const ctx = await getBrokerContext(req.userId!, req.userEmail!);
      if (!ctx) {
        res.status(403).json({ error: "Not authorized as broker" });
        return;
      }
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }
      const objectPath = await objectStorage.uploadFile(file.buffer, file.mimetype, "broker-client-docs");
      res.json({
        objectPath,
        fileName: file.originalname,
        contentType: file.mimetype,
        fileSizeBytes: file.size,
        displayName: file.originalname.replace(/\.[^.]+$/, ""),
      });
    } catch (err) {
      console.error("[broker] precreate-doc-upload error:", err);
      res.status(500).json({ error: "Document upload failed" });
    }
  },
);

// ── POST /api/broker/precreate-checkout ──────────────────────────────────────
router.post("/broker/precreate-checkout", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const ctx = await getBrokerContext(req.userId!, req.userEmail!);
    if (!ctx) {
      res.status(403).json({ error: "Not authorized as broker" });
      return;
    }

    const {
      clientEmail, clientName,
      propertyData, quizAnswers,
      documentPaths,
      duration = "1year",
      newConstructionData,
      closingDate,
      clientBirthday1,
      clientBirthday2,
    } = req.body as {
      clientEmail?: string;
      clientName?: string;
      propertyData?: Record<string, unknown>;
      quizAnswers?: QuizAnswers;
      documentPaths?: Array<{ objectPath: string; fileName: string; contentType: string; fileSizeBytes?: number; displayName?: string }>;
      duration?: "1year" | "3years";
      newConstructionData?: Record<string, unknown> | null;
      closingDate?: string | null;
      clientBirthday1?: string | null;
      clientBirthday2?: string | null;
    };

    if (!clientEmail?.trim()) {
      res.status(400).json({ error: "Client email is required" });
      return;
    }
    if (!quizAnswers?.zip) {
      res.status(400).json({ error: "Property ZIP code is required" });
      return;
    }

    const [brokerUser] = await db.select({ id: usersTable.id, email: usersTable.email, stripeCustomerId: usersTable.stripeCustomerId })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!brokerUser) { res.status(401).json({ error: "User not found" }); return; }

    const is3Year = duration === "3years";
    const priceCents = is3Year ? 11900 : 4500;
    const proMonths = is3Year ? 37 : 13;

    // For team members: store their userId so the client gets assigned to them after payment
    const assignedMemberId = ctx.isTeamMember ? req.userId! : null;

    const [pending] = await db.insert(brokerPrecreationsTable).values({
      brokerUserId: req.userId!,
      clientEmail: clientEmail.trim().toLowerCase(),
      clientName: clientName?.trim() || null,
      propertyData: propertyData ?? null,
      quizAnswers: quizAnswers ?? null,
      documentPaths: documentPaths ?? null,
      newConstructionData: newConstructionData ?? null,
      closingDate: closingDate?.trim() || null,
      clientBirthday1: clientBirthday1?.trim() || null,
      clientBirthday2: clientBirthday2?.trim() || null,
      status: "pending_payment",
      priceCents,
    }).returning();

    const stripe = getStripeClient();
    const base = getBaseUrl(req);

    let customerId = brokerUser.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: brokerUser.email,
        metadata: { userId: String(brokerUser.id) },
      });
      customerId = customer.id;
      await db.update(usersTable).set({ stripeCustomerId: customerId }).where(eq(usersTable.id, brokerUser.id));
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: priceCents,
          product_data: {
            name: is3Year
              ? "MaintainHome 3-Year Client Account"
              : "MaintainHome Pre-Created Client Account",
            description: is3Year
              ? `37 months Pro access for ${clientEmail.trim()} — pre-configured by broker`
              : `13 months Pro access for ${clientEmail.trim()} — pre-configured by broker`,
          },
        },
        quantity: 1,
      }],
      mode: "payment",
      metadata: {
        userId: String(brokerUser.id),
        email: brokerUser.email,
        type: "broker_precreate",
        precreationId: String(pending.id),
        brokerSubdomain: ctx.config.subdomain,
        duration,
        proMonths: String(proMonths),
        ...(assignedMemberId ? { assignedMemberId: String(assignedMemberId) } : {}),
      },
      success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/broker-dashboard`,
    });

    await db.update(brokerPrecreationsTable)
      .set({ stripeSessionId: session.id })
      .where(eq(brokerPrecreationsTable.id, pending.id));

    res.json({ url: session.url });
  } catch (err) {
    console.error("[broker] precreate-checkout error:", err);
    res.status(500).json({ error: "Failed to start checkout" });
  }
});

// ── POST /api/broker/client-renew-checkout ────────────────────────────────────
router.post("/broker/client-renew-checkout", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const ctx = await getBrokerContext(req.userId!, req.userEmail!);
    if (!ctx) { res.status(403).json({ error: "Not authorized as broker" }); return; }

    const { clientUserId, clientEmail } = req.body as { clientUserId?: number; clientEmail?: string };
    if (!clientUserId && !clientEmail) {
      res.status(400).json({ error: "clientUserId or clientEmail required" });
      return;
    }

    const [brokerUser] = await db.select({ id: usersTable.id, email: usersTable.email, stripeCustomerId: usersTable.stripeCustomerId })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!brokerUser) { res.status(401).json({ error: "User not found" }); return; }

    const stripe = getStripeClient();
    const base = getBaseUrl(req);

    let customerId = brokerUser.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: brokerUser.email, metadata: { userId: String(brokerUser.id) } });
      customerId = customer.id;
      await db.update(usersTable).set({ stripeCustomerId: customerId }).where(eq(usersTable.id, brokerUser.id));
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: 4500,
          product_data: {
            name: "MaintainHome Client Pro Renewal",
            description: `1-year Pro renewal for ${clientEmail ?? `client #${clientUserId}`}`,
          },
        },
        quantity: 1,
      }],
      mode: "payment",
      metadata: {
        userId: String(brokerUser.id),
        email: brokerUser.email,
        type: "broker_client_renew",
        clientUserId: String(clientUserId ?? ""),
        clientEmail: clientEmail ?? "",
        brokerSubdomain: ctx.config.subdomain,
      },
      success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/broker-dashboard`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("[broker] client-renew-checkout error:", err);
    res.status(500).json({ error: "Failed to start renewal checkout" });
  }
});

// ── GET /api/broker/precreations ─────────────────────────────────────────────
router.get("/broker/precreations", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const ctx = await getBrokerContext(req.userId!, req.userEmail!);
    if (!ctx) {
      res.status(403).json({ error: "Not authorized as broker" });
      return;
    }

    const records = await db
      .select()
      .from(brokerPrecreationsTable)
      .where(eq(brokerPrecreationsTable.brokerUserId, req.userId!));

    res.json(records);
  } catch (err) {
    console.error("[broker] GET /broker/precreations error:", err);
    res.status(500).json({ error: "Failed to load precreations" });
  }
});

// ── Builder warranty milestone injection ──────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function injectBuilderWarrantyMilestones(
  calendarData: Record<string, unknown>,
  warrantyPeriodMonths: number,
  closingDate?: string | null,
): Record<string, unknown> {
  const calendar = calendarData.calendar as Array<{ month: string; tasks: unknown[] }> | undefined;
  if (!Array.isArray(calendar) || calendar.length === 0) return calendarData;

  const cappedWarrantyMonths = Math.max(warrantyPeriodMonths ?? 12, 1);

  let baseMonthIdx = 0;
  if (closingDate) {
    const d = new Date(closingDate);
    if (!isNaN(d.getTime())) {
      baseMonthIdx = d.getUTCMonth();
    }
  }

  const lastMilestoneOffset = Math.min(cappedWarrantyMonths - 1, 11);
  const lastMilestoneLabel = lastMilestoneOffset === 11
    ? "11-month warranty expiration review"
    : `${lastMilestoneOffset}-month warranty expiration review`;

  const milestones = [
    {
      offsetMonths: 1,
      task: "30-day builder warranty walkthrough",
      why: "Catch defects while builder warranty is still active",
      tip: "Document all issues with photos before the walkthrough",
    },
    {
      offsetMonths: 6,
      task: "6-month check-in",
      why: "Inspect for settling cracks and leaks at mid-warranty",
      tip: "Check door alignment, grout, and caulking for gaps",
    },
    {
      offsetMonths: lastMilestoneOffset,
      task: lastMilestoneLabel,
      why: "Final chance to file warranty claims before expiration",
      tip: "Hire an independent inspector to uncover hidden issues",
    },
  ];

  const updatedCalendar = calendar.map((entry) => ({ ...entry, tasks: [...entry.tasks] }));

  for (const milestone of milestones) {
    const targetMonthIdx = (baseMonthIdx + milestone.offsetMonths) % 12;
    const targetMonthName = MONTH_NAMES[targetMonthIdx];
    const calEntry = updatedCalendar.find((m) => m.month === targetMonthName);
    if (calEntry) {
      calEntry.tasks.unshift({
        task: milestone.task,
        difficulty: "Pro",
        cost: "$0",
        why: milestone.why,
        tip: milestone.tip,
        isWarrantyMilestone: true,
      });
    }
  }

  return { ...calendarData, calendar: updatedCalendar };
}

// ── Internal: process broker precreation after payment ────────────────────────
export async function processBrokerPrecreation(
  precreationId: number,
  brokerSubdomain: string,
  baseUrl: string,
  proMonths: number = 13,
  assignedMemberId?: number | null,
): Promise<{ ok: boolean; activationLink: string; clientEmail: string; clientName: string | null }> {
  const [precreation] = await db
    .select()
    .from(brokerPrecreationsTable)
    .where(eq(brokerPrecreationsTable.id, precreationId))
    .limit(1);

  if (!precreation) throw new Error(`Precreation ${precreationId} not found`);

  if (precreation.status === "active" && precreation.activationToken) {
    return {
      ok: true,
      activationLink: `${baseUrl}/activate?token=${precreation.activationToken}`,
      clientEmail: precreation.clientEmail,
      clientName: precreation.clientName,
    };
  }

  await db.update(brokerPrecreationsTable)
    .set({ status: "processing" })
    .where(eq(brokerPrecreationsTable.id, precreationId));

  const clientEmail = precreation.clientEmail;
  const clientName = precreation.clientName;
  const proExpiresAt = new Date();
  proExpiresAt.setMonth(proExpiresAt.getMonth() + proMonths);

  let clientUserId: number;

  const [existingUser] = await db.select({ id: usersTable.id })
    .from(usersTable).where(eq(usersTable.email, clientEmail)).limit(1);

  if (existingUser) {
    clientUserId = existingUser.id;
    await db.update(usersTable).set({
      subscriptionStatus: "pro_annual",
      fullAccess: true,
      proExpiresAt,
      referralSubdomain: brokerSubdomain,
      brokerPreCreated: true,
      name: clientName || undefined,
      assignedMemberId: assignedMemberId ?? null,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, clientUserId));
  } else {
    const [newUser] = await db.insert(usersTable).values({
      email: clientEmail,
      name: clientName || null,
      subscriptionStatus: "pro_annual",
      fullAccess: true,
      proExpiresAt,
      referralSubdomain: brokerSubdomain,
      brokerPreCreated: true,
      assignedMemberId: assignedMemberId ?? null,
    }).returning({ id: usersTable.id });
    clientUserId = newUser.id;
  }

  const quizAnswers = precreation.quizAnswers as QuizAnswers | null;
  let calendarData: Record<string, unknown> | null = null;

  if (quizAnswers?.zip) {
    try {
      const propData = precreation.propertyData as Record<string, unknown> | null;
      calendarData = await generateCalendarFromAnswers(quizAnswers, {
        yearBuilt: (propData?.yearBuilt as number) || quizAnswers.yearBuilt,
        bedrooms: propData?.bedrooms as number | undefined,
        bathrooms: propData?.bathrooms as string | undefined,
        finishedBasement: propData?.finishedBasement as string | undefined,
        poolOrHotTub: propData?.poolOrHotTub as string | undefined,
        lastRenovationYear: propData?.lastRenovationYear as number | undefined,
      });

      // For builder accounts, inject warranty milestone tasks into the calendar
      const brokerConfig = await db
        .select({ accountType: whiteLabelConfigsTable.accountType, warrantyPeriodMonths: whiteLabelConfigsTable.warrantyPeriodMonths })
        .from(whiteLabelConfigsTable)
        .where(eq(whiteLabelConfigsTable.subdomain, brokerSubdomain))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (brokerConfig?.accountType === "builder") {
        calendarData = injectBuilderWarrantyMilestones(
          calendarData,
          brokerConfig.warrantyPeriodMonths ?? 12,
          precreation.closingDate,
        );
        console.log(`[broker] Builder warranty milestones injected for client ${clientEmail} (${brokerConfig.warrantyPeriodMonths ?? 12}-month warranty)`);
      }

      await db.insert(savedCalendarsTable).values({
        userId: clientUserId,
        quizAnswers,
        calendarData,
      }).onConflictDoNothing();

      const ncData = precreation.newConstructionData as Record<string, unknown> | null;
      if (propData || ncData) {
        await db.insert(homeProfilesTable).values({
          userId: clientUserId,
          fullAddress: (propData?.fullAddress as string) || null,
          yearBuilt: (propData?.yearBuilt as number) || null,
          bedrooms: (propData?.bedrooms as number) || null,
          bathrooms: (propData?.bathrooms as string) || null,
          finishedBasement: (propData?.finishedBasement as string) || null,
          poolOrHotTub: (propData?.poolOrHotTub as string) || null,
          lastRenovationYear: (propData?.lastRenovationYear as number) || null,
          newConstructionData: ncData ?? null,
        }).onConflictDoUpdate({
          target: homeProfilesTable.userId,
          set: {
            fullAddress: (propData?.fullAddress as string) || null,
            yearBuilt: (propData?.yearBuilt as number) || null,
            bedrooms: (propData?.bedrooms as number) || null,
            bathrooms: (propData?.bathrooms as string) || null,
            finishedBasement: (propData?.finishedBasement as string) || null,
            poolOrHotTub: (propData?.poolOrHotTub as string) || null,
            lastRenovationYear: (propData?.lastRenovationYear as number) || null,
            newConstructionData: ncData ?? null,
            updatedAt: new Date(),
          },
        });
      }

      console.log(`[broker] Calendar generated for pre-created client ${clientEmail}`);
    } catch (err) {
      console.error(`[broker] Calendar generation failed for ${clientEmail}:`, err);
    }
  }

  const docPaths = precreation.documentPaths as Array<{ objectPath: string; fileName: string; contentType: string; fileSizeBytes?: number; displayName?: string }> | null;
  if (docPaths && docPaths.length > 0) {
    for (const doc of docPaths) {
      await db.insert(maintenanceDocumentsTable).values({
        userId: clientUserId,
        fileName: doc.fileName,
        objectPath: doc.objectPath,
        contentType: doc.contentType,
        fileSizeBytes: doc.fileSizeBytes ?? null,
        displayName: doc.displayName ?? doc.fileName,
        docType: "document",
      }).catch(() => {});
    }
    console.log(`[broker] Transferred ${docPaths.length} document(s) to client ${clientEmail}`);
  }

  const activationToken = crypto.randomBytes(32).toString("hex");

  await db.update(brokerPrecreationsTable).set({
    status: "active",
    clientUserId,
    calendarData,
    activationToken,
    activatedAt: null,
  }).where(eq(brokerPrecreationsTable.id, precreationId));

  const activationLink = `${baseUrl}/activate?token=${activationToken}`;
  console.log(`[broker] Precreation ${precreationId} complete. Client: ${clientEmail}, link: ${activationLink}`);

  return { ok: true, activationLink, clientEmail, clientName };
}

// ── GET /api/broker/providers ─────────────────────────────────────────────────
router.get("/broker/providers", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const ctx = await getBrokerContext(req.userId!, req.userEmail!);
  if (!ctx) { res.status(403).json({ error: "Not authorized as broker" }); return; }
  const providers = await db.select().from(brokerServiceProvidersTable)
    .where(eq(brokerServiceProvidersTable.brokerSubdomain, ctx.config.subdomain))
    .orderBy(brokerServiceProvidersTable.category, brokerServiceProvidersTable.companyName);
  res.json({ providers });
});

// ── POST /api/broker/providers ────────────────────────────────────────────────
router.post("/broker/providers", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const ctx = await getBrokerContext(req.userId!, req.userEmail!);
  if (!ctx) { res.status(403).json({ error: "Not authorized as broker" }); return; }
  const { category, companyName, contactName, phone, email, website, note } = req.body as {
    category?: string; companyName?: string; contactName?: string;
    phone?: string; email?: string; website?: string; note?: string;
  };
  if (!category?.trim() || !companyName?.trim()) {
    res.status(400).json({ error: "Category and company name are required" }); return;
  }
  const [created] = await db.insert(brokerServiceProvidersTable).values({
    brokerSubdomain: ctx.config.subdomain,
    category: category.trim(),
    companyName: companyName.trim(),
    contactName: contactName?.trim() || null,
    phone: phone?.trim() || null,
    email: email?.trim() || null,
    website: website?.trim() || null,
    note: note?.trim() || null,
  }).returning();
  res.status(201).json({ provider: created });
});

// ── PUT /api/broker/providers/:id ─────────────────────────────────────────────
router.put("/broker/providers/:id", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const ctx = await getBrokerContext(req.userId!, req.userEmail!);
  if (!ctx) { res.status(403).json({ error: "Not authorized as broker" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { category, companyName, contactName, phone, email, website, note } = req.body as {
    category?: string; companyName?: string; contactName?: string;
    phone?: string; email?: string; website?: string; note?: string;
  };
  if (!category?.trim() || !companyName?.trim()) {
    res.status(400).json({ error: "Category and company name are required" }); return;
  }
  const [updated] = await db.update(brokerServiceProvidersTable).set({
    category: category.trim(),
    companyName: companyName.trim(),
    contactName: contactName?.trim() || null,
    phone: phone?.trim() || null,
    email: email?.trim() || null,
    website: website?.trim() || null,
    note: note?.trim() || null,
    updatedAt: new Date(),
  }).where(and(
    eq(brokerServiceProvidersTable.id, id),
    eq(brokerServiceProvidersTable.brokerSubdomain, ctx.config.subdomain),
  )).returning();
  if (!updated) { res.status(404).json({ error: "Provider not found" }); return; }
  res.json({ provider: updated });
});

// ── DELETE /api/broker/providers/:id ─────────────────────────────────────────
router.delete("/broker/providers/:id", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const ctx = await getBrokerContext(req.userId!, req.userEmail!);
  if (!ctx) { res.status(403).json({ error: "Not authorized as broker" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(brokerServiceProvidersTable).where(and(
    eq(brokerServiceProvidersTable.id, id),
    eq(brokerServiceProvidersTable.brokerSubdomain, ctx.config.subdomain),
  ));
  res.json({ ok: true });
});

export default router;
