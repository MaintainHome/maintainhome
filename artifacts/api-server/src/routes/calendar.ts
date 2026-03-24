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

router.post("/generate-calendar", async (req, res) => {
  const { zip, homeAge, homeType, sqft, allergies, allergiesDetails, crawlSpace, landscaping } = req.body;

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
  const homeAgeLabel = HOME_AGE_LABELS[homeAge] ?? homeAge ?? "Unknown";
  const homeTypeLabel = HOME_TYPE_LABELS[homeType] ?? homeType ?? "Unknown";
  const sqftLabel = SQFT_LABELS[sqft] ?? sqft ?? "Unknown";
  const landscapingLabel = LANDSCAPING_LABELS[landscaping] ?? landscaping ?? "Unknown";
  const allergiesText =
    allergies === "yes"
      ? `Yes${allergiesDetails ? ` — ${allergiesDetails}` : ""}`
      : "No";
  const crawlSpaceText = crawlSpace === "yes" ? "Yes" : "No";

  console.log(`[calendar] Generating for ZIP ${zip} → ${state}, ${homeTypeLabel}, ${homeAgeLabel}`);

  const systemPrompt = `You are MaintainHome AI, an expert 2026 home maintenance scheduler.
User location: ${state}.
Home age: ${homeAgeLabel}.
Home type: ${homeTypeLabel}.
Square footage: ${sqftLabel}.
Pets/allergies: ${allergiesText}.
Crawl space: ${crawlSpaceText}.
Landscaping: ${landscapingLabel}.

Generate a personalized 12-month maintenance calendar adjusted for the specific climate, seasons, pests, and building practices of ${state}.

Always include these tasks with state-specific timing and tips:
- Air filters (HVAC)
- Roof and gutters inspection/cleaning
- Crawl space moisture checks (especially important in humid states)
- Smoke and CO detector batteries
- Lawn care and natural area refresh (mulch, planting)
- Exterior paint and siding inspection
- Window seals and caulking
- Major appliances (filters, vents, hoses)

For each task include: month(s), difficulty (DIY or Pro), estimated cost range, 1-sentence why it matters in this state, short how-to tip.

Output ONLY valid JSON in this exact structure with no markdown, no code fences, no extra text:
{
  "state": "${state}",
  "calendar": [
    {
      "month": "January",
      "tasks": [
        {
          "task": "Task name",
          "difficulty": "DIY",
          "cost": "$20-40",
          "why": "Why it matters in ${state}",
          "tip": "Short how-to tip"
        }
      ]
    }
  ],
  "big_ticket_alerts": ["alert1", "alert2"],
  "one_time_tasks": ["task1", "task2"]
}`;

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: "user", content: "Generate my personalized home maintenance calendar." },
      ],
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[calendar] No JSON found in Claude response:", text.slice(0, 200));
      res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      return;
    }

    const calendar = JSON.parse(jsonMatch[0]);
    console.log(`[calendar] Generated successfully for ${state}, ${calendar.calendar?.length ?? 0} months`);
    res.json(calendar);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[calendar] Error:", msg);
    res.status(500).json({ error: "Failed to generate calendar. Please try again." });
  }
});

export default router;
