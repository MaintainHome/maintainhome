import { useState, useEffect } from "react";
import { Download, X, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop" | null;

export function AddToHomeScreen() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showDesktopMsg, setShowDesktopMsg] = useState(false);

  useEffect(() => {
    // Already installed as a standalone app — hide the button
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /android/i.test(ua);

    if (isIOS) setPlatform("ios");
    else if (isAndroid) setPlatform("android");
    else setPlatform("desktop");

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isInstalled) return null;

  // Show when: iOS always (show instructions), or when native prompt available
  const showButton = platform === "ios" || !!deferredPrompt;
  if (!showButton) return null;

  const handleClick = async () => {
    if (platform === "ios") {
      setShowIOSModal(true);
    } else if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setDeferredPrompt(null);
    } else {
      setShowDesktopMsg(true);
    }
  };

  return (
    <>
      {/* Install button — icon only on very small screens, text on sm+ */}
      <button
        onClick={handleClick}
        title="Add to Home Screen"
        className="flex items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-2 rounded-xl border-2 border-primary/30 text-primary font-semibold text-xs sm:text-sm hover:bg-primary/5 hover:border-primary/60 transition-all duration-200 active:scale-95 whitespace-nowrap"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        Add to Home Screen
      </button>

      {/* Desktop inline message */}
      <AnimatePresence>
        {showDesktopMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 text-sm text-slate-700"
          >
            <button
              onClick={() => setShowDesktopMsg(false)}
              className="absolute top-3 right-3 text-slate-300 hover:text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="font-semibold text-slate-900 mb-1">Install as an app</p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Click the install icon <strong>⊕</strong> in your browser's address bar, or open your browser menu and choose <strong>"Install MaintainHome.ai"</strong>.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS instructions modal */}
      <AnimatePresence>
        {showIOSModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowIOSModal(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/logo-icon.png"
                    alt="MaintainHome.ai"
                    className="w-10 h-10 rounded-xl object-contain"
                  />
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Add to Home Screen</p>
                    <p className="text-xs text-slate-500">MaintainHome.ai</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ol className="space-y-4 mb-6">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="text-sm text-slate-700">
                    Tap the{" "}
                    <span className="inline-flex items-center gap-1 font-semibold text-primary">
                      <Share2 className="w-3.5 h-3.5" /> Share
                    </span>{" "}
                    button at the <strong>bottom</strong> of your Safari browser.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="text-sm text-slate-700">
                    Scroll down and tap{" "}
                    <strong className="text-slate-900">"Add to Home Screen"</strong>.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="text-sm text-slate-700">
                    Tap <strong className="text-slate-900">"Add"</strong> in the top right corner.
                  </p>
                </li>
              </ol>

              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
