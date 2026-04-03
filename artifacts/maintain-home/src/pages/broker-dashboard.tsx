import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Building2, Users, Link2, Copy, Check, Palette, Loader2,
  ExternalLink, BarChart2, Zap, RefreshCw, LogOut,
  ShieldCheck, Gift, CreditCard, Calendar, TrendingUp,
  AlertTriangle, ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useLocation } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const BASE = import.meta.env.BASE_URL;

/* ─── Types ───────────────────────────────────────────────────────── */
interface BrokerConfig {
  id: number;
  subdomain: string;
  brokerName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  tagline: string | null;
  welcomeMessage: string | null;
  contactEmail: string;
  type: "individual_agent" | "team_leader";
  monetizationModel: "private_label" | "closing_gift" | null;
  giftDuration: "1year" | "3years" | null;
  status: string;
  createdAt: string;
}

interface Client {
  id: number;
  email: string;
  name: string | null;
  subscriptionStatus: string;
  createdAt: string;
  lastActiveAt: string | null;
  hasCalendar: boolean;
  logCount: number;
  activityScore: number;
  bigTicketAlertCount: number;
  bigTicketAlerts: string[];
}

/* ─── Helpers ─────────────────────────────────────────────────────── */
function isPro(status: string) {
  return ["pro_monthly", "pro_annual", "promo_pro"].includes(status);
}

function relativeDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function giftExpiry(createdAt: string, giftDuration: "1year" | "3years") {
  const d = new Date(createdAt);
  d.setFullYear(d.getFullYear() + (giftDuration === "3years" ? 3 : 1));
  const msLeft = d.getTime() - Date.now();
  if (msLeft < 0) return { label: "Expired", expired: true };
  const daysLeft = Math.floor(msLeft / 86400000);
  if (daysLeft < 30) return { label: `${daysLeft}d left`, expired: false };
  return { label: `${Math.round(daysLeft / 30)}mo left`, expired: false };
}

function scoreColor(score: number) {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#94a3b8";
}

/* ─── Score ring gauge ───────────────────────────────────────────── */
function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(score / 100, 1)) * circ;
  return (
    <div className="relative w-[52px] h-[52px] shrink-0">
      <svg width="52" height="52" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="26" cy="26" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

/* ─── Score bar ──────────────────────────────────────────────────── */
function ScoreBar({ score }: { score: number }) {
  const c = scoreColor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: c }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-5" style={{ color: c }}>{score}</span>
    </div>
  );
}

