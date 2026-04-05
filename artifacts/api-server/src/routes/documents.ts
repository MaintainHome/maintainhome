import { Router, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
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
    const allowed = [
      "image/jpeg", "image/jpg", "image/png", "image/webp",
      "application/pdf",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WebP images and PDF documents are supported."));
    }
  },
});

export type DocCategory = "warranty" | "hoa" | "insurance" | "deed" | "manual" | "other";

export interface DocumentData {
  documentType: DocCategory;
  documentTypeName: string;
  productName: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  issuer: string | null;
  policyNumber: string | null;
  purchaseDate: string | null;
  effectiveDate: string | null;
  expiryDate: string | null;
  renewalDate: string | null;
  coverageAmount: string | null;
  coverageDetails: string | null;
  importantTerms: string | null;
  nextActions: string[];
  confidence: "high" | "medium" | "low";
}

const DOCUMENT_EXTRACTION_PROMPT = `You are Maintly, an AI home ownership assistant. Analyze this home document or photo and extract key information. Respond ONLY with raw JSON (no markdown, no code blocks, just valid JSON).

First, identify what type of document this is:
- "warranty": Product warranty, appliance guarantee, service contract
- "hoa": HOA rules, CC&Rs, community guidelines, HOA fees/dues notice
- "insurance": Homeowners insurance, flood insurance, umbrella policy, life insurance
- "deed": Property deed, title document, land record, survey
- "manual": Appliance manual, owner's manual, installation guide
- "other": Anything else (utility bill, receipt, inspection report, etc.)

Required JSON structure:
{
  "documentType": "warranty" | "hoa" | "insurance" | "deed" | "manual" | "other",
  "documentTypeName": "descriptive name e.g. 'HVAC Warranty' or 'Homeowners Insurance Policy'",
  "productName": "product/appliance name for warranties/manuals, or document subject, or null",
  "modelNumber": "model or part number if visible, or null",
  "serialNumber": "serial number if visible, or null",
  "issuer": "company/organization issuing the document (insurance co, HOA name, manufacturer), or null",
  "policyNumber": "policy, account, or reference number if present, or null",
  "purchaseDate": "YYYY-MM-DD if found, or null",
  "effectiveDate": "YYYY-MM-DD when coverage/agreement starts, or null",
  "expiryDate": "YYYY-MM-DD when coverage/warranty expires, or null",
  "renewalDate": "YYYY-MM-DD next renewal/review date, or null",
  "coverageAmount": "dollar amount of coverage for insurance, or null",
  "coverageDetails": "2-3 sentence summary of what this document covers or its key purpose",
  "importantTerms": "1-2 sentences of any critical terms, exclusions, or things the homeowner must know",
  "nextActions": ["specific action 1", "specific action 2"],
  "confidence": "high" | "medium" | "low"
}

Rules:
- Output raw JSON only — no surrounding text whatsoever
- Use null (not empty string) for unknown values
- Format all dates as YYYY-MM-DD
- nextActions: 1-3 practical steps the homeowner should take (e.g. "Register product at manufacturer website", "Pay HOA dues by March 1", "File claim if damage occurs")
- confidence: high = fully legible, all key fields visible; medium = partially legible; low = hard to read or uncertain`;

// ── POST /api/documents/analyze ──────────────────────────────────────────────
router.post(
  "/documents/analyze",
  requireAuth as any,
  (upload.single("file") as any),
  async (req: AuthRequest, res: Response) => {
    const [user] = await db
      .select({ id: usersTable.id, subscriptionStatus: usersTable.subscriptionStatus, fullAccess: usersTable.fullAccess })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    if (!user) { res.status(401).json({ error: "User not found." }); return; }

    const isPro = user.fullAccess ||
      ["pro_monthly", "pro_annual", "promo_pro"].includes(user.subscriptionStatus);

    if (!isPro) {
      res.status(403).json({ error: "Document upload is a Pro feature. Please upgrade to analyze and store documents." });
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) { res.status(503).json({ error: "AI service not configured." }); return; }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: "No file uploaded." }); return; }

    const isImage = file.mimetype.startsWith("image/");
    const maxBytes = isImage ? 5 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      res.status(400).json({
        error: `File too large. Max ${isImage ? "5MB for images" : "8MB for PDFs"}.`,
      });
      return;
    }

    const anthropic = new Anthropic({ apiKey });
    const base64Data = file.buffer.toString("base64");

    type ImageBlock = { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/webp"; data: string } };
    type DocumentBlock = { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };
    type TextBlock = { type: "text"; text: string };

    const fileBlock: ImageBlock | DocumentBlock = isImage
      ? { type: "image", source: { type: "base64", media_type: file.mimetype as "image/jpeg" | "image/png" | "image/webp", data: base64Data } }
      : { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } };

    const content: (ImageBlock | DocumentBlock | TextBlock)[] = [
      fileBlock,
      { type: "text", text: DOCUMENT_EXTRACTION_PROMPT },
    ];

    let docData: DocumentData;
    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1536,
        messages: [{ role: "user", content: content as any }],
      });

      const rawText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();

      const cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "").trim();
      docData = JSON.parse(cleaned) as DocumentData;
      if (!Array.isArray(docData.nextActions)) docData.nextActions = [];
    } catch (err) {
      console.error("[documents] Claude extraction error:", err);
      res.status(500).json({ error: "Failed to analyze document. Please try again." });
      return;
    }

    let objectPath: string;
    try {
      objectPath = await objectStorageService.uploadFile(
        file.buffer,
        file.mimetype,
        "home-documents",
      );
    } catch (err) {
      console.error("[documents] Storage upload error:", err);
      res.status(500).json({ error: "Failed to store document. Please try again." });
      return;
    }

    const displayName =
      docData.documentTypeName ??
      docData.productName ??
      file.originalname;

    const [doc] = await db
      .insert(maintenanceDocumentsTable)
      .values({
        userId: req.userId!,
        fileName: file.originalname,
        objectPath,
        contentType: file.mimetype,
        fileSizeBytes: file.size,
        docType: docData.documentType,
        displayName,
        warrantyData: docData as any,
      })
      .returning();

    res.status(201).json({ doc, docData });
  }
);

// ── GET /api/documents ────────────────────────────────────────────────────────
router.get("/documents", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const docs = await db
    .select()
    .from(maintenanceDocumentsTable)
    .where(eq(maintenanceDocumentsTable.userId, req.userId!))
    .orderBy(desc(maintenanceDocumentsTable.uploadedAt));
  res.json(docs);
});

// ── DELETE /api/documents/:id ─────────────────────────────────────────────────
router.delete("/documents/:id", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .delete(maintenanceDocumentsTable)
    .where(and(
      eq(maintenanceDocumentsTable.id, id),
      eq(maintenanceDocumentsTable.userId, req.userId!)
    ));
  res.json({ ok: true });
});

export default router;
