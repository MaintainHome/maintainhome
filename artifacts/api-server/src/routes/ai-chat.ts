import { Router, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient } from "../lib/anthropicClient";
import multer from "multer";
import { db, usersTable, homeProfilesTable, maintenanceDocumentsTable, brokerServiceProvidersTable, whiteLabelConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";
import { checkUserChatLimit } from "../middleware/rateLimit";
import type { DocumentData } from "./documents";

const router = Router();

// Multer – memory storage, 8 MB hard cap (per-type limits enforced in handler)
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

async function getStateFromZip(zip: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip.trim()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { places?: Array<{ state?: string }> };
    return data.places?.[0]?.["state"] ?? null;
  } catch {
    return null;
  }
}

const HOME_AGE_LABELS: Record<string, string> = {
  new_construction: "New construction",
  resale_recent: "Resale (built in last 10 years)",
  resale_old: "Resale (10+ years old)",
};
const HOME_TYPE_LABELS: Record<string, string> = {
  single_family: "Single family house",
  townhome: "Townhome",
  condo: "Condo/Apartment",
  other: "Other",
};
const ROOF_TYPE_LABELS: Record<string, string> = {
  asphalt: "Asphalt shingles",
  metal: "Metal roof",
  tile: "Tile roof",
  flat: "Flat roof",
  other: "Other/Unknown",
};
const WATER_SOURCE_LABELS: Record<string, string> = {
  municipal: "Municipal/city water",
  well: "Private well",
};
const SEWER_LABELS: Record<string, string> = {
  municipal: "Municipal sewer",
  septic: "Septic system",
};
const PEST_LABELS: Record<string, string> = {
  yes: "Yes, on a regular schedule",
  no: "No pest prevention schedule",
  not_sure: "Not sure",
};
const SQFT_LABELS: Record<string, string> = {
  under_1500: "Under 1,500 sq ft",
  "1500_2500": "1,500–2,500 sq ft",
  "2500_4000": "2,500–4,000 sq ft",
  over_4000: "Over 4,000 sq ft",
};
const LANDSCAPING_LABELS: Record<string, string> = {
  mostly_grass: "Mostly grass",
  natural_areas: "Natural areas/mulch beds",
  minimal: "Minimal landscaping",
};
const CRAWL_SEALED_LABELS: Record<string, string> = {
  yes: "Yes, sealed/encapsulated",
  no: "No, open/vented",
  not_sure: "Not sure",
};

function label(map: Record<string, string>, val: string | undefined): string {
  if (!val) return "Unknown";
  return map[val] ?? val;
}

interface HomeProfileData {
  fullAddress?: string | null;
  bedrooms?: number | null;
  bathrooms?: string | null;
  finishedBasement?: string | null;
  poolOrHotTub?: string | null;
  lastRenovationYear?: number | null;
  yearBuilt?: number | null;
  mortgageRate?: string | null;
}

interface BigTicketForecast {
  name: string;
  avgLife: number;
  costRange: string;
  roofLifeAdjust?: Record<string, number>;
}

const BIG_TICKET_FORECASTS: BigTicketForecast[] = [
  { name: "Roof", avgLife: 25, costRange: "$12,000–$25,000", roofLifeAdjust: { metal: 50, tile: 50, flat: 15 } },
  { name: "HVAC system", avgLife: 17, costRange: "$8,000–$15,000" },
  { name: "Water heater", avgLife: 12, costRange: "$1,200–$3,500" },
  { name: "Windows", avgLife: 25, costRange: "$8,000–$20,000" },
  { name: "Exterior paint", avgLife: 8, costRange: "$3,000–$8,000" },
  { name: "Electrical panel", avgLife: 30, costRange: "$2,500–$6,000" },
  { name: "Garage door", avgLife: 15, costRange: "$1,000–$3,500" },
  { name: "Major appliances", avgLife: 12, costRange: "$1,000–$3,000 each" },
];

