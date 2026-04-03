import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, User, CheckCircle2, AlertCircle, Loader2, ChevronRight, Palette } from "lucide-react";

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
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handle(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-3">Application Submitted!</h1>
          <p className="text-slate-600 leading-relaxed mb-2">
            We'll review your white-label request and get back to you at{" "}
            <strong>{form.contactEmail}</strong> within 1–2 business days.
          </p>
          <p className="text-slate-500 text-sm">
            Once approved, your branded instance will be live at{" "}
            <strong>{form.subdomain}.maintainhome.ai</strong>.
          </p>
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
            <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
              <button
                type="button"
                onClick={() => handle("type", "individual_agent")}
                className={`flex items-center gap-3 px-6 py-5 text-left transition-all ${form.type === "individual_agent" ? "bg-primary/5 text-primary" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${form.type === "individual_agent" ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
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
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${form.type === "team_leader" ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-sm">Team Leader</p>
                  <p className="text-xs opacity-70">Shared team branding</p>
                </div>
              </button>
            </div>

            <form onSubmit={submit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Broker / Team Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.brokerName}
                    onChange={(e) => handle("brokerName", e.target.value)}
                    placeholder="Smith Realty Group"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900"
                  />
                </div>

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

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Logo URL <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={form.logoUrl}
                    onChange={(e) => handle("logoUrl", e.target.value)}
                    placeholder="https://yoursite.com/logo.png"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900"
                  />
                  <p className="text-xs text-slate-400 mt-1">Paste a public URL to your logo image. We recommend SVG or PNG with transparent background.</p>
                </div>

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
                  <div className="mt-3 h-8 rounded-xl overflow-hidden flex">
                    <div className="flex-1" style={{ backgroundColor: form.primaryColor }} />
                    <div className="flex-1" style={{ backgroundColor: form.secondaryColor }} />
                  </div>
                </div>

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
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Welcome Message for Clients <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={form.welcomeMessage}
                    onChange={(e) => handle("welcomeMessage", e.target.value)}
                    placeholder="Welcome! I'm here to help you navigate home ownership with confidence. Let's build your personalized home care plan."
                    rows={3}
                    maxLength={400}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900 resize-none"
                  />
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
                disabled={loading}
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
