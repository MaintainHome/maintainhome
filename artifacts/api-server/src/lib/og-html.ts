import { db, whiteLabelConfigsTable, teamMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

// Reserved first-segments — must include every top-level SPA route, every
// API/static path, and any well-known files. Do NOT remove entries; this list
// is the safety net that prevents real app routes from being treated as
// invite paths and getting custom OG injection.
const RESERVED_PATHS = new Set([
  "activate",
  "admin",
  "admin-brokers",
  "admin-testing",
  "api",
  "assets",
  "auth",
  "broker-dashboard",
  "broker-onboard",
  "builder-onboard",
  "calendar",
  "calendar-page",
  "checkout",
  "checkout-success",
  "choose-role",
  "dashboard",
  "documents",
  "favicon.ico",
  "feedback",
  "help",
  "history",
  "home",
  "home-profile",
  "images",
  "invite",
  "login",
  "logout",
  "manifest.json",
  "not-found",
  "pricing",
  "privacy",
  "quiz",
  "redwood-title",
  "register",
  "robots.txt",
  "settings",
  "signup",
  "sitemap.xml",
  "src",
  "static",
  "support",
  "sw.js",
  "team-join",
  "terms",
]);

export interface InvitePathInfo {
  subdomain: string;
  agentHandle: string | null;
}

export function parseInvitePath(pathname: string): InvitePathInfo | null {
  const clean = pathname.split("?")[0].split("#")[0];
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  // /invite/:subdomain
  if (parts[0].toLowerCase() === "invite" && parts.length === 2) {
    return { subdomain: parts[1].toLowerCase(), agentHandle: null };
  }

  // /:subdomain or /:teamHandle/:agentHandle
  if (parts.length > 2) return null;
  const first = parts[0].toLowerCase();
  if (RESERVED_PATHS.has(first)) return null;
  // Skip files with extensions (e.g. *.json, *.png)
  if (first.includes(".")) return null;

  return {
    subdomain: first,
    agentHandle: parts[1] ? parts[1].toLowerCase() : null,
  };
}

export interface InviteOgData {
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  ogUrl: string;
}

function escapeAttr(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Cache resolved OG data so crawler bursts on a single invite link don't
// hammer the DB. Keyed by `${subdomain}::${agentHandle ?? ""}::${origin}`.
const ogDataCache = new Map<string, { data: InviteOgData | null; ts: number }>();
const OG_DATA_TTL_MS = 1000 * 60 * 5;

export async function loadInviteOgData(
  info: InvitePathInfo,
  origin: string,
): Promise<InviteOgData | null> {
  const cacheKey = `${info.subdomain}::${info.agentHandle ?? ""}::${origin}`;
  const cached = ogDataCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < OG_DATA_TTL_MS) return cached.data;

  const result = await loadInviteOgDataUncached(info, origin);
  ogDataCache.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}

async function loadInviteOgDataUncached(
  info: InvitePathInfo,
  origin: string,
): Promise<InviteOgData | null> {
  const [config] = await db
    .select()
    .from(whiteLabelConfigsTable)
    .where(
      and(
        eq(whiteLabelConfigsTable.subdomain, info.subdomain),
        eq(whiteLabelConfigsTable.status, "approved"),
      ),
    )
    .limit(1);

  if (!config) return null;

  let agentName: string | null = null;
  if (info.agentHandle) {
    const [member] = await db
      .select()
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.teamSubdomain, info.subdomain),
          eq(teamMembersTable.agentHandle, info.agentHandle),
        ),
      )
      .limit(1);
    if (member) agentName = member.displayName ?? null;
  }

  const isBuilder = (config.accountType || "").toLowerCase() === "builder";
  const brandName = config.brokerName ?? "your partner";

  let ogTitle: string;
  let ogDescription: string;
  if (isBuilder) {
    ogTitle = `Your New Home from ${brandName}`;
    ogDescription = `A personalized home maintenance & warranty calendar from ${brandName}, powered by MaintainHome.ai.`;
  } else if (agentName) {
    ogTitle = `A Special Gift from ${agentName}`;
    ogDescription = `${agentName} at ${brandName} is gifting you a personalized home maintenance plan with MaintainHome.ai.`;
  } else {
    ogTitle = `A Special Gift from ${brandName}`;
    ogDescription = `${brandName} is gifting you a personalized home maintenance plan with MaintainHome.ai.`;
  }

  // Include `updatedAt` as a cache-buster so updates to the broker's branding
  // immediately invalidate any cached PNG in /api/og/preview as well as
  // crawler-side caches (Apple/Slack/Twitter all key by URL).
  const params = new URLSearchParams({ subdomain: info.subdomain });
  if (info.agentHandle) params.set("agent", info.agentHandle);
  const versionTs = config.updatedAt instanceof Date ? config.updatedAt.getTime() : 0;
  if (versionTs) params.set("v", String(versionTs));
  const ogImageUrl = `${origin}/api/og/preview?${params.toString()}`;

  const ogUrl = info.agentHandle
    ? `${origin}/${info.subdomain}/${info.agentHandle}`
    : `${origin}/${info.subdomain}`;

  return { ogTitle, ogDescription, ogImageUrl, ogUrl };
}

export function injectOgTags(html: string, data: InviteOgData): string {
  const tags = `
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeAttr(data.ogUrl)}" />
    <meta property="og:title" content="${escapeAttr(data.ogTitle)}" />
    <meta property="og:description" content="${escapeAttr(data.ogDescription)}" />
    <meta property="og:image" content="${escapeAttr(data.ogImageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="MaintainHome.ai" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(data.ogTitle)}" />
    <meta name="twitter:description" content="${escapeAttr(data.ogDescription)}" />
    <meta name="twitter:image" content="${escapeAttr(data.ogImageUrl)}" />
    <title>${escapeAttr(data.ogTitle)}</title>
  `.trim();

  // Remove existing og:*, twitter:*, and <title> tags
  let stripped = html
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, "")
    .replace(/<title>[\s\S]*?<\/title>\s*/gi, "");

  // Inject before </head>
  if (stripped.includes("</head>")) {
    stripped = stripped.replace("</head>", `${tags}\n  </head>`);
  } else {
    stripped = `${tags}\n${stripped}`;
  }
  return stripped;
}
