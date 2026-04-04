import { Router, type Request, type Response } from "express";
import { db, whiteLabelConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import multer from "multer";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const objectStorage = new ObjectStorageService();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

router.post("/logo-upload", imageUpload.single("logo"), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }
    const logoUrl = await objectStorage.uploadFile(file.buffer, file.mimetype, "broker-logos");
    res.json({ logoUrl });
  } catch (err: any) {
    console.error("[logo-upload] error:", err);
    if (err.message === "Only image files are allowed") {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Failed to upload logo. Please try a URL instead." });
  }
});

router.post("/photo-upload", imageUpload.single("photo"), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }
    const photoUrl = await objectStorage.uploadFile(file.buffer, file.mimetype, "broker-photos");
    res.json({ photoUrl });
  } catch (err: any) {
    console.error("[photo-upload] error:", err);
    if (err.message === "Only image files are allowed") {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Failed to upload photo. Please try a URL instead." });
  }
});

const SUBDOMAIN_RE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
const RESERVED = new Set(["www", "app", "api", "admin", "mail", "support", "help", "broker"]);

router.post("/broker-onboard", async (req: Request, res: Response) => {
  try {
    const {
      subdomain,
      brokerName,
      logoUrl,
      agentPhotoUrl,
      phoneNumber,
      tagline,
      welcomeMessage,
      contactEmail,
      type,
      monetizationModel,
      giftDuration,
    } = req.body as Record<string, string>;

    if (!subdomain || !brokerName || !contactEmail || !type) {
      res.status(400).json({ error: "subdomain, brokerName, contactEmail, and type are required" });
      return;
    }

    if (!tagline?.trim()) {
      res.status(400).json({ error: "A custom tagline is required." });
      return;
    }

    if (!welcomeMessage?.trim()) {
      res.status(400).json({ error: "A welcome message is required." });
      return;
    }

    const cleanSub = subdomain.toLowerCase().trim();

    if (!SUBDOMAIN_RE.test(cleanSub)) {
      res.status(400).json({
        error: "Subdomain must be 3–32 lowercase letters, numbers, or hyphens and cannot start/end with a hyphen",
      });
      return;
    }

    if (RESERVED.has(cleanSub)) {
      res.status(400).json({ error: "That subdomain is reserved. Please choose another." });
      return;
    }

    if (!["individual_agent", "team_leader"].includes(type)) {
      res.status(400).json({ error: "type must be individual_agent or team_leader" });
      return;
    }

    const existing = await db
      .select({ id: whiteLabelConfigsTable.id, status: whiteLabelConfigsTable.status })
      .from(whiteLabelConfigsTable)
      .where(eq(whiteLabelConfigsTable.subdomain, cleanSub))
      .limit(1);

    if (existing.length > 0) {
      const e = existing[0];
      if (e.status === "pending") {
        res.status(409).json({ error: "This subdomain already has a pending application. We'll review it shortly." });
      } else if (e.status === "approved") {
        res.status(409).json({ error: "This subdomain is already in use." });
      } else {
        res.status(409).json({ error: "This subdomain was previously rejected. Please contact support." });
      }
      return;
    }

    const validMonetization = ["private_label", "closing_gift"].includes(monetizationModel)
      ? (monetizationModel as "private_label" | "closing_gift")
      : "private_label";

    const validGiftDuration =
      validMonetization === "closing_gift" && ["1year", "3years"].includes(giftDuration)
        ? (giftDuration as "1year" | "3years")
        : null;

    await db.insert(whiteLabelConfigsTable).values({
      subdomain: cleanSub,
      brokerName: brokerName.trim(),
      logoUrl: logoUrl?.trim() || null,
      agentPhotoUrl: agentPhotoUrl?.trim() || null,
      phoneNumber: phoneNumber?.trim() || null,
      tagline: tagline?.trim() || null,
      welcomeMessage: welcomeMessage?.trim() || null,
      contactEmail: contactEmail.trim().toLowerCase(),
      type: type as "individual_agent" | "team_leader",
      monetizationModel: validMonetization,
      giftDuration: validGiftDuration,
      status: "pending",
    });

    res.status(201).json({
      message: "Application submitted! We'll review it and get back to you within 1-2 business days.",
    });
  } catch (err) {
    console.error("[broker-onboard] POST error:", err);
    res.status(500).json({ error: "Failed to submit application" });
  }
});

export default router;
