import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Loader2, Users, Check, AlertTriangle, Upload, Camera, Building2, ArrowRight,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const BASE = import.meta.env.BASE_URL;

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return {}; }
}

interface InviteInfo {
  invite: {
    id: number;
    displayName: string;
    email: string;
    teamSubdomain: string;
    status: string;
  };
  team: {
    brokerName: string;
    logoUrl: string | null;
    tagline: string | null;
    subdomain: string;
  };
}

export default function TeamJoin() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [headshotUrl, setHeadshotUrl] = useState("");

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [debugLink, setDebugLink] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) { setLoadError("Missing invite token."); setLoading(false); return; }
    fetch(`${API_BASE}/api/broker/team/invite-info?token=${encodeURIComponent(token)}`)
      .then(safeJson)
      .then((data) => {
        if (data.error) { setLoadError(data.error); return; }
        setInfo(data);
        setDisplayName(data.invite.displayName ?? "");
      })
      .catch(() => setLoadError("Network error. Please try again."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleHeadshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setFormError(null);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch(`${API_BASE}/api/photo-upload`, { method: "POST", body: fd, credentials: "include" });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setHeadshotUrl(data.photoUrl);
    } catch (err: any) {
      setFormError(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) { setFormError("Your name is required."); return; }
    setSubmitting(true); setFormError(null);
    try {
      const res = await fetch(`${API_BASE}/api/broker/team/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, displayName: displayName.trim(), phone: phone.trim(), headshotUrl }),
      });
      const data = await safeJson(res);
      if (!res.ok) { setFormError(data.error ?? "Failed to join team. Please try again."); return; }
      setDone(true);
      if (data.debugLink) setDebugLink(data.debugLink);
    } catch { setFormError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-black text-slate-900 mb-3">Invalid Invite Link</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">{loadError}</p>
          <a href="/" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors">
            Go to MaintainHome.ai
          </a>
        </div>
      </div>
    );
  }

  if (!info) return null;

  const accent = "#1f9e6e";

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center"
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: accent + "18" }}>
            <Check className="w-8 h-8" style={{ color: accent }} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-3">You're almost in!</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            We sent a sign-in link to <strong className="text-slate-700">{info.invite.email}</strong>.
            Click the link in your email to activate your team account and access the dashboard.
          </p>
          {debugLink && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-left">
              <p className="text-xs font-bold text-amber-700 mb-1">Dev Mode — Magic Link:</p>
              <a href={debugLink} className="text-xs text-amber-600 break-all hover:underline">{debugLink}</a>
            </div>
          )}
          <p className="text-xs text-slate-400">
            Team: <strong className="text-slate-600">{info.team.brokerName}</strong>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-6">

        {/* Header branding */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            {info.team.logoUrl ? (
              <img src={info.team.logoUrl} alt={info.team.brokerName} className="h-10 max-w-[140px] object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <img src={`${BASE}images/logo-icon.png`} alt="MaintainHome.ai" className="w-8 h-8 object-contain" />
                <span className="text-white font-black text-lg">{info.team.brokerName}</span>
              </div>
            )}
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: accent + "30", color: accent }}>
            <Users className="w-3.5 h-3.5" />Team Member Invitation
          </div>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-2xl p-8"
        >
          <h1 className="text-2xl font-black text-slate-900 mb-1">
            Join {info.team.brokerName}
          </h1>
          {info.team.tagline && (
            <p className="text-sm text-slate-400 italic mb-1">"{info.team.tagline}"</p>
          )}
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            You've been invited to join the team on{" "}
            <strong className="text-slate-700">MaintainHome.ai</strong>.
            Set up your agent profile below, then check your email for the sign-in link.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Headshot */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Your Headshot (optional)
              </label>
              <div className="flex items-center gap-4">
                {headshotUrl ? (
                  <img src={headshotUrl} alt="Headshot"
                    className="w-14 h-14 rounded-full object-cover border border-slate-200 shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Camera className="w-6 h-6 text-slate-400" />
                  </div>
                )}
                <div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleHeadshotUpload} />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploading ? "Uploading…" : "Upload Photo"}
                  </button>
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="displayName" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Your Name *
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Smith"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Phone (optional)
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Sign-in email (read-only) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Sign-in Email
              </label>
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-sm text-slate-500 font-mono">{info.invite.email}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">We'll send a magic sign-in link to this address.</p>
            </div>

            {formError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-extrabold text-base transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-50 disabled:scale-100"
              style={{
                backgroundColor: accent,
                boxShadow: `0 6px 28px ${accent}55`,
              }}
            >
              {submitting
                ? <><Loader2 className="w-5 h-5 animate-spin" />Sending link…</>
                : <><ArrowRight className="w-5 h-5" />Join Team & Activate</>}
            </button>
          </form>
        </motion.div>

        <p className="text-center text-xs text-slate-500">
          Powered by{" "}
          <a href="https://maintainhome.ai" className="font-semibold text-slate-400 hover:text-white transition-colors">
            MaintainHome.ai
          </a>
        </p>
      </div>
    </div>
  );
}
