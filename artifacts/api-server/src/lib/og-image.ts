import { Resvg } from "@resvg/resvg-js";
import path from "path";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import dns from "dns/promises";
import net from "net";

const __filenameLocal =
  typeof __filename !== "undefined"
    ? __filename
    : fileURLToPath(import.meta.url);
const __dirnameLocal = path.dirname(__filenameLocal);

const FONT_DIR_CANDIDATES = [
  // Production: dist/assets (sibling of dist/index.cjs)
  path.resolve(__dirnameLocal, "assets"),
  // Dev (tsx): src/lib -> ../../assets
  path.resolve(__dirnameLocal, "..", "..", "assets"),
  // Fallbacks
  path.resolve(__dirnameLocal, "..", "assets"),
  path.resolve(__dirnameLocal, "..", "..", "..", "assets"),
  path.resolve(process.cwd(), "artifacts/api-server/dist/assets"),
  path.resolve(process.cwd(), "artifacts/api-server/assets"),
];

function findFontDir(): string {
  for (const dir of FONT_DIR_CANDIDATES) {
    if (existsSync(path.join(dir, "Inter-Regular.otf"))) return dir;
  }
  return FONT_DIR_CANDIDATES[0];
}

const PUBLIC_IMAGE_DIR_CANDIDATES = [
  // Production: from artifacts/api-server/dist -> ../../maintain-home/dist/public/images
  path.resolve(__dirnameLocal, "..", "..", "maintain-home", "dist", "public", "images"),
  // Dev (tsx from src/lib): ../../../maintain-home/public/images
  path.resolve(__dirnameLocal, "..", "..", "..", "maintain-home", "public", "images"),
  path.resolve(__dirnameLocal, "..", "..", "..", "maintain-home", "dist", "public", "images"),
  path.resolve(process.cwd(), "artifacts/maintain-home/dist/public/images"),
  path.resolve(process.cwd(), "artifacts/maintain-home/public/images"),
];

function findPublicImageDir(): string {
  for (const dir of PUBLIC_IMAGE_DIR_CANDIDATES) {
    if (existsSync(dir)) return dir;
  }
  return PUBLIC_IMAGE_DIR_CANDIDATES[0];
}

const imageCache = new Map<string, { dataUri: string; ts: number }>();
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 6;

function isPrivateIp(addr: string): boolean {
  if (!addr) return true;
  if (net.isIP(addr) === 0) return true;
  if (net.isIP(addr) === 4) {
    // IPv4 private/reserved ranges
    const m = addr.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (!m) return true;
    const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  // IPv6 — block loopback, link-local, unique-local, mapped private v4
  const lower = addr.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("::ffff:")) {
    // IPv4-mapped — recurse on the v4 part
    const v4 = lower.split("::ffff:")[1];
    return isPrivateIp(v4);
  }
  return false;
}

