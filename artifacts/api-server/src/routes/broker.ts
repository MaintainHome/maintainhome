import { Router, type Response } from "express";
import { db, whiteLabelConfigsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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

    const clients = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        subscriptionStatus: usersTable.subscriptionStatus,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.referralSubdomain, config.subdomain));

    res.json({ clients, subdomain: config.subdomain });
  } catch (err) {
    console.error("[broker] GET /broker/clients error:", err);
    res.status(500).json({ error: "Failed to load client list" });
  }
});

export default router;
