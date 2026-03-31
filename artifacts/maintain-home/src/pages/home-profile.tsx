import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  Home, ArrowLeft, Save, CheckCircle2, AlertCircle, Edit2,
  MapPin, Bed, Bath, Layers, Waves, Calendar, Percent,
  TrendingDown, TrendingUp, Info, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// ── Label maps (mirrors quiz + ai-chat server) ─────────────────────────────
const HOME_AGE_LABELS: Record<string, string> = {
  new_construction: "New construction",
  resale_recent: "Resale (built in last 10 years)",
  resale_old: "Resale (10+ years old)",
};
const HOME_TYPE_LABELS: Record<string, string> = {
  single_family: "Single family house",
  townhome: "Townhome",
  condo: "Condo / Apartment",
  other: "Other",
};
const ROOF_TYPE_LABELS: Record<string, string> = {
  asphalt: "Asphalt shingles",
  metal: "Metal roof",
  tile: "Tile / Clay",
  flat: "Flat / TPO / EPDM",
  other: "Other",
};
const WATER_LABELS: Record<string, string> = {
  municipal: "Municipal / City water",
  well: "Private well",
};
const SEWER_LABELS: Record<string, string> = {
  municipal: "Municipal sewer",
  septic: "Septic system",
};
const PEST_LABELS: Record<string, string> = {
  yes_regular: "Yes, on a regular schedule",
  not_sure: "Not sure",
  no: "No",
};
const SQFT_LABELS: Record<string, string> = {
  under_1500: "Under 1,500 sq ft",
  "1500_2500": "1,500–2,500 sq ft",
  "2500_4000": "2,500–4,000 sq ft",
  over_4000: "Over 4,000 sq ft",
};
const LANDSCAPING_LABELS: Record<string, string> = {
  mostly_grass: "Mostly grass",
  natural_areas: "Natural areas / mulch beds",
  minimal: "Minimal landscaping",
};
const CRAWL_SEALED_LABELS: Record<string, string> = {
  yes: "Yes, sealed / encapsulated",
  no: "No, open / vented",
  not_sure: "Not sure",
};

// ── Mortgage rate comparison ───────────────────────────────────────────────
const CURRENT_AVG_RATE = 6.79;

interface HomeProfile {
  fullAddress: string;
  bedrooms: string;
  bathrooms: string;
  finishedBasement: string;
  poolOrHotTub: string;
  lastRenovationYear: string;
  mortgageRate: string;
}

const emptyProfile: HomeProfile = {
  fullAddress: "",
  bedrooms: "",
  bathrooms: "",
  finishedBasement: "",
  poolOrHotTub: "",
  lastRenovationYear: "",
  mortgageRate: "",
};