async function isUrlSafeForFetch(urlStr: string): Promise<boolean> {
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  // Disallow plain http in production-like usage to be safe
  if (u.protocol === "http:" && process.env.NODE_ENV === "production") return false;
  const hostname = u.hostname;
  if (!hostname) return false;
  // If the hostname is already an IP literal, check directly
  if (net.isIP(hostname) !== 0) {
    return !isPrivateIp(hostname);
  }
  try {
    const addrs = await dns.lookup(hostname, { all: true });
    if (addrs.length === 0) return false;
    for (const a of addrs) {
      if (isPrivateIp(a.address)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function fetchImageAsDataUri(url: string): Promise<string | null> {
  if (!url) return null;
  const cached = imageCache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_MAX_AGE_MS) return cached.dataUri;
  if (!(await isUrlSafeForFetch(url))) return null;
  try {
    // redirect: "manual" to prevent SSRF via redirect to private IP
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(url, { redirect: "manual", signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return null;
    const ct = (r.headers.get("content-type") || "image/png").split(";")[0].trim();
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0 || buf.length > 4 * 1024 * 1024) return null;
    const uri = `data:${ct};base64,${buf.toString("base64")}`;
    imageCache.set(url, { dataUri: uri, ts: Date.now() });
    return uri;
  } catch {
    return null;
  }
}

function readLocalImageAsDataUri(filename: string): string | null {
  try {
    const p = path.join(findPublicImageDir(), filename);
    if (!existsSync(p)) return null;
    const buf = readFileSync(p);
    const ext = path.extname(filename).toLowerCase().replace(".", "") || "png";
    const ct = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Approximate text width in pixels for Inter at a given weight/size.
// Tuned empirically — used for centering pills around dynamic-length text.
function approxTextWidth(text: string, fontSize: number, weight: 400 | 500 | 700 | 800 = 700): number {
  const factor = weight >= 800 ? 0.58 : weight >= 700 ? 0.56 : weight >= 500 ? 0.53 : 0.52;
  return text.length * fontSize * factor;
}

// Truncate with ellipsis if it would exceed maxChars.
function truncate(s: string, maxChars: number): string {
  if (s.length <= maxChars) return s;
  return s.slice(0, Math.max(0, maxChars - 1)).trimEnd() + "…";
}

export interface OgImageInput {
  accountType: "broker" | "builder" | string | null | undefined;
  brandName: string;
  agentName?: string | null;
  agentPhone?: string | null;
  logoUrl?: string | null;
  headshotUrl?: string | null;
  taglineCaption?: string | null;
}

export async function generateOgPng(input: OgImageInput): Promise<Buffer> {
  const isBuilder = (input.accountType || "").toLowerCase() === "builder";

  const W = 1200;
  const H = 630;
  const LEFT_W = 480; // ≈40% Maintly hero column

  // Right content column padding
  const RX = LEFT_W + 56;
  const RW = W - RX - 56;

  const accentGradId = "accent";
  const leftBgGradId = "leftbg";
  const maintlyGlowId = "maintlyGlow";

  // Note: input.logoUrl / input.headshotUrl are intentionally unused in the
  // current layout — Maintly + headline are the focal points. The fields are
  // kept on OgImageInput so the call sites in routes/og.ts don't need to
  // change if we re-introduce those visuals later.

  const maintlyFile = isBuilder ? "maintly_phone.png" : "maintly_gift.png";
  const maintlyUri = readLocalImageAsDataUri(maintlyFile);
  const mhIconUri = readLocalImageAsDataUri("logo-icon.png");

  // ── Copy ──────────────────────────────────────────────────────
  const partnerLabel = (input.agentName || input.brandName || "your partner").trim();
  const partnerLabelShort = truncate(partnerLabel, 28);

  const badgePrefix = isBuilder ? "A Special Welcome from" : "A Special Gift from";
  const badgeText = `${badgePrefix} ${partnerLabelShort}`;

  const headline = isBuilder
    ? ["Own Your New Home", "With Confidence"]
    : ["Own Your Home", "With Confidence"];

  const subline = `In partnership with ${truncate(partnerLabel, 36)}`;

  // ── Badge geometry (sized to text, with auto-shrink fallback) ──────
  // Start at 18px and step down until the text+padding fits inside RW so
  // unusually long brand names never overflow or get clipped by the rect.
  const badgePadX = 22;
  const badgeH = 40;
  let badgeFontSize = 18;
  let badgeTextW = approxTextWidth(badgeText, badgeFontSize, 700);
  while (badgeTextW + badgePadX * 2 > RW && badgeFontSize > 12) {
    badgeFontSize -= 1;
    badgeTextW = approxTextWidth(badgeText, badgeFontSize, 700);
  }
  const badgeW = Math.min(badgeTextW + badgePadX * 2, RW);
  const badgeY = 90;

  // Headline geometry — auto-fit so the longest line never overflows.
  // Inter-Bold cap-width ≈ 0.60 * fontSize at weight 700.
  const longestHeadlineChars = Math.max(...headline.map((l) => l.length));
  const headlineFontSize = Math.min(
    78,
    Math.floor(RW / (longestHeadlineChars * 0.6)),
  );
  const headlineLineH = Math.round(headlineFontSize * 1.1);
  const headlineY = badgeY + badgeH + 56 + headlineFontSize - 12;

  // Underline accent
  const underlineY = headlineY + headline.length * headlineLineH + 8;

  // Subline
  const sublineY = underlineY + 48;

  // ── Maintly hero (left column) ────────────────────────────────
  // Make him fill most of the left column. Anchor to bottom so the
  // gift box / phone reads as the focal point.
  const maintlySize = 460;
  const maintlyX = (LEFT_W - maintlySize) / 2;
  const maintlyY = H - maintlySize - 30;

  // Bottom gradient bar height
  const barH = 10;

  // Bottom-right "Powered by" wordmark
  const mhWordmark = "Powered by MaintainHome.ai";
  const mhFontSize = 22;
  const mhWordmarkW = approxTextWidth(mhWordmark, mhFontSize, 700);
  const mhIconSize = 32;
  const mhRightPad = 56;
  const mhBottomPad = 56;
  const mhWordmarkX = W - mhRightPad;
  const mhWordmarkY = H - mhBottomPad;
  const mhIconX = mhWordmarkX - mhWordmarkW - 12 - mhIconSize;
  const mhIconY = mhWordmarkY - mhIconSize + 4;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <!-- Soft mint→sky tint for the Maintly column background -->
    <linearGradient id="${leftBgGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ecfdf5"/>
      <stop offset="100%" stop-color="#e0f2fe"/>
    </linearGradient>

    <!-- Brand accent gradient: teal → green → blue (used in bar + underline + badge stroke shimmer) -->
    <linearGradient id="${accentGradId}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#14b8a6"/>
      <stop offset="50%" stop-color="#1f9e6e"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>

    <radialGradient id="${maintlyGlowId}" cx="50%" cy="55%" r="55%">
      <stop offset="0%" stop-color="#1f9e6e" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#1f9e6e" stop-opacity="0"/>
    </radialGradient>

  </defs>

  <!-- Card background (white) -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>

  <!-- Left Maintly column with soft gradient -->
  <rect x="0" y="0" width="${LEFT_W}" height="${H}" fill="url(#${leftBgGradId})"/>

  <!-- Subtle vertical divider between columns -->
  <rect x="${LEFT_W}" y="48" width="1" height="${H - 96 - barH}" fill="#e5e7eb"/>

  <!-- Glow behind Maintly to add depth -->
  <ellipse cx="${LEFT_W / 2}" cy="${maintlyY + maintlySize * 0.55}" rx="${maintlySize * 0.55}" ry="${maintlySize * 0.42}" fill="url(#${maintlyGlowId})"/>

  <!-- Maintly hero image -->
  ${maintlyUri
    ? `<image href="${maintlyUri}" x="${maintlyX}" y="${maintlyY}" width="${maintlySize}" height="${maintlySize}" preserveAspectRatio="xMidYMax meet"/>`
    : `<text x="${LEFT_W / 2}" y="${H / 2}" text-anchor="middle" fill="#1f9e6e" font-family="Inter" font-weight="800" font-size="64">Maintly</text>`}

  <!-- ── Right column content ───────────────────────────────── -->

  <!-- Green pill badge -->
  <rect x="${RX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" fill="#1f9e6e"/>
  <text x="${RX + badgeW / 2}" y="${badgeY + badgeH / 2 + badgeFontSize / 3}" text-anchor="middle" fill="#ffffff" font-family="Inter" font-weight="700" font-size="${badgeFontSize}">${escapeXml(badgeText)}</text>

  <!-- Big bold headline -->
  ${headline.map((line, i) => `<text x="${RX}" y="${headlineY + i * headlineLineH}" fill="#0f172a" font-family="Inter" font-weight="700" font-size="${headlineFontSize}">${escapeXml(line)}</text>`).join("\n  ")}

  <!-- Accent underline -->
  <rect x="${RX}" y="${underlineY}" width="180" height="6" rx="3" fill="url(#${accentGradId})"/>

  <!-- Sub-headline -->
  <text x="${RX}" y="${sublineY}" fill="#475569" font-family="Inter" font-weight="500" font-size="28">${escapeXml(subline)}</text>

  <!-- ── Footer: gradient bar + wordmark ───────────────────── -->

  <!-- Teal→green→blue accent bar at very bottom -->
  <rect x="0" y="${H - barH}" width="${W}" height="${barH}" fill="url(#${accentGradId})"/>

  <!-- "Powered by MaintainHome.ai" bottom-right -->
  ${mhIconUri ? `<image href="${mhIconUri}" x="${mhIconX}" y="${mhIconY}" width="${mhIconSize}" height="${mhIconSize}" preserveAspectRatio="xMidYMid meet"/>` : ""}
  <text x="${mhWordmarkX}" y="${mhWordmarkY}" text-anchor="end" fill="#0f172a" font-family="Inter" font-weight="700" font-size="${mhFontSize}">${escapeXml(mhWordmark)}</text>
</svg>`;

  const fontDir = findFontDir();
  const candidatePaths = [
    path.join(fontDir, "Inter.ttf"),
    path.join(fontDir, "Inter-Regular.otf"),
    path.join(fontDir, "Inter-Bold.otf"),
  ];
  const fontBuffers: Buffer[] = [];
  for (const p of candidatePaths) {
    if (existsSync(p)) {
      try {
        fontBuffers.push(readFileSync(p));
      } catch {
        /* skip */
      }
    }
  }

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    font: {
      fontBuffers,
      loadSystemFonts: fontBuffers.length === 0,
      defaultFontFamily: "Inter",
      sansSerifFamily: "Inter",
    },
    background: "#ffffff",
  });
  return resvg.render().asPng();
}
