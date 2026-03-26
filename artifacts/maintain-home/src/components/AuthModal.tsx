import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, CheckCircle2, Loader2, UserPlus, LogIn, MapPin, User, Tag, Unlock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Stage = "email" | "profile" | "sent" | "error";

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { refreshUser } = useAuth();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [debugLink, setDebugLink] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [fullAccessGranted, setFullAccessGranted] = useState(false);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStage("email");
      setEmail("");
      setName("");
      setZipCode("");
      setPromoCode("");
      setErrorMsg("");
      setDebugLink(null);
      setIsNewUser(false);
      setFullAccessGranted(false);
    }, 300);
  };

  // Step 1: check email, then either send link or ask for profile
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong.");
        setStage("error");
        return;
      }
      if (data.exists) {
        // Returning user — send magic link, include promo if entered
        await sendLink(trimmedEmail, null, null, promoCode);
      } else {
        // New user — collect name + zip
        setIsNewUser(true);
        setStage("profile");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection.");
      setStage("error");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: submit profile + send magic link
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedZip = zipCode.trim();
    if (!trimmedName || !trimmedZip) return;
    if (!/^\d{5}(-\d{4})?$/.test(trimmedZip)) {
      setErrorMsg("Please enter a valid 5-digit ZIP code.");
      return;
    }
    setErrorMsg("");
    await sendLink(email.trim(), trimmedName, trimmedZip, promoCode);
  };

  const sendLink = async (
    emailAddr: string,
    nameVal: string | null,
    zipVal: string | null,
    promo: string,
  ) => {
    setLoading(true);
    try {
      const body: Record<string, string> = { email: emailAddr };
      if (nameVal) body.name = nameVal;
      if (zipVal) body.zipCode = zipVal;
      if (promo.trim()) body.promoCode = promo.trim();

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

  const isSignUp = isNewUser || stage === "profile";

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
                {isSignUp ? (
                  <UserPlus className="w-5 h-5 text-primary" />
                ) : (
                  <LogIn className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-base">
                  {stage === "profile" ? "Create Your Account" : "Sign Up / Sign In"}
                </p>
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

          {/* Step indicator for new users */}
          {(stage === "email" || stage === "profile") && (
            <div className="flex items-center gap-2 mb-5">
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${stage === "email" || stage === "profile" ? "bg-primary" : "bg-slate-200"}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${stage === "profile" ? "bg-primary" : "bg-slate-200"}`} />
            </div>
          )}

          {/* Stage: email */}
          {stage === "email" && (
            <form onSubmit={handleEmailSubmit}>
              <p className="text-sm text-slate-600 mb-4">
                Enter your email to sign in or create a free account. No password needed.
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
                Promo Code <span className="font-normal text-slate-400">(optional — for early full access)</span>
              </label>
              <div className="relative mb-4">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter promo code"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary focus:outline-none text-sm transition-colors font-mono tracking-wider"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email.trim() || !email.includes("@")}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</>
                ) : (
                  "Continue"
                )}
              </button>
              <p className="text-xs text-center text-slate-400 mt-3">
                We'll send you a magic link — no password ever required.
              </p>
            </form>
          )}

          {/* Stage: profile (new user) */}
          {stage === "profile" && (
            <form onSubmit={handleProfileSubmit}>
              <p className="text-sm text-slate-600 mb-1">
                Welcome! Just a couple more details to personalize your home care plan.
              </p>
              <p className="text-xs text-slate-400 mb-4 flex items-center gap-1">
                <Mail className="w-3 h-3" /> {email}
              </p>

              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name
              </label>
              <div className="relative mb-3">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary focus:outline-none text-sm transition-colors"
                  autoFocus
                  required
                />
              </div>

              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Home ZIP Code
              </label>
              <div className="relative mb-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="28202"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary focus:outline-none text-sm transition-colors"
                  inputMode="numeric"
                  required
                />
              </div>
              {errorMsg && (
                <p className="text-xs text-red-600 mb-2">{errorMsg}</p>
              )}
              <p className="text-xs text-slate-400 mb-3">
                Used to tailor your maintenance reminders to your climate.
              </p>

              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Promo Code <span className="font-normal text-slate-400">(optional — for early full access)</span>
              </label>
              <div className="relative mb-4">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter promo code"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary focus:outline-none text-sm transition-colors font-mono tracking-wider"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim() || zipCode.length < 5}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                ) : (
                  <><UserPlus className="w-4 h-4" /> Create Account</>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setStage("email"); setIsNewUser(false); setErrorMsg(""); }}
                className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                ← Back
              </button>
            </form>
          )}

          {/* Stage: sent */}
          {stage === "sent" && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Check your email!</h3>
              {fullAccessGranted && (
                <div className="flex items-center justify-center gap-2 mb-3 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-semibold text-emerald-700">Full access unlocked ✓</span>
                </div>
              )}
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
