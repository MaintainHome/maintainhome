import { Router, type Request, type Response } from "express";
import { db, whiteLabelConfigsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function extractSubdomain(req: Request): string | null {
  const override =
    (req.headers["x-subdomain"] as string) ||
    (req.query._subdomain as string) ||
    null;
  if (override) return override.toLowerCase().trim();

  const host =
    (req.headers["x-forwarded-host"] as string) ||
    req.get("host") ||
    "";
  const cleanHost = host.split(":")[0];
  const parts = cleanHost.split(".");

  if (parts.length <= 2) return null;

  const sub = parts[0].toLowerCase();
  if (sub === "www") return null;
  return sub;
}

router.get("/branding", async (req: Request, res: Response) => {
  try {
    const subdomain = extractSubdomain(req);

    if (!subdomain) {
      res.json({ branding: null });
      return;
    }

    const [config] = await db
      .select()
      .from(whiteLabelConfigsTable)
      .where(
        and(
          eq(whiteLabelConfigsTable.subdomain, subdomain),
          eq(whiteLabelConfigsTable.status, "approved"),
        ),
      )
      .limit(1);

    if (!config) {
      res.json({ branding: null });
      return;
    }

    res.json({
      branding: {
        subdomain: config.subdomain,
        brokerName: config.brokerName,
        logoUrl: config.logoUrl,
        agentPhotoUrl: config.agentPhotoUrl,
        phoneNumber: config.phoneNumber,
        tagline: config.tagline,
        welcomeMessage: config.welcomeMessage,
        type: config.type,
        contactEmail: config.contactEmail,
        accountType: config.accountType,
        warrantyPeriodMonths: config.warrantyPeriodMonths,
        warrantyRepName: config.warrantyRepName,
        warrantyRepPhone: config.warrantyRepPhone,
        warrantyRepEmail: config.warrantyRepEmail,
      },
    });
  } catch (err) {
    console.error("[branding] GET /api/branding error:", err);
    res.status(500).json({ error: "Failed to load branding" });
  }
});

export default router;
