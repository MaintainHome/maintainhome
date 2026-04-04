import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Building2, Users, Link2, Copy, Check, User, Loader2,
  ExternalLink, BarChart2, Zap, RefreshCw, LogOut,
  ShieldCheck, Gift, CreditCard, Calendar, TrendingUp,
  AlertTriangle, ArrowUpRight, Star, Phone, Camera,
  Pencil, X, Upload, CheckCircle2, HomeIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useLocation } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const BASE = import.meta.env.BASE_URL;

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("[broker-dashboard] Non-JSON response:", res.status, text.slice(0, 200));
    throw new Error(`Server error (${res.status}). Please try again.`);
  }
}

const MH_PRIMARY = "#1f9e6e";

/* ─── Types ───────────────────────────────────────────────────────── */
interface BrokerConfig {
  id: number;
  subdomain: string;
  brokerName: string;
  logoUrl: string | null;
  agentPhotoUrl: string | null;
  phoneNumber: string | null;
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
          style={{ transition: "stroke-dasharray 0.6s ease" }} />
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
      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: c }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-5" style={{ color: c }}>{score}</span>
    </div>
  );
}

/* ─── Stat card ──────────────────────────────────────────────────── */
function StatCard({ icon, label, value, iconBg, iconColor, children }: {
  icon: React.ReactNode; label: string; value?: string | number;
  iconBg: string; iconColor?: string; children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconBg }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div className="min-w-0">
        {value !== undefined && (
          <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
        )}
        {children}
        <p className="text-xs text-slate-400 font-medium mt-1">{label}</p>
      </div>
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
  const { setPreviewSubdomain } = useBranding();
  const [, navigate] = useLocation();

  const [config, setConfig] = useState<BrokerConfig | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  /* ── Edit Branding modal state ────────────────────────────────── */
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ logoUrl: "", agentPhotoUrl: "", phoneNumber: "", tagline: "", welcomeMessage: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/"); return; }
    if (!user.isBroker) { navigate("/choose-role"); return; }
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
        const d = await safeJson(meRes);
        setError(d.error ?? "Could not load broker profile.");
        return;
      }
      setConfig((await safeJson(meRes)).config);
      if (clientsRes.ok) setClients((await safeJson(clientsRes)).clients ?? []);
    } catch { setError("Network error. Please refresh."); }
    finally { setLoading(false); }
  }, []);

  function copyInviteLink() {
    if (!config) return;
    navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL}invite/${config.subdomain}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }

  function openEditModal() {
    if (!config) return;
    setEditForm({
      logoUrl: config.logoUrl ?? "",
      agentPhotoUrl: config.agentPhotoUrl ?? "",
      phoneNumber: config.phoneNumber ?? "",
      tagline: config.tagline ?? "",
      welcomeMessage: config.welcomeMessage ?? "",
    });
    setEditSuccess(null);
    setEditError(null);
    setEditOpen(true);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setEditError(null);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch(`${API_BASE}/api/logo-upload`, { method: "POST", body: fd, credentials: "include" });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setEditForm((f) => ({ ...f, logoUrl: data.logoUrl }));
    } catch (err: any) {
      setEditError(err.message ?? "Logo upload failed");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setEditError(null);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch(`${API_BASE}/api/photo-upload`, { method: "POST", body: fd, credentials: "include" });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setEditForm((f) => ({ ...f, agentPhotoUrl: data.photoUrl }));
    } catch (err: any) {
      setEditError(err.message ?? "Photo upload failed");
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function handleEditSave() {
    if (!config) return;
    setEditSaving(true);
    setEditSuccess(null);
    setEditError(null);
    try {
      const res = await fetch(`${API_BASE}/api/broker/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editForm),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setConfig((prev) => prev ? {
        ...prev,
        logoUrl: editForm.logoUrl || null,
        agentPhotoUrl: editForm.agentPhotoUrl || null,
        phoneNumber: editForm.phoneNumber || null,
        tagline: editForm.tagline || null,
        welcomeMessage: editForm.welcomeMessage || null,
      } : prev);
      setEditSuccess("Branding updated successfully. Changes are live.");
    } catch (err: any) {
      setEditError(err.message ?? "Failed to save branding");
    } finally {
      setEditSaving(false);
    }
  }

  /* ── Derived stats ─────────────────────────────────────────────── */
  const proClients = clients.filter((c) => isPro(c.subscriptionStatus));
  const bigTicketClients = clients.filter((c) => c.bigTicketAlertCount > 0);
  const avgScore = clients.length > 0
    ? Math.round(clients.reduce((s, c) => s + c.activityScore, 0) / clients.length) : null;

  const accent = MH_PRIMARY;
  const isGift = config?.monetizationModel === "closing_gift";
  const inviteLink = config
    ? `${window.location.origin}${import.meta.env.BASE_URL}invite/${config.subdomain}` : "";

  /* ── Loading ─────────────────────────────────────────────────────── */
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

  /* ── Error ────────────────────────────────────────────────────────── */
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
            {config.agentPhotoUrl && (
              <img src={config.agentPhotoUrl} alt={config.brokerName}
                className="w-7 h-7 rounded-full object-cover border border-slate-200 hidden sm:block" />
            )}
            <span className="font-bold text-slate-900 text-sm hidden sm:block">Partner Dashboard</span>
            <span className="text-slate-300 hidden sm:block">·</span>
            <span className="text-xs font-semibold truncate hidden sm:block" style={{ color: accent }}>
              {config.brokerName}
            </span>
            {config.phoneNumber && (
              <span className="hidden lg:flex items-center gap-1 text-xs text-slate-400">
                <Phone className="w-3 h-3" />{config.phoneNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={copyInviteLink}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl text-white shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
              style={{ backgroundColor: accent }}>
              {linkCopied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Link2 className="w-3.5 h-3.5" />Invite Client</>}
            </button>
            <button onClick={openEditModal}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors border border-slate-200">
              <Pencil className="w-3.5 h-3.5" />Edit Branding
            </button>
            <button onClick={() => { setPreviewSubdomain(config.subdomain); navigate("/"); }}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors border border-slate-200">
              <ExternalLink className="w-3.5 h-3.5" />Preview
            </button>
            <button onClick={() => { sessionStorage.setItem("mh_active_role", "homeowner"); navigate("/"); }}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors border border-slate-200">
              <HomeIcon className="w-3.5 h-3.5" />My Home
            </button>
            <button onClick={async () => { await logout(); navigate("/"); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors">
              <LogOut className="w-3.5 h-3.5" /><span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 flex-1">

        {/* ════════════════════════════════════════════════════════
            HERO — dark slate, MaintainHome theme
        ════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl text-white relative overflow-hidden bg-slate-900"
        >
          {/* Animated radial glow — top right */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            style={{ background: `radial-gradient(ellipse at 85% 10%, ${accent}55 0%, transparent 55%)` }}
          />
          {/* Animated radial glow — bottom left */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0.25, 0.5, 0.25] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
            style={{ background: `radial-gradient(ellipse at 15% 90%, ${accent}35 0%, transparent 50%)` }}
          />
          {/* Noise texture overlay for depth */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />

          <div className="relative px-6 sm:px-10 py-10 sm:py-14 text-center">

            {/* Pioneer badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full mb-6"
              style={{ backgroundColor: accent + "30", border: `1px solid ${accent}50` }}
            >
              <Star className="w-3 h-3" style={{ color: accent }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>
                Pioneer Partner · Approved
              </span>
            </motion.div>

            {/* Logo + Agent photo — centered */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex flex-col items-center gap-4 mb-5"
            >
              {config.logoUrl ? (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/15">
                  <img src={config.logoUrl} alt={config.brokerName}
                    className="h-16 sm:h-20 max-w-[280px] object-contain" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ backgroundColor: accent + "33", border: `2px solid ${accent}40` }}>
                  <Building2 className="w-10 h-10" style={{ color: accent }} />
                </div>
              )}

              {/* Agent photo + phone row */}
              {(config.agentPhotoUrl || config.phoneNumber) && (
                <div className="flex items-center gap-3">
                  {config.agentPhotoUrl && (
                    <img src={config.agentPhotoUrl} alt={config.brokerName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white/30 shadow-lg" />
                  )}
                  {config.phoneNumber && (
                    <a href={`tel:${config.phoneNumber}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-sm border border-white/15 hover:bg-white/20 transition-colors">
                      <Phone className="w-3.5 h-3.5" />{config.phoneNumber}
                    </a>
                  )}
                </div>
              )}
            </motion.div>

            {/* Broker name */}
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="text-3xl sm:text-4xl font-black mb-2 leading-tight"
            >
              {config.brokerName}
            </motion.h1>

            {/* Tagline in accent color */}
            {config.tagline && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="text-lg sm:text-xl font-bold mb-4"
                style={{ color: accent }}
              >
                {config.tagline}
              </motion.p>
            )}

            {/* Welcome line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.38, duration: 0.5 }}
              className="text-white/55 text-sm sm:text-base max-w-lg mx-auto mb-7 leading-relaxed"
            >
              Welcome to your branded client retention platform. Help your clients own their homes better — and keep them for life.
            </motion.p>

            {/* Subdomain + type + model chips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="flex items-center justify-center gap-3 flex-wrap"
            >
              <span className="text-white/30 text-xs font-mono">{config.subdomain}.maintainhome.ai</span>
              <span className="text-white/15">·</span>
              <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: accent + "28", color: accent }}>
                {config.type === "team_leader" ? "Team Leader" : "Individual Agent"}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-white/65">
                <MIcon className="w-3 h-3 shrink-0" />{monetizationLabel}
              </span>
            </motion.div>

            {/* Quick-action buttons inside hero */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.52, duration: 0.4 }}
              className="flex items-center justify-center gap-3 mt-8 flex-wrap"
            >
              <button
                onClick={copyInviteLink}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-extrabold text-sm transition-all hover:scale-[1.04] active:scale-[0.98]"
                style={{
                  backgroundColor: accent,
                  boxShadow: `0 0 32px ${accent}70, 0 4px 16px ${accent}55`,
                  color: "#fff",
                }}
              >
                {linkCopied ? <><Check className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy Invite Link</>}
              </button>
              <button
                onClick={() => { setPreviewSubdomain(config.subdomain); navigate("/"); }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 transition-all border border-white/20 text-white/80 hover:text-white"
              >
                <ExternalLink className="w-4 h-4" />Preview Your Brand
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* ── 4 Stats ───────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4">

          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Total Clients"
            value={clients.length}
            iconBg={accent + "18"}
            iconColor={accent}
          />

          <StatCard
            icon={<Zap className="w-6 h-6" />}
            label="Active Pro"
            value={proClients.length}
            iconBg="#fef3c7"
            iconColor="#f59e0b"
          />

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
            {avgScore !== null ? (
              <ScoreRing score={avgScore} color={scoreColor(avgScore)} />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-slate-300" />
              </div>
            )}
            <div>
              <p className="text-sm font-black text-slate-900 leading-tight">
                {avgScore !== null ? avgScore : "—"}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">Avg. Health Score</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${bigTicketClients.length > 0 ? "bg-orange-50" : "bg-slate-50"}`}>
              <AlertTriangle className={`w-6 h-6 ${bigTicketClients.length > 0 ? "text-orange-500" : "text-slate-300"}`} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 leading-none">{bigTicketClients.length}</p>
              <p className="text-xs text-slate-400 font-medium mt-1">Big-Ticket Alerts</p>
            </div>
          </div>
        </motion.div>

        {/* ── Invite + Agent Profile row ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Invite card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.14 }}
            className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
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

            {/* Primary CTA — large, glowing */}
            <button
              onClick={copyInviteLink}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-white font-extrabold text-base transition-all hover:scale-[1.02] active:scale-[0.99] mt-auto"
              style={{
                backgroundColor: accent,
                boxShadow: linkCopied
                  ? `0 4px 20px ${accent}30`
                  : `0 6px 28px ${accent}55, 0 2px 8px ${accent}30`,
              }}
            >
              {linkCopied
                ? <><Check className="w-5 h-5" />Copied to clipboard!</>
                : <><Copy className="w-5 h-5" />Copy Invite Link</>}
            </button>
            <p className="text-xs text-slate-400 mt-3 text-center">
              Short link:{" "}
              <strong className="text-slate-600 font-mono">maintainhome.ai/{config.subdomain}</strong>
            </p>
          </motion.div>

          {/* Agent Profile card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.17 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" style={{ color: accent }} />
              <h2 className="font-bold text-slate-900">Agent Profile</h2>
            </div>

            {/* Logo */}
            {config.logoUrl ? (
              <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-center border border-slate-100">
                <img src={config.logoUrl} alt="logo" className="max-h-10 max-w-full object-contain" />
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-center border border-slate-100">
                <Building2 className="w-6 h-6 text-slate-300" />
              </div>
            )}

            {/* Agent photo */}
            {config.agentPhotoUrl ? (
              <div className="flex items-center gap-3">
                <img src={config.agentPhotoUrl} alt={config.brokerName}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{config.brokerName}</p>
                  <p className="text-xs text-slate-400 capitalize">{config.type.replace("_", " ")}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-400">No headshot uploaded — contact support to update.</p>
              </div>
            )}

            {/* Phone */}
            {config.phoneNumber && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <p className="text-sm font-semibold text-slate-700">{config.phoneNumber}</p>
              </div>
            )}

            {/* Tagline */}
            {config.tagline && (
              <p className="text-xs text-slate-500 italic border-l-2 pl-3 leading-relaxed"
                style={{ borderColor: accent + "50" }}>
                "{config.tagline}"
              </p>
            )}

            {/* Model chip */}
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
              To update your profile,{" "}
              <a href="mailto:support@maintainhome.ai" className="hover:underline" style={{ color: accent }}>contact support</a>
            </p>
          </motion.div>
        </div>

        {/* ── Client table ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

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
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-extrabold mt-2 hover:scale-[1.03] active:scale-[0.98] transition-all"
                style={{ backgroundColor: accent, boxShadow: `0 6px 24px ${accent}50` }}>
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
                {clients.map((client, idx) => {
                  const expiry = isGift && config.giftDuration
                    ? giftExpiry(client.createdAt, config.giftDuration)
                    : null;

                  return (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * idx, duration: 0.3 }}
                      className="group"
                    >
                      {/* ─ Mobile row ─ */}
                      <div className="md:hidden flex items-center gap-3 px-6 py-4 hover:bg-slate-50/80 transition-colors">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black"
                          style={{ backgroundColor: accent + "20", color: accent }}>
                          {(client.name ?? client.email)[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{client.name ?? "—"}</p>
                          <p className="text-xs text-slate-400 truncate">{client.email}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {client.hasCalendar && <Calendar className="w-3.5 h-3.5 text-blue-400" />}
                          {client.bigTicketAlertCount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />}
                          {isPro(client.subscriptionStatus)
                            ? <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f59e0b18", color: "#d97706" }}>Pro</span>
                            : expiry
                              ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${expiry.expired ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"}`}>Gift</span>
                              : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Free</span>
                          }
                        </div>
                      </div>

                      {/* ─ Desktop row ─ */}
                      <div className="hidden md:grid gap-3 px-6 py-4 hover:bg-slate-50/80 transition-colors items-center"
                        style={{ gridTemplateColumns: "2fr 90px 95px 120px 90px 44px" }}>

                        {/* Client */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black"
                            style={{ backgroundColor: accent + "20", color: accent }}>
                            {(client.name ?? client.email)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-slate-900 truncate">{client.name ?? "—"}</p>
                              {client.bigTicketAlertCount > 0 && (
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0"
                                  title={`${client.bigTicketAlertCount} big-ticket alert${client.bigTicketAlertCount > 1 ? "s" : ""}`} />
                              )}
                              {client.hasCalendar && (
                                <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" title="AI calendar built" />
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

                        {/* Health Score */}
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
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>

        {/* ── Big-ticket spotlight ──────────────────────────────────── */}
        {bigTicketClients.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.24 }}
            className="rounded-2xl p-6 border"
            style={{
              backgroundColor: "#fff7ed",
              borderColor: "#fed7aa",
              borderLeftWidth: "4px",
              borderLeftColor: "#f97316",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h2 className="font-bold text-orange-900">Big-Ticket Alerts Across Your Clients</h2>
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">{bigTicketClients.length}</span>
            </div>
            <div className="space-y-3">
              {bigTicketClients.slice(0, 5).map((client) => (
                <div key={client.id} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-orange-100 shadow-sm">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black bg-orange-100 text-orange-600 mt-0.5">
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
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.26 }}
          className="rounded-2xl p-6 sm:p-8 text-white bg-slate-900">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="w-5 h-5" style={{ color: accent }} />
            <h2 className="font-bold">How to Share Your Branded Experience</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { step: "1", title: "Copy your invite link", desc: "Share via email, text, or your website. Clients instantly see your brand." },
              { step: "2", title: "Client signs up", desc: "They see your logo and photo. Your welcome message greets them on first login." },
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
      <div className="border-t border-slate-200 py-4 mt-2">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-center gap-2">
          <img src={`${BASE}images/logo-icon.png`} alt="MaintainHome.ai" className="w-4 h-4 object-contain opacity-40" />
          <span className="text-xs text-slate-400">
            Powered by <a href="https://maintainhome.ai" className="font-semibold hover:text-slate-600 transition-colors">MaintainHome.ai</a>
          </span>
          <span className="text-slate-200">·</span>
          <a href="mailto:support@maintainhome.ai" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Support</a>
        </div>
      </div>

      {/* ── Edit Branding Modal ─────────────────────────────────────── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setEditOpen(false); }}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${MH_PRIMARY}18` }}>
                  <Pencil className="w-4 h-4" style={{ color: MH_PRIMARY }} />
                </div>
                <h2 className="text-base font-black text-slate-900">Edit My Branding</h2>
              </div>
              <button onClick={() => setEditOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">

              {/* Success banner */}
              {editSuccess && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <p className="text-sm text-green-700 font-medium">{editSuccess}</p>
                </div>
              )}

              {/* Error banner */}
              {editError && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600">{editError}</p>
                </div>
              )}

              {/* ── Logo ───────────────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Company Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                    {editForm.logoUrl
                      ? <img src={editForm.logoUrl} alt="Logo" className="max-h-12 max-w-[72px] object-contain" />
                      : <Building2 className="w-6 h-6 text-slate-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
                      {logoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {logoUploading ? "Uploading…" : "Upload New Logo"}
                    </button>
                    <p className="text-xs text-slate-400 mt-1.5">JPG, PNG, SVG · Max 2MB</p>
                  </div>
                </div>
              </div>

              {/* ── Agent Photo ────────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Agent / Team Photo <span className="font-normal normal-case text-slate-400">(optional)</span></label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                    {editForm.agentPhotoUrl
                      ? <img src={editForm.agentPhotoUrl} alt="Agent" className="w-full h-full object-cover" />
                      : <User className="w-6 h-6 text-slate-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
                      {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      {photoUploading ? "Uploading…" : "Upload New Photo"}
                    </button>
                    <p className="text-xs text-slate-400 mt-1.5">JPG, PNG · Max 2MB</p>
                  </div>
                </div>
              </div>

              {/* ── Phone Number ───────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="e.g. 336.380.1851"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": MH_PRIMARY } as React.CSSProperties}
                />
              </div>

              {/* ── Tagline ─────────────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Tagline</label>
                <input
                  type="text"
                  value={editForm.tagline}
                  onChange={(e) => setEditForm((f) => ({ ...f, tagline: e.target.value }))}
                  placeholder="e.g. Your trusted real estate partner"
                  maxLength={120}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": MH_PRIMARY } as React.CSSProperties}
                />
                <p className="text-xs text-slate-400 mt-1">{editForm.tagline.length}/120</p>
              </div>

              {/* ── Welcome Message ─────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Welcome Message</label>
                <textarea
                  rows={3}
                  value={editForm.welcomeMessage}
                  onChange={(e) => setEditForm((f) => ({ ...f, welcomeMessage: e.target.value }))}
                  placeholder="A personal note shown to new clients on your invite page…"
                  maxLength={400}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                  style={{ "--tw-ring-color": MH_PRIMARY } as React.CSSProperties}
                />
                <p className="text-xs text-slate-400 mt-1">{editForm.welcomeMessage.length}/400</p>
              </div>

              {/* ── Save / Cancel ───────────────────────────────────────── */}
              <div className="flex gap-3 pt-1 pb-2">
                <button
                  onClick={handleEditSave}
                  disabled={editSaving || logoUploading || photoUploading}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 shadow-sm"
                  style={{ backgroundColor: MH_PRIMARY }}>
                  {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={() => setEditOpen(false)}
                  className="px-5 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
