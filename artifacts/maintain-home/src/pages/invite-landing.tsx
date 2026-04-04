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

  /* ── Loading ────────────────────────────────────────────────────── */
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

  /* ── No subdomain ───────────────────────────────────────────────── */
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

  /* ── Branding not found ─────────────────────────────────────────── */
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

  /* ── Branded invite page ───────────────────────────────────────── */
  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950">

      {/* ── Animated background gradients ────────────────────────── */}
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: `radial-gradient(ellipse at 70% 0%, ${ACCENT}60 0%, transparent 50%)` }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        style={{ background: `radial-gradient(ellipse at 15% 90%, ${ACCENT}45 0%, transparent 48%)` }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.1, 0.28, 0.1] }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut", delay: 8 }}
        style={{ background: `radial-gradient(ellipse at 50% 55%, ${ACCENT}22 0%, transparent 60%)` }} />

      {/* ── "Powered by" top badge ───────────────────────────────── */}
      <div className="relative z-10 pt-5 flex justify-center">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/15">
          <img src={`${BASE}images/logo-icon.png`} alt="MaintainHome.ai" className="w-3.5 h-3.5 object-contain opacity-50" />
          <span className="text-xs font-semibold text-white/40">Powered by MaintainHome.ai</span>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center px-5 py-8 sm:py-12">
        <div className="w-full max-w-md">

          {/* ── Hero broker logo ─────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex justify-center mb-8"
          >
            {branding.logoUrl ? (
              <div className="bg-white/12 backdrop-blur-md rounded-3xl px-10 py-7 border border-white/20 shadow-2xl shadow-black/40">
                <img
                  src={branding.logoUrl}
                  alt={branding.brokerName}
                  className="h-20 sm:h-28 max-w-[300px] object-contain"
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-3xl flex items-center justify-center shadow-2xl"
                style={{ backgroundColor: ACCENT + "35", border: `2px solid ${ACCENT}55` }}>
                <span className="text-5xl font-black" style={{ color: ACCENT }}>
                  {branding.brokerName[0]}
                </span>
              </div>
            )}
          </motion.div>

          {/* ── Agent headshot + name + phone ────────────────────── */}
          {(branding.agentPhotoUrl || branding.phoneNumber) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.45, ease: "easeOut" }}
              className="flex flex-col items-center gap-3 mb-8"
            >
              {branding.agentPhotoUrl && (
                <div className="relative">
                  <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 shadow-2xl shadow-black/50"
                    style={{ borderColor: ACCENT + "80" }}>
                    <img
                      src={branding.agentPhotoUrl}
                      alt={branding.brokerName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Subtle glow ring */}
                  <div className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ boxShadow: `0 0 0 6px ${ACCENT}25, 0 0 40px ${ACCENT}30` }} />
                </div>
              )}
              <div className="text-center">
                <p className="text-white font-bold text-lg leading-tight">{branding.brokerName}</p>
                {branding.phoneNumber && (
                  <a href={`tel:${branding.phoneNumber}`}
                    className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover:bg-white/20"
                    style={{ color: ACCENT, backgroundColor: ACCENT + "18", border: `1px solid ${ACCENT}40` }}>
                    <Phone className="w-3.5 h-3.5" />{branding.phoneNumber}
                  </a>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Headline ────────────────────────────────────────── */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.45 }}
            className="text-4xl sm:text-5xl font-black text-white text-center mb-3 leading-[1.1] tracking-tight"
          >
            Welcome to Your<br />
            <span style={{ color: ACCENT }}>MaintainHome</span> Experience
          </motion.h1>

          {/* ── Sub-headline ────────────────────────────────────── */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-center text-white/55 text-base sm:text-lg mb-6 leading-snug"
          >
            A personal gift from{" "}
            <span className="font-bold" style={{ color: ACCENT }}>{branding.brokerName}</span>
          </motion.p>

          {/* ── Welcome message ──────────────────────────────────── */}
          {branding.welcomeMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.37, duration: 0.4 }}
              className="mb-7 px-5 py-4 rounded-2xl text-center"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <p className="text-white/70 text-sm sm:text-base leading-relaxed italic">
                "{branding.welcomeMessage}"
              </p>
            </motion.div>
          )}

          {/* ── Maintly teaser chat bubble ───────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44, duration: 0.45 }}
            className="mb-8"
          >
            <div className="flex items-end gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, #0f7a52)` }}>
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              {/* Bubble */}
              <div className="flex-1 rounded-2xl rounded-bl-sm px-4 py-3.5 shadow-md"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <p className="text-xs font-bold mb-1" style={{ color: ACCENT }}>Maintly · Your AI Home Assistant</p>
                <p className="text-white/75 text-sm leading-relaxed">
                  Hi! I'm Maintly — your personal AI home maintenance assistant.
                  Ask me anything about your home, from seasonal prep to big repairs. I've got you covered. 🏡
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Tagline ─────────────────────────────────────────── */}
          {branding.tagline && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="text-center text-white/35 text-sm mb-7 italic"
            >
              "{branding.tagline}"
            </motion.p>
          )}

          {/* ── Primary CTA ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.45 }}
          >
            <button
              onClick={openSignup}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl text-white font-extrabold text-xl transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{
                backgroundColor: ACCENT,
                boxShadow: `0 0 60px ${ACCENT}80, 0 8px 32px ${ACCENT}60`,
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

        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="relative z-10 pb-6 flex justify-center">
        <p className="text-white/15 text-xs text-center">
          © {new Date().getFullYear()} MaintainHome.ai · All rights reserved
        </p>
      </div>

      {/* ── Auth modal ──────────────────────────────────────────── */}
      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        initialMode={authInitialMode}
      />
    </div>
  );
}
