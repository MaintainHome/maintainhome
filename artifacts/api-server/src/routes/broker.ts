import { Router, type Response } from "express";
import { db, whiteLabelConfigsTable, usersTable, savedCalendarsTable, maintenanceLogTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";

const router = Router();

router.get("/broker/me", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const userEmail = req.user!.email;
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

    if (!config) {
      res.status(404).json({ error: "No approved broker account found for this email." });
      return;
    }

    res.json({ config });
  } catch (err) {
    console.error("[broker] GET /broker/me error:", err);
    res.status(500).json({ error: "Failed to load broker profile" });
  }
});

router.get("/broker/clients", requireAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const userEmail = req.user!.email;
    const [config] = await db
      .select({ subdomain: whiteLabelConfigsTable.subdomain })
      .from(whiteLabelConfigsTable)
      .where(
        and(
          eq(whiteLabelConfigsTable.contactEmail, userEmail),
          eq(whiteLabelConfigsTable.status, "approved"),
        ),
      )
      .limit(1);

    if (!config) {
      res.status(403).json({ error: "Not authorized as broker" });
      return;
    }

    const rawClients = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        subscriptionStatus: usersTable.subscriptionStatus,
        createdAt: usersTable.createdAt,
        lastActiveAt: usersTable.updatedAt,
      })
      .from(usersTable)
      .where(eq(usersTable.referralSubdomain, config.subdomain));

    if (rawClients.length === 0) {
      res.json({ clients: [], subdomain: config.subdomain });
      return;
    }

    const userIds = rawClients.map((c) => c.id);

    const [calendarRows, logRows] = await Promise.all([
      db
        .select({
          userId: savedCalendarsTable.userId,
          calendarData: savedCalendarsTable.calendarData,
        })
        .from(savedCalendarsTable)
        .where(inArray(savedCalendarsTable.userId, userIds)),
      db
        .select({
          userId: maintenanceLogTable.userId,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(maintenanceLogTable)
        .where(inArray(maintenanceLogTable.userId, userIds))
        .groupBy(maintenanceLogTable.userId),
    ]);

    const calendarMap = new Map(calendarRows.map((r) => [r.userId, r.calendarData]));
    const logCountMap = new Map(logRows.map((r) => [r.userId, r.count]));

    const clients = rawClients.map((c) => {
      const calData = calendarMap.get(c.id) as Record<string, unknown> | undefined;
      const hasCalendar = !!calData;
      const bigTicketAlertCount = Array.isArray((calData as any)?.big_ticket_alerts)
        ? (calData as any).big_ticket_alerts.length
        : 0;
      const bigTicketAlerts: string[] = Array.isArray((calData as any)?.big_ticket_alerts)
        ? (calData as any).big_ticket_alerts.slice(0, 3)
        : [];
      const logCount = logCountMap.get(c.id) ?? 0;
      const activityScore = Math.min(
        (hasCalendar ? 60 : 0) + Math.min(logCount * 8, 40),
        100,
      );
      return {
        ...c,
        hasCalendar,
        logCount,
        activityScore,
        bigTicketAlertCount,
        bigTicketAlerts,
      };
    });

    res.json({ clients, subdomain: config.subdomain });
  } catch (err) {
    console.error("[broker] GET /broker/clients error:", err);
    res.status(500).json({ error: "Failed to load client list" });
  }
});

export default router;