function buildForecastContext(yearBuilt: number | null | undefined, currentYear: number, roofType?: string): string {
  if (!yearBuilt) return "";
  const age = currentYear - yearBuilt;
  const lines = BIG_TICKET_FORECASTS.map(item => {
    let life = item.avgLife;
    if (item.name === "Roof" && roofType && item.roofLifeAdjust?.[roofType]) {
      life = item.roofLifeAdjust[roofType];
    }
    const dueYear = yearBuilt + life;
    const yearsLeft = dueYear - currentYear;
    const status = yearsLeft < 0
      ? `OVERDUE by ${Math.abs(yearsLeft)} year(s)`
      : yearsLeft === 0 ? "DUE THIS YEAR"
      : yearsLeft <= 5 ? `due in ~${yearsLeft} years (IMMINENT)`
      : yearsLeft <= 10 ? `due in ~${yearsLeft} years (watch soon)`
      : `due ~${dueYear} (${yearsLeft} years away)`;
    return `  - ${item.name}: ${status}, est. cost ${item.costRange}`;
  });
  return `\nBig-ticket component forecasts (home built ${yearBuilt}, now ${age} years old):\n${lines.join("\n")}\nReference these forecasts when the user asks about major systems, planning, budgeting, or inspection timing. Always note these are averages and recommend professional inspection.`;
}

function buildDocumentContext(documents: { displayName: string | null; docType: string; warrantyData: unknown }[]): string {
  if (!documents.length) return "";

  const byType: Record<string, string[]> = {};
  for (const doc of documents) {
    const d = doc.warrantyData as DocumentData | null;
    const name = d?.documentTypeName ?? d?.productName ?? doc.displayName ?? "Unknown";
    const expiry = d?.expiryDate ? ` (expires ${d.expiryDate})` : d?.renewalDate ? ` (renews ${d.renewalDate})` : "";
    const issuer = d?.issuer ? ` | ${d.issuer}` : "";
    const coverage = d?.coverageDetails ? ` — ${d.coverageDetails}` : "";
    const serial = d?.serialNumber ? `, S/N: ${d.serialNumber}` : "";
    const policy = d?.policyNumber ? `, #${d.policyNumber}` : "";
    const entry = `  - ${name}${serial}${policy}${issuer}${expiry}${coverage}`;
    const category = doc.docType ?? "other";
    if (!byType[category]) byType[category] = [];
    byType[category].push(entry);
  }

  const LABELS: Record<string, string> = {
    warranty: "Warranties", hoa: "HOA Documents", insurance: "Insurance Policies",
    deed: "Deeds & Titles", manual: "Manuals", other: "Other Documents",
  };

  const sections = Object.entries(byType).map(([type, lines]) =>
    `${LABELS[type] ?? type}:\n${lines.join("\n")}`
  ).join("\n");

  return `\nHome documents on file:\n${sections}\nReference these documents when the user asks about warranties, insurance, HOA rules, property records, or any of the specific items above. Provide accurate, personalized guidance based on the details stored.`;
}

interface BrokerProviderContext {
  brokerName: string;
  providers: { category: string; companyName: string; contactName: string | null; phone: string | null; email: string | null; note: string | null }[];
}

function buildProviderContext(ctx: BrokerProviderContext | null): string {
  if (!ctx || !ctx.providers.length) return "";
  const lines = ctx.providers.map(p => {
    const contact = [p.contactName, p.phone, p.email].filter(Boolean).join(" | ");
    const note = p.note ? ` — "${p.note}"` : "";
    return `  - ${p.category}: ${p.companyName}${contact ? ` (${contact})` : ""}${note}`;
  });
  return `\nBroker-recommended service providers (from ${ctx.brokerName}):\n${lines.join("\n")}\nWhen the user asks about a home maintenance task and a matching provider exists above, say: "You have full autonomy to choose any service provider you like. Your broker ${ctx.brokerName} recommends [Company Name] for this type of work." Then share their contact info naturally. Only mention this if a provider is listed for the relevant category. Never be pushy — mention it once and move on to your advice.\n`;
}

