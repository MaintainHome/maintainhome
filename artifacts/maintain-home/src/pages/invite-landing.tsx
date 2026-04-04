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

      {/* ── Background gradients ─────────────────────────────────── */}
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.45, 0.75, 0.45] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${ACCENT}50 0%, transparent 55%)` }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.2, 0.45, 0.2] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        style={{ background: `radial-gradient(ellipse at 15% 80%, ${ACCENT}35 0%, transparent 48%)` }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.1, 0.22, 0.1] }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut", delay: 8 }}
        style={{ background: `radial-gradient(ellipse at 85% 75%, ${ACCENT}28 0%, transparent 48%)` }} />

      {/* ── "Powered by" badge ───────────────────────────────────── */}
      <div className="relative z-10 pt-5 flex justify-center">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/15">
          <img src={`${BASE}images/logo-icon.png`} alt="MaintainHome.ai" className="w-3.5 h-3.5 object-contain opacity-50" />
          <span className="text-xs font-semibold text-white/40">Powered by MaintainHome.ai</span>
        </div>
      </div>

      {/* ── Main content — centered single column ────────────────── */}
      <div className="relative z-10 flex flex-col items-center px-5 sm:px-8 pt-8 pb-14 max-w-lg mx-auto">

        {/* ── 1. Broker logo ───────────────────────────────────────── */}
        <motion.div
          className="w-full mb-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {branding.logoUrl ? (
            <div className="bg-white/12 backdrop-blur-md rounded-3xl px-8 py-6 border border-white/20 shadow-2xl shadow-black/40 flex justify-center">
              <img
                src={branding.logoUrl}
                alt={branding.brokerName}
                className="h-20 sm:h-28 max-w-[300px] object-contain"
              />
            </div>
          ) : (
            <div className="w-32 h-32 rounded-3xl flex items-center justify-center shadow-2xl mx-auto"
              style={{ backgroundColor: ACCENT + "35", border: `2px solid ${ACCENT}55` }}>
              <span className="text-5xl font-black" style={{ color: ACCENT }}>
                {branding.brokerName[0]}
              </span>
            </div>
          )}
        </motion.div>

        {/* ── 2. Agent headshot + name + phone (centered under logo) ── */}
        {(branding.agentPhotoUrl || branding.phoneNumber) && (
          <motion.div
            className="flex flex-col items-center mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.12, duration: 0.45, ease: "easeOut" }}
          >
            {branding.agentPhotoUrl && (
              <div className="relative mb-3">
                <div
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 shadow-2xl shadow-black/50"
                  style={{ borderColor: ACCENT + "80" }}
                >
                  <img src={branding.agentPhotoUrl} alt={branding.brokerName} className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ boxShadow: `0 0 0 6px ${ACCENT}20, 0 0 40px ${ACCENT}30` }} />
              </div>
            )}
            <p className="text-white font-bold text-lg text-center">{branding.brokerName}</p>
            {branding.phoneNumber && (
              <a
                href={`tel:${branding.phoneNumber}`}
                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover:bg-white/15"
                style={{ color: ACCENT, backgroundColor: ACCENT + "18", border: `1px solid ${ACCENT}40` }}
              >
                <Phone className="w-3.5 h-3.5" />{branding.phoneNumber}
              </a>
            )}
          </motion.div>
        )}

        {/* ── 3. Headline ──────────────────────────────────────────── */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="text-4xl sm:text-5xl font-black text-white text-center mb-3 leading-[1.05] tracking-tight"
        >
          Welcome to Your<br />
          <span style={{ color: ACCENT }}>MaintainHome</span> Experience
        </motion.h1>

        {/* ── 4. Sub-headline ──────────────────────────────────────── */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.27, duration: 0.4 }}
          className="text-white/55 text-base sm:text-lg text-center mb-7 leading-snug"
        >
          A personal gift from{" "}
          <span className="font-bold" style={{ color: ACCENT }}>{branding.brokerName}</span>
        </motion.p>

        {/* ── 5. PRIMARY CTA ───────────────────────────────────────── */}
        <motion.div
          className="w-full mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.33, duration: 0.45 }}
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

        {/* ── 6. Maintly full-body greeting ────────────────────────── */}
        <motion.div
          className="w-full mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.5 }}
        >
          {/* Subtle section label */}
          <p className="text-center text-white/25 text-xs font-semibold tracking-widest uppercase mb-5">
            Meet Your AI Home Assistant
          </p>

          {/* Maintly + bubble row */}
          <div className="flex items-end gap-0">
            {/* Full-body Maintly — pointing right toward bubble */}
            <div className="shrink-0 self-end">
              <motion.img
                src={`${BASE}images/maintly_point.png`}
                alt="Maintly"
                className="w-32 sm:w-36 drop-shadow-2xl"
                style={{ transform: "scaleX(-1)" }}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Chat bubble */}
            <div className="flex-1 min-w-0 mb-4">
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
              {/* Bubble tail */}
              <div className="ml-4 w-0 h-0"
                style={{
                  borderLeft: "10px solid transparent",
                  borderRight: "10px solid rgba(255,255,255,0.09)",
                  borderTop: "10px solid rgba(255,255,255,0.09)",
                }} />
            </div>
          </div>
        </motion.div>

        {/* ── 7. Broker welcome message (bottom) ───────────────────── */}
        {branding.welcomeMessage && (
          <motion.div
            className="w-full mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.4 }}
          >
            <div className="w-full h-px mb-6"
              style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)" }} />
            <p className="text-center text-white/30 text-xs font-semibold tracking-widest uppercase mb-3">
              A Note from {branding.brokerName}
            </p>
            <div
              className="px-5 py-4 rounded-2xl"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
            >
              <p className="text-white/60 text-sm leading-relaxed italic text-center">
                "{branding.welcomeMessage}"
              </p>
            </div>
          </motion.div>
        )}

        {/* ── 8. Tagline ───────────────────────────────────────────── */}
        {branding.tagline && (
          <motion.p
            className="text-white/25 text-sm italic text-center mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.62 }}
          >
            "{branding.tagline}"
          </motion.p>
        )}

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
