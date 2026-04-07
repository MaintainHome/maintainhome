import { Router, type Request, type Response, type NextFunction } from "express";
import { db, whiteLabelConfigsTable, usersTable, sessionsTable, smsLogTable, maintenanceDocumentsTable, maintenanceLogTable, maintenanceNotesTable, homeProfilesTable, stripeTransactionsTable, giftCodesTable, brokerPrecreationsTable, savedCalendarsTable } from "@workspace/db";
import { eq, desc, inArray, or } from "drizzle-orm";

const router = Router();

function requireAdminToken(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    res.status(503).json({ error: "Admin access not configured" });
    return;
  }
  const provided =
    (req.headers["x-admin-token"] as string) ||
    (req.query.token as string);
  if (!provided || provided !== secret) {
    res.status(401).json({ error: "Invalid admin token" });
    return;
  }
  next();
}

router.get("/admin/broker-requests", requireAdminToken, async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(whiteLabelConfigsTable)
      .orderBy(desc(whiteLabelConfigsTable.createdAt));
    res.json({ requests: rows });
  } catch (err) {
    console.error("[admin] GET /admin/broker-requests error:", err);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

router.post("/admin/broker-requests/:id/approve", requireAdminToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const { logoUrl, tagline, welcomeMessage, phoneNumber } = req.body as Record<string, string>;

    const updateData: Partial<typeof whiteLabelConfigsTable.$inferInsert> = {
      status: "approved",
      updatedAt: new Date(),
    };
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null;
    if (tagline !== undefined) updateData.tagline = tagline || null;
    if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage || null;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber || null;

    const [updated] = await db
      .update(whiteLabelConfigsTable)
      .set(updateData)
      .where(eq(whiteLabelConfigsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    res.json({ message: "Approved", config: updated });
  } catch (err) {
    console.error("[admin] approve error:", err);
    res.status(500).json({ error: "Failed to approve" });
  }
});

router.post("/admin/broker-requests/:id/reject", requireAdminToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const { reason } = req.body as { reason?: string };

    const [updated] = await db
      .update(whiteLabelConfigsTable)
      .set({
        status: "rejected",
        rejectionReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(whiteLabelConfigsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    res.json({ message: "Rejected", config: updated });
  } catch (err) {
    console.error("[admin] reject error:", err);
    res.status(500).json({ error: "Failed to reject" });
  }
});

router.delete("/admin/broker-requests/:id", requireAdminToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(whiteLabelConfigsTable).where(eq(whiteLabelConfigsTable.id, id));
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("[admin] delete error:", err);
    res.status(500).json({ error: "Failed to delete" });
  }
});

// TEMPORARY — user purge for testing (remove after use)
router.delete("/admin/purge-users", requireAdminToken, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids: number[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "Provide ids array" });
      return;
    }
    const log: string[] = [];
    const del = async (label: string, fn: () => Promise<unknown>) => {
      await fn(); log.push(label);
    };
    await del("sessions",             () => db.delete(sessionsTable).where(inArray(sessionsTable.userId, ids)));
    await del("sms_log",              () => db.delete(smsLogTable).where(inArray(smsLogTable.userId, ids)));
    await del("maintenance_documents",() => db.delete(maintenanceDocumentsTable).where(inArray(maintenanceDocumentsTable.userId, ids)));
    await del("maintenance_notes",    () => db.delete(maintenanceNotesTable).where(inArray(maintenanceNotesTable.userId, ids)));
    await del("maintenance_log",      () => db.delete(maintenanceLogTable).where(inArray(maintenanceLogTable.userId, ids)));
    await del("home_profiles",        () => db.delete(homeProfilesTable).where(inArray(homeProfilesTable.userId, ids)));
    await del("stripe_transactions",  () => db.delete(stripeTransactionsTable).where(inArray(stripeTransactionsTable.userId, ids)));
    await del("gift_codes",           () => db.delete(giftCodesTable).where(or(inArray(giftCodesTable.purchasedByUserId, ids), inArray(giftCodesTable.redeemedByUserId, ids))));
    await del("broker_precreations",  () => db.delete(brokerPrecreationsTable).where(or(inArray(brokerPrecreationsTable.brokerUserId, ids), inArray(brokerPrecreationsTable.clientUserId, ids))));
    await del("saved_calendars",      () => db.delete(savedCalendarsTable).where(inArray(savedCalendarsTable.userId, ids)));
    await del("users",                () => db.delete(usersTable).where(inArray(usersTable.id, ids)));
    res.json({ message: "Purged", steps: log, ids });
  } catch (err) {
    console.error("[admin] purge-users error:", err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
