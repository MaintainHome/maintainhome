import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Building2, Users, Link2, Copy, Check, Palette, Loader2,
  ExternalLink, BarChart2, UserCheck, Zap, RefreshCw, LogOut,
  ShieldCheck, Gift, CreditCard, Activity, Calendar, TrendingUp,
  Home,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useLocation } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const BASE = import.meta.env.BASE_URL;

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
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      title={`Copy ${label}`}
      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function ActivityBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-400" : "bg-slate-200";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-slate-500 tabular-nums w-6">{score}%</span>
    </div>
  );
}

function isPro(status: string) {
  return ["pro_monthly", "pro_annual", "promo_pro"].includes(status);
}

function relativeDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

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
    if (!user) {
      navigate("/");
      return;
    }
    load();
  }, [authLoading, user]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, clientsRes] = await Promise.all([
        fetch(`${API_BASE}/api/broker/me`, { credentials: "include" }),
        fetch(`${API_BASE}/api/broker/clients`, { credentials: "include" }),
      ]);
      if (!meRes.ok) {
        const data = await meRes.json();
        setError(data.error ?? "Could not load broker profile. Make sure you're signed in with your broker email.");
        return;
      }
      const meData = await meRes.json();
      setConfig(meData.config);
      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData.clients ?? []);
      }
    } catch {
      setError("Network error. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  function previewBranding() {
    if (!config) return;
    setPreviewSubdomain(config.subdomain);
    navigate("/");
  }

  function copyInviteLink() {
    if (!config) return;
    const link = `${window.location.origin}${import.meta.env.BASE_URL}?_ref=${config.subdomain}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }

  const inviteLink = config
    ? `${window.location.origin}${import.meta.env.BASE_URL}?_ref=${config.subdomain}`
    : "";

  const proClients = clients.filter((c) => isPro(c.subscriptionStatus));
  const clientsWithCalendar = clients.filter((c) => c.hasCalendar);
  const avgActivity =
    clients.length > 0
      ? Math.round(clients.reduce((sum, c) => sum + c.activityScore, 0) / clients.length)
      : null;

  const accentColor = brandPrimary ?? config?.primaryColor ?? "#1f9e6e";

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: accentColor }} />
          <p className="text-slate-500 text-sm">Loading your broker dashboard…</p>
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
            <button
              onClick={() => navigate("/broker-onboard")}
              className="w-full px-5 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Apply for a White-Label Account
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!config) return null;

  const monetizationLabel =
    config.monetizationModel === "closing_gift"
      ? `Closing Gift${config.giftDuration === "3years" ? " · 3 Years" : " · 1 Year"}`
      : "Private Label";

  const MonetizationIcon =
    config.monetizationModel === "closing_gift" ? Gift : CreditCard;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.brokerName}
                className="h-7 max-w-[120px] object-contain"
              />
            ) : (
              <img
                src={`${BASE}images/logo-icon.png`}
                alt="MaintainHome.ai"
                className="w-7 h-7 object-contain"
              />
            )}
            <span className="font-bold text-slate-900 text-sm hidden sm:block">
              Broker Dashboard
            </span>
            <span className="text-xs text-slate-400 hidden sm:block">·</span>
            <span className="text-xs font-semibold hidden sm:block" style={{ color: accentColor }}>
              {config.brokerName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-colors text-white shadow-sm"
              style={{ backgroundColor: accentColor }}
            >
              {linkCopied ? (
                <><Check className="w-3.5 h-3.5" /> Copied!</>
              ) : (
                <><Link2 className="w-3.5 h-3.5" /> Invite Client</>
              )}
            </button>
            <button
              onClick={previewBranding}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors border border-slate-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 flex-1">

        {/* Hero welcome */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${config.secondaryColor} 0%, ${config.primaryColor}22 100%), ${config.secondaryColor}` }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at top right, ${accentColor}30 0%, transparent 60%)` }} />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.brokerName}
                className="h-12 max-w-[160px] object-contain bg-white/10 rounded-xl px-3 py-2"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: accentColor + "33" }}
              >
                <Building2 className="w-7 h-7" style={{ color: accentColor }} />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4" style={{ color: accentColor }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>Approved Partner</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mb-1">{config.brokerName}</h1>
              {config.tagline && (
                <p className="text-white/70 text-sm">{config.tagline}</p>
              )}
              <p className="text-white/40 text-xs mt-1.5 font-mono">
                {config.subdomain}.maintainhome.ai
              </p>
            </div>
            <div className="flex flex-row sm:flex-col items-start gap-2 shrink-0">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full`}
                style={{ backgroundColor: accentColor + "30", color: accentColor }}
              >
                {config.type === "team_leader" ? "Team Leader" : "Individual Agent"}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-white/70">
                <MonetizationIcon className="w-3 h-3" />
                {monetizationLabel}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.07 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            {
              label: "Total Clients",
              value: clients.length,
              icon: <Users className="w-5 h-5" />,
              color: accentColor,
              sub: clients.length === 1 ? "homeowner" : "homeowners",
            },
            {
              label: "Pro Members",
              value: proClients.length,
              icon: <Zap className="w-5 h-5" />,
              color: "#f59e0b",
              sub: proClients.length === 0 ? "upgrade your clients" : "active subscriptions",
            },
            {
              label: "With Calendar",
              value: clientsWithCalendar.length,
              icon: <Calendar className="w-5 h-5" />,
              color: "#3b82f6",
              sub: "AI plan built",
            },
            {
              label: "Avg. Engagement",
              value: avgActivity !== null ? `${avgActivity}%` : "—",
              icon: <TrendingUp className="w-5 h-5" />,
              color: "#8b5cf6",
              sub: "activity score",
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
                style={{ backgroundColor: stat.color + "20" }}
              >
                <span style={{ color: stat.color }}>{stat.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black text-slate-900 leading-none">{stat.value}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5 leading-tight">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Invite Link Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-5 h-5" style={{ color: accentColor }} />
              <h2 className="font-bold text-slate-900">Invite New Client</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Share this link. When clients click it they'll see your branded experience and sign up under your account automatically.
            </p>
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 mb-4">
              <span className="text-sm text-slate-700 font-mono flex-1 truncate">{inviteLink}</span>
              <CopyButton text={inviteLink} label="invite link" />
            </div>
            <button
              onClick={copyInviteLink}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-white font-bold text-sm transition-all shadow-md hover:opacity-90 active:scale-[0.99]"
              style={{ backgroundColor: accentColor, boxShadow: `0 4px 14px ${accentColor}40` }}
            >
              {linkCopied ? (
                <><Check className="w-4 h-4" /> Copied to clipboard!</>
              ) : (
                <><Copy className="w-4 h-4" /> Copy Invite Link</>
              )}
            </button>
            <p className="text-xs text-slate-400 mt-3 text-center">
              Or direct clients to: <strong className="text-slate-600">{config.subdomain}.maintainhome.ai</strong>
            </p>
          </motion.div>

          {/* Branding Summary */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Palette className="w-5 h-5" style={{ color: accentColor }} />
              <h2 className="font-bold text-slate-900">Your Branding</h2>
            </div>

            <div className="flex gap-2">
              <div
                className="flex-1 rounded-xl h-8 flex items-center justify-center"
                style={{ backgroundColor: config.primaryColor }}
                title={`Primary: ${config.primaryColor}`}
              >
                <span className="text-white text-[10px] font-mono font-bold opacity-80">{config.primaryColor}</span>
              </div>
              <div
                className="flex-1 rounded-xl h-8 flex items-center justify-center"
                style={{ backgroundColor: config.secondaryColor }}
                title={`Secondary: ${config.secondaryColor}`}
              >
                <span className="text-white text-[10px] font-mono font-bold opacity-80">{config.secondaryColor}</span>
              </div>
            </div>

            {config.logoUrl && (
              <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-center border border-slate-100">
                <img src={config.logoUrl} alt="Your logo" className="max-h-10 max-w-full object-contain" />
              </div>
            )}

            {config.tagline && (
              <div className="text-xs text-slate-500 italic border-l-2 pl-3" style={{ borderColor: accentColor + "50" }}>
                "{config.tagline}"
              </div>
            )}

            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <MonetizationIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-700">{monetizationLabel}</p>
                <p className="text-xs text-slate-400">Offer model</p>
              </div>
            </div>

            <button
              onClick={previewBranding}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm hover:opacity-90 transition-colors mt-auto"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              <ExternalLink className="w-4 h-4" />
              Preview Your Brand
            </button>

            <p className="text-xs text-slate-400 text-center">
              To update branding, contact{" "}
              <a href="mailto:support@maintainhome.ai" className="hover:underline" style={{ color: accentColor }}>
                support
              </a>
            </p>
          </motion.div>
        </div>

        {/* Client List */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: accentColor }} />
              <h2 className="font-bold text-slate-900">Your Clients</h2>
              {clients.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">{clients.length}</span>
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
              <button
                onClick={copyInviteLink}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all mt-2"
                style={{ backgroundColor: accentColor }}
              >
                <Copy className="w-4 h-4" />
                Copy Invite Link
              </button>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="hidden sm:grid grid-cols-[2fr_1fr_80px_90px_90px] gap-4 px-6 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wide">
                <span>Client</span>
                <span>Joined</span>
                <span>Plan</span>
                <span>Engagement</span>
                <span>Last Active</span>
              </div>
              <div className="divide-y divide-slate-100">
                {clients.map((client) => (
                  <div key={client.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_1fr_80px_90px_90px] gap-4 items-center px-6 py-3.5 hover:bg-slate-50/60 transition-colors">
                    {/* Client info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
                        style={{ backgroundColor: accentColor + "30", color: accentColor }}
                      >
                        {(client.name ?? client.email)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{client.name ?? "—"}</p>
                        <p className="text-xs text-slate-400 truncate">{client.email}</p>
                      </div>
                      {client.hasCalendar && (
                        <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" title="Has AI calendar" />
                      )}
                    </div>

                    {/* Joined */}
                    <div className="text-xs text-slate-400 hidden sm:block">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </div>

                    {/* Plan */}
                    <div className="hidden sm:block">
                      {isPro(client.subscriptionStatus) ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#f59e0b20", color: "#d97706" }}>
                          <Zap className="w-3 h-3" />
                          Pro
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Free</span>
                      )}
                    </div>

                    {/* Engagement */}
                    <div className="hidden sm:block">
                      <ActivityBar score={client.activityScore} />
                    </div>

                    {/* Last Active */}
                    <div className="text-xs text-slate-400 hidden sm:block shrink-0">
                      {relativeDate(client.lastActiveAt)}
                    </div>

                    {/* Mobile: plan badge only */}
                    <div className="sm:hidden flex items-center gap-2 shrink-0">
                      {isPro(client.subscriptionStatus) ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f59e0b20", color: "#d97706" }}>Pro</span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Free</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* How to share instructions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl p-6 sm:p-8 text-white"
          style={{ backgroundColor: config.secondaryColor }}
        >
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="w-5 h-5" style={{ color: accentColor }} />
            <h2 className="font-bold">How to Share Your Branded Experience</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: "1",
                title: "Copy your invite link",
                desc: "Use the invite link above or share your subdomain directly with clients.",
              },
              {
                step: "2",
                title: "Client signs up",
                desc: "They see your logo, colors, and tagline immediately. Your welcome message greets them on first login.",
              },
              {
                step: "3",
                title: "They build their plan",
                desc: "Clients complete the home quiz, get their AI maintenance calendar, and interact with Maintly — all under your brand.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: accentColor + "30" }}>
                  <span className="font-black text-xs" style={{ color: accentColor }}>{item.step}</span>
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

      {/* Footer */}
      <div className="border-t border-slate-200 py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-center gap-2">
          <img
            src={`${BASE}images/logo-icon.png`}
            alt="MaintainHome.ai"
            className="w-4 h-4 object-contain opacity-40"
          />
          <span className="text-xs text-slate-400">
            Powered by <a href="https://maintainhome.ai" className="font-semibold hover:text-slate-600 transition-colors">MaintainHome.ai</a>
          </span>
          <span className="text-slate-200">·</span>
          <a href="mailto:support@maintainhome.ai" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Support
          </a>
        </div>
      </div>
    </div>
  );
}
