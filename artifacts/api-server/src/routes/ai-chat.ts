import { Router, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db, usersTable, homeProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";

const router = Router();

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

function buildSystemPrompt(
  userZip: string | null,
  state: string | null,
  qa: Record<string, string>,
  homeProfile?: HomeProfileData | null,
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

${profileSection}

Tone guidelines:
- Warm and approachable, but professional
- Use simple, everyday language
- Be encouraging when users are doing the right thing
- Always prioritize safety — if something involves electrical, structural, gas, or major systems, strongly recommend calling a licensed professional
- Keep answers practical and actionable (2-4 paragraphs max)
- Stay focused on home maintenance topics only. If the user asks about something unrelated to home maintenance, politely redirect them.

Always end every response with this disclaimer on its own line:
"⚠️ This is general guidance only and not a substitute for professional inspection or repair. Consult a licensed contractor when needed."

Start most responses with something like "Hey there, it's Maintly." or "Good question — here's what I recommend." but vary your opening naturally so it doesn't feel repetitive.`;
}

router.post("/ai/chat", requireAuth as any, async (req: AuthRequest, res: Response) => {
  // Verify user has Pro subscription first (before API key check)
  const [user] = await db
    .select({ subscriptionStatus: usersTable.subscriptionStatus, zipCode: usersTable.zipCode })
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
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

  // Fetch home profile for richer context
  const [homeProfile] = await db
    .select()
    .from(homeProfilesTable)
    .where(eq(homeProfilesTable.userId, req.userId!))
    .limit(1);

  const systemPrompt = buildSystemPrompt(zip, state, quizAnswers, homeProfile ?? null);

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

  const anthropic = new Anthropic({ apiKey });

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

export default router;
