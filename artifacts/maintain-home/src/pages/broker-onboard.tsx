import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Building2, CheckCircle2, AlertCircle, Loader2,
  ChevronRight, Upload, X, ImageIcon, Phone, Camera,
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
    isTeamLeader: false,
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

  function handle<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
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

  /* ── Success page ────────────────────────────────────────────── */
  if (success) {
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
              We received your Pioneer Agent request for{" "}
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
                <strong className="text-slate-900">Your branded page will be live within 24 hours after approval.</strong>{" "}
                We'll email you the moment it's ready.
              </p>
            </div>

            <h2 className="font-bold text-slate-900 text-base">What happens next:</h2>
            <div className="space-y-4">
              {[
                { emoji: "📋", title: "Review (typically same business day)", desc: `We review your submission and send an approval email to ${form.contactEmail}.` },
                { emoji: "🚀", title: "Your branded page goes live", desc: `Within 24 hours, clients can visit maintainhome.ai/${form.subdomain} and see your logo and welcome message instantly.` },
                { emoji: "📊", title: "Access your Partner Dashboard", desc: "Sign in at maintainhome.ai/broker-dashboard to copy your invite link, view client activity, and track engagement." },
              ].map((item) => (
                <div key={item.emoji} className="flex gap-3">
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

  /* ── Form ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-semibold mb-5">
              <Building2 className="w-4 h-4" />
              Pioneer Agent Program
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
              The Ultimate<br />
              <span className="text-primary">Client Retention Tool</span>
            </h1>
            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              <strong className="text-white">Join the Pioneer 300</strong> — Get your own branded home maintenance app at
              <strong className="text-white"> maintainhome.ai/[yourname]</strong> that you can send to every client at closing.
              Turn one-time transactions into lifelong relationships.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <form onSubmit={submit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* Broker / Agent Name */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Broker / Agent Name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={form.brokerName} onChange={(e) => handle("brokerName", e.target.value)}
                    placeholder="Jane Smith Real Estate"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900" />
                </div>

                {/* Handle / subdomain */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Your Short Handle <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-3 bg-slate-50 border border-r-0 border-slate-200 rounded-l-xl text-slate-400 text-sm whitespace-nowrap">
                      maintainhome.ai/
                    </span>
                    <input type="text" value={form.subdomain}
                      onChange={(e) => handle("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="walkerrealty" required
                      className="flex-1 px-4 py-3 rounded-r-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Letters, numbers, and hyphens only. Min 3 characters.</p>
                </div>

                {/* Contact Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Contact Email <span className="text-red-500">*</span>
                  </label>
                  <input type="email" value={form.contactEmail} onChange={(e) => handle("contactEmail", e.target.value)}
                    placeholder="jane@smithrealty.com" required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900" />
                  <p className="text-xs text-slate-400 mt-1">We'll send your approval notification here.</p>
                </div>

                {/* Logo Upload */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Logo <span className="text-red-500">*</span>{" "}
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
                    Agent Headshot <span className="text-slate-400 font-normal">(optional — max 2MB)</span>
                  </label>
                  <p className="text-xs text-slate-400 mb-2.5">Shown next to your logo on your invite page — gives clients a personal, trusted face to connect with.</p>

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
                  <p className="text-xs text-slate-400 mt-1">Shown next to your logo so clients can reach you directly.</p>
                </div>

                {/* Tagline */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Custom Tagline <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={form.tagline} onChange={(e) => handle("tagline", e.target.value)}
                    placeholder="Own Your Home With Confidence – Smith Realty Group"
                    maxLength={120}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900" />
                  <p className="text-xs text-slate-400 mt-1">Shown prominently below your logo on your branded page.</p>
                </div>

                {/* Welcome Message */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Welcome Message <span className="text-red-500">*</span>
                  </label>
                  <textarea value={form.welcomeMessage} onChange={(e) => handle("welcomeMessage", e.target.value)}
                    placeholder="Welcome! I set up this home care tool to help you protect your investment and stay ahead of maintenance. Let's build your personalized plan together."
                    rows={4} maxLength={400}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900 resize-none" />
                  <p className="text-xs text-slate-400 mt-1">Shown on your branded invite page — make it personal and warm.</p>
                </div>

                {/* Team Leader checkbox */}
                <div className="sm:col-span-2">
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
                      <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                        This is for a Team Leader
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        Multiple agents share this branding. Each member has private home data, but everyone benefits from the shared logo and experience.
                      </p>
                    </div>
                  </label>
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

              <p className="text-center text-xs text-slate-400">
                We review every application and respond within one business day. Questions?{" "}
                <a href="mailto:support@maintainhome.ai" className="text-primary hover:underline">support@maintainhome.ai</a>
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
