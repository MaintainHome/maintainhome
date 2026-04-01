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

const BIG_TICKET_FORECAST_ITEMS = [
  { name: "Roof", avgLife: 25, costRange: "$12,000–$25,000", metalTileLife: 50, flatLife: 15 },
  { name: "HVAC system", avgLife: 17, costRange: "$8,000–$15,000" },
  { name: "Water heater", avgLife: 12, costRange: "$1,200–$3,500" },
  { name: "Windows", avgLife: 25, costRange: "$8,000–$20,000" },
  { name: "Exterior paint", avgLife: 8, costRange: "$3,000–$8,000" },
  { name: "Electrical panel", avgLife: 30, costRange: "$2,500–$6,000" },
  { name: "Major appliances", avgLife: 12, costRange: "$1,000–$3,000 each" },
];

function buildCalendarForecastContext(yearBuilt: number | null | undefined, currentYear: number, roofType?: string): string {
  if (!yearBuilt) return "";
  const age = currentYear - yearBuilt;
  const lines = BIG_TICKET_FORECAST_ITEMS.map(item => {
    let life = item.avgLife;
    if (item.name === "Roof" && roofType) {
      if (roofType === "metal" || roofType === "tile") life = (item as any).metalTileLife ?? life;
      else if (roofType === "flat") life = (item as any).flatLife ?? life;
    }
    const dueYear = yearBuilt + life;
    const yearsLeft = dueYear - currentYear;
    const status = yearsLeft < 0
      ? `OVERDUE by ${Math.abs(yearsLeft)} yr(s) — consider adding an inspection task`
      : yearsLeft <= 5 ? `due ~${dueYear} (IMMINENT — include preparatory inspection tasks)`
      : yearsLeft <= 10 ? `due ~${dueYear} (approaching — include monitoring tasks)`
      : `due ~${dueYear} (${yearsLeft} years — routine maintenance only)`;
    return `  - ${item.name}: ${status}, cost ${item.costRange}`;
  });
  return `\n\nBig-ticket component forecasts for this ${age}-year-old home (built ${yearBuilt}):\n${lines.join("\n")}\nUse these forecasts to: (1) include relevant inspection tasks in the calendar, (2) flag any overdue or imminent items as big_ticket_alerts, and (3) suggest one-time inspection tasks for items due within 5 years.`;
}

router.post("/generate-calendar", async (req, res) => {
  const {
    zip, homeAge, homeType, roofType, waterSource, sewerSystem, pestSchedule,
    sqft, allergies, allergiesDetails, crawlSpace, crawlSpaceSealed, landscaping,
    homeProfile,
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

  const currentYear = new Date().getFullYear();

  // Determine precise home age: prefer yearBuilt from home profile, fall back to quiz homeAge range
  let homeAgeContext: string;
  if (homeProfile?.yearBuilt) {
    const age = currentYear - homeProfile.yearBuilt;
    homeAgeContext = `Home built in ${homeProfile.yearBuilt} (${age} years old — use this precise age for lifespan calculations: roof, HVAC, windows, appliances, water heater, etc.)`;
  } else {
    homeAgeContext = `Home age: ${homeAgeLabel}`;
  }

  const homeProfileLines: string[] = [];
  if (homeProfile) {
    if (homeProfile.bedrooms) homeProfileLines.push(`Bedrooms: ${homeProfile.bedrooms}`);
    if (homeProfile.bathrooms) homeProfileLines.push(`Bathrooms: ${homeProfile.bathrooms}`);
    if (homeProfile.finishedBasement === "yes") homeProfileLines.push(`Has finished basement`);
    if (homeProfile.poolOrHotTub === "yes") homeProfileLines.push(`Has swimming pool or hot tub`);
    if (homeProfile.lastRenovationYear) homeProfileLines.push(`Last major renovation: ${homeProfile.lastRenovationYear}`);
  }
  const homeProfileContext = homeProfileLines.length > 0
    ? `\nAdditional home details: ${homeProfileLines.join(". ")}.`
    : "";

  const forecastContext = buildCalendarForecastContext(homeProfile?.yearBuilt, currentYear, roofType);

  const systemPrompt = `You are MaintainHome AI, a home maintenance scheduler.
Location: ${state}. ${homeAgeContext}. Type: ${homeTypeLabel}. Roof: ${roofTypeLabel}. Size: ${sqftLabel}.
Water: ${waterSourceLabel}. Sewer: ${sewerLabel}. Pest prevention: ${pestLabel}.
Allergies: ${allergiesText}. Crawl space: ${crawlSpaceText}. Landscaping: ${landscapingLabel}.${homeProfileContext}${forecastContext}

Generate a 12-month maintenance calendar for ${state}. Spread tasks across all 12 months. Include 3-5 tasks per month. Be CONCISE — keep "why" and "tip" fields under 15 words each.

═══ NON-NEGOTIABLE RECURRING RULES (always include, every calendar) ═══

1. HVAC AIR FILTER REPLACEMENT — every 3 months without exception:
   - January, April, July, October are the default months.
   - Only shift by 1 month if the state's climate strongly demands it (e.g. heavy pollen season starts February → move first change to February).
   - Task name: "Replace HVAC air filter", difficulty: "DIY", cost: "$15-40".

2. SMOKE & CO DETECTOR BATTERY CHECK — once per year:
   - Default month: October (fall prep). Use November only if October is very full for that state.
   - Task name: "Test and replace smoke/CO detector batteries", difficulty: "DIY", cost: "$10-20".

3. WINTER PREPARATION TASKS — add ALL THREE to the first winter-prep month for ${state}:
   - For northern/mid-Atlantic states (including NC, VA, MD, PA, NJ, NY, etc.): use November.
   - For deep southern states (FL, GA, AL, MS, LA, TX): use December.
   - The three mandatory winter-prep tasks are:
     a. "Drip faucets on coldest nights to prevent freezing", DIY, $0
     b. "Insulate exposed exterior water pipes", DIY, $10-30
     c. "Unplug and drain all exterior garden hoses", DIY, $0

4. PRESSURE WASHING — once per year:
   - Best month for high-pollen states (NC, TN, GA, VA, etc.): April (after peak pollen).
   - Best month for other states: September (fall prep).
   - Task: "Pressure wash exterior siding, driveway, and walkways", difficulty: "DIY or Pro", cost: "$75-200".

5. TREE LIMB INSPECTION — twice per year, spring AND fall:
   - Spring: March or April. Fall: September or October.
   - Task: "Inspect and trim tree limbs overhanging roof, structures, or power lines", difficulty: "Pro", cost: "$100-400".

═══ SYSTEM-SPECIFIC TAILORING (apply on top of the mandatory rules above) ═══

- Roof type (${roofTypeLabel}): time inspections/cleaning to that roof material's needs
- Water (${waterSourceLabel}): include well testing/pump checks if private well
- Sewer (${sewerLabel}): include septic pumping/inspection if on septic system
- Pest (${pestLabel}): adjust pest control tasks based on whether they already have a service
- Crawl space (${crawlSpaceText}): include moisture/mold checks, and vapor barrier tasks if vented
- Allergies: suggest HEPA filters or extra air quality tasks if yes
- Also include at state-appropriate times: gutter cleaning, lawn care, exterior inspection, window caulking, appliance maintenance.

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
