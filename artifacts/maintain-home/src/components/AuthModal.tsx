import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, CheckCircle2, Loader2, LogIn, Tag, ShieldCheck, Unlock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Stage = "email" | "sent" | "error";

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { refreshUser } = useAuth();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [debugLink, setDebugLink] = useState<string | null>(null);
  const [fullAccessGranted, setFullAccessGranted] = useState(false);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStage("email");
      setEmail("");
      setPromoCode("");
      setErrorMsg("");
      setDebugLink(null);
      setFullAccessGranted(false);
      setStaySignedIn(true);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const body: Record<string, string | boolean> = {
        email: trimmedEmail,
        staySignedIn,
      };
      if (promoCode.trim()) body.promoCode = promoCode.trim();

      const res = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setStage("error");
        return;
      }
      if (data.debugLink) setDebugLink(data.debugLink);
      if (data.fullAccessGranted) setFullAccessGranted(true);
      setStage("sent");
    } catch {
      setErrorMsg("Network error. Please check your connection.");
      setStage("error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="bg-white rounded-3xl p-7 w-full max-w-sm shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <LogIn className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-base">Sign In or Create Account</p>
                <p className="text-xs text-slate-500">MaintainHome.ai</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stage: email */}
          {stage === "email" && (
            <form onSubmit={handleSubmit}>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                Enter your email address. We'll send you a magic link to sign in or create a free account. No password needed.
              </p>

              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email address
              </label>
              <div className="relative mb-4">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary focus:outline-none text-sm transition-colors"
                  autoFocus
                  required
                />
              </div>

              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Promo Code <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <div className="relative mb-5">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BETA2026"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary focus:outline-none text-sm transition-colors font-mono tracking-wider"
                />
              </div>

              <label className="flex items-center gap-2.5 mb-5 cursor-pointer select-none">
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={staySignedIn}
                    onChange={(e) => setStaySignedIn(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded border-2 border-slate-300 peer-checked:border-primary peer-checked:bg-primary transition-colors flex items-center justify-center">
                    {staySignedIn && <ShieldCheck className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-700">Stay signed in for 30 days</span>
                  <p className="text-xs text-slate-400 leading-tight">Uncheck on shared or public devices</p>
                </div>
              </label>

              <button
                type="submit"
                disabled={loading || !email.trim() || !email.includes("@")}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending link…</>
                ) : (
                  "Continue →"
                )}
              </button>

              <p className="text-xs text-center text-slate-400 mt-3">
                No password ever required — just click the link we send you.
              </p>
            </form>
          )}

          {/* Stage: sent */}
          {stage === "sent" && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Check your inbox!</h3>
              {fullAccessGranted && (
                <div className="flex items-center justify-center gap-2 mb-3 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-semibold text-emerald-700">Pro access unlocked ✓</span>
                </div>
              )}
              <p className="text-sm text-slate-600 mb-1">
                We've sent a magic link to{" "}
                <span className="font-semibold text-slate-800">{email}</span>.
              </p>
              <p className="text-sm text-slate-600 mb-4">
                Click it to continue — it expires in 15 minutes.
              </p>
              {debugLink && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
                  <p className="text-xs font-semibold text-amber-700 mb-1">
                    Dev mode — click link directly:
                  </p>
                  <a
                    href={debugLink}
                    onClick={async () => { await refreshUser(); handleClose(); }}
                    className="text-xs text-primary underline break-all"
                  >
                    {debugLink}
                  </a>
                </div>
              )}
              <button
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Stage: error */}
          {stage === "error" && (
            <div className="text-center">
              <p className="text-red-600 text-sm font-medium mb-4">{errorMsg}</p>
              <button
                onClick={() => { setStage("email"); setErrorMsg(""); }}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
