import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, CheckCircle2, Loader2, LogIn } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [debugLink, setDebugLink] = useState<string | null>(null);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStage("email");
      setEmail("");
      setErrorMsg("");
      setDebugLink(null);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setStage("error");
        return;
      }
      if (data.debugLink) setDebugLink(data.debugLink);
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
                <p className="font-bold text-slate-900 text-base">Sign In</p>
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

          {stage === "email" && (
            <form onSubmit={handleSubmit}>
              <p className="text-sm text-slate-600 mb-4">
                Enter your email and we'll send you a magic sign-in link. No password needed.
              </p>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary focus:outline-none text-sm transition-colors mb-4"
                autoFocus
                required
              />
              <button
                type="submit"
                disabled={loading || !email.trim() || !email.includes("@")}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                ) : (
                  <><Mail className="w-4 h-4" /> Send Magic Link</>
                )}
              </button>
              <p className="text-xs text-center text-slate-400 mt-3">
                A sign-in link will be emailed to you. No password required.
              </p>
            </form>
          )}

          {stage === "sent" && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Check your email!</h3>
              <p className="text-sm text-slate-600 mb-2">
                We sent a sign-in link to{" "}
                <span className="font-semibold text-slate-800">{email}</span>.
              </p>
              <p className="text-xs text-slate-400 mb-5">
                Click the link in the email to sign in. It expires in 15 minutes.
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
