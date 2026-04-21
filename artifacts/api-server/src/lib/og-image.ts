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

function wrapTitle(title: string, maxLen = 22): string[] {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length > maxLen && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
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

  const leftBgGradId = "leftbg";
  const accentGradId = "accent";
  const W = 1200;
  const H = 630;
  const LEFT_W = 480;

  const leftStops = isBuilder
    ? `<stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#0b1220"/>`
    : `<stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#0b1220"/>`;

  const accentStops = isBuilder
    ? `<stop offset="0%" stop-color="#14b8a6"/><stop offset="50%" stop-color="#1f9e6e"/><stop offset="100%" stop-color="#3b82f6"/>`
    : `<stop offset="0%" stop-color="#1f9e6e"/><stop offset="100%" stop-color="#3b82f6"/>`;

  const [logoUri, headshotUri] = await Promise.all([
    input.logoUrl ? fetchImageAsDataUri(input.logoUrl) : Promise.resolve(null),
    input.headshotUrl ? fetchImageAsDataUri(input.headshotUrl) : Promise.resolve(null),
  ]);

  const maintlyFile = isBuilder ? "maintly_phone.png" : "maintly_gift.png";
  const maintlyUri = readLocalImageAsDataUri(maintlyFile);
  const mhIconUri = readLocalImageAsDataUri("logo-icon.png");

  const headlineLines = ["Partnering With You", "To Own Your Home", "With Confidence"];

  const subline = input.agentName
    ? `In partnership with ${input.agentName}`
    : `In partnership with ${input.brandName}`;

  const brandLine = input.brandName ? escapeXml(input.brandName) : "";

  const agentName = escapeXml(input.agentName || "");
  const agentPhone = escapeXml(input.agentPhone || "");
  const taglineCaption = input.taglineCaption ? wrapTitle(input.taglineCaption, 36).slice(0, 2) : [];

  // Layout positions
  const logoBoxY = 60;
  const logoBoxH = 90;
  const headshotR = 90;
  const headshotCx = LEFT_W / 2;
  const headshotCy = 290;
  const nameY = headshotCy + headshotR + 56;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="${leftBgGradId}" x1="0%" y1="0%" x2="0%" y2="100%">${leftStops}</linearGradient>
    <linearGradient id="${accentGradId}" x1="0%" y1="0%" x2="100%" y2="0%">${accentStops}</linearGradient>
    <clipPath id="headshotClip"><circle cx="${headshotCx}" cy="${headshotCy}" r="${headshotR}"/></clipPath>
    <radialGradient id="maintlyGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${isBuilder ? "#1f9e6e" : "#fbbf24"}" stop-opacity="0.55"/>
      <stop offset="70%" stop-color="${isBuilder ? "#1f9e6e" : "#fbbf24"}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Right white side -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>

  <!-- Left dark column -->
  <rect x="0" y="0" width="${LEFT_W}" height="${H}" fill="url(#${leftBgGradId})"/>

  <!-- Accent stripe at top of left column -->
  <rect x="0" y="0" width="${LEFT_W}" height="6" fill="url(#${accentGradId})"/>

  ${logoUri ? `<image href="${logoUri}" x="${(LEFT_W - 280) / 2}" y="${logoBoxY}" width="280" height="${logoBoxH}" preserveAspectRatio="xMidYMid meet"/>` : `<text x="${LEFT_W / 2}" y="${logoBoxY + 60}" text-anchor="middle" fill="#ffffff" font-family="Inter" font-weight="700" font-size="42">${brandLine}</text>`}

  <!-- Headshot circle -->
  <circle cx="${headshotCx}" cy="${headshotCy}" r="${headshotR + 4}" fill="url(#${accentGradId})"/>
  <circle cx="${headshotCx}" cy="${headshotCy}" r="${headshotR}" fill="#1e293b"/>
  ${headshotUri ? `<image href="${headshotUri}" x="${headshotCx - headshotR}" y="${headshotCy - headshotR}" width="${headshotR * 2}" height="${headshotR * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#headshotClip)"/>` : `<text x="${headshotCx}" y="${headshotCy + 14}" text-anchor="middle" fill="#94a3b8" font-family="Inter" font-weight="700" font-size="56">${escapeXml((input.agentName || input.brandName || "?").trim().charAt(0).toUpperCase())}</text>`}

  ${agentName ? `<text x="${LEFT_W / 2}" y="${nameY}" text-anchor="middle" fill="#ffffff" font-family="Inter" font-weight="700" font-size="32">${agentName}</text>` : ""}
  ${agentPhone ? `<text x="${LEFT_W / 2}" y="${nameY + 38}" text-anchor="middle" fill="#cbd5e1" font-family="Inter" font-weight="400" font-size="22">${agentPhone}</text>` : ""}

  ${taglineCaption.length > 0
    ? taglineCaption.map((l, i) => `<text x="${LEFT_W / 2}" y="${H - 70 + i * 26}" text-anchor="middle" fill="#94a3b8" font-family="Inter" font-style="italic" font-weight="400" font-size="20">"${escapeXml(l)}"</text>`).join("")
    : ""}

  <!-- Right side content -->
  <!-- Maintly glow + avatar in top-right (smaller so it doesn't overlap headline) -->
  <circle cx="${W - 100}" cy="100" r="100" fill="url(#maintlyGlow)"/>
  ${maintlyUri ? `<image href="${maintlyUri}" x="${W - 180}" y="20" width="160" height="160" preserveAspectRatio="xMidYMid meet"/>` : ""}

  <!-- Badge pill -->
  <rect x="540" y="80" width="${isBuilder ? 240 : 220}" height="36" rx="18" fill="#ecfdf5" stroke="#1f9e6e" stroke-width="1"/>
  <text x="${540 + (isBuilder ? 120 : 110)}" y="105" text-anchor="middle" fill="#1f9e6e" font-family="Inter" font-weight="700" font-size="15">${isBuilder ? "A SPECIAL WELCOME" : "A SPECIAL GIFT"}</text>

  <!-- Headline (font sized to fit alongside Maintly) -->
  ${headlineLines.map((line, i) => `<text x="540" y="${190 + i * 60}" fill="#0f172a" font-family="Inter" font-weight="800" font-size="52">${escapeXml(line)}</text>`).join("")}

  <!-- Accent underline below headline -->
  <rect x="540" y="${190 + headlineLines.length * 60 + 4}" width="180" height="6" rx="3" fill="url(#${accentGradId})"/>

  <!-- Subline -->
  <text x="540" y="${190 + headlineLines.length * 60 + 56}" fill="#475569" font-family="Inter" font-weight="500" font-size="24">${escapeXml(subline)}</text>

  <!-- MaintainHome icon + wordmark bottom-right -->
  ${mhIconUri ? `<image href="${mhIconUri}" x="${W - 260}" y="${H - 70}" width="44" height="44" preserveAspectRatio="xMidYMid meet"/>` : ""}
  <text x="${W - 40}" y="${H - 38}" text-anchor="end" fill="#0f172a" font-family="Inter" font-weight="800" font-size="26">MaintainHome.ai</text>

  <!-- Bottom-left tag -->
  <text x="540" y="${H - 38}" fill="#94a3b8" font-family="Inter" font-weight="500" font-size="16">Powered by AI · Personalized to your home</text>
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