function buildSystemPrompt(
  userZip: string | null,
  state: string | null,
  qa: Record<string, string>,
  homeProfile?: HomeProfileData | null,
  documents?: { displayName: string | null; docType: string; warrantyData: unknown }[],
  brokerContext?: BrokerProviderContext | null,
): string {
  const location = state ? `${state}${userZip ? ` (ZIP ${userZip})` : ""}` : userZip ?? "Unknown";
  const hasProfile = Object.keys(qa).length > 0;
  const currentYear = new Date().getFullYear();

  // Determine precise age line: prefer yearBuilt, fall back to quiz homeAge range
  let homeAgeLine: string;
  if (homeProfile?.yearBuilt) {
    const age = currentYear - homeProfile.yearBuilt;
    homeAgeLine = `Home built in ${homeProfile.yearBuilt} (${age} years old)`;
  } else if (hasProfile) {
    homeAgeLine = label(HOME_AGE_LABELS, qa.homeAge);
  } else {
    homeAgeLine = "Unknown";
  }

  const extraLines: string[] = [];
  if (homeProfile) {
    if (homeProfile.bedrooms) extraLines.push(`- Bedrooms: ${homeProfile.bedrooms}`);
    if (homeProfile.bathrooms) extraLines.push(`- Bathrooms: ${homeProfile.bathrooms}`);
    if (homeProfile.finishedBasement === "yes") extraLines.push(`- Has finished basement`);
    if (homeProfile.poolOrHotTub === "yes") extraLines.push(`- Has swimming pool or hot tub`);
    if (homeProfile.lastRenovationYear) extraLines.push(`- Last major renovation: ${homeProfile.lastRenovationYear}`);
    if (homeProfile.fullAddress) extraLines.push(`- Address: ${homeProfile.fullAddress}`);
  }

  const forecastContext = buildForecastContext(homeProfile?.yearBuilt, currentYear, qa.roofType);
  const warrantyContext = documents?.length ? buildDocumentContext(documents) : "";
  const providerContext = buildProviderContext(brokerContext ?? null);

  const profileSection = hasProfile
    ? `User profile:
- Location: ${location}
- Home age: ${homeAgeLine}
- Home type: ${label(HOME_TYPE_LABELS, qa.homeType)}
- Roof type: ${label(ROOF_TYPE_LABELS, qa.roofType)}
- Water: ${label(WATER_SOURCE_LABELS, qa.waterSource)}
- Sewer: ${label(SEWER_LABELS, qa.sewerSystem)}
- Approximate size: ${label(SQFT_LABELS, qa.sqft)}
- Crawl space: ${qa.crawlSpace === "yes" ? `Yes (${label(CRAWL_SEALED_LABELS, qa.crawlSpaceSealed)})` : qa.crawlSpace === "no" ? "No crawl space" : "Unknown"}
- Pest schedule: ${label(PEST_LABELS, qa.pestSchedule)}
- Landscaping: ${label(LANDSCAPING_LABELS, qa.landscaping)}${qa.allergies === "yes" && qa.allergiesDetails ? `\n- Pets/allergies: ${qa.allergiesDetails}` : ""}${extraLines.length > 0 ? "\n" + extraLines.join("\n") : ""}`
    : `User profile:\n- Location: ${location}\n- Home age: ${homeAgeLine}\n- Other details: Full home profile not available for this session.${extraLines.length > 0 ? "\n" + extraLines.join("\n") : ""}`;

  return `You are Maintly, a friendly, practical, and experienced home maintenance assistant.
You speak like a trusted, knowledgeable handyman who is helpful, clear, and safety-conscious.

${profileSection}${forecastContext}${warrantyContext}${providerContext}

Tone guidelines:
- Warm and approachable, but professional
- Use simple, everyday language
- Be encouraging when users are doing the right thing
- Always prioritize safety — if something involves electrical, structural, gas, or major systems, strongly recommend calling a licensed professional
- Keep answers practical and actionable (2-4 paragraphs max)
- Stay focused on home maintenance topics only. If the user asks about something unrelated to home maintenance, politely redirect them.

SMS reminders: Users can enable SMS text reminders for critical recurring tasks (smoke detector batteries, air filter replacement, winter prep, etc.) via their home profile settings at maintainhome.ai. If users ask about SMS reminders, explain that they can go to their Home Profile → SMS Reminders section to enable it and add a phone number. Standard message and data rates apply.

Always end every response with this disclaimer on its own line:
"⚠️ This is general guidance only and not a substitute for professional inspection or repair. Consult a licensed contractor when needed."

Start most responses with something like "Hey there, it's Maintly." or "Good question — here's what I recommend." but vary your opening naturally so it doesn't feel repetitive.`;
}

