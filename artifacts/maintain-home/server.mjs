import express from "express";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || "19957", 10);
const PUBLIC_DIR = path.resolve(__dirname, "dist", "public");
const API_BASE = process.env.API_BASE_URL || "http://127.0.0.1:8080";
const INDEX_HTML_PATH = path.join(PUBLIC_DIR, "index.html");

const app = express();
app.disable("x-powered-by");

let indexHtmlCache = null;
let indexHtmlCacheTs = 0;
const INDEX_TTL_MS = 30 * 1000;

async function getIndexHtml() {
  if (indexHtmlCache && Date.now() - indexHtmlCacheTs < INDEX_TTL_MS) {
    return indexHtmlCache;
  }
  indexHtmlCache = await readFile(INDEX_HTML_PATH, "utf-8");
  indexHtmlCacheTs = Date.now();
  return indexHtmlCache;
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function injectOgTags(html, data) {
  const tags = `
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeAttr(data.url)}" />
    <meta property="og:title" content="${escapeAttr(data.title)}" />
    <meta property="og:description" content="${escapeAttr(data.description)}" />
    <meta property="og:image" content="${escapeAttr(data.image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="MaintainHome.ai" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(data.title)}" />
    <meta name="twitter:description" content="${escapeAttr(data.description)}" />
    <meta name="twitter:image" content="${escapeAttr(data.image)}" />
    <title>${escapeAttr(data.title)}</title>
  `.trim();

  let stripped = html
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, "")
    .replace(/<title>[\s\S]*?<\/title>\s*/gi, "");

  if (stripped.includes("</head>")) {
    return stripped.replace("</head>", `${tags}\n  </head>`);
  }
  return `${tags}\n${stripped}`;
}

function getOrigin(req) {
  const proto =
    (req.headers["x-forwarded-proto"] || "").toString().split(",")[0].trim() ||
    req.protocol ||
    "https";
  const host =
    (req.headers["x-forwarded-host"] || "").toString().split(",")[0].trim() ||
    req.get("host") ||
    "maintainhome.ai";
  return `${proto}://${host}`;
}

// Serve static assets first (CSS, JS, images, manifest, etc.)
app.use(
  express.static(PUBLIC_DIR, {
    index: false,
    maxAge: "1h",
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }),
);

// SPA + OG injection catch-all
app.get(/^\/(?!api\/).*/, async (req, res) => {
  try {
    // Skip obvious file requests that fell through static serving
    if (path.extname(req.path)) {
      res.sendFile(INDEX_HTML_PATH);
      return;
    }

    const origin = getOrigin(req);
    let injected = null;

    try {
      const lookupUrl = `${API_BASE}/api/og/lookup?path=${encodeURIComponent(
        req.path,
      )}&origin=${encodeURIComponent(origin)}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch(lookupUrl, { signal: ctrl.signal });
      clearTimeout(timer);
      if (r.ok) {
        const data = await r.json();
        if (data && data.found) {
          const html = await getIndexHtml();
          injected = injectOgTags(html, data);
        }
      }
    } catch (err) {
      console.error("[og] lookup failed:", err?.message || err);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (injected) {
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
      res.send(injected);
    } else {
      res.setHeader("Cache-Control", "no-cache");
      const html = await getIndexHtml();
      res.send(html);
    }
  } catch (err) {
    console.error("[server] catch-all error:", err);
    res.status(500).send("Server error");
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[maintain-home] listening on :${PORT}`);
  console.log(`[maintain-home] PUBLIC_DIR=${PUBLIC_DIR}`);
  console.log(`[maintain-home] API_BASE=${API_BASE}`);
});