/* ─── Copy button ─────────────────────────────────────────────────── */
function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} title={`Copy ${label}`}
      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0">
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════════════════════ */
export default function BrokerDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const { setPreviewSubdomain, primaryColor: brandPrimary } = useBranding();
  const [, navigate] = useLocation();

  const [config, setConfig] = useState<BrokerConfig | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/"); return; }
    load();
  }, [authLoading, user]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [meRes, clientsRes] = await Promise.all([
        fetch(`${API_BASE}/api/broker/me`, { credentials: "include" }),
        fetch(`${API_BASE}/api/broker/clients`, { credentials: "include" }),
      ]);
      if (!meRes.ok) {
        const d = await meRes.json();
        setError(d.error ?? "Could not load broker profile.");
        return;
      }
      setConfig((await meRes.json()).config);
      if (clientsRes.ok) setClients((await clientsRes.json()).clients ?? []);
    } catch { setError("Network error. Please refresh."); }
    finally { setLoading(false); }
  }, []);

  function copyInviteLink() {
    if (!config) return;
    navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL}?_ref=${config.subdomain}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }

  /* ── Derived stats ─────────────────────────────────────────────── */
  const proClients = clients.filter((c) => isPro(c.subscriptionStatus));
  const bigTicketClients = clients.filter((c) => c.bigTicketAlertCount > 0);
  const avgScore = clients.length > 0
    ? Math.round(clients.reduce((s, c) => s + c.activityScore, 0) / clients.length) : null;

  const accent = brandPrimary ?? config?.primaryColor ?? "#1f9e6e";
  const isGift = config?.monetizationModel === "closing_gift";
  const inviteLink = config
    ? `${window.location.origin}${import.meta.env.BASE_URL}?_ref=${config.subdomain}` : "";

  /* ── Guards ─────────────────────────────────────────────────────── */
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: accent }} />
          <p className="text-slate-500 text-sm">Loading your partner dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <Building2 className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-black text-slate-900 mb-3">Broker Account Not Found</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">{error}</p>
          <div className="flex flex-col gap-2">
            <button onClick={() => navigate("/broker-onboard")}
              className="w-full px-5 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors">
              Apply for a White-Label Account
            </button>
            <button onClick={() => navigate("/")}
              className="w-full px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!config) return null;

  const monetizationLabel = isGift
    ? `Closing Gift · ${config.giftDuration === "3years" ? "3 Years" : "1 Year"}`
    : "Private Label";
  const MIcon = isGift ? Gift : CreditCard;

  /* ════════════════════════════════════════════════════════════════
     Dashboard render
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {config.logoUrl
              ? <img src={config.logoUrl} alt={config.brokerName} className="h-7 max-w-[110px] object-contain" />
              : <img src={`${BASE}images/logo-icon.png`} alt="MaintainHome" className="w-7 h-7 object-contain" />
            }
            <span className="font-bold text-slate-900 text-sm hidden sm:block">Partner Dashboard</span>
            <span className="text-slate-300 hidden sm:block">·</span>
            <span className="text-xs font-semibold truncate hidden sm:block" style={{ color: accent }}>
              {config.brokerName}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={copyInviteLink}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl text-white shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
              style={{ backgroundColor: accent }}>
              {linkCopied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Link2 className="w-3.5 h-3.5" />Invite Client</>}
            </button>
            <button onClick={() => { setPreviewSubdomain(config.subdomain); navigate("/"); }}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors border border-slate-200">
              <ExternalLink className="w-3.5 h-3.5" />Preview
            </button>
            <button onClick={async () => { await logout(); navigate("/"); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors">
              <LogOut className="w-3.5 h-3.5" /><span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 flex-1">

        {/* ── Hero ────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${config.secondaryColor} 0%, ${config.primaryColor}18 100%)` }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at top right, ${accent}28 0%, transparent 65%)` }} />
          <div className="relative flex flex-col sm:flex-row items-start gap-5">
            {config.logoUrl
              ? <img src={config.logoUrl} alt={config.brokerName} className="h-12 max-w-[160px] object-contain bg-white/10 rounded-xl px-3 py-2 shrink-0" />
              : <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: accent + "33" }}>
                  <Building2 className="w-7 h-7" style={{ color: accent }} />
                </div>
            }
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: accent }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accent }}>Approved Partner</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mb-1 truncate">{config.brokerName}</h1>
              {config.tagline && <p className="text-white/65 text-sm mb-1">{config.tagline}</p>}
              <p className="text-white/35 text-xs font-mono">{config.subdomain}.maintainhome.ai</p>
            </div>
            <div className="flex flex-row sm:flex-col items-start gap-2 shrink-0">
              <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ backgroundColor: accent + "28", color: accent }}>
                {config.type === "team_leader" ? "Team Leader" : "Individual Agent"}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/12 text-white/75">
                <MIcon className="w-3 h-3 shrink-0" />{monetizationLabel}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── 4 Stats ───────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.07 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4">

          {/* Total clients */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: accent + "18" }}>
              <Users className="w-5 h-5" style={{ color: accent }} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 leading-none">{clients.length}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Total Clients</p>
            </div>
          </div>

          {/* Active Pro */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 leading-none">{proClients.length}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Active Pro</p>
            </div>
          </div>

          {/* Avg health score ring */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-3">
            {avgScore !== null ? (
              <ScoreRing score={avgScore} color={scoreColor(avgScore)} />
            ) : (
              <div className="w-[52px] h-[52px] rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-slate-300" />
              </div>
            )}
            <div>
              <p className="text-sm font-black text-slate-900 leading-tight">
                {avgScore !== null ? "Avg. Score" : "No Data"}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Health Score</p>
            </div>
          </div>

          {/* Big-ticket alerts */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bigTicketClients.length > 0 ? "bg-orange-50" : "bg-slate-50"}`}>
              <AlertTriangle className={`w-5 h-5 ${bigTicketClients.length > 0 ? "text-orange-500" : "text-slate-300"}`} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 leading-none">{bigTicketClients.length}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Big-Ticket Alerts</p>
            </div>
          </div>
        </motion.div>

        {/* ── Invite + Branding row ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Invite card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 }}
            className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-5 h-5" style={{ color: accent }} />
              <h2 className="font-bold text-slate-900">Invite New Client</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Share this link. Clients instantly see your branded experience and sign up under your account.
            </p>
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 mb-4">
              <span className="text-sm text-slate-700 font-mono flex-1 truncate min-w-0">{inviteLink}</span>
              <CopyBtn text={inviteLink} label="invite link" />
            </div>
            <button onClick={copyInviteLink}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.99] mt-auto"
              style={{ backgroundColor: accent, boxShadow: `0 4px 16px ${accent}35` }}>
              {linkCopied
                ? <><Check className="w-4 h-4" />Copied to clipboard!</>
                : <><Copy className="w-4 h-4" />Copy Invite Link</>}
            </button>
            <p className="text-xs text-slate-400 mt-3 text-center">
              Or direct clients to <strong className="text-slate-600">{config.subdomain}.maintainhome.ai</strong>
            </p>
          </motion.div>

          {/* Branding card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5" style={{ color: accent }} />
              <h2 className="font-bold text-slate-900">Your Branding</h2>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl h-7 flex items-center justify-center" style={{ backgroundColor: config.primaryColor }}>
                <span className="text-white text-[9px] font-mono font-bold opacity-80">{config.primaryColor}</span>
              </div>
              <div className="flex-1 rounded-xl h-7 flex items-center justify-center" style={{ backgroundColor: config.secondaryColor }}>
                <span className="text-white text-[9px] font-mono font-bold opacity-80">{config.secondaryColor}</span>
              </div>
            </div>
            {config.logoUrl && (
              <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-center border border-slate-100">
                <img src={config.logoUrl} alt="logo" className="max-h-9 max-w-full object-contain" />
              </div>
            )}
            {config.tagline && (
              <p className="text-xs text-slate-500 italic border-l-2 pl-3 leading-relaxed"
                style={{ borderColor: accent + "50" }}>
                "{config.tagline}"
              </p>
            )}
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <MIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800 leading-tight">{monetizationLabel}</p>
                <p className="text-xs text-slate-400">Offer model</p>
              </div>
            </div>
            <button onClick={() => { setPreviewSubdomain(config.subdomain); navigate("/"); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm hover:opacity-80 transition-colors mt-auto"
              style={{ borderColor: accent, color: accent }}>
              <ExternalLink className="w-4 h-4" />Preview Your Brand
            </button>
            <p className="text-xs text-slate-400 text-center">
              To update branding,{" "}
              <a href="mailto:support@maintainhome.ai" className="hover:underline" style={{ color: accent }}>contact support</a>
            </p>
          </motion.div>
        </div>

        {/* ── Client table ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18 }}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

          {/* Table title bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="w-5 h-5" style={{ color: accent }} />
              <h2 className="font-bold text-slate-900">Your Clients</h2>
              {clients.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">{clients.length}</span>
              )}
              {isGift && config.giftDuration && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                  <Gift className="w-3 h-3" />
                  Gift · {config.giftDuration === "3years" ? "3 Years" : "1 Year"}
                </span>
              )}
            </div>
            <button onClick={load} className="text-slate-400 hover:text-slate-600 transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {clients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Users className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-slate-500 text-sm font-medium">No clients yet</p>
              <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                Share your invite link to start bringing clients in under your branded experience.
              </p>
              <button onClick={copyInviteLink}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold mt-2 hover:opacity-90"
                style={{ backgroundColor: accent }}>
                <Copy className="w-4 h-4" />Copy Invite Link
              </button>
            </div>
          ) : (
            <>
              {/* Desktop column headers */}
              <div className="hidden md:grid gap-3 px-6 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                style={{ gridTemplateColumns: "2fr 90px 95px 120px 90px 44px" }}>
                <span>Client</span>
                <span>Joined</span>
                <span>Plan</span>
                <span>Health Score</span>
                <span>Last Active</span>
                <span />
              </div>

              <div className="divide-y divide-slate-100">
                {clients.map((client) => {
                  const expiry = isGift && config.giftDuration
                    ? giftExpiry(client.createdAt, config.giftDuration)
                    : null;

                  return (
                    <div key={client.id} className="group">
                      {/* ─ Mobile row ─ */}
                      <div className="md:hidden flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50/60 transition-colors">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{ backgroundColor: accent + "20", color: accent }}>
                          {(client.name ?? client.email)[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{client.name ?? "—"}</p>
                          <p className="text-xs text-slate-400 truncate">{client.email}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {client.hasCalendar && <Calendar className="w-3 h-3 text-blue-400" />}
                          {client.bigTicketAlertCount > 0 && <AlertTriangle className="w-3 h-3 text-orange-400" />}
                          {isPro(client.subscriptionStatus)
                            ? <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f59e0b18", color: "#d97706" }}>Pro</span>
                            : expiry
                              ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${expiry.expired ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"}`}>Gift</span>
                              : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Free</span>
                          }
                        </div>
                      </div>

                      {/* ─ Desktop row ─ */}
                      <div className="hidden md:grid gap-3 px-6 py-3.5 hover:bg-slate-50/60 transition-colors items-center"
                        style={{ gridTemplateColumns: "2fr 90px 95px 120px 90px 44px" }}>

                        {/* Client */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                            style={{ backgroundColor: accent + "20", color: accent }}>
                            {(client.name ?? client.email)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-slate-900 truncate">{client.name ?? "—"}</p>
                              {client.bigTicketAlertCount > 0 && (
                                <AlertTriangle className="w-3 h-3 text-orange-400 shrink-0"
                                  title={`${client.bigTicketAlertCount} big-ticket alert${client.bigTicketAlertCount > 1 ? "s" : ""}`} />
                              )}
                              {client.hasCalendar && (
                                <Calendar className="w-3 h-3 text-blue-400 shrink-0" title="AI calendar built" />
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate">{client.email}</p>
                          </div>
                        </div>

                        {/* Joined */}
                        <span className="text-xs text-slate-400">
                          {new Date(client.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                        </span>

                        {/* Plan */}
                        <div>
                          {isPro(client.subscriptionStatus) ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                              style={{ backgroundColor: "#f59e0b18", color: "#d97706" }}>
                              <Zap className="w-3 h-3" />Pro
                            </span>
                          ) : expiry ? (
                            <div>
                              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${expiry.expired ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"}`}>
                                <Gift className="w-3 h-3" />Gift
                              </span>
                              <p className={`text-[10px] mt-0.5 font-medium ${expiry.expired ? "text-red-400" : "text-slate-400"}`}>
                                {expiry.label}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Free</span>
                          )}
                        </div>

                        {/* Health Score bar */}
                        <ScoreBar score={client.activityScore} />

                        {/* Last Active */}
                        <span className="text-xs text-slate-400">{relativeDate(client.lastActiveAt)}</span>

                        {/* View button */}
                        <button
                          title="View client (coming soon)"
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>

        {/* ── Big-ticket spotlight ──────────────────────────────────── */}
        {bigTicketClients.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.22 }}
            className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h2 className="font-bold text-orange-900">Big-Ticket Alerts Across Your Clients</h2>
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">{bigTicketClients.length}</span>
            </div>
            <div className="space-y-3">
              {bigTicketClients.slice(0, 5).map((client) => (
                <div key={client.id} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-orange-100">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold bg-orange-100 text-orange-600 mt-0.5">
                    {(client.name ?? client.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{client.name ?? client.email}</p>
                    <ul className="mt-1 space-y-0.5">
                      {client.bigTicketAlerts.map((alert, i) => (
                        <li key={i} className="text-xs text-orange-700 flex items-start gap-1.5">
                          <span className="text-orange-400 mt-0.5 shrink-0">•</span>
                          {alert}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-orange-600 mt-3 text-center">
              These clients have big-ticket alerts in their AI plan — consider reaching out to offer guidance.
            </p>
          </motion.div>
        )}

        {/* ── How-to guide ──────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.24 }}
          className="rounded-2xl p-6 sm:p-8 text-white"
          style={{ backgroundColor: config.secondaryColor }}>
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="w-5 h-5" style={{ color: accent }} />
            <h2 className="font-bold">How to Share Your Branded Experience</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { step: "1", title: "Copy your invite link", desc: "Share via email, text, or your website. Clients instantly see your brand." },
              { step: "2", title: "Client signs up", desc: "They see your logo, colors, and tagline. Your welcome message greets them on first login." },
              { step: "3", title: "They build their plan", desc: "Clients complete the home quiz, get their AI maintenance calendar, and track tasks — all under your brand." },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: accent + "30" }}>
                  <span className="font-black text-xs" style={{ color: accent }}>{item.step}</span>
                </div>
                <div>
                  <p className="font-bold text-sm mb-1">{item.title}</p>
                  <p className="text-white/50 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="border-t border-slate-200 py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-center gap-2">
          <img src={`${BASE}images/logo-icon.png`} alt="MaintainHome.ai" className="w-4 h-4 object-contain opacity-40" />
          <span className="text-xs text-slate-400">
            Powered by <a href="https://maintainhome.ai" className="font-semibold hover:text-slate-600 transition-colors">MaintainHome.ai</a>
          </span>
          <span className="text-slate-200">·</span>
          <a href="mailto:support@maintainhome.ai" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Support</a>
        </div>
      </div>
    </div>
  );
}
