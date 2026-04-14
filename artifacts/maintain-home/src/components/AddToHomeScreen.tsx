import { useState, useEffect } from "react";
import { Download, X, Share2, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBranding } from "@/contexts/BrandingContext";

const BASE = import.meta.env.BASE_URL;
const ACCENT = "#1f9e6e";
const VISIT_KEY = "mh_install_visit_count";
const DISMISS_KEY = "mh_install_dismissed_at";
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop" | null;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function incrementVisitCount() {
  const current = parseInt(localStorage.getItem(VISIT_KEY) ?? "0", 10);
  const next = current + 1;
  localStorage.setItem(VISIT_KEY, String(next));
  return next;
}

function getVisitCount() {
  return parseInt(localStorage.getItem(VISIT_KEY) ?? "0", 10);
}

function isDismissed() {
  const ts = localStorage.getItem(DISMISS_KEY);
  if (!ts) return false;
  const diff = Date.now() - parseInt(ts, 10);
  return diff < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function dismiss() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

export function AddToHomeScreen() {
  const { branding } = useBranding();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  const appName = branding?.brokerName ?? "MaintainHome.ai";
  const logoSrc = branding?.logoUrl ?? `${BASE}images/logo-icon.png`;

  useEffect(() => {
    if (isStandalone() || !isMobile()) return;

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /android/i.test(ua);
    setPlatform(isIOS ? "ios" : isAndroid ? "android" : "desktop");

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => { setInstalled(true); setDeferredPrompt(null); });

    // Smart visit counter — increment once per component mount
    const count = incrementVisitCount();

    // Show banner if:
    // - visited 3+ times OR Android has a native prompt ready (show right away)
    // - not dismissed recently
    const shouldShow = (count >= 3 || isAndroid) && !isDismissed();
    if (shouldShow) {
      // Slight delay so it doesn't appear during page load jank
      const t = setTimeout(() => setShowBanner(true), 1200);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Also show if an android prompt becomes available later
  useEffect(() => {
    if (deferredPrompt && !isDismissed() && !installed) {
      setTimeout(() => setShowBanner(true), 800);
    }
  }, [deferredPrompt]);

  if (installed || isStandalone() || !isMobile()) return null;

  const handleInstall = async () => {
    if (platform === "ios") {
      setShowBanner(false);
      setShowIOSModal(true);
    } else if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        setShowBanner(false);
      }
    } else if (platform === "ios") {
      setShowIOSModal(true);
    }
  };

  const handleDismiss = () => {
    dismiss();
    setShowBanner(false);
  };

  const showButton = platform === "ios" || !!deferredPrompt;
  if (!showButton && !showBanner) return null;

  return (
    <>
      {/* ── Floating bottom install banner ───────────────────────────── */}
      <AnimatePresence>
        {showBanner && showButton && (
          <motion.div
            key="install-banner"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed bottom-4 left-3 right-3 z-50 md:hidden"
          >
            <div
              className="rounded-2xl shadow-2xl overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${ACCENT} 0%, #3b82f6 100%)`,
                boxShadow: `0 8px 32px ${ACCENT}66`,
              }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                {/* App icon */}
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 overflow-hidden">
                  <img src={logoSrc} alt={appName} className="w-9 h-9 object-contain" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-extrabold text-sm leading-tight">
                    Install {appName}
                  </p>
                  <p className="text-white/80 text-xs leading-tight mt-0.5">
                    Install as an app on your phone for the best experience.
                  </p>
                </div>

                {/* Dismiss */}
                <button
                  onClick={handleDismiss}
                  className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white/70 hover:text-white shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Install button */}
              <div className="px-4 pb-4 pt-1">
                <button
                  onClick={handleInstall}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white font-extrabold text-sm transition-all active:scale-95"
                  style={{ color: ACCENT }}
                >
                  <Download className="w-4 h-4" />
                  Add to Home Screen
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── iOS instructions bottom sheet ───────────────────────────── */}
      <AnimatePresence>
        {showIOSModal && (
          <motion.div
            key="ios-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 md:hidden"
            onClick={(e) => e.target === e.currentTarget && setShowIOSModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-t-3xl w-full max-w-lg shadow-2xl pb-safe"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>

              <div className="px-6 pb-8 pt-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-100"
                      style={{ backgroundColor: `${ACCENT}15` }}>
                      <img src={logoSrc} alt={appName} className="w-10 h-10 object-contain" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900">Add to Home Screen</p>
                      <p className="text-xs text-slate-500">{appName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowIOSModal(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                  Install <strong className="text-slate-800">{appName}</strong> on your iPhone for the best experience — launch from your home screen, just like a native app.
                </p>

                {/* Steps */}
                <ol className="space-y-4 mb-6">
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: ACCENT }}>1</span>
                    <p className="text-sm text-slate-700">
                      Tap the{" "}
                      <span className="inline-flex items-center gap-1 font-bold" style={{ color: ACCENT }}>
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </span>{" "}
                      button at the <strong>bottom</strong> of your Safari browser.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: ACCENT }}>2</span>
                    <p className="text-sm text-slate-700">
                      Scroll down and tap{" "}
                      <strong className="text-slate-900">"Add to Home Screen"</strong>.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: ACCENT }}>3</span>
                    <p className="text-sm text-slate-700">
                      Tap <strong className="text-slate-900">"Add"</strong> in the top-right corner. Done!
                    </p>
                  </li>
                </ol>

                <button
                  onClick={() => setShowIOSModal(false)}
                  className="w-full py-4 rounded-2xl text-white font-extrabold text-base transition-all active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #3b82f6 100%)` }}
                >
                  Got it!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Smaller inline variant — shown inside Dashboard header on mobile.
 * Tapping opens the iOS sheet or triggers the native Android prompt.
 */
export function AddToHomeScreenButton() {
  const { branding } = useBranding();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  const appName = branding?.brokerName ?? "MaintainHome.ai";
  const logoSrc = branding?.logoUrl ?? `${BASE}images/logo-icon.png`;

  useEffect(() => {
    if (isStandalone()) { setInstalled(true); return; }
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /android/i.test(ua);
    setPlatform(isIOS ? "ios" : isAndroid ? "android" : "desktop");
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => { setInstalled(true); });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed || isStandalone()) return null;
  if (platform !== "ios" && !deferredPrompt) return null;

  const handleClick = async () => {
    if (platform === "ios") { setShowIOSModal(true); }
    else if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 whitespace-nowrap"
        style={{
          background: `linear-gradient(135deg, ${ACCENT} 0%, #3b82f6 100%)`,
          color: "white",
          boxShadow: `0 3px 12px ${ACCENT}44`,
        }}
      >
        <Smartphone className="w-3.5 h-3.5 shrink-0" />
        Install App
      </button>

      <AnimatePresence>
        {showIOSModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60"
            onClick={(e) => e.target === e.currentTarget && setShowIOSModal(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-t-3xl w-full max-w-lg shadow-2xl"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>
              <div className="px-6 pb-8 pt-4">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center"
                      style={{ backgroundColor: `${ACCENT}15` }}>
                      <img src={logoSrc} alt={appName} className="w-10 h-10 object-contain" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900">Add to Home Screen</p>
                      <p className="text-xs text-slate-500">{appName}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowIOSModal(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <ol className="space-y-4 mb-6">
                  {[
                    <>Tap the <span className="inline-flex items-center gap-1 font-bold" style={{ color: ACCENT }}><Share2 className="w-3.5 h-3.5" /> Share</span> button at the <strong>bottom</strong> of Safari.</>,
                    <>Scroll and tap <strong>"Add to Home Screen"</strong>.</>,
                    <>Tap <strong>"Add"</strong> in the top-right corner.</>,
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 mt-0.5"
                        style={{ backgroundColor: ACCENT }}>{i + 1}</span>
                      <p className="text-sm text-slate-700">{step}</p>
                    </li>
                  ))}
                </ol>
                <button onClick={() => setShowIOSModal(false)}
                  className="w-full py-4 rounded-2xl text-white font-extrabold text-base"
                  style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #3b82f6 100%)` }}>
                  Got it!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
