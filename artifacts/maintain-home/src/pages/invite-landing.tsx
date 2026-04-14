import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, Loader2, Home, AlertTriangle, Phone,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { AuthModal } from "@/components/AuthModal";
import { useLocation, useParams } from "wouter";

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

  // Determine subdomain and optional agentHandle from route params or query
  const { subdomain, agentHandle: routeAgentHandle } = useMemo(() => {
    // /:teamHandle/:agentHandle route
    if (params?.teamHandle && params?.agentHandle) {
      return {
        subdomain: params.teamHandle.toLowerCase().trim(),
        agentHandle: params.agentHandle.toLowerCase().trim(),
      };
    }
    // /invite/:subdomain or /:subdomain route
    const fromRoute = params?.subdomain?.toLowerCase().trim();
    if (fromRoute) return { subdomain: fromRoute, agentHandle: null };
    // legacy query params
    const p = new URLSearchParams(window.location.search);
    return {
      subdomain: (p.get("broker") ?? p.get("_ref"))?.toLowerCase().trim() ?? null,
      agentHandle: null,
    };
  }, [params?.subdomain, params?.teamHandle, params?.agentHandle]);

  const { setPreviewSubdomain, branding, loading: brandingLoading } = useBranding();
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

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

  // Fetch agent info if agentHandle is present in route
  useEffect(() => {
    if (!subdomain || !routeAgentHandle) {
      // Legacy ?member= query param support
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
          // Store agent's memberUserId so auth flow can assign the client
          if (data.member.memberUserId) {
            localStorage.setItem("mh_pending_member", String(data.member.memberUserId));
          }
        }
      })
      .catch(() => {})
      .finally(() => setAgentLoading(false));
  }, [subdomain, routeAgentHandle]);

  useEffect(() => {
    if (!authLoading && user) navigate("/");
  }, [user, authLoading, navigate]);

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

  // When coming from /:teamHandle/:agentHandle, show agent's info prominently
  // Agent's photo overrides the broker's agentPhotoUrl if present
  const displayPhotoUrl = agentInfo?.headshotUrl ?? branding.agentPhotoUrl;
  const displayPhone = agentInfo?.phone ?? branding.phoneNumber;
  const displayAgentName = agentInfo?.displayName ?? null;

  /* ── Branded invite page ─────────────────────────────────────── */
  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950">

      {/* ── Background gradients ─────────────────────────────────── */}
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.45, 0.75, 0.45] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: `radial-gradient(ellipse at 25% 10%, ${ACCENT}50 0%, transparent 52%)` }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.2, 0.45, 0.2] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        style={{ background: `radial-gradient(ellipse at 80% 85%, ${ACCENT}35 0%, transparent 48%)` }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.1, 0.22, 0.1] }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut", delay: 8 }}
        style={{ background: `radial-gradient(ellipse at 60% 45%, ${ACCENT}18 0%, transparent 55%)` }} />

      {/* ── "Powered by" badge ───────────────────────────────────── */}
      <div className="relative z-10 pt-5 flex justify-center">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/15">
          <img src={`${BASE}images/logo-icon.png`} alt="MaintainHome.ai" className="w-3.5 h-3.5 object-contain opacity-50" />
          <span className="text-xs font-semibold text-white/40">Powered by MaintainHome.ai</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          OUTER WRAPPER — single col mobile / two col desktop
      ══════════════════════════════════════════════════════════ */}
      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 pt-8 pb-14">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-12 xl:gap-16">

          {/* ══════════════════════════════════════════════════════
              LEFT COLUMN — broker identity (logo + headshot)
              Mobile: shows above headline, centered
              Desktop: ~45% width, centered, sticky-ish
          ══════════════════════════════════════════════════════ */}
          <motion.div
            className="flex flex-col items-center lg:w-[42%] xl:w-[40%] shrink-0 mb-8 lg:mb-0"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            {/* Broker logo */}
            {branding.logoUrl ? (
              <div className="bg-white/12 backdrop-blur-md rounded-3xl px-8 py-7 border border-white/20 shadow-2xl shadow-black/50 w-full flex justify-center mb-7">
                <img
                  src={branding.logoUrl}
                  alt={branding.brokerName}
                  className="h-20 sm:h-28 lg:h-32 max-w-[260px] object-contain"
                />
              </div>
            ) : (
              <div
                className="w-32 h-32 lg:w-40 lg:h-40 rounded-3xl flex items-center justify-center shadow-2xl mb-7"
                style={{ backgroundColor: ACCENT + "35", border: `2px solid ${ACCENT}55` }}
              >
                <span className="text-5xl font-black" style={{ color: ACCENT }}>
                  {branding.brokerName[0]}
                </span>
              </div>
            )}

            {/* Agent / team member headshot */}
            {displayPhotoUrl ? (
              <motion.div
                className="relative mb-4"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.18, duration: 0.45, ease: "easeOut" }}
              >
                <div
                  className="w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 shadow-2xl shadow-black/60"
                  style={{ borderColor: ACCENT + "80" }}
                >
                  <img
                    src={displayPhotoUrl}
                    alt={displayAgentName ?? branding.brokerName}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Glow ring */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ boxShadow: `0 0 0 8px ${ACCENT}20, 0 0 50px ${ACCENT}35` }}
                />
              </motion.div>
            ) : agentInfo ? (
              /* Initials avatar when agentInfo exists but no headshot */
              <motion.div
                className="relative mb-4"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.18, duration: 0.45, ease: "easeOut" }}
              >
                <div
                  className="w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-full flex items-center justify-center border-4 shadow-2xl shadow-black/60"
                  style={{ backgroundColor: ACCENT + "25", borderColor: ACCENT + "80" }}
                >
                  <span className="text-4xl font-black" style={{ color: ACCENT }}>
                    {agentInfo.displayName[0].toUpperCase()}
                  </span>
                </div>
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ boxShadow: `0 0 0 8px ${ACCENT}20, 0 0 50px ${ACCENT}35` }}
                />
              </motion.div>
            ) : null}

            {/* Name + phone */}
            <div className="text-center">
              {/* Agent name (prominent) when agent-specific link */}
              {agentInfo ? (
                <>
                  <p className="text-white font-bold text-xl">{agentInfo.displayName}</p>
                  <p className="text-white/45 text-sm mt-0.5">{branding.brokerName}</p>
                </>
              ) : (
                <p className="text-white font-bold text-xl">{branding.brokerName}</p>
              )}
              {displayPhone && (
                <a
                  href={`tel:${displayPhone}`}
                  className="inline-flex items-center gap-1.5 mt-2.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors hover:bg-white/15"
                  style={{ color: ACCENT, backgroundColor: ACCENT + "18", border: `1px solid ${ACCENT}40` }}
                >
                  <Phone className="w-3.5 h-3.5" />{displayPhone}
                </a>
              )}
            </div>

            {/* Tagline — desktop only, below name */}
            {branding.tagline && (
              <motion.p
                className="hidden lg:block text-white/28 text-sm italic mt-5 text-center leading-relaxed max-w-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
              >
                "{branding.tagline}"
              </motion.p>
            )}
          </motion.div>

          {/* ══════════════════════════════════════════════════════
              RIGHT COLUMN — action content
              Mobile: full width below identity block
              Desktop: ~55-58% width
          ══════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col">

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.45 }}
              className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-black text-white text-center lg:text-left mb-3 leading-[1.05] tracking-tight"
            >
              Welcome to Your<br />
              <span style={{ color: ACCENT }}>MaintainHome</span><br className="lg:hidden" />{" "}Experience
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.4 }}
              className="text-white/55 text-base sm:text-lg mb-7 text-center lg:text-left leading-snug"
            >
              A personal gift from{" "}
              <span className="font-bold" style={{ color: ACCENT }}>
                {agentInfo ? agentInfo.displayName : branding.brokerName}
              </span>
              {agentInfo && (
                <span className="text-white/35"> · {branding.brokerName}</span>
              )}
            </motion.p>

            {/* ── PRIMARY CTA ──────────────────────────────────── */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26, duration: 0.45 }}
            >
              <button
                onClick={openSignup}
                className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl text-white font-extrabold text-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: ACCENT,
                  boxShadow: `0 0 70px ${ACCENT}80, 0 10px 36px ${ACCENT}60`,
                }}
              >
                Get Started Free
                <ArrowRight className="w-6 h-6" />
              </button>
              <p className="text-center text-white/35 text-sm mt-4">
                Already have an account?{" "}
                <button
                  onClick={openSignin}
                  className="font-semibold hover:underline transition-colors"
                  style={{ color: ACCENT }}
                >
                  Sign In →
                </button>
              </p>
            </motion.div>

            {/* Thin divider */}
            <div
              className="w-full h-px mb-8"
              style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.12), transparent)" }}
            />

            {/* ── Maintly greeting ─────────────────────────────── */}
            <motion.div
              className="mb-7"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.5 }}
            >
              <p className="text-white/25 text-xs font-semibold tracking-widest uppercase mb-4 text-center lg:text-left">
                Meet Your AI Home Assistant
              </p>

              {/* Maintly avatar + bubble */}
              <div className="flex items-end gap-1">
                {/* Full-body pointing Maintly, flipped to face right */}
                <div className="shrink-0 self-end">
                  <motion.img
                    src={`${BASE}images/maintly_point.png`}
                    alt="Maintly"
                    className="w-28 sm:w-32 lg:w-36 drop-shadow-2xl"
                    style={{ transform: "scaleX(-1)" }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>

                {/* Chat bubble */}
                <div className="flex-1 min-w-0 mb-3">
                  <div
                    className="rounded-2xl rounded-bl-none px-4 py-4 shadow-xl"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.09)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <p className="text-xs font-bold mb-2" style={{ color: ACCENT }}>
                      Maintly · AI-Powered Home Ownership
                    </p>
                    <p className="text-white/80 text-sm sm:text-base leading-relaxed">
                      Hello! I'm Maintly — your personal AI-Powered Home Ownership Chatbot.
                      I'm here to help simplify home ownership like never before.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Broker welcome message (bottom of right col) ── */}
            {branding.welcomeMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.52, duration: 0.4 }}
              >
                <p className="text-white/28 text-xs font-semibold tracking-widest uppercase mb-3 text-center lg:text-left">
                  A Note from {branding.brokerName}
                </p>
                <div
                  className="px-5 py-4 rounded-2xl mb-4"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
                >
                  <p className="text-white/60 text-sm leading-relaxed italic text-center lg:text-left">
                    "{branding.welcomeMessage}"
                  </p>
                </div>
              </motion.div>
            )}

            {/* Tagline — mobile only */}
            {branding.tagline && (
              <motion.p
                className="lg:hidden text-white/25 text-sm italic text-center mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                "{branding.tagline}"
              </motion.p>
            )}

          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="relative z-10 pb-6 flex justify-center">
        <p className="text-white/15 text-xs text-center">
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
