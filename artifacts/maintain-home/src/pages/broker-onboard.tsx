import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Building2, User, CheckCircle2, AlertCircle, Loader2,
  ChevronRight, Palette, Upload, X, ImageIcon, Users,
  Gift, CreditCard,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

const DEFAULT_PRIMARY = "#1f9e6e";
const DEFAULT_SECONDARY = "#1e293b";

export default function BrokerOnboard() {
  const [form, setForm] = useState({
    subdomain: "",
    brokerName: "",
    logoUrl: "",
    primaryColor: DEFAULT_PRIMARY,
    secondaryColor: DEFAULT_SECONDARY,
    tagline: "",
    welcomeMessage: "",
    contactEmail: "",
    type: "individual_agent" as "individual_agent" | "team_leader",
    monetizationModel: "private_label" as "private_label" | "closing_gift",
    giftDuration: "1year" as "1year" | "3years",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handle(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
  }

  const handleLogoSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setLogoError("Please select an image file (PNG, JPG, SVG, WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Logo must be under 2MB.");
      return;
    }
    setLogoError(null);
    setLogoFile(file);
    const preview = URL.createObjectURL(file);
    setLogoPreview(preview);

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch(`${API_BASE}/api/logo-upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setLogoError(data.error ?? "Upload failed. You can paste a URL instead.");
        setForm((f) => ({ ...f, logoUrl: "" }));
      } else {
        setForm((f) => ({ ...f, logoUrl: data.logoUrl }));
      }
    } catch {
      setLogoError("Upload failed. You can paste a URL instead.");
    } finally {
      setLogoUploading(false);
    }
  }, []);

  function clearLogo() {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    setLogoError(null);
    setForm((f) => ({ ...f, logoUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (logoUploading) {
      setError("Please wait for the logo to finish uploading.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/broker-onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Success banner */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 text-white text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black mb-2">Application Submitted!</h1>
            <p className="text-green-100 text-sm">
              We received your request for <strong>{form.subdomain}.maintainhome.ai</strong>
            </p>
          </div>

          {/* Next steps */}
          <div className="p-8 space-y-5">
            <h2 className="font-bold text-slate-900 text-base">What happens next:</h2>
            <div className="space-y-4">
              {[
                {
                  step: "1",
                  title: "Application review (1–2 business days)",
                  desc: `We'll review your submission and send an approval email to ${form.contactEmail}.`,
                },
                {
                  step: "2",
                  title: "Your branded instance goes live",
                  desc: `Your clients can visit ${form.subdomain}.maintainhome.ai and see your logo, colors, and branding immediately.`,
                },
                {
                  step: "3",
                  title: "Access your Broker Dashboard",
                  desc: "Sign in with your contact email to access your broker dashboard, view clients, and share your invite link.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-primary font-black text-xs">{item.step}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-5">
              <a
                href="/"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-colors shadow-sm shadow-primary/20"
              >
                Go to MaintainHome.ai
                <ChevronRight className="w-4 h-4" />
              </a>
              <p className="text-center text-xs text-slate-400 mt-3">
                Questions? Email us at{" "}
                <a href="mailto:support@maintainhome.ai" className="text-primary hover:underline">
                  support@maintainhome.ai
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-semibold mb-5">
              <Building2 className="w-4 h-4" />
              Broker &amp; Team White-Label Program
            </div>
            <h1 className="text-4xl font-black text-white mb-3">
              Launch Your Branded<br />Home Ownership Platform
            </h1>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Give your clients a fully branded AI-powered home ownership experience — your logo, your colors, your name.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Type selector */}
            <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
              <button
                type="button"
                onClick={() => handle("type", "individual_agent")}
                className={`flex items-center gap-3 px-6 py-5 text-left transition-all ${form.type === "individual_agent" ? "bg-primary/5 text-primary" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${form.type === "individual_agent" ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-sm">Individual Agent</p>
                  <p className="text-xs opacity-70">Solo broker branding</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handle("type", "team_leader")}
                className={`flex items-center gap-3 px-6 py-5 text-left transition-all ${form.type === "team_leader" ? "bg-primary/5 text-primary" : "text-slate-500 hover:bg-slate-50"}`}
              >
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
                  <strong>Team Leader mode:</strong> All team members log in under your branded instance and see your logo and colors. Each member has their own private home data, but everyone benefits from your shared branding.
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
                  <input
                    type="text"
                    value={form.brokerName}
                    onChange={(e) => handle("brokerName", e.target.value)}
                    placeholder={form.type === "team_leader" ? "Smith Realty Group" : "Jane Smith Real Estate"}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900"
                  />
                </div>

                {/* Subdomain */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Desired Subdomain <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={form.subdomain}
                      onChange={(e) => handle("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="smith"
                      required
                      className="flex-1 px-4 py-3 rounded-l-xl border border-r-0 border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900"
                    />
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
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => handle("contactEmail", e.target.value)}
                    placeholder="you@smithrealty.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900"
                  />
                </div>

                {/* Logo Upload */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Logo <span className="text-slate-400 font-normal">(PNG, SVG, WebP — max 2MB)</span>
                  </label>

                  {!logoFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-200 rounded-xl px-6 py-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
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
                        {logoUploading && (
                          <p className="text-xs text-primary flex items-center gap-1 mt-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
                          </p>
                        )}
                        {!logoUploading && form.logoUrl && (
                          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-3 h-3" /> Uploaded successfully
                          </p>
                        )}
                        {logoError && (
                          <p className="text-xs text-red-500 mt-1">{logoError}</p>
                        )}
                      </div>
                      <button type="button" onClick={clearLogo} className="shrink-0 text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoSelect(file);
                    }}
                  />

                  {logoError && !logoFile && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {logoError}
                    </p>
                  )}

                  <div className="mt-2.5">
                    <label className="block text-xs text-slate-400 mb-1.5">
                      Or paste a public logo URL:
                    </label>
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <input
                        type="url"
                        value={logoFile ? "" : form.logoUrl}
                        onChange={(e) => { clearLogo(); handle("logoUrl", e.target.value); }}
                        placeholder="https://yoursite.com/logo.png"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Color pickers */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    <Palette className="w-4 h-4 inline mr-1.5 text-slate-400" />
                    Brand Colors
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-500 mb-1.5 block">Primary Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={form.primaryColor}
                          onChange={(e) => handle("primaryColor", e.target.value)}
                          className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={form.primaryColor}
                          onChange={(e) => handle("primaryColor", e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm font-mono text-slate-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1.5 block">Secondary Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={form.secondaryColor}
                          onChange={(e) => handle("secondaryColor", e.target.value)}
                          className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={form.secondaryColor}
                          onChange={(e) => handle("secondaryColor", e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm font-mono text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 h-6 rounded-lg overflow-hidden flex">
                    <div className="flex-1" style={{ backgroundColor: form.primaryColor }} />
                    <div className="flex-1" style={{ backgroundColor: form.secondaryColor }} />
                  </div>
                </div>

                {/* Tagline */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Custom Tagline <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.tagline}
                    onChange={(e) => handle("tagline", e.target.value)}
                    placeholder="Powered by Smith Realty – We help you own your home better"
                    maxLength={120}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900"
                  />
                  <p className="text-xs text-slate-400 mt-1">Shown below the headline on your branded homepage.</p>
                </div>

                {/* Welcome Message */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Client Welcome Message <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={form.welcomeMessage}
                    onChange={(e) => handle("welcomeMessage", e.target.value)}
                    placeholder="Welcome! I'm here to help you navigate home ownership with confidence. Let's build your personalized home care plan."
                    rows={3}
                    maxLength={400}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900 resize-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">Shown as a banner the first time a client signs in under your brand.</p>
                </div>

                {/* Monetization Model */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    How do you want to offer MaintainHome to your clients?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, monetizationModel: "private_label" }))}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        form.monetizationModel === "private_label"
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${form.monetizationModel === "private_label" ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">Private Label</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Clients pay the monthly subscription themselves under your brand</p>
                      </div>
                      <div className={`ml-auto shrink-0 w-4 h-4 rounded-full border-2 mt-1 ${form.monetizationModel === "private_label" ? "border-primary bg-primary" : "border-slate-300"}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, monetizationModel: "closing_gift" }))}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        form.monetizationModel === "closing_gift"
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${form.monetizationModel === "closing_gift" ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">Closing Gift</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Prepay for 1 or 3 years and gift it to clients at closing</p>
                      </div>
                      <div className={`ml-auto shrink-0 w-4 h-4 rounded-full border-2 mt-1 ${form.monetizationModel === "closing_gift" ? "border-primary bg-primary" : "border-slate-300"}`} />
                    </button>
                  </div>

                  {form.monetizationModel === "closing_gift" && (
                    <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                      <label className="block text-sm font-semibold text-amber-900 mb-2">
                        <Gift className="w-3.5 h-3.5 inline mr-1.5" />
                        Gift Duration
                      </label>
                      <div className="flex gap-3">
                        {(["1year", "3years"] as const).map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, giftDuration: dur }))}
                            className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-bold transition-all ${
                              form.giftDuration === dur
                                ? "border-amber-500 bg-amber-500 text-white"
                                : "border-amber-300 text-amber-700 hover:border-amber-400"
                            }`}
                          >
                            {dur === "1year" ? "1 Year" : "3 Years"}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-amber-700 mt-2">
                        Our team will contact you with bulk pricing details after your application is approved.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || logoUploading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-base transition-all disabled:opacity-60 shadow-lg shadow-primary/25"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Submit Application
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-400">
                By submitting you agree to our Partner Terms of Service. Applications are reviewed within 1–2 business days.
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
