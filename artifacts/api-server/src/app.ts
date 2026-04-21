import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes";
import path from "path";
import { existsSync, readFileSync } from "fs";
import { parseInvitePath, loadInviteOgData, injectOgTags } from "./lib/og-html";

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

// Webhook must receive raw Buffer BEFORE express.json() parses the body
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

// 10mb limit so feedback/support screenshots and other base64 attachments fit
// (5MB image ≈ 6.7MB base64-encoded).
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const redwoodDistPath = path.resolve(__dirname, "../../redwood-title/dist/public");
  const maintainHomeDistPath = path.resolve(__dirname, "../../maintain-home/dist/public");

  function getStaticDir(host: string): string {
    if (host.includes("redwoodtitlecompany")) {
      return redwoodDistPath;
    }
    return maintainHomeDistPath;
  }

  function getOrigin(req: Request): string {
    const proto =
      (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const host =
      (req.headers["x-forwarded-host"] as string) ||
      req.get("host") ||
      "maintainhome.ai";
    return `${proto}://${host}`;
  }

  app.use((req: Request, res: Response, next: NextFunction) => {
    const staticDir = getStaticDir(req.hostname || "");
    if (existsSync(staticDir)) {
      express.static(staticDir, { index: false })(req, res, next);
    } else {
      next();
    }
  });

  // Cache index.html in memory so we don't readFileSync per request.
  const indexHtmlCache = new Map<string, { html: string; ts: number }>();
  const INDEX_HTML_TTL_MS = 1000 * 30;

  function readIndexCached(indexPath: string): string | null {
    const cached = indexHtmlCache.get(indexPath);
    if (cached && Date.now() - cached.ts < INDEX_HTML_TTL_MS) return cached.html;
    try {
      const html = readFileSync(indexPath, "utf-8");
      indexHtmlCache.set(indexPath, { html, ts: Date.now() });
      return html;
    } catch {
      return null;
    }
  }

  app.get("/{*path}", async (req: Request, res: Response) => {
    const staticDir = getStaticDir(req.hostname || "");
    const indexPath = path.join(staticDir, "index.html");
    if (!existsSync(indexPath)) {
      res.status(503).send("Site building — please try again shortly.");
      return;
    }

    const inviteInfo = parseInvitePath(req.path);
    if (inviteInfo) {
      try {
        const data = await loadInviteOgData(inviteInfo, getOrigin(req));
        if (data) {
          const html = readIndexCached(indexPath);
          if (html) {
            const injected = injectOgTags(html, data);
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
            res.send(injected);
            return;
          }
        }
      } catch (err) {
        console.error("[og] inject failed:", err);
      }
    }

    res.sendFile(indexPath);
  });
}

export default app;
