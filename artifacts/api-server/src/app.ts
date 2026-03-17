import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import router from "./routes";
import path from "path";
import { existsSync } from "fs";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

  app.use((req: Request, res: Response, next: NextFunction) => {
    const staticDir = getStaticDir(req.hostname || "");
    if (existsSync(staticDir)) {
      express.static(staticDir)(req, res, next);
    } else {
      next();
    }
  });

  app.get("/{*path}", (req: Request, res: Response) => {
    const staticDir = getStaticDir(req.hostname || "");
    const indexPath = path.join(staticDir, "index.html");
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(503).send("Site building — please try again shortly.");
    }
  });
}

export default app;