// ── Component ─────────────────────────────────────────────────────────────
export default function HomeProfilePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string> | null>(null);
  const [profile, setProfile] = useState<HomeProfile>(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/user/calendar/latest", { credentials: "include" }).then(r => r.ok ? r.json() : null),
      fetch("/api/user/home-profile", { credentials: "include" }).then(r => r.ok ? r.json() : null),
    ]).then(([cal, prof]) => {
      if (cal?.quizAnswers) setQuizAnswers(cal.quizAnswers);
      if (prof) {
        setProfile({
          fullAddress: prof.fullAddress ?? "",
          bedrooms: prof.bedrooms != null ? String(prof.bedrooms) : "",
          bathrooms: prof.bathrooms ?? "",
          finishedBasement: prof.finishedBasement ?? "",
          poolOrHotTub: prof.poolOrHotTub ?? "",
          lastRenovationYear: prof.lastRenovationYear != null ? String(prof.lastRenovationYear) : "",
          mortgageRate: prof.mortgageRate ?? "",
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user?.id]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/user/home-profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullAddress: profile.fullAddress || null,
          bedrooms: profile.bedrooms ? parseInt(profile.bedrooms) : null,
          bathrooms: profile.bathrooms || null,
          finishedBasement: profile.finishedBasement || null,
          poolOrHotTub: profile.poolOrHotTub || null,
          lastRenovationYear: profile.lastRenovationYear ? parseInt(profile.lastRenovationYear) : null,
          mortgageRate: profile.mortgageRate || null,
        }),
      });
      if (!r.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch {
      setError("Could not save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Mortgage widget ──────────────────────────────────────────────────────
  const userRate = profile.mortgageRate ? parseFloat(profile.mortgageRate) : null;
  const rateDiff = userRate != null ? userRate - CURRENT_AVG_RATE : null;
  const rateIsBetter = rateDiff != null && rateDiff < 0;
  const rateIsHigher = rateDiff != null && rateDiff > 0;

  // ── Quiz answer helper ───────────────────────────────────────────────────
  function qa(key: string, labelMap?: Record<string, string>): string {
    const val = quizAnswers?.[key];
    if (!val) return "—";
    return labelMap ? (labelMap[val] ?? val) : val;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Please sign in to view your home profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Home className="w-5 h-5 text-primary shrink-0" />
            <h1 className="text-base font-bold text-slate-900 truncate">My Home Profile</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-colors disabled:opacity-60 shadow-sm shadow-primary/20"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? "Saved!" : saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Profile saved — Maintly will use your updated details for future advice.
          </motion.div>
        )}

        {/* ── Original Quiz Answers ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Home Setup Answers</h2>
              <p className="text-xs text-slate-500 mt-0.5">From your original quiz — these power your calendar</p>
            </div>
            <button
              onClick={() => navigate("/quiz")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Retake Quiz
            </button>
          </div>
          {loading ? (
            <div className="px-5 py-8 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-slate-300 animate-spin" />
            </div>
          ) : quizAnswers ? (
            <div className="divide-y divide-slate-50">
              {[
                { label: "ZIP Code", value: qa("zip") },
                { label: "Home Age", value: qa("homeAge", HOME_AGE_LABELS) },
                { label: "Home Type", value: qa("homeType", HOME_TYPE_LABELS) },
                { label: "Roof Type", value: qa("roofType", ROOF_TYPE_LABELS) },
                { label: "Water Source", value: qa("waterSource", WATER_LABELS) },
                { label: "Sewer System", value: qa("sewerSystem", SEWER_LABELS) },
                { label: "Pest Prevention", value: qa("pestSchedule", PEST_LABELS) },
                { label: "Square Footage", value: qa("sqft", SQFT_LABELS) },
                { label: "Landscaping", value: qa("landscaping", LANDSCAPING_LABELS) },
                { label: "Allergies / Pets", value: quizAnswers.allergies === "yes" ? `Yes${quizAnswers.allergiesDetails ? ` — ${quizAnswers.allergiesDetails}` : ""}` : "No" },
                { label: "Crawl Space", value: quizAnswers.crawlSpace === "yes" ? `Yes (${CRAWL_SEALED_LABELS[quizAnswers.crawlSpaceSealed] ?? "status unknown"})` : quizAnswers.crawlSpace === "no" ? "No" : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-slate-500 font-medium">{label}</span>
                  <span className="text-sm font-semibold text-slate-800 text-right max-w-[55%]">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-6 text-center text-slate-400 text-sm">
              No quiz answers found.{" "}
              <button onClick={() => navigate("/quiz")} className="text-primary font-semibold hover:underline">Take the quiz</button>{" "}
              to generate your maintenance calendar.
            </div>
          )}
        </motion.div>

        {/* ── Additional Home Details ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Additional Home Details</h2>
            <p className="text-xs text-slate-500 mt-0.5">Optional — fills in extra context for Maintly and your calendar</p>
          </div>
          <div className="px-5 py-4 space-y-5">
            {/* Full Address */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                Full Address <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={profile.fullAddress}
                onChange={e => setProfile(p => ({ ...p, fullAddress: e.target.value }))}
                placeholder="123 Main St, Charlotte, NC 28202"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-slate-800 transition-all"
              />
            </div>

            {/* Bedrooms + Bathrooms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                  <Bed className="w-4 h-4 text-slate-400" />
                  Bedrooms
                </label>
                <input
                  type="number"
                  min="1" max="20"
                  value={profile.bedrooms}
                  onChange={e => setProfile(p => ({ ...p, bedrooms: e.target.value }))}
                  placeholder="3"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-slate-800 transition-all"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                  <Bath className="w-4 h-4 text-slate-400" />
                  Bathrooms
                </label>
                <input
                  type="text"
                  value={profile.bathrooms}
                  onChange={e => setProfile(p => ({ ...p, bathrooms: e.target.value }))}
                  placeholder="2.5"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-slate-800 transition-all"
                />
              </div>
            </div>

            {/* Finished Basement + Pool */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                  <Layers className="w-4 h-4 text-slate-400" />
                  Finished Basement?
                </label>
                <div className="flex gap-2">
                  {["yes", "no"].map(v => (
                    <button
                      key={v}
                      onClick={() => setProfile(p => ({ ...p, finishedBasement: p.finishedBasement === v ? "" : v }))}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        profile.finishedBasement === v
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {v === "yes" ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                  <Waves className="w-4 h-4 text-slate-400" />
                  Pool or Hot Tub?
                </label>
                <div className="flex gap-2">
                  {["yes", "no"].map(v => (
                    <button
                      key={v}
                      onClick={() => setProfile(p => ({ ...p, poolOrHotTub: p.poolOrHotTub === v ? "" : v }))}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        profile.poolOrHotTub === v
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {v === "yes" ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Last Renovation Year */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Last Major Renovation Year <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                min="1950" max={new Date().getFullYear()}
                value={profile.lastRenovationYear}
                onChange={e => setProfile(p => ({ ...p, lastRenovationYear: e.target.value }))}
                placeholder={String(new Date().getFullYear() - 5)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-slate-800 transition-all"
              />
            </div>

            {/* Mortgage Rate */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                <Percent className="w-4 h-4 text-slate-400" />
                Current Mortgage Interest Rate <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01" min="0" max="30"
                  value={profile.mortgageRate}
                  onChange={e => setProfile(p => ({ ...p, mortgageRate: e.target.value }))}
                  placeholder="4.25"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-slate-800 transition-all pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-semibold">%</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Mortgage Rate Widget ───────────────────────────────────── */}
        {userRate != null && !isNaN(userRate) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-2xl border shadow-sm overflow-hidden ${
              rateIsBetter
                ? "bg-emerald-50 border-emerald-200"
                : rateIsHigher
                ? "bg-red-50 border-red-200"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="px-5 py-4 border-b border-black/5">
              <h2 className="text-base font-bold text-slate-900">Mortgage Rate Comparison</h2>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center bg-white rounded-xl border border-slate-200 py-3 px-4 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your Rate</p>
                  <p className={`text-3xl font-black ${rateIsBetter ? "text-emerald-600" : rateIsHigher ? "text-red-600" : "text-slate-800"}`}>
                    {userRate.toFixed(2)}%
                  </p>
                </div>
                <div className="text-2xl font-bold text-slate-300">vs</div>
                <div className="flex-1 text-center bg-white rounded-xl border border-slate-200 py-3 px-4 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Avg 30yr Fixed</p>
                  <p className="text-3xl font-black text-slate-700">{CURRENT_AVG_RATE.toFixed(2)}%</p>
                </div>
              </div>

              <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 ${
                rateIsBetter ? "bg-emerald-100 text-emerald-800" : rateIsHigher ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"
              }`}>
                {rateIsBetter ? (
                  <TrendingDown className="w-5 h-5 shrink-0" />
                ) : rateIsHigher ? (
                  <TrendingUp className="w-5 h-5 shrink-0" />
                ) : (
                  <Info className="w-5 h-5 shrink-0" />
                )}
                <p className="text-sm font-semibold">
                  {rateIsBetter
                    ? `Great rate! You're ${Math.abs(rateDiff!).toFixed(2)}% below the current average.`
                    : rateIsHigher
                    ? `Your rate is ${rateDiff!.toFixed(2)}% above average. Consider contacting your lender about refinancing.`
                    : "Your rate is right at the current average."}
                </p>
              </div>

              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Info className="w-3 h-3 shrink-0" />
                Rates change daily. This is not financial advice. Average rate is approximate for reference only.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Save button (bottom) ───────────────────────────────────── */}
        <div className="pb-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-colors disabled:opacity-60 shadow-md shadow-primary/20"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Profile Saved!" : saving ? "Saving…" : "Save Home Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
