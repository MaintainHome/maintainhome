import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, Loader2, Home, AlertTriangle, Phone,
  CalendarDays, MessageCircle, FolderOpen, TrendingUp,
  ShieldCheck, FileLock2, Bot,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { AuthModal } from "@/components/AuthModal";
import { useLocation, useParams } from "wouter";
import NotFound from "@/pages/not-found";

const BASE = import.meta.env.BASE_URL;
const ACCENT = "#1f9e6e";
const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface AgentInfo {
  id: number;
  memberUserId: number | null;
  displayName: string;
  headshotUrl: string | null;
  phone: string | null;
  agentHandle: string | null;
  status: string;
}

const BENEFITS = [
  { icon: CalendarDays, label: "Custom Maintenance Calendar" },
  { icon: MessageCircle, label: "AI Chat with Maintly" },
  { icon: FolderOpen, label: "Home Document Vault" },
  { icon: TrendingUp, label: "Resale-Ready History" },
];

const BUILDER_BENEFITS = [
  { icon: ShieldCheck, label: "Automatic 1-Year Warranty Reminders" },
  { icon: FileLock2, label: "Secure Vault for Builder Paperwork" },
  { icon: Bot, label: "24/7 AI Assistant for New Homeowners" },
  { icon: CalendarDays, label: "Custom Maintenance Calendar" },
];