router.post("/ai/chat", requireAuth as any, async (req: AuthRequest, res: Response) => {
  // Verify user has Pro subscription first (before API key check)
  const [user] = await db
    .select({ subscriptionStatus: usersTable.subscriptionStatus, zipCode: usersTable.zipCode, referralSubdomain: usersTable.referralSubdomain })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User not found." });
    return;
  }

  const proStatuses = ["pro_monthly", "pro_annual", "promo_pro"];
  if (!proStatuses.includes(user.subscriptionStatus)) {
    res.status(403).json({ error: "Pro subscription required to use AI chat." });
    return;
  }

  const rateCheck = checkUserChatLimit(req.userId!, true);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: rateCheck.error, retryAfter: rateCheck.retryAfter });
    return;
  }

  const anthropic = createAnthropicClient();
  if (!anthropic) {
    res.status(503).json({ error: "AI service not configured." });
    return;
  }

  const { message, history = [], quizAnswers = {} } = req.body as {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
    quizAnswers: Record<string, string>;
  };

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message is required." });
    return;
  }

  // Look up state from ZIP
  const zip = quizAnswers.zip ?? user.zipCode ?? null;
  const state = zip ? await getStateFromZip(zip) : null;

  // Fetch home profile, documents, and broker service providers in parallel
  const [homeProfile] = await db
    .select()
    .from(homeProfilesTable)
    .where(eq(homeProfilesTable.userId, req.userId!))
    .limit(1);

  const [homeDocs, brokerContext] = await Promise.all([
    db.select({ displayName: maintenanceDocumentsTable.displayName, docType: maintenanceDocumentsTable.docType, warrantyData: maintenanceDocumentsTable.warrantyData })
      .from(maintenanceDocumentsTable)
      .where(eq(maintenanceDocumentsTable.userId, req.userId!)),
    (async (): Promise<BrokerProviderContext | null> => {
      const sub = user.referralSubdomain;
      if (!sub) return null;
      const [brokerConfig] = await db.select({ brokerName: whiteLabelConfigsTable.brokerName })
        .from(whiteLabelConfigsTable).where(eq(whiteLabelConfigsTable.subdomain, sub)).limit(1);
      if (!brokerConfig) return null;
      const providers = await db.select({
        category: brokerServiceProvidersTable.category,
        companyName: brokerServiceProvidersTable.companyName,
        contactName: brokerServiceProvidersTable.contactName,
        phone: brokerServiceProvidersTable.phone,
        email: brokerServiceProvidersTable.email,
        note: brokerServiceProvidersTable.note,
      }).from(brokerServiceProvidersTable)
        .where(eq(brokerServiceProvidersTable.brokerSubdomain, sub));
      return providers.length ? { brokerName: brokerConfig.brokerName, providers } : null;
    })(),
  ]);

  const systemPrompt = buildSystemPrompt(zip, state, quizAnswers, homeProfile ?? null, homeDocs, brokerContext);

  // Build messages array (keep last 10 turns for context)
  const contextHistory = history.slice(-10);
  const messages: { role: "user" | "assistant"; content: string }[] = [
    ...contextHistory,
    { role: "user", content: message.trim() },
  ];

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const stream = anthropic.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("[ai-chat] Claude error:", err);
    res.write(`data: ${JSON.stringify({ error: "AI service error. Please try again." })}\n\n`);
    res.end();
  }
});

