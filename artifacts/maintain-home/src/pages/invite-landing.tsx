import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, Loader2, Home, AlertTriangle, Phone, Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { AuthModal } from "@/components/AuthModal";
import { useLocation, useParams } from "wouter";

const BASE = import.meta.env.BASE_URL;
const ACCENT = "#1f9e6e";

/* ════════════════════════════════════════════════════════════════════
   Invite Landing Page
   Supported routes:
     /invite/:subdomain      → cleanest explicit form
     /:subdomain             → ultra-short alias
     /invite?broker=...      → legacy query-param form
     /?_ref=...              → legacy referral param (still works)
════════════════════════════════════════════════════════════════════ */
export default function InviteLanding() {
  const params = useParams<{ subdomain?: string }>();

  const subdomain = useMemo(() => {
    const fromRoute = params?.subdomain?.toLowerCase().trim();
    if (fromRoute) return fromRoute;
    const p = new URLSearchParams(window.location.search);
    return (p.get("broker") ?? p.get("_ref"))?.toLowerCase().trim() ?? null;
  }, [params?.subdomain]);

  const { setPreviewSubdomain, branding, loading: brandingLoading } = useBranding();
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [showAuth, setShowAuth] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<"signup" | "signin">("signup");

  useEffect(() => {
    if (subdomain) {
      setPreviewSubdomain(subdomain);
      localStorage.setItem("mh_referral_sub", subdomain);
    }
  }, [subdomain, setPreviewSubdomain]);

  useEffect(() => {
    if (!authLoading && user) navigate("/");
  }, [user, authLoading, navigate]);

  function openSignup() { setAuthInitialMode("signup"); setShowAuth(true); }
  function openSignin() { setAuthInitialMode("signin"); setShowAuth(true); }

  /* ── Loading ─────────────────────────────────────────────────── */
  if (brandingLoading || authLoading) {
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

  /* ── Branded invite page ─────────────────────────────────────── */
  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950">

      {/* ── Animated gradient blobs ──────────────────────────────── */}
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: `radial-gradient(ellipse at 20% 10%, ${ACCENT}55 0%, transparent 48%)` }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        style={{ background: `radial-gradient(ellipse at 85% 80%, ${ACCENT}40 0%, transparent 48%)` }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.1, 0.25, 0.1] }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut", delay: 8 }}
        style={{ background: `radial-gradient(ellipse at 50% 50%, ${ACCENT}18 0%, transparent 55%)` }} />

      {/* ── "Powered by" badge ───────────────────────────────────── */}
      <div className="relative z-10 pt-5 flex justify-center">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/15">
          <img src={`${BASE}images/logo-icon.png`} alt="MaintainHome.ai" className="w-3.5 h-3.5 object-contain opacity-50" />
          <span className="text-xs font-semibold text-white/40">Powered by MaintainHome.ai</span>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="relative z-10 px-5 sm:px-8 pt-8 pb-12 max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-14">

          {/* ══════════════════════════════════════════════════════
              LEFT COLUMN — logo, headshot, agent identity
          ══════════════════════════════════════════════════════ */}
          <motion.div
            className="flex flex-col items-center lg:items-start lg:w-80 xl:w-96 shrink-0 mb-8 lg:mb-0 lg:sticky lg:top-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Broker logo */}
            {branding.logoUrl ? (
              <div className="bg-white/12 backdrop-blur-md rounded-3xl px-8 py-6 border border-white/20 shadow-2xl shadow-black/40 w-full flex justify-center mb-6">
                <img
                  src={branding.logoUrl}
                  alt={branding.brokerName}
                  className="h-20 sm:h-24 lg:h-28 max-w-[280px] object-contain"
                />
              </div>
            ) : (
              <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-3xl flex items-center justify-center shadow-2xl mb-6"
                style={{ backgroundColor: ACCENT + "35", border: `2px solid ${ACCENT}55` }}>
                <span className="text-5xl font-black" style={{ color: ACCENT }}>
                  {branding.brokerName[0]}
                </span>
              </div>
            )}

            {/* Agent headshot */}
            {branding.agentPhotoUrl && (
              <motion.div
                className="relative mb-4"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.45, ease: "easeOut" }}
              >
                <div className="w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full overflow-hidden border-4 shadow-2xl shadow-black/50"
                  style={{ borderColor: ACCENT + "80" }}>
                  <img src={branding.agentPhotoUrl} alt={branding.brokerName} className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ boxShadow: `0 0 0 6px ${ACCENT}22, 0 0 40px ${ACCENT}28` }} />
              </motion.div>
            )}

            {/* Agent name + phone */}
            <div className="text-center lg:text-left">
              <p className="text-white font-bold text-lg">{branding.brokerName}</p>
              {branding.phoneNumber && (
                <a href={`tel:${branding.phoneNumber}`}
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover:bg-white/15"
                  style={{ color: ACCENT, backgroundColor: ACCENT + "18", border: `1px solid ${ACCENT}40` }}>
                  <Phone className="w-3.5 h-3.5" />{branding.phoneNumber}
                </a>
              )}
            </div>

            {/* Tagline — desktop only, lives under agent identity */}
            {branding.tagline && (
              <motion.p
                className="hidden lg:block text-white/30 text-sm italic mt-5 leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                "{branding.tagline}"
              </motion.p>
            )}
          </motion.div>

          {/* ══════════════════════════════════════════════════════
              RIGHT COLUMN — headline, CTA, welcome, Maintly
          ══════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col">

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.45 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-white text-center lg:text-left mb-3 leading-[1.05] tracking-tight"
            >
              Welcome to Your<br />
              <span style={{ color: ACCENT }}>MaintainHome</span><br className="hidden lg:block" /> Experience
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.4 }}
              className="text-white/55 text-base sm:text-lg mb-7 text-center lg:text-left leading-snug"
            >
              A personal gift from{" "}
              <span className="font-bold" style={{ color: ACCENT }}>{branding.brokerName}</span>
            </motion.p>

            {/* ── PRIMARY CTA — right after headline ─────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.45 }}
              className="mb-10"
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
                <button onClick={openSignin}
                  className="font-semibold hover:underline transition-colors"
                  style={{ color: ACCENT }}>
                  Sign In →
                </button>
              </p>
            </motion.div>

            {/* Divider */}
            <div className="w-full h-px mb-8" style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)" }} />

            {/* Welcome message */}
            {branding.welcomeMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="mb-7 px-5 py-4 rounded-2xl"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <p className="text-white/70 text-sm sm:text-base leading-relaxed italic text-center lg:text-left">
                  "{branding.welcomeMessage}"
                </p>
              </motion.div>
            )}

            {/* Maintly teaser bubble */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.43, duration: 0.45 }}
              className="mb-6"
            >
              <div className="flex items-end gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, #0f7a52)` }}>
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 rounded-2xl rounded-bl-sm px-4 py-4 shadow-md"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <p className="text-xs font-bold mb-1.5" style={{ color: ACCENT }}>Maintly · Your AI Home Assistant</p>
                  <p className="text-white/75 text-sm leading-relaxed">
                    Hi! I'm Maintly — your personal AI home maintenance assistant.
                    Ask me anything about your home, from seasonal prep to big repairs. I've got you covered. 🏡
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Tagline — mobile only (desktop version is in left column) */}
            {branding.tagline && (
              <motion.p
                className="lg:hidden text-center text-white/30 text-sm italic mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
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
