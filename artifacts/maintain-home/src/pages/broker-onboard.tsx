import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, CheckCircle2, AlertCircle, Loader2,
  ChevronRight, Upload, X, ImageIcon, Phone, Camera,
  Sparkles, Star, Users, ArrowRight, Eye,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const BASE = import.meta.env.BASE_URL ?? "/";
const ACCENT = "#1f9e6e";

/* ── tiny stat badge ────────────────────────────────────────────── */
function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center px-5 py-3 rounded-2xl"
      style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
      <span className="text-2xl font-black text-white leading-none">{value}</span>
      <span className="text-xs text-white/50 mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  );
}

/* ── live preview panel ─────────────────────────────────────────── */
function LivePreview({
  brokerName, tagline, welcomeMessage, logoPreview, logoUrl, photoPreview, phoneNumber, subdomain,
}: {
  brokerName: string; tagline: string; welcomeMessage: string;
  logoPreview: string | null; logoUrl: string; photoPreview: string | null;
  phoneNumber: string; subdomain: string;
}) {
  const displayName = brokerName || "Your Agency";
  const displayTagline = tagline || "Own Your Home With Confidence";
  const displayWelcome = welcomeMessage || "Welcome! I set up this home care tool to help protect your investment and stay ahead of maintenance.";
  const displayHandle = subdomain || "youragency";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-5 shadow-2xl"
      style={{ border: "1px solid rgba(255,255,255,0.12)" }}>

      {/* mini gradient blobs */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 80% 10%, ${ACCENT}50 0%, transparent 50%)` }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 10% 90%, ${ACCENT}30 0%, transparent 45%)` }} />

      {/* powered by badge */}
      <div className="relative flex justify-center mb-4">
        <span className="text-[10px] font-semibold text-white/30 px-2 py-1 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          Powered by MaintainHome.ai
        </span>
      </div>

      {/* Logo */}
      <div className="relative flex justify-center mb-4">
        {(logoPreview || logoUrl) ? (
          <div className="px-6 py-4 rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <img src={logoPreview ?? logoUrl} alt="Logo" className="h-10 max-w-[160px] object-contain" />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black"
            style={{ backgroundColor: ACCENT + "30", border: `1px solid ${ACCENT}50`, color: ACCENT }}>
            {displayName[0]?.toUpperCase()}
          </div>
        )}
      </div>

      {/* Agent photo + phone */}
      {(photoPreview || phoneNumber) && (
        <div className="relative flex flex-col items-center gap-2 mb-4">
          {photoPreview && (
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 shadow-lg"
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

      {/* Headline */}
      <div className="relative text-center mb-3">
        <h3 className="text-sm font-black text-white leading-snug">
          Welcome to Your<br />
          <span style={{ color: ACCENT }}>MaintainHome</span> Experience
        </h3>
        <p className="text-[10px] text-white/45 mt-1">
          A personal gift from <span className="font-bold" style={{ color: ACCENT }}>{displayName}</span>
        </p>
      </div>

      {/* Welcome message */}
      <div className="relative mb-3 px-3 py-2.5 rounded-xl text-center"
        style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] text-white/55 italic leading-relaxed line-clamp-3">
          "{displayWelcome}"
        </p>
      </div>

      {/* Maintly bubble */}
      <div className="relative flex items-end gap-2 mb-4">
        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, #0f7a52)` }}>
          <Sparkles className="w-3 h-3 text-white" />
        </div>
        <div className="flex-1 rounded-xl rounded-bl-sm px-2.5 py-2"
          style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <p className="text-[9px] font-bold mb-0.5" style={{ color: ACCENT }}>Maintly · AI Home Assistant</p>
          <p className="text-[10px] text-white/60 leading-relaxed">
            Hi! I'm Maintly — ask me anything about your home. 🏡
          </p>
        </div>
      </div>

      {/* Tagline */}
      <p className="relative text-center text-[9px] text-white/25 italic mb-3">"{displayTagline}"</p>

      {/* CTA */}
      <button className="relative w-full py-2.5 rounded-xl text-white text-xs font-extrabold"
        style={{ backgroundColor: ACCENT, boxShadow: `0 0 20px ${ACCENT}70` }}>
        Get Started Free →
      </button>

      {/* URL bar */}
      <div className="relative mt-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
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
export default function BrokerOnboard() {
  const [form, setForm] = useState({
    subdomain: "",
    brokerName: "",
    logoUrl: "",
    agentPhotoUrl: "",
    phoneNumber: "",
    tagline: "",
    welcomeMessage: "",
    contactEmail: "",
    isTeamLeader: false,
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

  /* ── Logo upload ─────────────────────────────────────────────── */
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

  /* ── Photo upload ────────────────────────────────────────────── */
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
      if (!res.ok) { setPhotoError(data.error ?? "Upload failed."); setForm((f) => ({ ...f, agentPhotoUrl: "" })); }
      else { setForm((f) => ({ ...f, agentPhotoUrl: data.photoUrl })); }
    } catch { setPhotoError("Upload failed."); }
    finally { setPhotoUploading(false); }
  }, []);

  function clearPhoto() {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null); setPhotoError(null);
    setForm((f) => ({ ...f, agentPhotoUrl: "" }));
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  /* ── Submit ──────────────────────────────────────────────────── */
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (logoUploading || photoUploading) { setError("Please wait for uploads to finish."); return; }
    if (!form.logoUrl) { setError("Please upload your logo or paste a logo URL."); return; }
    if (!form.tagline.trim()) { setError("Please enter your custom tagline."); return; }
    if (!form.welcomeMessage.trim()) { setError("Please enter a welcome message for your clients."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/broker-onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: form.subdomain,
          brokerName: form.brokerName,
          logoUrl: form.logoUrl,
          agentPhotoUrl: form.agentPhotoUrl,
          phoneNumber: form.phoneNumber,
          tagline: form.tagline,
          welcomeMessage: form.welcomeMessage,
          contactEmail: form.contactEmail,
          type: form.isTeamLeader ? "team_leader" : "individual_agent",
          monetizationModel: "private_label",
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong. Please try again.");
      else setSuccess(true);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  /* ── Success screen ──────────────────────────────────────────── */
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
            <h1 className="text-2xl font-black mb-1">You're In! 🎉</h1>
            <p className="text-green-100 text-sm mb-3">
              Application submitted for{" "}
              <strong>maintainhome.ai/{form.subdomain}</strong>
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
              {form.isTeamLeader ? "🏢 Team Leader" : "👤 Individual Agent"}
            </span>
          </div>
          <div className="p-8 space-y-5">
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-primary/8 border border-primary/20">
              <span className="text-lg shrink-0">⚡</span>
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>Your branded page will be live within 24 hours after approval.</strong>{" "}
                We'll email you at <strong>{form.contactEmail}</strong> the moment it's ready.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { emoji: "📋", title: "Review (same business day)", desc: "We personally review every application and approve qualified agents." },
                { emoji: "🚀", title: "Your page goes live", desc: `Clients visit maintainhome.ai/${form.subdomain} and see your logo and welcome instantly.` },
                { emoji: "📊", title: "Partner Dashboard access", desc: "Copy your invite link, view client activity, and track engagement." },
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
                Go to My Partner Dashboard <ChevronRight className="w-4 h-4" />
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

  /* ── Main page ───────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-x-hidden">

      {/* ══ Animated background gradients ═══════════════════════════ */}
      <motion.div className="fixed inset-0 pointer-events-none z-0"
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: `radial-gradient(ellipse at 80% 5%, ${ACCENT}55 0%, transparent 45%)` }} />
      <motion.div className="fixed inset-0 pointer-events-none z-0"
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        style={{ background: `radial-gradient(ellipse at 10% 80%, ${ACCENT}40 0%, transparent 45%)` }} />
      <motion.div className="fixed inset-0 pointer-events-none z-0"
        animate={{ opacity: [0.1, 0.25, 0.1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 9 }}
        style={{ background: `radial-gradient(ellipse at 45% 55%, ${ACCENT}20 0%, transparent 55%)` }} />

      {/* ══ Hero ════════════════════════════════════════════════════ */}
      <div className="relative z-10 pt-12 pb-16 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-10">

            {/* ── Hero left ─────────────────────────────────────── */}
            <motion.div
              className="flex-1 text-center lg:text-left"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-6"
                style={{ backgroundColor: ACCENT + "22", color: ACCENT, border: `1px solid ${ACCENT}40` }}>
                <Building2 className="w-4 h-4" />
                Pioneer Agent Program
              </div>

              {/* Headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.0] tracking-tight mb-5">
                The Ultimate<br />
                <span style={{ color: ACCENT }}>Client Retention</span><br />
                Tool
              </h1>

              {/* Subheadline */}
              <p className="text-white/60 text-lg sm:text-xl leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                Join the{" "}
                <strong className="text-white">Pioneer 300</strong> — get your own fully branded AI home maintenance app at{" "}
                <span className="font-bold" style={{ color: ACCENT }}>maintainhome.ai/[yourname]</span>{" "}
                that turns one-time transactions into lifelong client relationships.
              </p>

              {/* Stat badges */}
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-8">
                <StatBadge value="300" label="Pioneer spots total" />
                <StatBadge value="12-mo" label="AI maintenance calendar" />
                <StatBadge value="∞" label="Client relationships" />
              </div>

              {/* Social proof row */}
              <div className="flex items-center gap-3 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {["#e2a05a", "#6dd5a8", "#5ab0e2", "#d56d6d"].map((c, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-950 flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: c }}>
                      {["A", "B", "C", "D"][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-white/40 text-xs mt-0.5">Loved by top-producing agents</p>
                </div>
              </div>
            </motion.div>

            {/* ── Maintly avatar ────────────────────────────────── */}
            <motion.div
              className="hidden lg:flex flex-col items-center relative"
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            >
              <motion.img
                src={`${BASE}images/maintly_point.png`}
                alt="Maintly"
                className="w-72 xl:w-80 drop-shadow-2xl"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Speech bubble */}
              <motion.div
                className="absolute top-8 -left-4 max-w-[220px] px-4 py-3 rounded-2xl rounded-bl-sm shadow-xl"
                style={{ backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(12px)" }}
                initial={{ opacity: 0, x: -12, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.4 }}
              >
                <p className="text-white text-sm font-semibold leading-snug">
                  I'll be your clients' AI home assistant — every day. 🏡
                </p>
                <p className="text-xs mt-1" style={{ color: ACCENT }}>— Maintly</p>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </div>

      {/* ══ Form + Preview ══════════════════════════════════════════ */}
      <div className="relative z-10 px-5 sm:px-8 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* ── Form card ─────────────────────────────────────── */}
            <motion.div
              className="flex-1 min-w-0"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

                {/* Card header */}
                <div className="px-8 pt-8 pb-6 border-b border-slate-100">
                  <h2 className="text-2xl font-black text-slate-900">Apply for Your Branded Page</h2>
                  <p className="text-slate-500 text-sm mt-1">Takes about 3 minutes. We review every application personally.</p>
                </div>

                <form onSubmit={submit} className="p-8 space-y-7">

                  {/* ── Row: Name + Handle ────────────────────── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Broker / Agent Name <span className="text-red-500">*</span>
                      </label>
                      <input type="text" value={form.brokerName}
                        onChange={(e) => handle("brokerName", e.target.value)}
                        placeholder="Jane Smith Real Estate"
                        required
                        className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900 text-base transition-shadow hover:shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Contact Email <span className="text-red-500">*</span>
                      </label>
                      <input type="email" value={form.contactEmail}
                        onChange={(e) => handle("contactEmail", e.target.value)}
                        placeholder="jane@smithrealty.com" required
                        className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900 text-base transition-shadow hover:shadow-sm" />
                    </div>
                  </div>

                  {/* ── Handle / subdomain ──────────────────────── */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Your Short Handle <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-shadow hover:shadow-sm">
                      <span className="px-4 py-3.5 bg-slate-50 text-slate-400 text-sm font-medium border-r border-slate-200 whitespace-nowrap shrink-0">
                        maintainhome.ai/
                      </span>
                      <input type="text" value={form.subdomain}
                        onChange={(e) => handle("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        placeholder="walkerrealty" required
                        className="flex-1 px-4 py-3.5 text-slate-900 text-base focus:outline-none" />
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">Letters, numbers, and hyphens only. This is the URL your clients will visit.</p>
                  </div>

                  {/* ── Logo upload ─────────────────────────────── */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Logo <span className="text-red-500">*</span>{" "}
                      <span className="text-slate-400 font-normal text-xs">(PNG, SVG, WebP — max 2MB)</span>
                    </label>

                    {!logoFile ? (
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        onClick={() => logoInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-200 rounded-xl px-6 py-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/3 transition-all"
                      >
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
                            <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{logoFile.name}</p>
                          <p className="text-xs text-slate-400">{(logoFile.size / 1024).toFixed(0)} KB</p>
                          {logoUploading && <p className="text-xs text-primary flex items-center gap-1 mt-1"><Loader2 className="w-3 h-3 animate-spin" />Uploading…</p>}
                          {!logoUploading && form.logoUrl && <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><CheckCircle2 className="w-3 h-3" />Uploaded successfully</p>}
                          {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
                        </div>
                        <button type="button" onClick={clearLogo} className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoSelect(f); }} />

                    {logoError && !logoFile && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />{logoError}
                      </p>
                    )}

                    <div className="mt-3">
                      <label className="block text-xs text-slate-400 mb-1.5">Or paste a public logo URL:</label>
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <input type="url" value={logoFile ? "" : form.logoUrl}
                          onChange={(e) => { clearLogo(); handle("logoUrl", e.target.value); }}
                          placeholder="https://yoursite.com/logo.png"
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm text-slate-900 transition-shadow hover:shadow-sm" />
                      </div>
                    </div>
                  </div>

                  {/* ── Agent photo ─────────────────────────────── */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      <Camera className="w-4 h-4 inline mr-1.5 text-slate-400" />
                      Agent Headshot <span className="text-slate-400 font-normal text-xs">(optional — max 2MB)</span>
                    </label>
                    <p className="text-xs text-slate-400 mb-3">Shown next to your logo on your invite page — adds a personal, trusted touch.</p>

                    {!photoFile ? (
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        onClick={() => photoInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-200 rounded-xl px-6 py-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/3 transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                          <Camera className="w-4 h-4 text-slate-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-700">Click to upload your headshot</p>
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
                          {!photoUploading && form.agentPhotoUrl && <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><CheckCircle2 className="w-3 h-3" />Uploaded</p>}
                          {photoError && <p className="text-xs text-red-500 mt-1">{photoError}</p>}
                        </div>
                        <button type="button" onClick={clearPhoto} className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }} />
                  </div>

                  {/* ── Phone number ─────────────────────────────── */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1.5 text-slate-400" />
                      Phone Number <span className="text-slate-400 font-normal text-xs">(optional)</span>
                    </label>
                    <input type="tel" value={form.phoneNumber}
                      onChange={(e) => handle("phoneNumber", e.target.value)}
                      placeholder="(555) 867-5309"
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900 text-base transition-shadow hover:shadow-sm" />
                    <p className="text-xs text-slate-400 mt-1.5">Shown next to your logo so clients can reach you directly.</p>
                  </div>

                  {/* ── Tagline ─────────────────────────────────── */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Custom Tagline <span className="text-red-500">*</span>
                    </label>
                    <input type="text" value={form.tagline}
                      onChange={(e) => handle("tagline", e.target.value)}
                      placeholder="Own Your Home With Confidence – Smith Realty"
                      maxLength={120} required
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900 text-base transition-shadow hover:shadow-sm" />
                    <p className="text-xs text-slate-400 mt-1.5">Shown below your logo on your branded invite page.</p>
                  </div>

                  {/* ── Welcome message ──────────────────────────── */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Welcome Message <span className="text-red-500">*</span>
                    </label>
                    <textarea value={form.welcomeMessage}
                      onChange={(e) => handle("welcomeMessage", e.target.value)}
                      placeholder="Welcome! I set up this home care tool to help you protect your investment and stay ahead of maintenance. Let's build your personalized plan together."
                      rows={4} maxLength={400} required
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900 text-base resize-none transition-shadow hover:shadow-sm" />
                    <p className="text-xs text-slate-400 mt-1.5">Shown on your invite page — make it personal and warm.</p>
                  </div>

                  {/* ── Team leader checkbox ─────────────────────── */}
                  <div className="px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative mt-0.5 shrink-0">
                        <input type="checkbox" checked={form.isTeamLeader}
                          onChange={(e) => handle("isTeamLeader", e.target.checked)}
                          className="sr-only peer" />
                        <div className="w-5 h-5 rounded border-2 border-slate-300 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                          {form.isTeamLeader && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <p className="text-sm font-bold text-slate-700">This is for a Team Leader</p>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                          Multiple agents share this branding. Each member has private home data under your shared logo.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* ── Error ────────────────────────────────────── */}
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

                  {/* ── Submit ───────────────────────────────────── */}
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
                      : <>Submit Application <ArrowRight className="w-5 h-5" /></>}
                  </motion.button>

                  {/* Mobile: preview toggle */}
                  <button type="button" onClick={() => setShowPreview(v => !v)}
                    className="lg:hidden w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                    <Eye className="w-4 h-4" />
                    {showPreview ? "Hide Preview" : "Preview Your Branded Page"}
                  </button>

                  {/* Mobile preview */}
                  <AnimatePresence>
                    {showPreview && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="lg:hidden overflow-hidden"
                      >
                        <LivePreview
                          brokerName={form.brokerName} tagline={form.tagline}
                          welcomeMessage={form.welcomeMessage} logoPreview={logoPreview}
                          logoUrl={form.logoUrl} photoPreview={photoPreview}
                          phoneNumber={form.phoneNumber} subdomain={form.subdomain}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p className="text-center text-xs text-slate-400">
                    We review every application and respond within one business day.{" "}
                    <a href="mailto:support@maintainhome.ai" className="text-primary hover:underline">Questions?</a>
                  </p>
                </form>
              </div>
            </motion.div>

            {/* ── Live Preview (desktop sticky) ─────────────────── */}
            <motion.div
              className="hidden lg:block w-80 xl:w-96 shrink-0 sticky top-8"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" style={{ color: ACCENT }} />
                <span className="text-sm font-bold text-white/70">Live Preview</span>
                <span className="text-xs text-white/30">— updates as you type</span>
              </div>
              <LivePreview
                brokerName={form.brokerName} tagline={form.tagline}
                welcomeMessage={form.welcomeMessage} logoPreview={logoPreview}
                logoUrl={form.logoUrl} photoPreview={photoPreview}
                phoneNumber={form.phoneNumber} subdomain={form.subdomain}
              />

              {/* Tips card */}
              <div className="mt-4 px-4 py-4 rounded-2xl"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p className="text-xs font-bold text-white/60 mb-2">💡 Tips for best results</p>
                <ul className="space-y-1.5 text-xs text-white/40 leading-relaxed">
                  <li>• Use a transparent PNG logo for a clean look</li>
                  <li>• A warm welcome message converts better than a formal one</li>
                  <li>• Your tagline is the first thing clients read — make it memorable</li>
                  <li>• A headshot builds trust immediately</li>
                </ul>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
