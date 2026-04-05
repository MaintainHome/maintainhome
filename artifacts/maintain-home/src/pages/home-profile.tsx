import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Home, Save, CheckCircle2, AlertCircle, Edit2,
  MapPin, Bed, Bath, Layers, Waves, Calendar, Percent,
  TrendingDown, TrendingUp, Info, RefreshCw, Zap, X, CreditCard, Trash2, Shield,
  ExternalLink, MessageSquare, Phone, Bell, BellOff, ToggleLeft, ToggleRight,
} from "lucide-react";
import { useAuth, isPro } from "@/contexts/AuthContext";
import { PricingSection } from "@/components/PricingSection";
import { BrandedPageHeader } from "@/components/BrandedPageHeader";
import { HomeDocumentsSection } from "@/components/HomeDocumentsWidget";

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
  yearBuilt: string;
  lastRenovationYear: string;
  mortgageRate: string;
}

const emptyProfile: HomeProfile = {
  fullAddress: "",
  bedrooms: "",
  bathrooms: "",
  finishedBasement: "",
  poolOrHotTub: "",
  yearBuilt: "",
  lastRenovationYear: "",
  mortgageRate: "",
};

// ── Component ─────────────────────────────────────────────────────────────
export default function HomeProfilePage() {
  const { user, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string> | null>(null);
  const [profile, setProfile] = useState<HomeProfile>(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const userIsPro = isPro(user);

  // ── SMS settings state ────────────────────────────────────────────────────
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsSaved, setSmsSaved] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [smsLog, setSmsLog] = useState<{ id: number; taskNames: string; month: string; status: string; sentAt: string }[]>([]);
  const [smsTesting, setSmsTesting] = useState(false);
  const [smsTestResult, setSmsTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    setSmsEnabled(user.smsEnabled ?? false);
    setSmsPhone(user.smsPhone ?? "");
    fetch("/api/sms/log", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setSmsLog(data))
      .catch(() => {});
  }, [user?.id]);

  async function handleSaveSms() {
    setSmsSaving(true);
    setSmsError(null);
    setSmsTestResult(null);
    try {
      const r = await fetch("/api/user/sms-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smsEnabled, smsPhone }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error ?? "Save failed");
      setSmsSaved(true);
      setTimeout(() => setSmsSaved(false), 3500);
    } catch (err: any) {
      setSmsError(err.message ?? "Could not save text reminder settings.");
    } finally {
      setSmsSaving(false);
    }
  }

  async function handleTestSms() {
    setSmsTesting(true);
    setSmsTestResult(null);
    setSmsError(null);
    try {
      const r = await fetch("/api/sms/test", {
        method: "POST",
        credentials: "include",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error ?? "Could not send test message.");
      setSmsTestResult({ ok: true, message: data.message ?? "Test message sent!" });
    } catch (err: any) {
      setSmsTestResult({ ok: false, message: err.message ?? "Could not send test message." });
    } finally {
      setSmsTesting(false);
    }
  }

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
          yearBuilt: prof.yearBuilt != null ? String(prof.yearBuilt) : "",
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
          yearBuilt: profile.yearBuilt ? parseInt(profile.yearBuilt) : null,
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

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const r = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setDeleteError(data.error ?? "Something went wrong. Please try again.");
        setDeleting(false);
        return;
      }
      await refreshUser();
      navigate("/");
    } catch {
      setDeleteError("Network error. Please try again.");
      setDeleting(false);
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
      <BrandedPageHeader
        title="My Property Facts"
        icon={<Home className="w-5 h-5 text-primary shrink-0" />}
      >
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
      </BrandedPageHeader>

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

        {/* ── Profile Strength ──────────────────────────────────────── */}
        {!loading && (() => {
          const fields = [
            { label: "Address", filled: !!profile.fullAddress?.trim(), pts: 5 },
            { label: "Bedrooms", filled: !!profile.bedrooms, pts: 4 },
            { label: "Bathrooms", filled: !!profile.bathrooms, pts: 4 },
            { label: "Year Built", filled: !!profile.yearBuilt, pts: 8 },
            { label: "Renovation Year", filled: !!profile.lastRenovationYear, pts: 4 },
          ];
          const earned = fields.filter(f => f.filled).reduce((s, f) => s + f.pts, 0);
          const max = 25;
          const pct = Math.round((earned / max) * 100);
          const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
          const textColor = pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600";
          const missing = fields.filter(f => !f.filled);
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${pct >= 80 ? "bg-emerald-100" : pct >= 50 ? "bg-amber-100" : "bg-red-100"}`}>
                    <Shield className={`w-4.5 h-4.5 ${textColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Profile Strength</p>
                    <p className={`text-xs font-bold ${textColor}`}>{earned}/{max} pts · {pct}% complete</p>
                  </div>
                </div>
                <div className="flex-1 min-w-0 max-w-xs">
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {missing.length > 0 && (
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Add: {missing.map(f => f.label).join(", ")} to improve your <span className="font-semibold text-slate-600">Home Health Score</span>
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* ── Current Plan ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Current Plan</h2>
            <p className="text-xs text-slate-500 mt-0.5">Your active subscription and access level</p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${userIsPro ? "bg-primary/10" : "bg-slate-100"}`}>
                {userIsPro
                  ? <Zap className="w-5 h-5 text-primary" />
                  : <CreditCard className="w-5 h-5 text-slate-400" />
                }
              </div>
              <div>
                <p className={`text-sm font-bold ${userIsPro ? "text-primary" : "text-slate-700"}`}>
                  {user?.subscriptionStatus === "pro_monthly" && "Pro — Monthly"}
                  {user?.subscriptionStatus === "pro_annual" && "Pro — Annual"}
                  {user?.subscriptionStatus === "promo_pro" && "Pro — Promo (Beta)"}
                  {(!user?.subscriptionStatus || user?.subscriptionStatus === "free") && "Free Plan"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {userIsPro
                    ? "Full access — 12-month calendar, AI chat, history & more"
                    : "Limited to 2 months · Upgrade for full access"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPricingModal(true)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
                userIsPro
                  ? "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  : "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              {userIsPro ? "Manage Plan" : "Upgrade to Pro"}
            </button>
          </div>
        </motion.div>

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

            {/* Year Built + Last Renovation Year */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Year Built <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  min="1800" max={new Date().getFullYear()}
                  value={profile.yearBuilt}
                  onChange={e => setProfile(p => ({ ...p, yearBuilt: e.target.value }))}
                  placeholder="1998"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-slate-800 transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">Used for precise roof, HVAC &amp; appliance lifespan estimates</p>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Last Major Renovation <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  min="1950" max={new Date().getFullYear()}
                  value={profile.lastRenovationYear}
                  onChange={e => setProfile(p => ({ ...p, lastRenovationYear: e.target.value }))}
                  placeholder={String(new Date().getFullYear() - 5)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-slate-800 transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">Year of last major remodel or renovation</p>
              </div>
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

        {/* ── Upcoming Major Expenses Preview ────────────────────────── */}
        {!loading && (() => {
          const yb = profile.yearBuilt ? parseInt(profile.yearBuilt) : null;
          if (!yb || isNaN(yb)) return null;
          const now = new Date().getFullYear();
          const age = now - yb;
          type Urgency = "overdue" | "critical" | "watch" | "good";
          const items: { name: string; emoji: string; avgLife: number; costRange: string; dueYear: number; yearsLeft: number; urgency: Urgency }[] = [
            { name: "Roof", emoji: "🏠", avgLife: 25, costRange: "$12,000–$25,000" },
            { name: "HVAC System", emoji: "❄️", avgLife: 17, costRange: "$8,000–$15,000" },
            { name: "Water Heater", emoji: "🚿", avgLife: 12, costRange: "$1,200–$3,500" },
            { name: "Windows", emoji: "🪟", avgLife: 25, costRange: "$8,000–$20,000" },
            { name: "Exterior Paint", emoji: "🎨", avgLife: 8, costRange: "$3,000–$8,000" },
            { name: "Electrical Panel", emoji: "⚡", avgLife: 30, costRange: "$2,500–$6,000" },
          ].map(i => {
            const dueYear = yb + i.avgLife;
            const yearsLeft = dueYear - now;
            const urgency: Urgency = yearsLeft < 0 ? "overdue" : yearsLeft <= 5 ? "critical" : yearsLeft <= 10 ? "watch" : "good";
            return { ...i, dueYear, yearsLeft, urgency };
          }).sort((a, b) => a.yearsLeft - b.yearsLeft);

          return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Future Big-Ticket Items</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Based on your home built in <span className="font-semibold text-slate-700">{yb}</span> ({age} yrs old) · averages, ±3 yrs
                  </p>
                </div>
                <Shield className="w-4 h-4 text-primary shrink-0" />
              </div>
              <div className="divide-y divide-slate-50">
                {items.map(item => {
                  const isOverdue = item.urgency === "overdue";
                  const isCritical = item.urgency === "critical";
                  const isWatch = item.urgency === "watch";
                  const dot = isOverdue || isCritical ? "bg-red-400" : isWatch ? "bg-amber-400" : "bg-emerald-400";
                  const label = isOverdue ? `Overdue ~${Math.abs(item.yearsLeft)}yr` : item.yearsLeft === 0 ? "Due this year" : `~${item.dueYear}`;
                  const labelColor = isOverdue || isCritical ? "text-red-600" : isWatch ? "text-amber-600" : "text-emerald-600";
                  return (
                    <div key={item.name} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="text-base leading-none w-5 text-center">{item.emoji}</span>
                      <span className="flex-1 text-sm text-slate-800 font-medium">{item.name}</span>
                      <span className={`text-xs font-bold ${labelColor}`}>{label}</span>
                      <div className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-3 border-t border-slate-50">
                <p className="text-[11px] text-slate-400">Full detailed forecasts with costs appear on your Dashboard (Pro). These are estimates — consult a professional before major decisions.</p>
              </div>
            </motion.div>
          );
        })()}

        {/* ── Home Value Estimates ──────────────────────────────────── */}
        {(() => {
          const addr = profile.fullAddress.trim();
          const zip  = quizAnswers?.zip ?? "";
          const placeholder = `123 Main St, Charlotte, NC${zip ? ` ${zip}` : ""}`;

          function makeZillowUrl(a: string) {
            return `https://www.zillow.com/homes/${encodeURIComponent(a)}_rb/`;
          }
          function makeRedfinUrl(a: string) {
            return `https://www.redfin.com/query-location?location=${encodeURIComponent(a)}`;
          }
          function makeRealtorUrl(a: string) {
            return `https://www.realtor.com/realestateandhomes-search/${encodeURIComponent(a)}`;
          }

          const sites: {
            label: string;
            sub: string;
            color: string;
            bg: string;
            border: string;
            href: string;
          }[] = [
            {
              label: "Zillow",
              sub: "Zestimate® home value",
              color: "text-[#006AFF]",
              bg: "hover:bg-blue-50",
              border: "border-blue-200 hover:border-blue-400",
              href: addr ? makeZillowUrl(addr) : "https://www.zillow.com",
            },
            {
              label: "Redfin",
              sub: "Real-time estimate",
              color: "text-[#d93025]",
              bg: "hover:bg-red-50",
              border: "border-red-200 hover:border-red-400",
              href: addr ? makeRedfinUrl(addr) : "https://www.redfin.com",
            },
            {
              label: "Realtor.com",
              sub: "RealEstimate℠ value",
              color: "text-[#d64200]",
              bg: "hover:bg-orange-50",
              border: "border-orange-200 hover:border-orange-400",
              href: addr ? makeRealtorUrl(addr) : "https://www.realtor.com",
            },
          ];

          return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <h2 className="text-base font-bold text-slate-900">Home Value Estimates</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 ml-6">Enter your address to look up live estimates on major real estate sites</p>
              </div>

              <div className="px-5 pt-4 pb-2 space-y-4">
                {/* Address input */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    Full Street Address
                    <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={profile.fullAddress}
                    onChange={e => setProfile(p => ({ ...p, fullAddress: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-slate-800 transition-all"
                  />
                  {zip && !addr && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Your ZIP is <span className="font-semibold text-slate-600">{zip}</span> — add your full street address above for the best results
                    </p>
                  )}
                  {addr && (
                    <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Address saved — links below are pre-filled
                    </p>
                  )}
                </div>

                {/* 3 estimate cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {sites.map(site => (
                    <a
                      key={site.label}
                      href={site.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border transition-all ${site.bg} ${site.border} ${!addr ? "opacity-60" : ""}`}
                    >
                      <div className="min-w-0">
                        <p className={`text-sm font-black leading-tight ${site.color}`}>{site.label}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{site.sub}</p>
                      </div>
                      <ExternalLink className={`w-4 h-4 shrink-0 ${site.color}`} />
                    </a>
                  ))}
                </div>

                {/* Disclaimer */}
                <div className="flex items-start gap-2 bg-slate-50 rounded-xl px-4 py-3">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    These are live estimates from major real estate sites. They update regularly and can be useful for tracking your home's value over time.
                    {" "}<span className="font-semibold text-slate-600">This is not financial advice.</span>
                  </p>
                </div>
              </div>

              {!addr && (
                <div className="px-5 pb-4">
                  <p className="text-xs text-amber-600 font-semibold text-center">
                    Save your address above to pre-fill estimate links
                  </p>
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* ── Save button (bottom) ───────────────────────────────────── */}
        <div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-colors disabled:opacity-60 shadow-md shadow-primary/20"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Profile Saved!" : saving ? "Saving…" : "Save Home Profile"}
          </button>
        </div>

        {/* ── SMS Reminders ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h2 className="text-base font-bold text-slate-900">Text Reminders</h2>
            </div>
            {smsEnabled && smsPhone ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <Bell className="w-3 h-3" />Texts Active
              </span>
            ) : smsEnabled && !smsPhone ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                <Phone className="w-3 h-3" />Phone Required
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                <BellOff className="w-3 h-3" />Off
              </span>
            )}
          </div>

          <div className="px-5 py-5 space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Get a text message at the start of each month for critical tasks like smoke detector checks, air filter replacements, and winter prep. Fully opt-in — you can cancel any time.
            </p>

            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Enable Text Reminders</p>
                <p className="text-xs text-slate-400 mt-0.5">Receive critical task reminders by text message</p>
              </div>
              <button
                onClick={() => setSmsEnabled((v) => !v)}
                className="shrink-0 transition-colors"
                title={smsEnabled ? "Disable text reminders" : "Enable text reminders"}
              >
                {smsEnabled
                  ? <ToggleRight className="w-10 h-10 text-primary" />
                  : <ToggleLeft className="w-10 h-10 text-slate-300" />
                }
              </button>
            </div>

            {/* Phone input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                US Phone Number
              </label>
              <input
                type="tel"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder="+1 (555) 867-5309"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-slate-50"
              />
              <p className="text-xs text-slate-400 mt-1">US numbers only. Format: +1XXXXXXXXXX or (555) 867-5309</p>
            </div>

            {/* Reminders sent */}
            {smsLog.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recent Reminders Sent</p>
                <ul className="space-y-1.5">
                  {smsLog.slice(0, 3).map((entry) => (
                    <li key={entry.id} className="flex items-start gap-2 text-xs text-slate-500">
                      <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${entry.status === "sent" ? "text-emerald-500" : "text-red-400"}`} />
                      <span>
                        <span className="font-medium text-slate-700">{entry.month}</span>
                        {" — "}{entry.taskNames}
                        <span className="text-slate-400 ml-1">
                          ({new Date(entry.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })})
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {smsError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {smsError}
              </div>
            )}

            {smsTestResult && (
              <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs ${smsTestResult.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
                {smsTestResult.ok
                  ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                  : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                }
                <span>{smsTestResult.message}</span>
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                onClick={handleSaveSms}
                disabled={smsSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-colors disabled:opacity-60"
              >
                {smsSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : smsSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {smsSaved ? "Saved!" : smsSaving ? "Saving…" : "Save Settings"}
              </button>

              <button
                onClick={handleTestSms}
                disabled={smsTesting || !user?.smsPhone}
                title={!user?.smsPhone ? "Save a phone number first" : "Send a test text to your phone"}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-primary/60 hover:border-primary text-primary font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {smsTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                {smsTesting ? "Sending…" : "Send Test Text"}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Message and data rates may apply. Reply STOP to any message to opt out. Max 2 reminders per month.
            </p>
          </div>
        </motion.div>

        {/* ── Home Documents ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.19 }}
        >
          <HomeDocumentsSection />
        </motion.div>

        {/* ── Danger Zone ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-red-50">
            <h2 className="text-base font-bold text-red-700">Danger Zone</h2>
            <p className="text-xs text-slate-500 mt-0.5">Permanent actions that cannot be undone</p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Delete Account</p>
              <p className="text-xs text-slate-400 mt-0.5">Permanently delete your account and all data. This cannot be undone.</p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold text-sm transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Account
            </button>
          </div>
        </motion.div>

        <div className="pb-6" />
      </div>

      {/* ── Pricing Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPricingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 overflow-y-auto"
            onClick={(e) => e.target === e.currentTarget && setShowPricingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="min-h-screen px-4 py-8 flex flex-col items-center"
            >
              <div className="w-full max-w-4xl bg-slate-50 rounded-3xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
                  <div>
                    <p className="font-bold text-slate-900 text-base">Plans &amp; Pricing</p>
                    <p className="text-xs text-slate-400">Upgrade or manage your subscription</p>
                  </div>
                  <button
                    onClick={() => setShowPricingModal(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <PricingSection />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={(e) => e.target === e.currentTarget && !deleting && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="bg-white rounded-3xl p-7 w-full max-w-sm shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Delete Account?</h3>
              <p className="text-sm text-slate-500 text-center mb-2">
                This will permanently delete your account, calendar, maintenance history, and all associated data.
              </p>
              <p className="text-sm font-bold text-red-600 text-center mb-6">This cannot be undone.</p>
              {deleteError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-center mb-4">{deleteError}</p>
              )}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-sm transition-colors"
                >
                  {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? "Deleting…" : "Yes, Delete My Account"}
                </button>
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteError(null); }}
                  disabled={deleting}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