// ── POST /api/ai/chat-with-file  (Pro only, multipart) ────────────────────
router.post(
  "/ai/chat-with-file",
  requireAuth as any,
  (upload.single("file") as any),
  async (req: AuthRequest, res: Response) => {
    // Pro check
    const [user] = await db
      .select({ subscriptionStatus: usersTable.subscriptionStatus, zipCode: usersTable.zipCode })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    if (!user) { res.status(401).json({ error: "User not found." }); return; }

    const proStatuses = ["pro_monthly", "pro_annual", "promo_pro"];
    if (!proStatuses.includes(user.subscriptionStatus)) {
      res.status(403).json({ error: "Pro subscription required to upload files." });
      return;
    }

    const anthropic = createAnthropicClient();
    if (!anthropic) { res.status(503).json({ error: "AI service not configured." }); return; }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: "No file uploaded." }); return; }

    // Per-type size enforcement
    const isImage = file.mimetype.startsWith("image/");
    const maxBytes = isImage ? 5 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      res.status(400).json({ error: `File is too large. Max ${isImage ? "5MB" : "8MB"} for ${isImage ? "images" : "PDFs"}.` });
      return;
    }

    const message = ((req.body.message as string) || "").trim();
    let quizAnswers: Record<string, string> = {};
    try { quizAnswers = JSON.parse((req.body.quizAnswers as string) || "{}"); } catch {}

    // Look up state + home profile + all home documents
    const zip = quizAnswers.zip ?? user.zipCode ?? null;
    const state = zip ? await getStateFromZip(zip) : null;
    const [homeProfile] = await db
      .select()
      .from(homeProfilesTable)
      .where(eq(homeProfilesTable.userId, req.userId!))
      .limit(1);

    const homeDocs = await db
      .select({ displayName: maintenanceDocumentsTable.displayName, docType: maintenanceDocumentsTable.docType, warrantyData: maintenanceDocumentsTable.warrantyData })
      .from(maintenanceDocumentsTable)
      .where(eq(maintenanceDocumentsTable.userId, req.userId!));

    const systemPrompt = buildSystemPrompt(zip, state, quizAnswers, homeProfile ?? null, homeDocs);

    // Build Claude content blocks
    const base64Data = file.buffer.toString("base64");
    const userText = message || (isImage
      ? "Please analyze this image and give me maintenance advice based on what you see."
      : "Please analyze this document and summarize key details, flag concerns, and suggest any maintenance actions needed.");

    type ImageBlock = {
      type: "image";
      source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: string };
    };
    type DocumentBlock = {
      type: "document";
      source: { type: "base64"; media_type: "application/pdf"; data: string };
    };
    type TextBlock = { type: "text"; text: string };

    const fileBlock: ImageBlock | DocumentBlock = isImage
      ? { type: "image", source: { type: "base64", media_type: file.mimetype as "image/jpeg" | "image/png", data: base64Data } }
      : { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } };

    const content: (ImageBlock | DocumentBlock | TextBlock)[] = [
      fileBlock,
      { type: "text", text: userText },
    ];

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    try {
      const stream = anthropic.messages.stream({
        model: "claude-haiku-4-5",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: content as any }],
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      console.error("[ai-chat-file] Claude error:", err);
      res.write(`data: ${JSON.stringify({ error: "AI service error. Please try again." })}\n\n`);
      res.end();
    }
  }
);

export default router;
