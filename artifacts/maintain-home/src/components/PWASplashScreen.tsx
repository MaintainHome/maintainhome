import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBranding } from "@/contexts/BrandingContext";

const BASE = import.meta.env.BASE_URL;
const ACCENT = "#1f9e6e";
const SESSION_KEY = "mh_splash_shown";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function PWASplashScreen() {
  const { branding, loading } = useBranding();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show in standalone (installed PWA) mode
    if (!isStandalone()) return;
    // Only once per session
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(true);

    // Hide after 1.8 seconds
    const t = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(t);
  }, []);

  const appName = branding?.brokerName ?? "MaintainHome.ai";
  const logoSrc = branding?.logoUrl ?? `${BASE}images/logo-icon.png`;
  const tagline = branding?.tagline ?? "AI-Powered Home Care — built for you.";

  // Don't render at all if branding is still loading (avoids flicker)
  if (loading) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pwa-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center"
          style={{
            background: `linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f2a1e 100%)`,
          }}
        >
          {/* Glow blob behind logo */}
          <div
            className="absolute w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ backgroundColor: ACCENT, top: "30%", left: "50%", transform: "translate(-50%, -50%)" }}
          />

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="relative z-10 mb-6"
          >
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={appName}
                className="h-20 max-w-[220px] object-contain drop-shadow-2xl"
              />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={`${BASE}images/logo-icon.png`}
                  alt="MaintainHome.ai"
                  className="w-24 h-24 object-contain drop-shadow-2xl"
                />
                <span className="text-white text-2xl font-black tracking-tight">
                  MaintainHome<span style={{ color: ACCENT }}>.ai</span>
                </span>
              </div>
            )}
          </motion.div>

          {/* Maintly mascot */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="relative z-10 mb-5"
          >
            <img
              src={`${BASE}images/maintly_thumb.png`}
              alt="Maintly"
              className="w-40 h-40 object-contain drop-shadow-xl"
            />
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="relative z-10 text-white/70 text-sm font-medium text-center px-8 max-w-xs"
          >
            {tagline}
          </motion.p>

          {/* Loading dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute bottom-14 flex items-center gap-1.5"
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: ACCENT }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
