import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HardHat, CheckCircle2, AlertCircle, Loader2,
  ChevronRight, Upload, X, ImageIcon, Phone, Camera,
  Sparkles, Star, ArrowRight, Eye, ShieldCheck, Clock, FileText,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const BASE = import.meta.env.BASE_URL ?? "/";
const ACCENT = "#1f9e6e";

/* ── Stat badge ─────────────────────────────────────────────────── */
function StatBadge({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-3 rounded-2xl"
      style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
      <span className={`font-black text-white leading-none ${valueClassName ?? "text-xl"}`}>{value}</span>
      <span className="text-xs text-white/50 mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  );
}

/* ── Live preview ───────────────────────────────────────────────── */
function LivePreview({
  builderName, tagline, welcomeMessage, logoPreview, logoUrl, photoPreview, phoneNumber, subdomain,
}: {
  builderName: string; tagline: string; welcomeMessage: string;
  logoPreview: string | null; logoUrl: string; photoPreview: string | null;
  phoneNumber: string; subdomain: string;
}) {
  const displayName = builderName || "Your Builder Co.";
  const displayTagline = tagline || "Your New Home. Cared For, Day One.";
  const displayWelcome = welcomeMessage || "Welcome to your new home! We've set up this tool to make your first year seamless.";
  const displayHandle = subdomain || "yourbuilder";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-5 shadow-2xl"
      style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 80% 10%, ${ACCENT}50 0%, transparent 50%)` }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 10% 90%, ${ACCENT}30 0%, transparent 45%)` }} />

      <div className="relative flex justify-center mb-3">
        <span className="text-[10px] font-semibold text-white/30 px-2 py-1 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          Powered by MaintainHome.ai
        </span>
      </div>

      <div className="relative flex justify-center mb-3">
        {(logoPreview || logoUrl) ? (
          <div className="px-5 py-3 rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <img src={logoPreview ?? logoUrl} alt="Logo" className="h-9 max-w-[150px] object-contain" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
            style={{ backgroundColor: ACCENT + "30", border: `1px solid ${ACCENT}50`, color: ACCENT }}>
            {displayName[0]?.toUpperCase()}
          </div>
        )}
      </div>

      {(photoPreview || phoneNumber) && (
        <div className="relative flex flex-col items-center gap-1.5 mb-3">
          {photoPreview && (
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg"
              style={{ borderColor: ACCENT + "70" }}>
              <img src={photoPreview} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <p className="text-white text-xs font-bold">{displayName}</p>
          {phoneNumber && (
            <span className="text-[10px] px-2 py-1 rounded-full font-semibold"
              style={{ color: ACCENT, backgroundColor: ACCENT + "18", border: `1px solid ${ACCENT}35` }}>
              📞 {phoneNumber}
            </span>
          )}
        </div>
      )}

      <div className="relative text-center mb-2.5">
        <h3 className="text-sm font-black text-white leading-snug">
          Your New Home from <span style={{ color: ACCENT }}>{displayName}</span>
        </h3>
        <p className="text-[10px] text-white/45 mt-0.5">
          1-Year Care Package · Warranty Tracking · AI Support
        </p>
      </div>

      <div className="relative mb-2.5 px-3 py-2 rounded-xl text-center"
        style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] text-white/55 italic leading-relaxed line-clamp-2">"{displayWelcome}"</p>
      </div>

      <div className="relative flex items-end gap-2 mb-3">
        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, #0f7a52)` }}>
          <Sparkles className="w-3 h-3 text-white" />
        </div>
        <div className="flex-1 rounded-xl rounded-bl-sm px-2.5 py-2"
          style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <p className="text-[9px] font-bold mb-0.5" style={{ color: ACCENT }}>Maintly · AI Home Assistant</p>
          <p className="text-[10px] text-white/60 leading-relaxed">
            Hi! I'll guide you through your first year — ask me anything. 🏗️
          </p>
        </div>
      </div>

      <p className="relative text-center text-[9px] text-white/25 italic mb-2.5">"{displayTagline}"</p>

      <button className="relative w-full py-2 rounded-xl text-white text-xs font-extrabold"
        style={{ backgroundColor: ACCENT, boxShadow: `0 0 16px ${ACCENT}70` }}>
        Get Started Free →
      </button>

      <div className="relative mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
        style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
        <span className="text-[9px] text-white/30 font-mono">maintainhome.ai/{displayHandle}</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Main component
════════════════════════════════════════════════════════════════════ */
export default function BuilderOnboard() {
  const [form, setForm] = useState({
    subdomain: "",
    builderName: "",
    logoUrl: "",
    contactPhotoUrl: "",
    phoneNumber: "",
    tagline: "",
    welcomeMessage: "",
    contactEmail: "",
    warrantyPeriodMonths: "12",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  function handle<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
  }

  const handleLogoSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { setLogoError("Please select an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setLogoError("Logo must be under 2MB."); return; }
    setLogoError(null); setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const fd = new FormData(); fd.append("logo", file);
      const res = await fetch(`${API_BASE}/api/logo-upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setLogoError(data.error ?? "Upload failed."); setForm((f) => ({ ...f, logoUrl: "" })); }
      else { setForm((f) => ({ ...f, logoUrl: data.logoUrl })); }
    } catch { setLogoError("Upload failed. Paste a URL instead."); }
    finally { setLogoUploading(false); }
  }, []);

  function clearLogo() {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null); setLogoError(null);
    setForm((f) => ({ ...f, logoUrl: "" }));
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  const handlePhotoSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { setPhotoError("Please select an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setPhotoError("Photo must be under 2MB."); return; }
    setPhotoError(null); setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploading(true);
    try {
      const fd = new FormData(); fd.append("photo", file);
      const res = await fetch(`${API_BASE}/api/photo-upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setPhotoError(data.error ?? "Upload failed."); setForm((f) => ({ ...f, contactPhotoUrl: "" })); }
      else { setForm((f) => ({ ...f, contactPhotoUrl: data.photoUrl })); }
    } catch { setPhotoError("Upload failed."); }
    finally { setPhotoUploading(false); }
  }, []);

  function clearPhoto() {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null); setPhotoError(null);
    setForm((f) => ({ ...f, contactPhotoUrl: "" }));
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (logoUploading || photoUploading) { setError("Please wait for uploads to finish."); return; }
    if (!form.logoUrl) { setError("Please upload your logo or paste a logo URL."); return; }
    if (!form.tagline.trim()) { setError("Please enter your custom tagline."); return; }
    if (!form.welcomeMessage.trim()) { setError("Please enter a welcome message for your buyers."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/broker-onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: form.subdomain,
          brokerName: form.builderName,
          logoUrl: form.logoUrl,
          agentPhotoUrl: form.contactPhotoUrl,
          phoneNumber: form.phoneNumber,
          tagline: form.tagline,
          welcomeMessage: form.welcomeMessage,
          contactEmail: form.contactEmail,
          type: "individual_agent",
          monetizationModel: "closing_gift",
          giftDuration: "1year",
          accountType: "builder",
          warrantyPeriodMonths: form.warrantyPeriodMonths,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong. Please try again.");
      else setSuccess(true);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  /* ── Success ─────────────────────────────────────────────────── */
  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 60% 20%, ${ACCENT}45 0%, transparent 50%)` }} />
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-8 text-white text-center" style={{ background: `linear-gradient(135deg, ${ACCENT}, #0f7a52)` }}>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black mb-1">Application Received! 🏗️</h1>
            <p className="text-green-100 text-sm mb-3">
              Builder page submitted for <strong>maintainhome.ai/{form.subdomain}</strong>
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
              🏗️ Builder Account
            </span>
          </div>
          <div className="p-8 space-y-5">
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-primary/8 border border-primary/20">
              <span className="text-lg shrink-0">⚡</span>
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>Your builder page will be live within 24 hours after approval.</strong>{" "}
                We'll email you at <strong>{form.contactEmail}</strong> the moment it's ready.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { emoji: "📋", title: "Review (same business day)", desc: "We personally review every builder application." },
                { emoji: "🚀", title: "Your page goes live", desc: `Buyers visit maintainhome.ai/${form.subdomain} and see your branding instantly.` },
                { emoji: "🏗️", title: "Deliver care packages", desc: "Assign each buyer their 1-year MaintainHome experience at closing." },
              ].map((item) => (
                <div key={item.emoji} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-base">{item.emoji}</div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-5 space-y-2">
              <a href="/broker-dashboard"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-colors">
                Go to My Builder Dashboard <ChevronRight className="w-4 h-4" />
              </a>
              <a href="/"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                Go to MaintainHome.ai
              </a>
              <p className="text-center text-xs text-slate-400 mt-2">
                Questions? <a href="mailto:support@maintainhome.ai" className="text-primary hover:underline">support@maintainhome.ai</a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════
     Main page
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-x-hidden">

      {/* ══ Animated background ═════════════════════════════════════ */}
      <motion.div className="fixed inset-0 pointer-events-none z-0"
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: `radial-gradient(ellipse at 15% 30%, ${ACCENT}55 0%, transparent 45%)` }} />
      <motion.div className="fixed inset-0 pointer-events-none z-0"
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        style={{ background: `radial-gradient(ellipse at 85% 70%, ${ACCENT}35 0%, transparent 45%)` }} />
      <motion.div className="fixed inset-0 pointer-events-none z-0"
        animate={{ opacity: [0.1, 0.22, 0.1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 9 }}
        style={{ background: `radial-gradient(ellipse at 50% 55%, ${ACCENT}18 0%, transparent 55%)` }} />

      {/* ══ Full-width headline bar ══════════════════════════════════ */}
      <div className="relative z-10 pt-10 pb-4 px-5 sm:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-5"
            style={{ backgroundColor: ACCENT + "22", color: ACCENT, border: `1px solid ${ACCENT}40` }}>
            <HardHat className="w-4 h-4" />
            Builder White-Label Program
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.0] tracking-tight">
            The Ultimate{" "}
            <span style={{ background: "linear-gradient(135deg, #1f9e6e 0%, #3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>New Home Buyer</span>
            {" "}Experience Tool
          </h1>
          <p className="text-white/80 text-lg sm:text-xl font-semibold leading-snug mt-5 max-w-2xl mx-auto">
            Give your buyers a branded{" "}
            <span style={{ color: "#1f9e6e" }}>1-year home care package</span>{" "}
            with warranty tracking, document vault, and AI maintenance support.
          </p>
        </motion.div>
      </div>

      {/* ══ Builder Info Banner ══════════════════════════════════════ */}
      <div className="relative z-10 px-5 sm:px-8 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="max-w-3xl mx-auto"
        >
          <div className="rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{
              background: `linear-gradient(135deg, ${ACCENT}18 0%, ${ACCENT}08 100%)`,
              border: `1.5px solid ${ACCENT}50`,
            }}>
            <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center"
              style={{ backgroundColor: ACCENT + "25", border: `1px solid ${ACCENT}40` }}>
              <ShieldCheck className="w-5 h-5" style={{ color: ACCENT }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white mb-1 tracking-wide uppercase"
                style={{ letterSpacing: "0.04em" }}>
                Builder Accounts — New Construction Focus
              </p>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed">
                Builder accounts emphasize{" "}
                <span className="font-bold text-white">new construction warranties</span>{" "}
                and 1-year post-closing support. Warranty dates and specs are made prominent with automatic reminders at the 1-year window.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ══ Maintly LEFT + Form RIGHT ═══════════════════════════════ */}
      <div className="relative z-10 px-5 sm:px-8 pt-6 pb-20">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-stretch gap-8">

          {/* ── LEFT: Maintly + stats ─────────────────────────────── */}
          <motion.div
            className="lg:w-80 xl:w-96 shrink-0 flex flex-col items-start"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.55, ease: "easeOut" }}
          >
            <div className="relative w-full flex justify-start">
              <div className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 50% 100%, ${ACCENT}40 0%, transparent 60%)` }} />
              <motion.img
                src={`${BASE}images/maintly_point.png`}
                alt="Maintly"
                className="relative w-44 sm:w-56 lg:w-64 xl:w-72 drop-shadow-2xl -ml-3 sm:-ml-2 lg:ml-0"
                style={{ transform: "scaleX(-1)" }}
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute top-6 right-0 lg:right-auto lg:left-[55%] max-w-[190px] px-3.5 py-3 rounded-2xl rounded-tl-sm shadow-xl"
                style={{
                  backgroundColor: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  backdropFilter: "blur(12px)",
                }}
                initial={{ opacity: 0, x: 12, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 0.75, duration: 0.4 }}
              >
                <p className="text-white text-xs font-semibold leading-snug">
                  I'll guide your buyers through their entire first year of homeownership. 🏗️
                </p>
                <p className="text-[10px] mt-1" style={{ color: ACCENT }}>— Maintly</p>
              </motion.div>
            </div>

            {/* Stat badges */}
            <div className="grid grid-cols-3 gap-2 mt-4 w-full">
              <StatBadge value="12-mo" label="Warranty window" />
              <StatBadge value="AI" label="Support 24/7" />
              <StatBadge value="∞" label="Homes delivered" valueClassName="text-4xl" />
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex -space-x-2">
                {["#e2a05a", "#6dd5a8", "#5ab0e2", "#d56d6d"].map((c, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-slate-950 flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: c }}>
                    {["A", "B", "C", "D"][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-white/35 text-xs mt-0.5">Loved by top builders</p>
              </div>
            </div>

            {/* Tips */}
            <div className="hidden lg:block mt-6 w-full px-4 py-4 rounded-2xl"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-bold text-white/50 mb-2">💡 Builder tips</p>
              <ul className="space-y-1.5 text-xs text-white/35 leading-relaxed">
                <li>• Use a transparent PNG logo for a clean look</li>
                <li>• Set the warranty period to match your builder warranty</li>
                <li>• A warm welcome message builds post-close trust</li>
                <li>• Buyers love knowing their warranty is tracked</li>
              </ul>
            </div>
          </motion.div>

          {/* ── RIGHT: Form card ──────────────────────────────────── */}
          <motion.div
            className="flex-1 min-w-0"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.55, ease: "easeOut" }}
          >
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden h-full flex flex-col">

              {/* Title bar */}
              <div className="flex items-center gap-3 px-7 py-5 border-b border-slate-100"
                style={{ background: "linear-gradient(to right, #0f172a, #1e293b)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, #0f7a52)` }}>
                  <HardHat className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-base leading-tight">Apply for Your Builder White-Label Page</p>
                  <p className="text-white/45 text-xs mt-0.5">Takes ~3 minutes · Reviewed personally</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-red-400/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                  <div className="w-3 h-3 rounded-full bg-green-400/70" />
                </div>
              </div>

              {/* Form */}
              <form onSubmit={submit} className="flex-1 p-7 sm:p-9 space-y-7 overflow-y-auto">

                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Builder / Company Name <span className="text-red-500">*</span>
                    </label>
                    <input type="text" value={form.builderName}
                      onChange={(e) => handle("builderName", e.target.value)}
                      placeholder="Sunrise Homes LLC"
                      required
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900 text-base transition-all hover:shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Contact Email <span className="text-red-500">*</span>
                    </label>
                    <input type="email" value={form.contactEmail}
                      onChange={(e) => handle("contactEmail", e.target.value)}
                      placeholder="contact@sunrisehomes.com" required
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900 text-base transition-all hover:shadow-sm" />
                  </div>
                </div>

                {/* Handle */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Your Short Handle <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all hover:shadow-sm">
                    <span className="px-4 py-3.5 bg-slate-50 text-slate-400 text-sm font-medium border-r border-slate-200 whitespace-nowrap shrink-0">
                      maintainhome.ai/
                    </span>
                    <input type="text" value={form.subdomain}
                      onChange={(e) => handle("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="sunrisehomes" required
                      className="flex-1 px-4 py-3.5 text-slate-900 text-base focus:outline-none" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">Letters, numbers, and hyphens only. This is the URL your buyers will visit.</p>
                </div>

                {/* Logo */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Company Logo <span className="text-red-500">*</span>{" "}
                    <span className="text-slate-400 font-normal text-xs">(PNG, SVG, WebP — max 2MB)</span>
                  </label>
                  {!logoFile ? (
                    <motion.div whileHover={{ scale: 1.01 }}
                      onClick={() => logoInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-200 rounded-xl px-6 py-9 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/3 transition-all">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-slate-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-700">Click to upload your logo</p>
                        <p className="text-xs text-slate-400 mt-1">Recommended: transparent PNG or SVG, min 200×60px</p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="w-full border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4">
                      {logoPreview && (
                        <div className="w-24 h-14 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                          <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{logoFile.name}</p>
                        <p className="text-xs text-slate-400">{(logoFile.size / 1024).toFixed(0)} KB</p>
                        {logoUploading && <p className="text-xs text-primary flex items-center gap-1 mt-1"><Loader2 className="w-3 h-3 animate-spin" />Uploading…</p>}
                        {!logoUploading && form.logoUrl && <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><CheckCircle2 className="w-3 h-3" />Uploaded</p>}
                        {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
                      </div>
                      <button type="button" onClick={clearLogo} className="shrink-0 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoSelect(f); }} />
                  {logoError && !logoFile && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{logoError}</p>
                  )}
                  <div className="mt-3">
                    <label className="block text-xs text-slate-400 mb-1.5">Or paste a public logo URL:</label>
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <input type="url" value={logoFile ? "" : form.logoUrl}
                        onChange={(e) => { clearLogo(); handle("logoUrl", e.target.value); }}
                        placeholder="https://yoursite.com/logo.png"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm text-slate-900 hover:shadow-sm" />
                    </div>
                  </div>
                </div>

                {/* Contact photo */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    <Camera className="w-4 h-4 inline mr-1.5 text-slate-400" />
                    Contact / Sales Rep Photo <span className="text-slate-400 font-normal text-xs">(optional — max 2MB)</span>
                  </label>
                  <p className="text-xs text-slate-400 mb-3">Shown alongside your logo on the buyer's invite page.</p>
                  {!photoFile ? (
                    <motion.div whileHover={{ scale: 1.01 }}
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-200 rounded-xl px-6 py-7 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/3 transition-all">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Camera className="w-4 h-4 text-slate-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">Click to upload a photo</p>
                    </motion.div>
                  ) : (
                    <div className="w-full border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4">
                      {photoPreview && (
                        <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-slate-200">
                          <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{photoFile.name}</p>
                        {photoUploading && <p className="text-xs text-primary flex items-center gap-1 mt-1"><Loader2 className="w-3 h-3 animate-spin" />Uploading…</p>}
                        {!photoUploading && form.contactPhotoUrl && <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><CheckCircle2 className="w-3 h-3" />Uploaded</p>}
                        {photoError && <p className="text-xs text-red-500 mt-1">{photoError}</p>}
                      </div>
                      <button type="button" onClick={clearPhoto} className="shrink-0 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }} />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1.5 text-slate-400" />
                    Phone Number <span className="text-slate-400 font-normal text-xs">(optional)</span>
                  </label>
                  <input type="tel" value={form.phoneNumber}
                    onChange={(e) => handle("phoneNumber", e.target.value)}
                    placeholder="(555) 867-5309"
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900 text-base transition-all hover:shadow-sm" />
                </div>

                {/* Warranty Period — builder-specific field */}
                <div className="px-5 py-4 rounded-2xl border-2 border-dashed"
                  style={{ borderColor: ACCENT + "40", backgroundColor: ACCENT + "06" }}>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    <Clock className="w-4 h-4 inline mr-1.5" style={{ color: ACCENT }} />
                    Primary Builder Warranty Period{" "}
                    <span className="text-slate-400 font-normal text-xs">(months, optional)</span>
                  </label>
                  <p className="text-xs text-slate-400 mb-3">
                    We'll set this as the default warranty window for all buyers you onboard. Default is 12 months.
                  </p>
                  <input type="number" min="1" max="120" value={form.warrantyPeriodMonths}
                    onChange={(e) => handle("warrantyPeriodMonths", e.target.value)}
                    placeholder="12"
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900 text-base transition-all hover:shadow-sm" />
                </div>

                {/* Tagline */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Custom Tagline <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={form.tagline}
                    onChange={(e) => handle("tagline", e.target.value)}
                    placeholder="Your New Home. Cared For, Day One. – Sunrise Homes"
                    maxLength={120} required
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900 text-base transition-all hover:shadow-sm" />
                </div>

                {/* Welcome message */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Welcome Message <span className="text-red-500">*</span>
                  </label>
                  <textarea value={form.welcomeMessage}
                    onChange={(e) => handle("welcomeMessage", e.target.value)}
                    placeholder="Welcome to your new home! We've set up this tool to make your first year seamless — with warranty tracking, maintenance reminders, and an AI assistant to answer any question about your home."
                    rows={4} maxLength={400} required
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900 text-base resize-none transition-all hover:shadow-sm" />
                  <p className="text-xs text-slate-400 mt-1.5">Shown on your buyer's invite page — make it warm and reassuring.</p>
                </div>

                {/* Builder note */}
                <div className="flex items-start gap-3 px-4 py-4 rounded-xl border"
                  style={{ backgroundColor: ACCENT + "08", borderColor: ACCENT + "30" }}>
                  <FileText className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ACCENT }} />
                  <p className="text-sm text-slate-600 leading-relaxed">
                    <span className="font-bold" style={{ color: ACCENT }}>Builder accounts</span>{" "}
                    focus on new construction warranties and 1-year post-closing support. Once approved, you can deliver care packages to each buyer at closing.
                  </p>
                </div>

                {/* Preview toggle */}
                <div>
                  <button type="button" onClick={() => setShowPreview(v => !v)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                    <Eye className="w-4 h-4" style={{ color: ACCENT }} />
                    {showPreview ? "Hide Preview" : "Preview Your Buyer Invite Page"}
                  </button>
                  <AnimatePresence>
                    {showPreview && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-4"
                      >
                        <LivePreview
                          builderName={form.builderName} tagline={form.tagline}
                          welcomeMessage={form.welcomeMessage} logoPreview={logoPreview}
                          logoUrl={form.logoUrl} photoPreview={photoPreview}
                          phoneNumber={form.phoneNumber} subdomain={form.subdomain}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200"
                    >
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading || logoUploading || photoUploading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl text-white font-extrabold text-xl transition-all disabled:opacity-60"
                  style={{
                    backgroundColor: ACCENT,
                    boxShadow: `0 0 50px ${ACCENT}70, 0 8px 28px ${ACCENT}50`,
                  }}
                >
                  {loading
                    ? <><Loader2 className="w-5 h-5 animate-spin" />Submitting…</>
                    : <>Submit Builder Application <ArrowRight className="w-5 h-5" /></>}
                </motion.button>

                <p className="text-center text-xs text-slate-400">
                  We review every application within one business day.{" "}
                  <a href="mailto:support@maintainhome.ai" className="text-primary hover:underline">Questions?</a>
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
