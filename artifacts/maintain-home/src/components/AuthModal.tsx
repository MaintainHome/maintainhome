import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Mail, CheckCircle2, Loader2, Tag, ShieldCheck, Unlock,
  UserPlus, LogIn, User, ArrowRight, Sparkles, Gift,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: "signup" | "signin";
}

type Mode = "signup" | "signin";
type Stage = "form" | "sent" | "error";

export function AuthModal({ open, onClose, initialMode }: AuthModalProps) {
  const { refreshUser } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode ?? "signup");

  useEffect(() => {
    if (open) setMode(initialMode ?? "signup");
  }, [open, initialMode]);
  const [stage, setStage] = useState<Stage>("form");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [giftCode, setGiftCode] = useState("");
  const [showGiftField, setShowGiftField] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [debugLink, setDebugLink] = useState<string | null>(null);
  const [fullAccessGranted, setFullAccessGranted] = useState(false);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setMode("signup");
      setStage("form");
      setEmail("");
      setName("");
      setPromoCode("");
      setGiftCode("");
      setShowGiftField(false);
      setErrorMsg("");
      setDebugLink(null);
      setFullAccessGranted(false);
      setStaySignedIn(true);
      setEmailChecked(false);
      setCheckingEmail(false);
    }, 300);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrorMsg("");
  };

  const checkEmail = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) return;
    setCheckingEmail(true);
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setMode(data.exists ? "signin" : "signup");
        setEmailChecked(true);
      }
    } catch {
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setEmailChecked(false);
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const trimmed = val.trim();
    if (trimmed && trimmed.includes("@") && trimmed.includes(".")) {
      checkTimer.current = setTimeout(() => checkEmail(val), 600);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) return;
    if (mode === "signup" && !name.trim()) return;

    setLoading(true);
    setErrorMsg("");
    try {
      const body: Record<string, string | boolean> = {
        email: trimmedEmail,
        staySignedIn,
      };
      if (mode === "signup") {
        body.name = name.trim();
        if (promoCode.trim()) body.promoCode = promoCode.trim();
        const referral = localStorage.getItem("mh_referral_sub");
        if (referral) body.referralSubdomain = referral;
      }
      if (giftCode.trim()) {
        body.giftCode = giftCode.trim().toUpperCase();
        localStorage.setItem("mh_pending_gift", giftCode.trim().toUpperCase());
      }

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

  const emailValid = email.trim().length > 0 && email.includes("@");
  const canSubmit = emailValid && !loading && (mode === "signin" || name.trim().length > 0);

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
          className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
        >
          {/* ── Header bar ───────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/images/logo-icon.png"
                alt="MaintainHome.ai"
                className="w-8 h-8 object-contain"
              />
              <div>
                <p className="font-bold text-slate-900 text-sm leading-tight">MaintainHome.ai</p>
                <p className="text-xs text-slate-400 leading-tight">Personalized home maintenance</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {stage === "form" && (
            <>
              {/* ── Mode tabs ─────────────────────────────────────── */}
              <div className="flex mx-6 mb-5 rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    mode === "signup"
                      ? "bg-white text-primary shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    mode === "signin"
                      ? "bg-white text-primary shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </button>
              </div>

              {/* ── Mode headline ─────────────────────────────────── */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="px-6"
                >
                  {mode === "signup" ? (
                    <div className="mb-4">
                      <h2 className="text-base font-bold text-slate-900 mb-0.5">New to MaintainHome?</h2>
                      <p className="text-xs text-slate-500">Create a free account — no password, ever. Just a magic link.</p>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <h2 className="text-base font-bold text-slate-900 mb-0.5">Welcome back!</h2>
                      <p className="text-xs text-slate-500">Enter your email and we'll send a magic sign-in link instantly.</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* ── Form ─────────────────────────────────────────── */}
              <form onSubmit={handleSubmit} className="px-6 pb-6">
                <AnimatePresence mode="wait">
                  {mode === "signup" && (
                    <motion.div
                      key="name-field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name <span className="text-red-400">*</span>
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
                          required={mode === "signup"}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email */}
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative mb-3">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={() => checkEmail(email)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-9 py-3 rounded-xl border-2 border-slate-200 focus:border-primary focus:outline-none text-sm transition-colors"
                    autoFocus={mode === "signin"}
                    required
                  />
                  {checkingEmail && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 animate-spin" />
                  )}
                  {!checkingEmail && emailChecked && emailValid && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500" />
                  )}
                </div>

                {/* Smart detection hint */}
                {emailChecked && emailValid && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 mb-3 text-xs"
                  >
                    {mode === "signin" ? (
                      <span className="text-emerald-600 font-semibold">✓ Account found — signing you in</span>
                    ) : (
                      <span className="text-primary font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> New email — creating your account
                      </span>
                    )}
                  </motion.div>
                )}

                {/* Promo code — signup only */}
                <AnimatePresence mode="wait">
                  {mode === "signup" && (
                    <motion.div
                      key="promo-field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Promo Code <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <div className="relative mb-4">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          placeholder="e.g. BETA2026"
                          className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary focus:outline-none text-sm transition-colors font-mono tracking-wider"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Gift code — both modes */}
                <div className="mb-4">
                  {!showGiftField ? (
                    <button
                      type="button"
                      onClick={() => setShowGiftField(true)}
                      className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      Have a gift code?
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.2 }}
                    >
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Gift Code
                      </label>
                      <div className="relative">
                        <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                        <input
                          type="text"
                          value={giftCode}
                          onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                          placeholder="e.g. A1B2-C3D4-E5F6"
                          className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-primary/30 focus:border-primary focus:outline-none text-sm transition-colors font-mono tracking-wider bg-primary/5"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Enter your gift code — you'll get 1 year of Pro after signing in.</p>
                    </motion.div>
                  )}
                </div>

                {/* Stay signed in */}
                <label className="flex items-start gap-2.5 mb-5 cursor-pointer select-none">
                  <div className="relative flex-shrink-0 mt-0.5">
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

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary/20"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Sending link…</>
                  ) : mode === "signup" ? (
                    <><UserPlus className="w-4 h-4" />Create Account &amp; Continue</>
                  ) : (
                    <><ArrowRight className="w-4 h-4" />Send Magic Link</>
                  )}
                </button>

                {/* Switch mode hint */}
                <p className="text-xs text-center text-slate-400 mt-3">
                  {mode === "signup" ? (
                    <>Already have an account?{" "}
                      <button type="button" onClick={() => switchMode("signin")} className="text-primary font-semibold hover:underline">
                        Sign In
                      </button>
                    </>
                  ) : (
                    <>New to MaintainHome?{" "}
                      <button type="button" onClick={() => switchMode("signup")} className="text-primary font-semibold hover:underline">
                        Create Account
                      </button>
                    </>
                  )}
                </p>
              </form>
            </>
          )}

          {/* ── Sent ─────────────────────────────────────────────── */}
          {stage === "sent" && (
            <div className="text-center px-6 pb-7">
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
                We sent a magic link to{" "}
                <span className="font-semibold text-slate-800">{email}</span>.
              </p>
              <p className="text-sm text-slate-500 mb-5">
                Click it to {mode === "signup" ? "finish creating your account" : "sign back in"} — it expires in 15 minutes.
              </p>
              {debugLink && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Dev mode — click link directly:</p>
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

          {/* ── Error ────────────────────────────────────────────── */}
          {stage === "error" && (
            <div className="text-center px-6 pb-7">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <X className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-red-600 text-sm font-medium mb-5">{errorMsg}</p>
              <button
                onClick={() => { setStage("form"); setErrorMsg(""); }}
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
