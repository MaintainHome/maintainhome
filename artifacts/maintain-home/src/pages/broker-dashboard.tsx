import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Building2, Users, Link2, Copy, Check, Palette, Loader2,
  ExternalLink, BarChart2, UserCheck, Zap, RefreshCw, LogOut,
  Mail, ArrowRight, ShieldCheck,
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
  status: string;
  createdAt: string;
}

interface Client {
  id: number;
  email: string;
  name: string | null;
  subscriptionStatus: string;
  createdAt: string;
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

export default function BrokerDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const { setPreviewSubdomain } = useBranding();
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

  const proClients = clients.filter(c =>
    ["pro_monthly", "pro_annual", "promo_pro"].includes(c.subscriptionStatus)
  );

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={`${BASE}images/logo-icon.png`}
              alt="MaintainHome.ai"
              className="w-7 h-7 object-contain"
            />
            <span className="font-bold text-slate-900 text-sm hidden sm:block">
              Broker Dashboard
            </span>
            <span className="text-xs text-slate-400 hidden sm:block">·</span>
            <span className="text-xs font-semibold text-primary hidden sm:block">{config.brokerName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={previewBranding}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors border border-slate-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Preview Brand
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Hero welcome */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-600/10 pointer-events-none" />
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
                style={{ backgroundColor: config.primaryColor + "33" }}
              >
                <Building2 className="w-7 h-7" style={{ color: config.primaryColor }} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Approved Partner</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mb-1">{config.brokerName}</h1>
              {config.tagline && (
                <p className="text-slate-300 text-sm">{config.tagline}</p>
              )}
              <p className="text-slate-400 text-xs mt-1.5 font-mono">
                {config.subdomain}.maintainhome.ai
              </p>
            </div>
            <div className="sm:ml-auto flex flex-col items-start sm:items-end gap-1 shrink-0">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${config.type === "team_leader" ? "bg-blue-500/20 text-blue-300" : "bg-primary/20 text-primary"}`}>
                {config.type === "team_leader" ? "Team Leader" : "Individual Agent"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.07 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-4"
        >
          {[
            { label: "Total Clients", value: clients.length, icon: <Users className="w-5 h-5 text-primary" />, color: "bg-primary/10" },
            { label: "Pro Members", value: proClients.length, icon: <Zap className="w-5 h-5 text-amber-500" />, color: "bg-amber-50" },
            { label: "Referral Source", value: config.type === "team_leader" ? "Team" : "Individual", icon: <UserCheck className="w-5 h-5 text-blue-500" />, color: "bg-blue-50" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
              <div className={`${stat.color} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
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
              <Link2 className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-slate-900">Invite New Client</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Share this link with homebuyer clients. When they click it, they'll see your branded experience and sign up under your account.
            </p>
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 mb-4">
              <span className="text-sm text-slate-700 font-mono flex-1 truncate">{inviteLink}</span>
              <CopyButton text={inviteLink} label="invite link" />
            </div>
            <button
              onClick={copyInviteLink}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-colors shadow-sm shadow-primary/20"
            >
              {linkCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied to clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Invite Link
                </>
              )}
            </button>
            <p className="text-xs text-slate-400 mt-3 text-center">
              You can also share your branded subdomain directly: <strong>{config.subdomain}.maintainhome.ai</strong>
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
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-slate-900">Your Branding</h2>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 rounded-xl h-8" style={{ backgroundColor: config.primaryColor }} title={`Primary: ${config.primaryColor}`} />
              <div className="flex-1 rounded-xl h-8" style={{ backgroundColor: config.secondaryColor }} title={`Secondary: ${config.secondaryColor}`} />
            </div>

            {config.logoUrl && (
              <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-center">
                <img src={config.logoUrl} alt="Your logo" className="max-h-10 max-w-full object-contain" />
              </div>
            )}

            {config.tagline && (
              <div className="text-xs text-slate-500 italic border-l-2 border-primary/30 pl-3">
                "{config.tagline}"
              </div>
            )}

            <button
              onClick={previewBranding}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary text-primary font-bold text-sm hover:bg-primary/5 transition-colors mt-auto"
            >
              <ExternalLink className="w-4 h-4" />
              Preview Your Brand
            </button>

            <p className="text-xs text-slate-400 text-center">
              To update your branding, contact{" "}
              <a href="mailto:support@maintainhome.ai" className="text-primary hover:underline">
                support@maintainhome.ai
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
              <Users className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-slate-900">Your Clients</h2>
              {clients.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">{clients.length}</span>
              )}
            </div>
            <button onClick={load} className="text-slate-400 hover:text-slate-600 transition-colors">
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
                Share your invite link above to start bringing clients in under your branded experience.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {clients.map((client) => (
                <div key={client.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-xs">
                      {(client.name ?? client.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{client.name ?? "—"}</p>
                    <p className="text-xs text-slate-400 truncate">{client.email}</p>
                  </div>
                  <div className="shrink-0">
                    {["pro_monthly", "pro_annual", "promo_pro"].includes(client.subscriptionStatus) ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">Pro</span>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Free</span>
                    )}
                  </div>
                  <div className="shrink-0 text-xs text-slate-400 hidden sm:block">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* How to share instructions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white"
        >
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="w-5 h-5 text-primary" />
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
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary font-black text-xs">{item.step}</span>
                </div>
                <div>
                  <p className="font-bold text-sm mb-1">{item.title}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
