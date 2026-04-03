import { Router, type Request, type Response, type NextFunction } from "express";
import { db, whiteLabelConfigsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

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

    const { primaryColor, secondaryColor, logoUrl, tagline, welcomeMessage } = req.body as Record<string, string>;

    const updateData: Partial<typeof whiteLabelConfigsTable.$inferInsert> = {
      status: "approved",
      updatedAt: new Date(),
    };
    if (primaryColor) updateData.primaryColor = primaryColor;
    if (secondaryColor) updateData.secondaryColor = secondaryColor;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null;
    if (tagline !== undefined) updateData.tagline = tagline || null;
    if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage || null;

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

export default router;
