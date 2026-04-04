import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Building2, User, CheckCircle2, AlertCircle, Loader2,
  ChevronRight, Upload, X, ImageIcon, Users,
  Gift, CreditCard, Phone, Camera,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

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
    type: "individual_agent" as "individual_agent" | "team_leader",
    monetizationModel: "private_label" as "private_label" | "closing_gift",
    giftDuration: "1year" as "1year" | "3years",
  });

  /* Logo upload state */
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  /* Agent photo upload state */
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handle(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
  }

  /* ── Logo upload ─────────────────────────────────────────────── */
  const handleLogoSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { setLogoError("Please select an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setLogoError("Logo must be under 2MB."); return; }
    setLogoError(null);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
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
    setLogoPreview(null);
    setLogoError(null);
    setForm((f) => ({ ...f, logoUrl: "" }));
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  /* ── Agent photo upload ──────────────────────────────────────── */
  const handlePhotoSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { setPhotoError("Please select an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setPhotoError("Photo must be under 2MB."); return; }
    setPhotoError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
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
    setPhotoPreview(null);
    setPhotoError(null);
    setForm((f) => ({ ...f, agentPhotoUrl: "" }));
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  /* ── Submit ──────────────────────────────────────────────────── */
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (logoUploading || photoUploading) { setError("Please wait for uploads to finish."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/broker-onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong. Please try again.");
      else setSuccess(true);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  /* ── Success page ────────────────────────────────────────────── */
  if (success) {
    const monetizationDisplay =
      form.monetizationModel === "closing_gift"
        ? `Closing Gift · ${form.giftDuration === "3years" ? "3 Years" : "1 Year"}`
        : "Private Label";

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 text-white text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black mb-1">Application Submitted!</h1>
            <p className="text-green-100 text-sm mb-3">
              We received your request for <strong>{form.subdomain}.maintainhome.ai</strong>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
                {form.type === "team_leader" ? "🏢 Team Leader" : "👤 Individual Agent"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
                {form.monetizationModel === "closing_gift" ? "🎁" : "💳"} {monetizationDisplay}
              </span>
            </div>
          </div>

          <div className="p-8 space-y-5">
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-primary/8 border border-primary/20">
              <span className="text-lg shrink-0">⚡</span>
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Your branded instance will be live within 24 hours after approval.</strong>{" "}
                We'll email you the moment it's ready.
              </p>
            </div>

            <h2 className="font-bold text-slate-900 text-base">What happens next:</h2>
            <div className="space-y-4">
              {[
                { step: "1", emoji: "📋", title: "Review (typically same business day)", desc: `We review your submission and send an approval email to ${form.contactEmail}.` },
                { step: "2", emoji: "🚀", title: "Your branded instance goes live", desc: `Within 24 hours of approval, clients can visit maintainhome.ai/${form.subdomain} and see your logo instantly.` },
                { step: "3", emoji: "📊", title: "Access your Partner Dashboard", desc: "Sign in at maintainhome.ai/broker-dashboard to view clients, copy your invite link, and track engagement." },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-base">
                    {item.emoji}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-5 space-y-2">
              <a href="/broker-dashboard"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-colors shadow-sm shadow-primary/20">
                Go to My Broker Dashboard <ChevronRight className="w-4 h-4" />
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

  /* ── Form ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-semibold mb-5">
              <Building2 className="w-4 h-4" />
              Broker &amp; Team White-Label Program
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
              The Ultimate<br />
              <span className="text-primary">Client Retention Tool</span>
            </h1>
            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              <strong className="text-white">Join the Pioneer 300</strong> — Be one of the first top agents to have your own fully branded client retention tool.
              Give every client a powerful AI home ownership app with your logo at closing — turning one-time transactions into lifelong relationships.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Type selector */}
            <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
              <button type="button" onClick={() => handle("type", "individual_agent")}
                className={`flex items-center gap-3 px-6 py-5 text-left transition-all ${form.type === "individual_agent" ? "bg-primary/5 text-primary" : "text-slate-500 hover:bg-slate-50"}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${form.type === "individual_agent" ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-sm">Individual Agent</p>
                  <p className="text-xs opacity-70">Solo broker branding</p>
                </div>
              </button>
              <button type="button" onClick={() => handle("type", "team_leader")}
                className={`flex items-center gap-3 px-6 py-5 text-left transition-all ${form.type === "team_leader" ? "bg-primary/5 text-primary" : "text-slate-500 hover:bg-slate-50"}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${form.type === "team_leader" ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-sm">Team Leader</p>
                  <p className="text-xs opacity-70">Shared team branding</p>
                </div>
              </button>
            </div>

            {form.type === "team_leader" && (
              <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-start gap-2.5">
                <Users className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  <strong>Team Leader mode:</strong> All team members log in under your branded instance and see your logo. Each member has their own private home data, but everyone benefits from your shared branding.
                </p>
              </div>
            )}

            <form onSubmit={submit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* Broker/Team Name */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {form.type === "team_leader" ? "Team Name" : "Broker / Agent Name"} <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={form.brokerName} onChange={(e) => handle("brokerName", e.target.value)}
                    placeholder={form.type === "team_leader" ? "Smith Realty Group" : "Jane Smith Real Estate"}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900" />
                </div>

                {/* Subdomain */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Desired Subdomain <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <input type="text" value={form.subdomain}
                      onChange={(e) => handle("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="smith" required
                      className="flex-1 px-4 py-3 rounded-l-xl border border-r-0 border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900" />
                    <span className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-r-xl text-slate-500 text-sm whitespace-nowrap">
                      .maintainhome.ai
                    </span>
                  </div>
                </div>

                {/* Contact Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Contact Email <span className="text-red-500">*</span>
                  </label>
                  <input type="email" value={form.contactEmail} onChange={(e) => handle("contactEmail", e.target.value)}
                    placeholder="you@smithrealty.com" required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900" />
                </div>

                {/* Logo Upload */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Company / Team Logo <span className="text-red-500">*</span>{" "}
                    <span className="text-slate-400 font-normal">(PNG, SVG, WebP — max 2MB)</span>
                  </label>

                  {!logoFile ? (
                    <div onClick={() => logoInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-200 rounded-xl px-6 py-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">Click to upload your logo</p>
                        <p className="text-xs text-slate-400 mt-1">Recommended: transparent PNG or SVG, min 200×60px</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4">
                      {logoPreview && (
                        <div className="w-20 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
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
                      <button type="button" onClick={clearLogo} className="shrink-0 text-slate-400 hover:text-slate-600">
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

                  <div className="mt-2.5">
                    <label className="block text-xs text-slate-400 mb-1.5">Or paste a public logo URL:</label>
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <input type="url" value={logoFile ? "" : form.logoUrl}
                        onChange={(e) => { clearLogo(); handle("logoUrl", e.target.value); }}
                        placeholder="https://yoursite.com/logo.png"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm text-slate-900" />
                    </div>
                  </div>
                </div>

                {/* Agent Photo (optional) */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    <Camera className="w-4 h-4 inline mr-1.5 text-slate-400" />
                    Agent Headshot <span className="text-slate-400 font-normal">(optional, max 2MB)</span>
                  </label>
                  <p className="text-xs text-slate-400 mb-2.5">Shown alongside your logo on the invite page and in the app header — adds a personal touch.</p>

                  {!photoFile ? (
                    <div onClick={() => photoInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-200 rounded-xl px-6 py-6 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Camera className="w-4 h-4 text-slate-400" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">Click to upload your headshot</p>
                    </div>
                  ) : (
                    <div className="w-full border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4">
                      {photoPreview && (
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-slate-200">
                          <img src={photoPreview} alt="Photo preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{photoFile.name}</p>
                        {photoUploading && <p className="text-xs text-primary flex items-center gap-1 mt-1"><Loader2 className="w-3 h-3 animate-spin" />Uploading…</p>}
                        {!photoUploading && form.agentPhotoUrl && <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><CheckCircle2 className="w-3 h-3" />Uploaded</p>}
                        {photoError && <p className="text-xs text-red-500 mt-1">{photoError}</p>}
                      </div>
                      <button type="button" onClick={clearPhoto} className="shrink-0 text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }} />
                </div>

                {/* Phone Number (optional) */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    <Phone className="w-4 h-4 inline mr-1.5 text-slate-400" />
                    Phone Number <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input type="tel" value={form.phoneNumber} onChange={(e) => handle("phoneNumber", e.target.value)}
                    placeholder="(555) 867-5309"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900" />
                  <p className="text-xs text-slate-400 mt-1">Displayed next to your logo on invite pages.</p>
                </div>

                {/* Tagline */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Custom Tagline <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input type="text" value={form.tagline} onChange={(e) => handle("tagline", e.target.value)}
                    placeholder="Own Your Home With Confidence – Smith Realty Group"
                    maxLength={120}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900" />
                  <p className="text-xs text-slate-400 mt-1">Shown below your logo on the invite page.</p>
                </div>

                {/* Welcome Message */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Client Welcome Message <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea value={form.welcomeMessage} onChange={(e) => handle("welcomeMessage", e.target.value)}
                    placeholder="Welcome! I'm here to help you navigate home ownership with confidence. Let's build your personalized home care plan."
                    rows={3} maxLength={400}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900 resize-none" />
                  <p className="text-xs text-slate-400 mt-1">Shown on the invite page your clients land on.</p>
                </div>

                {/* Monetization Model */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Offer Model</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => handle("monetizationModel", "private_label")}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${form.monetizationModel === "private_label" ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${form.monetizationModel === "private_label" ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${form.monetizationModel === "private_label" ? "text-primary" : "text-slate-700"}`}>Private Label</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Clients see your brand. They manage their own subscription.</p>
                      </div>
                    </button>
                    <button type="button" onClick={() => handle("monetizationModel", "closing_gift")}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${form.monetizationModel === "closing_gift" ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${form.monetizationModel === "closing_gift" ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${form.monetizationModel === "closing_gift" ? "text-primary" : "text-slate-700"}`}>Closing Gift</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">You gift clients complimentary access. A memorable, lasting gesture.</p>
                      </div>
                    </button>
                  </div>

                  {form.monetizationModel === "closing_gift" && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {(["1year", "3years"] as const).map((d) => (
                        <button key={d} type="button" onClick={() => handle("giftDuration", d)}
                          className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${form.giftDuration === d ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                          {d === "1year" ? "1 Year Gift" : "3 Year Gift"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading || logoUploading || photoUploading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-white font-extrabold text-base transition-all disabled:opacity-60 shadow-lg shadow-primary/25">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Submitting…</> : <>Submit Application<ChevronRight className="w-5 h-5" /></>}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
