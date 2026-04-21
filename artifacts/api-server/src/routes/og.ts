import { Router, type Request, type Response } from "express";
import { db, whiteLabelConfigsTable, teamMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { generateOgPng } from "../lib/og-image";
import { parseInvitePath, loadInviteOgData } from "../lib/og-html";

const router = Router();

/* ── /api/og/lookup ─────────────────────────────────────────────
   JSON endpoint used by the maintain-home production node server
   to decide whether a given path is an invite page and, if so,
   what custom OG meta tags to inject. Returns:
     { found: false }                                  – not an invite
     { found: true, title, description, image, url }   – inject these
   ────────────────────────────────────────────────────────────── */
router.get("/og/lookup", async (req: Request, res: Response) => {
  try {
    const rawPath = String(req.query.path || "/");
    const origin = String(req.query.origin || "");
    const info = parseInvitePath(rawPath);
    if (!info || !origin) {
      res.json({ found: false });
      return;
    }
    const data = await loadInviteOgData(info, origin);
    if (!data) {
      res.json({ found: false });
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({
      found: true,
      title: data.ogTitle,
      description: data.ogDescription,
      image: data.ogImageUrl,
      url: data.ogUrl,
    });
  } catch (err) {
    console.error("[og] /api/og/lookup error:", err);
    res.status(500).json({ found: false });
  }
});

const pngCache = new Map<string, { png: Buffer; ts: number }>();
const CACHE_MAX_AGE_MS = 1000 * 60 * 30;

router.get("/og/preview", async (req: Request, res: Response) => {
  try {
    const subdomain = String(req.query.subdomain || "").toLowerCase().trim();
    const agentHandle = String(req.query.agent || "").toLowerCase().trim() || null;
    // Cache-buster from /api/og/lookup — sourced from white_label_configs.updatedAt.
    // Including it in the cache key ensures any branding update produces a fresh PNG.
    const version = String(req.query.v || "").slice(0, 32);

    if (!subdomain) {
      res.status(400).send("subdomain required");
      return;
    }

    const cacheKey = `${subdomain}::${agentHandle || ""}::${version}`;
    const cached = pngCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_MAX_AGE_MS) {
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=1800, s-maxage=1800");
      res.send(cached.png);
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
      res.status(404).send("not found");
      return;
    }

    let agentName: string | null = null;
    let agentPhone: string | null = null;
    let headshotUrl: string | null = config.agentPhotoUrl ?? null;

    if (agentHandle) {
      const [member] = await db
        .select()
        .from(teamMembersTable)
        .where(
          and(
            eq(teamMembersTable.teamSubdomain, subdomain),
            eq(teamMembersTable.agentHandle, agentHandle),
          ),
        )
        .limit(1);
      if (member) {
        agentName = member.displayName ?? null;
        agentPhone = member.phone ?? null;
        if (member.headshotUrl) headshotUrl = member.headshotUrl;
      }
    }

    if (!agentName) {
      agentName = config.brokerName ?? null;
      if (!agentPhone) agentPhone = config.phoneNumber ?? null;
    }

    const png = await generateOgPng({
      accountType: config.accountType ?? "broker",
      brandName: config.brokerName ?? "MaintainHome",
      agentName,
      agentPhone,
      logoUrl: config.logoUrl ?? null,
      headshotUrl,
      taglineCaption: config.tagline ?? null,
    });

    pngCache.set(cacheKey, { png, ts: Date.now() });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=1800, s-maxage=1800");
    res.send(png);
  } catch (err) {
    console.error("[og] /api/og/preview error:", err);
    res.status(500).send("error");
  }
});

export default router;
