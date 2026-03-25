import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

async function getStateFromZip(zip: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip.trim()}`);
    if (!res.ok) return null;
    const data = await res.json() as { places?: Array<{ state?: string }> };
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
  yes: "Yes, on a regular monthly/quarterly schedule",
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

router.post("/generate-calendar", async (req, res) => {
  const {
    zip, homeAge, homeType, roofType, waterSource, sewerSystem, pestSchedule,
    sqft, allergies, allergiesDetails, crawlSpace, crawlSpaceSealed, landscaping,
  } = req.body;

  if (!zip) {
    res.status(400).json({ error: "ZIP code is required" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[calendar] ANTHROPIC_API_KEY not set");
    res.status(503).json({ error: "AI service is not configured. Please add ANTHROPIC_API_KEY to deployment secrets." });
    return;
  }

  const state = await getStateFromZip(zip) ?? "your state";
  const homeAgeLabel      = HOME_AGE_LABELS[homeAge]           ?? homeAge        ?? "Unknown";
  const homeTypeLabel     = HOME_TYPE_LABELS[homeType]         ?? homeType       ?? "Unknown";
  const roofTypeLabel     = ROOF_TYPE_LABELS[roofType]         ?? roofType       ?? "Unknown";
  const waterSourceLabel  = WATER_SOURCE_LABELS[waterSource]   ?? waterSource    ?? "Unknown";
  const sewerLabel        = SEWER_LABELS[sewerSystem]          ?? sewerSystem    ?? "Unknown";
  const pestLabel         = PEST_LABELS[pestSchedule]          ?? pestSchedule   ?? "Unknown";
  const sqftLabel         = SQFT_LABELS[sqft]                  ?? sqft           ?? "Unknown";
  const landscapingLabel  = LANDSCAPING_LABELS[landscaping]    ?? landscaping    ?? "Unknown";
  const allergiesText     = allergies === "yes"
    ? `Yes${allergiesDetails ? ` — ${allergiesDetails}` : ""}`
    : "No";
  const crawlSpaceText    = crawlSpace === "yes"
    ? `Yes (${CRAWL_SEALED_LABELS[crawlSpaceSealed] ?? "status unknown"})`
    : "No";

  console.log(`[calendar] Generating for ZIP ${zip} → ${state}, ${homeTypeLabel}, ${homeAgeLabel}, roof: ${roofTypeLabel}`);

  const systemPrompt = `You are MaintainHome AI, a home maintenance scheduler.
Location: ${state}. Home age: ${homeAgeLabel}. Type: ${homeTypeLabel}. Roof: ${roofTypeLabel}. Size: ${sqftLabel}.
Water: ${waterSourceLabel}. Sewer: ${sewerLabel}. Pest prevention: ${pestLabel}.
Allergies: ${allergiesText}. Crawl space: ${crawlSpaceText}. Landscaping: ${landscapingLabel}.

Generate a 12-month maintenance calendar for ${state}. Spread tasks across all 12 months. Include 2-4 tasks per month maximum. Be CONCISE — keep "why" and "tip" fields under 15 words each.

Tailor tasks to their specific systems:
- Roof type (${roofTypeLabel}): time inspections/cleaning to that roof material's needs
- Water (${waterSourceLabel}): include well testing/pump checks if private well
- Sewer (${sewerLabel}): include septic pumping/inspection if on septic system
- Pest (${pestLabel}): adjust pest control tasks based on whether they already have a service
- Crawl space (${crawlSpaceText}): include moisture/mold checks, and vapor barrier tasks if vented
- Allergies: suggest HEPA filters or extra air quality tasks if yes

Also distribute at state-appropriate times: HVAC filter changes, gutter cleaning, smoke/CO detector batteries, lawn care, exterior inspection, window caulking, appliance maintenance.

Output ONLY valid compact JSON, no markdown, no code fences:
{"state":"${state}","calendar":[{"month":"January","tasks":[{"task":"string","difficulty":"DIY or Pro","cost":"$X-Y","why":"≤15 words","tip":"≤15 words"}]}],"big_ticket_alerts":["string"],"one_time_tasks":["string"]}

big_ticket_alerts: 3 items max. one_time_tasks: 3 items max.`;

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        { role: "user", content: "Generate my personalized home maintenance calendar." },
      ],
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    if (message.stop_reason === "max_tokens") {
      console.error("[calendar] Response truncated — hit max_tokens. Raw length:", text.length);
      res.status(500).json({ error: "The AI response was too long and got cut off. Please try again — it usually works on retry." });
      return;
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[calendar] No JSON found in Claude response:", text.slice(0, 200));
      res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      return;
    }

    let calendar;
    try {
      calendar = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("[calendar] JSON parse failed. stop_reason:", message.stop_reason, "text length:", text.length);
      res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      return;
    }

    console.log(`[calendar] Generated successfully for ${state}, ${calendar.calendar?.length ?? 0} months`);
    res.json(calendar);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[calendar] Error:", msg);
    res.status(500).json({ error: "Failed to generate calendar. Please try again." });
  }
});

export default router;