/* ════════════════════════════════════════════════════════════════════
   Invite Landing Page
   Supported routes:
     /invite/:subdomain          → cleanest explicit form
     /:subdomain                 → ultra-short alias
     /:teamHandle/:agentHandle   → agent-specific invite link
     /invite?broker=...          → legacy query-param form
     /?_ref=...                  → legacy referral param (still works)
════════════════════════════════════════════════════════════════════ */
export default function InviteLanding() {
  const params = useParams<{ subdomain?: string; teamHandle?: string; agentHandle?: string }>();

  const { subdomain, agentHandle: routeAgentHandle } = useMemo(() => {
    if (params?.teamHandle && params?.agentHandle) {
      return {
        subdomain: params.teamHandle.toLowerCase().trim(),
        agentHandle: params.agentHandle.toLowerCase().trim(),
      };
    }
    const fromRoute = params?.subdomain?.toLowerCase().trim();
    if (fromRoute) return { subdomain: fromRoute, agentHandle: null };
    const p = new URLSearchParams(window.location.search);
    return {
      subdomain: (p.get("broker") ?? p.get("_ref"))?.toLowerCase().trim() ?? null,
      agentHandle: null,
    };
  }, [params?.subdomain, params?.teamHandle, params?.agentHandle]);

  const { setPreviewSubdomain, branding, loading: brandingLoading } = useBranding();
  const { user, loading: authLoading, isBroker } = useAuth();
  const [location, navigate] = useLocation();

  const [showAuth, setShowAuth] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<"signup" | "signin">("signup");
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);

  useEffect(() => {
    if (subdomain) {
      setPreviewSubdomain(subdomain);
      localStorage.setItem("mh_referral_sub", subdomain);
    }
  }, [subdomain, setPreviewSubdomain]);

  useEffect(() => {
    if (!subdomain || !routeAgentHandle) {
      const p = new URLSearchParams(window.location.search);
      const memberId = p.get("member");
      if (memberId) {
        localStorage.setItem("mh_pending_member", memberId);
      } else if (!routeAgentHandle) {
        localStorage.removeItem("mh_pending_member");
      }
      return;
    }

    setAgentLoading(true);
    fetch(`${API_BASE}/api/broker/team/member-by-handle?subdomain=${encodeURIComponent(subdomain)}&agentHandle=${encodeURIComponent(routeAgentHandle)}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (data.member) {
          setAgentInfo(data.member);
          if (data.member.memberUserId) {
            localStorage.setItem("mh_pending_member", String(data.member.memberUserId));
          }
        }
      })
      .catch(() => {})
      .finally(() => setAgentLoading(false));
  }, [subdomain, routeAgentHandle]);

  useEffect(() => {
    if (!authLoading && user && !isBroker) navigate("/");
  }, [user, authLoading, isBroker, navigate]);

  function openSignup() { setAuthInitialMode("signup"); setShowAuth(true); }
  function openSignin() { setAuthInitialMode("signin"); setShowAuth(true); }

  /* ── Loading ─────────────────────────────────────────────────── */
  if (brandingLoading || authLoading || agentLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-slate-400 text-sm">Loading your invitation…</p>
        </div>
      </div>
    );
  }

  /* ── No subdomain ────────────────────────────────────────────── */
  if (!subdomain) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-5">
            <Home className="w-8 h-8 text-slate-500" />
          </div>
          <h1 className="text-2xl font-black text-white mb-3">Welcome to MaintainHome.ai</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Your AI-powered home ownership companion. Sign up to get your personalized 12-month maintenance plan.
          </p>
          <button onClick={() => navigate("/")}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm mx-auto hover:bg-primary/90 transition-colors">
            <ArrowRight className="w-4 h-4" />Get Started
          </button>
        </div>
      </div>
    );
  }

  /* ── Branding not found ──────────────────────────────────────── */
  if (!branding) {
    const isInvitePath = location.startsWith("/invite");
    if (!isInvitePath) return <NotFound />;
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8 text-slate-500" />
          </div>
          <h1 className="text-2xl font-black text-white mb-3">Invite Link Expired</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            This invite link is invalid or has expired. Please ask your agent for a new link.
          </p>
          <button onClick={() => navigate("/")}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm mx-auto hover:bg-primary/90 transition-colors">
            <Home className="w-4 h-4" />Go to MaintainHome.ai
          </button>
        </div>
      </div>
    );
  }

  const displayPhotoUrl = agentInfo?.headshotUrl ?? branding.agentPhotoUrl;
  const displayPhone = agentInfo?.phone ?? branding.phoneNumber;
  const displayAgentName = agentInfo?.displayName ?? null;
  const displayName = agentInfo ? agentInfo.displayName : branding.brokerName;

  /* ── Branded invite page ─────────────────────────────────────── */
  return (
    <div className="min-h-screen relative overflow-x-hidden bg-slate-950">

      {/* ── Animated background blobs ────────────────────────────── */}
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: `radial-gradient(ellipse at 20% 5%, ${ACCENT}60 0%, transparent 50%)` }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        style={{ background: `radial-gradient(ellipse at 85% 90%, ${ACCENT}40 0%, transparent 48%)` }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.08, 0.2, 0.08] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 10 }}
        style={{ background: `radial-gradient(ellipse at 65% 40%, ${ACCENT}22 0%, transparent 52%)` }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.12, 0.3, 0.12] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{ background: `radial-gradient(ellipse at 5% 70%, #3b82f630 0%, transparent 45%)` }} />

      {/* ══════════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 pt-10 sm:pt-14 pb-16">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-14 xl:gap-20">

          {/* ════════════════════════════════════════════════════════
              LEFT COLUMN (~40%) — identity + Maintly hero
              Order (top→bottom):
                1. Broker/Builder logo
                2. Large Maintly avatar (gift for broker, phone for builder)
                3. Agent headshot
                4. Name + phone
                5. Tagline (desktop only)
          ════════════════════════════════════════════════════════ */}
          <motion.div
            className="w-full lg:w-[40%] shrink-0 flex flex-col items-center mb-10 lg:mb-0"
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* ── 1. Broker/Builder logo ─────────────────────────── */}
            {branding.logoUrl ? (
              <div
                className="w-full flex justify-center items-center rounded-3xl px-8 py-6 mb-6 shadow-2xl shadow-black/60"
                style={{
                  backgroundColor: "rgba(255,255,255,0.09)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <img
                  src={branding.logoUrl}
                  alt={branding.brokerName}
                  className="h-24 sm:h-28 lg:h-32 max-w-[260px] object-contain"
                />
              </div>
            ) : (
              <div
                className="w-32 h-32 lg:w-36 lg:h-36 rounded-3xl flex items-center justify-center shadow-2xl mb-6"
                style={{ backgroundColor: ACCENT + "30", border: `2px solid ${ACCENT}55` }}
              >
                <span className="text-5xl font-black" style={{ color: ACCENT }}>
                  {branding.brokerName[0]}
                </span>
              </div>
            )}

            {/* ── 2. Agent / team member headshot ───────────────── */}
            {displayPhotoUrl ? (
              <motion.div
                className="relative mb-4"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
              >
                <div
                  className="absolute -inset-2 rounded-full"
                  style={{ background: `radial-gradient(circle, ${ACCENT}35 0%, transparent 70%)` }}
                />
                <div
                  className="w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full overflow-hidden border-4 shadow-2xl relative"
                  style={{ borderColor: ACCENT + "90" }}
                >
                  <img
                    src={displayPhotoUrl}
                    alt={displayAgentName ?? branding.brokerName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <motion.div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  style={{ boxShadow: `0 0 0 6px ${ACCENT}25, 0 0 60px ${ACCENT}40` }}
                />
              </motion.div>
            ) : agentInfo ? (
              <motion.div
                className="relative mb-4"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
              >
                <div
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center border-4 shadow-2xl"
                  style={{ backgroundColor: ACCENT + "25", borderColor: ACCENT + "80" }}
                >
                  <span className="text-4xl font-black" style={{ color: ACCENT }}>
                    {agentInfo.displayName[0].toUpperCase()}
                  </span>
                </div>
              </motion.div>
            ) : null}

            {/* ── 3. Name + phone ────────────────────────────────── */}
            <div className="text-center mb-6">
              {agentInfo ? (
                <>
                  <p className="text-white font-extrabold text-xl">{agentInfo.displayName}</p>
                  <p className="text-white/40 text-sm mt-1 font-medium">{branding.brokerName}</p>
                </>
              ) : (
                <p className="text-white font-extrabold text-xl">{branding.brokerName}</p>
              )}
              {displayPhone && (
                <a
                  href={`tel:${displayPhone}`}
                  className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105"
                  style={{ color: ACCENT, backgroundColor: ACCENT + "18", border: `1px solid ${ACCENT}40` }}
                >
                  <Phone className="w-3.5 h-3.5" />{displayPhone}
                </a>
              )}
            </div>

            {/* ── 4. Large Maintly hero (gift for broker, phone for builder) — static ── */}
            <motion.div
              className="relative mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, duration: 0.55, ease: "easeOut" }}
            >
              {/* Celebratory glow — gold for broker gift, brand-green for builder */}
              <div
                className="absolute inset-0 rounded-full blur-3xl opacity-80 -z-0"
                style={{
                  background:
                    branding.accountType === "builder"
                      ? `radial-gradient(circle, ${ACCENT}80 0%, ${ACCENT}40 50%, transparent 75%)`
                      : "radial-gradient(circle, rgba(250,204,21,0.55) 0%, rgba(251,146,60,0.30) 50%, transparent 75%)",
                }}
              />
              <img
                src={
                  branding.accountType === "builder"
                    ? `${BASE}images/maintly_phone.png`
                    : `${BASE}images/maintly_gift.png`
                }
                alt={
                  branding.accountType === "builder"
                    ? "Maintly — your AI home assistant"
                    : "Maintly with your closing gift"
                }
                className="relative h-44 sm:h-52 lg:h-60 w-auto object-contain drop-shadow-2xl"
              />
            </motion.div>

            {/* ── 5. Tagline caption (desktop only) ──────────────── */}
            {branding.tagline && (
              <motion.p
                className="hidden lg:block mt-5 text-white/25 text-sm italic text-center max-w-xs leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
              >
                "{branding.tagline}"
              </motion.p>
            )}
          </motion.div>

          {/* ════════════════════════════════════════════════════════
              RIGHT COLUMN (~60%) — pitch + benefits + CTA
              Order (top→bottom):
                1. Badge
                2. Headline
                3. Sub-headline
                4. Benefits list
                5. Glowing CTA + microcopy + Sign-in
                6. Welcome message
          ════════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col lg:pt-2">

            {/* ── 1. Badge ───────────────────────────────────────── */}
            <motion.div
              className="flex justify-center lg:justify-start mb-5"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.4 }}
            >
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide uppercase"
                style={{
                  backgroundColor: ACCENT + "22",
                  border: `1px solid ${ACCENT}55`,
                  color: ACCENT,
                }}
              >
                <span className="text-base">{branding.accountType === "builder" ? "🏗️" : "🎁"}</span>
                {branding.accountType === "builder" ? `Your New Home from ${displayName}` : `A Special Gift from ${displayName}`}
              </div>
            </motion.div>

            {/* ── 2. Headline ────────────────────────────────────── */}
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.5, ease: "easeOut" }}
              className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-black text-white text-center lg:text-left mb-5 leading-[1.04] tracking-tight"
            >
              {branding.tagline ? (
                <span
                  style={{
                    background:
                      branding.accountType === "builder"
                        ? "linear-gradient(135deg, #14b8a6 0%, #1f9e6e 50%, #3b82f6 100%)"
                        : "linear-gradient(135deg, #1f9e6e 0%, #3b82f6 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {branding.tagline}
                </span>
              ) : branding.accountType === "builder" ? (
                <>
                  Welcome to<br />
                  <span
                    style={{
                      background: "linear-gradient(135deg, #14b8a6 0%, #1f9e6e 50%, #3b82f6 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Your New Home.
                  </span>
                </>
              ) : (
                <>
                  Your Home.<br />
                  <span
                    style={{
                      background: "linear-gradient(135deg, #1f9e6e 0%, #3b82f6 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Protected.
                  </span>{" "}
                  Organized.<br />
                  <span className="text-white/60">Forever.</span>
                </>
              )}
            </motion.h1>

            {/* ── 3. Sub-headline ────────────────────────────────── */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.45 }}
              className="text-white/65 text-base sm:text-lg mb-7 text-center lg:text-left leading-relaxed"
            >
              {branding.accountType === "builder"
                ? <>Your new home comes with <span className="font-bold text-white/85">1-year warranty tracking</span>, AI support from Maintly, and a complete care plan — all under your builder's brand.</>
                : <>Welcome To Your Custom App In Partnership With Your Real Estate Agent. <span className="font-bold text-white/85">Own Your Home Alone, But Care For It With Trusted Partners.</span></>}
            </motion.p>

            {/* ── 4. Benefits list ───────────────────────────────── */}
            <motion.div
              className="mb-7"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.45 }}
            >
              <div
                className="rounded-2xl px-5 py-4 sm:px-6 sm:py-5"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-4 text-center lg:text-left">
                  {branding.accountType === "builder" ? "Your New Home Care Package" : "Everything Included Under Your Brand"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(branding.accountType === "builder" ? BUILDER_BENEFITS : BENEFITS).map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: ACCENT + "25" }}
                      >
                        <Icon className="w-4 h-4" style={{ color: ACCENT }} />
                      </div>
                      <span className="text-white/75 text-sm font-medium leading-tight">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* ── 5. PRIMARY CTA + microcopy + Sign-in ──────────── */}
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
            >
              <motion.button
                onClick={openSignup}
                className="w-full flex items-center justify-center gap-3 py-6 rounded-2xl text-white font-extrabold text-lg sm:text-2xl transition-all leading-tight text-center"
                style={{
                  background:
                    branding.accountType === "builder"
                      ? "linear-gradient(135deg, #14b8a6 0%, #1f9e6e 50%, #3b82f6 100%)"
                      : "linear-gradient(135deg, #1f9e6e 0%, #3b82f6 100%)",
                  boxShadow:
                    branding.accountType === "builder"
                      ? `0 0 80px #14b8a690, 0 12px 48px #3b82f670, 0 0 0 1px #1f9e6e`
                      : `0 0 80px #1f9e6e90, 0 12px 48px #3b82f670, 0 0 0 1px #1f9e6e`,
                }}
                whileHover={{
                  scale: 1.025,
                  boxShadow:
                    branding.accountType === "builder"
                      ? `0 0 120px #14b8a6aa, 0 16px 60px #3b82f680, 0 0 0 1px #1f9e6e`
                      : `0 0 120px #1f9e6eaa, 0 16px 60px #3b82f680, 0 0 0 1px #1f9e6e`,
                }}
                whileTap={{ scale: 0.97 }}
              >
                {branding.accountType === "builder" ? "Start Your 1-Year Home Care Plan" : "Get Started Free"}
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="shrink-0"
                >
                  <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7" />
                </motion.span>
              </motion.button>
              <p className="text-center text-white/45 text-xs sm:text-sm mt-3 font-medium">
                {branding.accountType === "builder"
                  ? "Free for one full year · Includes warranty tracking, AI support & document vault"
                  : "Free to start · No credit card · Set up in under 2 minutes"}
              </p>

              <p className="text-center text-white/40 text-sm mt-3">
                Already have an account?{" "}
                <button
                  onClick={openSignin}
                  className="font-semibold transition-colors hover:underline"
                  style={{ color: ACCENT }}
                >
                  Sign In →
                </button>
              </p>
            </motion.div>

            {/* ── 6. Welcome message from broker ─────────────────── */}
            {branding.welcomeMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.4 }}
              >
                <div
                  className="w-full h-px mb-6"
                  style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.10), transparent)" }}
                />
                <p className="text-white/28 text-xs font-bold tracking-widest uppercase mb-3 text-center lg:text-left">
                  A Note from {branding.brokerName}
                </p>
                <div
                  className="px-5 py-4 rounded-2xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p className="text-white/55 text-sm leading-relaxed italic text-center lg:text-left">
                    "{branding.welcomeMessage}"
                  </p>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="relative z-10 pb-8 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1.5 opacity-60">
          <img src={`${BASE}images/logo-icon.png`} alt="" className="w-3.5 h-3.5 object-contain" />
          <p className="text-white/40 text-xs font-semibold">Powered by MaintainHome.ai</p>
        </div>
        <p className="text-white/15 text-[11px] text-center">
          © {new Date().getFullYear()} MaintainHome.ai · All rights reserved
        </p>
      </div>

      {/* ── Auth modal ───────────────────────────────────────────── */}
      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        initialMode={authInitialMode}
      />
    </div>
  );
}
