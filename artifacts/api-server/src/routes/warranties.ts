import { Router, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient } from "../lib/anthropicClient";
import multer from "multer";
import { db, usersTable, maintenanceDocumentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const objectStorageService = new ObjectStorageService();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG images and PDF documents are supported."));
    }
  },
});

export interface WarrantyData {
  productName: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  expiryDate: string | null;
  coverageDetails: string | null;
  nextActions: string[];
  confidence: "high" | "medium" | "low";
}

const WARRANTY_EXTRACTION_PROMPT = `You are analyzing a warranty document or photo. Extract the following information and respond ONLY with valid JSON (no markdown code blocks, no explanation, just raw JSON).

Required JSON structure:
{
  "productName": "the product or item name",
  "modelNumber": "model or part number if visible, or null",
  "serialNumber": "serial number if visible, or null",
  "purchaseDate": "YYYY-MM-DD format if found, or null",
  "expiryDate": "YYYY-MM-DD format if found, or null",
  "coverageDetails": "1-2 sentence description of what is covered",
  "nextActions": ["action 1 (e.g. Register product)", "action 2 (e.g. Schedule first service)"],
  "confidence": "high" or "medium" or "low"
}

Rules:
- Always output raw JSON only, no surrounding text
- Use null (not empty string) for unknown values
- Format all dates as YYYY-MM-DD
- nextActions should be practical, specific steps the homeowner should take
- confidence reflects how legible/complete the document is`;

// ── POST /api/warranties/analyze ──────────────────────────────────────────────
router.post(
  "/warranties/analyze",
  requireAuth as any,
  (upload.single("file") as any),
  async (req: AuthRequest, res: Response) => {
    const [user] = await db
      .select({ subscriptionStatus: usersTable.subscriptionStatus })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "User not found." });
      return;
    }

    const anthropic = createAnthropicClient();
    if (!anthropic) {
      res.status(503).json({ error: "AI service not configured." });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "No file uploaded." });
      return;
    }

    const isImage = file.mimetype.startsWith("image/");
    const maxBytes = isImage ? 5 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      res.status(400).json({
        error: `File too large. Max ${isImage ? "5MB for images" : "8MB for PDFs"}.`,
      });
      return;
    }

    type ImageBlock = {
      type: "image";
      source: { type: "base64"; media_type: "image/jpeg" | "image/png"; data: string };
    };
    type DocumentBlock = {
      type: "document";
      source: { type: "base64"; media_type: "application/pdf"; data: string };
    };
    type TextBlock = { type: "text"; text: string };

    const base64Data = file.buffer.toString("base64");
    const fileBlock: ImageBlock | DocumentBlock = isImage
      ? { type: "image", source: { type: "base64", media_type: file.mimetype as "image/jpeg" | "image/png", data: base64Data } }
      : { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } };

    const content: (ImageBlock | DocumentBlock | TextBlock)[] = [
      fileBlock,
      { type: "text", text: WARRANTY_EXTRACTION_PROMPT },
    ];

    let warrantyData: WarrantyData;
    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: content as any }],
      });

      const rawText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();

      const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      warrantyData = JSON.parse(cleaned) as WarrantyData;
      if (!Array.isArray(warrantyData.nextActions)) {
        warrantyData.nextActions = [];
      }
    } catch (err) {
      console.error("[warranties] Claude extraction error:", err);
      res.status(500).json({ error: "Failed to analyze document. Please try again." });
      return;
    }

    let objectPath: string;
    try {
      objectPath = await objectStorageService.uploadFile(
        file.buffer,
        file.mimetype,
        "warranties",
      );
    } catch (err) {
      console.error("[warranties] Storage upload error:", err);
      res.status(500).json({ error: "Failed to store document. Please try again." });
      return;
    }

    const displayName = warrantyData.productName ?? file.originalname;

    const [doc] = await db
      .insert(maintenanceDocumentsTable)
      .values({
        userId: req.userId!,
        fileName: file.originalname,
        objectPath,
        contentType: file.mimetype,
        fileSizeBytes: file.size,
        docType: "warranty",
        displayName,
        warrantyData,
      })
      .returning();

    res.status(201).json({ doc, warrantyData });
  }
);

// ── GET /api/warranties ────────────────────────────────────────────────────────
router.get("/warranties", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const warranties = await db
    .select()
    .from(maintenanceDocumentsTable)
    .where(
      and(
        eq(maintenanceDocumentsTable.userId, req.userId!),
        eq(maintenanceDocumentsTable.docType, "warranty")
      )
    )
    .orderBy(desc(maintenanceDocumentsTable.uploadedAt));

  res.json(warranties);
});

// ── DELETE /api/warranties/:id ─────────────────────────────────────────────────
router.delete("/warranties/:id", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(maintenanceDocumentsTable)
    .where(
      and(
        eq(maintenanceDocumentsTable.id, id),
        eq(maintenanceDocumentsTable.userId, req.userId!)
      )
    );
  res.json({ ok: true });
});

export default router;
