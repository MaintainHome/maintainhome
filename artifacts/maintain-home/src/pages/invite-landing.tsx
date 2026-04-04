import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, Gift, ArrowRight, Loader2, Home, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { AuthModal } from "@/components/AuthModal";
import { useLocation } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const BASE = import.meta.env.BASE_URL;

const FEATURES = [
  "AI-generated 12-month home maintenance calendar",
  "Big-ticket repair alerts & cost estimates",
  "Maintenance log & history tracker",
  "Personal AI home ownership assistant",
];

/* ════════════════════════════════════════════════════════════════════
   Invite Landing Page
   Route: /invite?broker=[subdomain]
════════════════════════════════════════════════════════════════════ */
export default function InviteLanding() {
  /* Read ?broker= synchronously before BrandingContext effect strips it */
  const [subdomain] = useState<string | null>(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("broker")?.toLowerCase().trim() ?? null;
  });

  const { setPreviewSubdomain, branding, loading: brandingLoading } = useBranding();
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [showAuth, setShowAuth] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<"signup" | "signin">("signup");

  /* Activate branding + save referral */
  useEffect(() => {
    if (subdomain) {
      setPreviewSubdomain(subdomain);
      localStorage.setItem("mh_referral_sub", subdomain);
    }
  }, [subdomain, setPreviewSubdomain]);

  /* Redirect already-logged-in users */
  useEffect(() => {
    if (!authLoading && user) navigate("/");
  }, [user, authLoading, navigate]);

  function openSignup() {
    setAuthInitialMode("signup");
    setShowAuth(true);
  }

  function openSignin() {
    setAuthInitialMode("signin");
    setShowAuth(true);
  }

  /* ── Loading state ─────────────────────────────────────────────── */
  if (!subdomain || brandingLoading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-slate-400 text-sm">Loading your invitation…</p>
        </div>
      </div>
    );
  }

  /* ── Invalid / not found ───────────────────────────────────────── */
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
  const accent = branding.primaryColor;
  const bg = branding.secondaryColor;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: bg }}>

      {/* ── Animated gradient blobs ─────────────────────────────── */}
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.45, 0.75, 0.45] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: `radial-gradient(ellipse at 75% 15%, ${accent}55 0%, transparent 55%)` }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.2, 0.45, 0.2] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        style={{ background: `radial-gradient(ellipse at 20% 85%, ${accent}38 0%, transparent 50%)` }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        style={{ background: `radial-gradient(ellipse at 50% 50%, ${accent}20 0%, transparent 60%)` }} />

      {/* ── Top badge ───────────────────────────────────────────── */}
      <div className="relative z-10 pt-6 flex justify-center">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/15">
          <img src={`${BASE}images/logo-icon.png`} alt="MaintainHome.ai" className="w-4 h-4 object-contain opacity-60" />
          <span className="text-xs font-semibold text-white/50">Powered by MaintainHome.ai</span>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center px-5 py-10 sm:py-14 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-md">

          {/* Gift badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex justify-center mb-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
              style={{ backgroundColor: accent + "28", color: accent, border: `1px solid ${accent}45` }}>
              <Gift className="w-4 h-4" />
              A Personal Gift for You
            </span>
          </motion.div>

          {/* Broker logo */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45 }}
            className="flex justify-center mb-7"
          >
            {branding.logoUrl ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-7 py-4 border border-white/15">
                <img src={branding.logoUrl} alt={branding.brokerName}
                  className="h-14 sm:h-18 max-w-[260px] object-contain" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ backgroundColor: accent + "35", border: `2px solid ${accent}45` }}>
                <span className="text-3xl font-black" style={{ color: accent }}>
                  {branding.brokerName[0]}
                </span>
              </div>
            )}
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.45 }}
            className="text-4xl sm:text-5xl font-black text-white text-center mb-3 leading-tight"
          >
            A Gift from<br />{branding.brokerName}
          </motion.h1>

          {/* Sub-headline in accent color */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="text-center font-bold text-base sm:text-lg mb-4 leading-snug"
            style={{ color: accent }}
          >
            Your personal AI home ownership tool,<br className="hidden sm:block" /> custom-branded for you by {branding.brokerName}.
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.32, duration: 0.4 }}
            className="text-white/55 text-sm sm:text-base text-center mb-7 leading-relaxed"
          >
            MaintainHome helps you stay on top of maintenance, protect your biggest investment, and own your home with confidence.
          </motion.p>

          {/* Feature list */}
          <motion.ul
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.4 }}
            className="space-y-2.5 mb-8"
          >
            {FEATURES.map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: accent + "30" }}>
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: accent }} />
                </div>
                <span className="text-white/75 text-sm">{feature}</span>
              </li>
            ))}
          </motion.ul>

          {/* CTA — Get Started */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.46, duration: 0.4 }}
          >
            <button
              onClick={openSignup}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-extrabold text-lg transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{
                backgroundColor: accent,
                boxShadow: `0 0 40px ${accent}70, 0 6px 24px ${accent}55`,
              }}
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-center text-white/40 text-sm mt-4">
              Already have an account?{" "}
              <button onClick={openSignin}
                className="font-semibold hover:underline transition-colors"
                style={{ color: accent }}>
                Sign In →
              </button>
            </p>
          </motion.div>

          {/* Tagline if present */}
          {branding.tagline && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="text-center text-white/25 text-xs mt-6 italic"
            >
              "{branding.tagline}"
            </motion.p>
          )}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="relative z-10 pb-6 flex justify-center">
        <p className="text-white/20 text-xs text-center">
          © {new Date().getFullYear()} MaintainHome.ai · All rights reserved
        </p>
      </div>

      {/* ── Auth Modal ──────────────────────────────────────────── */}
      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        initialMode={authInitialMode}
      />
    </div>
  );
}
