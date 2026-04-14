import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Users, Link2, Copy, Check, User, Loader2,
  ExternalLink, BarChart2, Zap, RefreshCw, LogOut,
  ShieldCheck, Gift, CreditCard, Calendar, TrendingUp,
  AlertTriangle, AlertCircle, ArrowUpRight, Star, Phone, Camera,
  Pencil, X, Upload, CheckCircle2, HomeIcon, PlusCircle,
  FileText, Trash2, UserPlus, Key, Clock, Wrench, Plus, ChevronDown, ChevronUp, Mail, Globe,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useLocation } from "wouter";
import { NewConstructionSection, NewConstructionCheckbox, emptyNewConstruction, type NewConstructionData } from "@/components/NewConstructionSection";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const BASE = import.meta.env.BASE_URL;

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("[broker-dashboard] Non-JSON response:", res.status, text.slice(0, 200));
    throw new Error(`Server error (${res.status}). Please try again.`);
  }
}

const MH_PRIMARY = "#1f9e6e";

/* ─── Types ───────────────────────────────────────────────────────── */
interface BrokerConfig {
  id: number;
  subdomain: string;
  brokerName: string;
  logoUrl: string | null;
  agentPhotoUrl: string | null;
  phoneNumber: string | null;
  tagline: string | null;
  welcomeMessage: string | null;
  contactEmail: string;
  type: "individual_agent" | "team_leader";
  monetizationModel: "private_label" | "closing_gift" | null;
  giftDuration: "1year" | "3years" | null;
  status: string;
  createdAt: string;
}

interface Client {
  id: number;
  email: string;
  name: string | null;
  subscriptionStatus: string;
  createdAt: string;
  lastActiveAt: string | null;
  hasCalendar: boolean;
  logCount: number;
  activityScore: number;
  imminentAlertCount: number;
  imminentAlerts: string[];
  isPrecreated?: boolean;
  isActivated?: boolean;
  activationToken?: string | null;
  assignedMemberId?: number | null;
}

interface TeamMember {
  id: number;
  teamSubdomain: string;
  memberUserId: number | null;
  displayName: string;
  email: string;
  headshotUrl: string | null;
  phone: string | null;
  status: "invited" | "active";
  inviteToken: string;
  invitedAt: string;
  activatedAt: string | null;
}

interface TeamMembership {
  id: number;
  teamSubdomain: string;
  memberUserId: number | null;
  displayName: string;
  email: string;
  headshotUrl: string | null;
  phone: string | null;
  status: "invited" | "active";
  inviteToken: string;
}

/* ─── Helpers ─────────────────────────────────────────────────────── */
function isPro(status: string) {
  return ["pro_monthly", "pro_annual", "promo_pro"].includes(status);
}

function relativeDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function giftExpiry(createdAt: string, giftDuration: "1year" | "3years") {
  const d = new Date(createdAt);
  d.setFullYear(d.getFullYear() + (giftDuration === "3years" ? 3 : 1));
  const msLeft = d.getTime() - Date.now();
  if (msLeft < 0) return { label: "Expired", expired: true };
  const daysLeft = Math.floor(msLeft / 86400000);
  if (daysLeft < 30) return { label: `${daysLeft}d left`, expired: false };
  return { label: `${Math.round(daysLeft / 30)}mo left`, expired: false };
}

function scoreColor(score: number) {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#94a3b8";
}

/* ─── Score ring gauge ───────────────────────────────────────────── */
function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(score / 100, 1)) * circ;
  return (
    <div className="relative w-[52px] h-[52px] shrink-0">
      <svg width="52" height="52" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="26" cy="26" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

/* ─── Score bar ──────────────────────────────────────────────────── */
function ScoreBar({ score }: { score: number }) {
  const c = scoreColor(score);
  const isLow = score < 60;
  return (
    <div className="flex items-center gap-2">
      {isLow && (
        <span title="Low health score — client may need attention">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        </span>
      )}
      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: c }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-5" style={{ color: c }}>{score}</span>
    </div>
  );
}

/* ─── Stat card ──────────────────────────────────────────────────── */
function StatCard({ icon, label, value, iconBg, iconColor, children }: {
  icon: React.ReactNode; label: string; value?: string | number;
  iconBg: string; iconColor?: string; children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconBg }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div className="min-w-0">
        {value !== undefined && (
          <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
        )}
        {children}
        <p className="text-xs text-slate-400 font-medium mt-1">{label}</p>
      </div>
    </div>
  );
}

/* ─── Copy button ─────────────────────────────────────────────────── */
function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} title={`Copy ${label}`}
      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0">
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

/* ─── Team Members Panel (Team Leader only) ─────────────────────── */
function TeamMembersPanel({
  accent, teamMembers, onRefresh, config,
}: {
  accent: string;
  teamMembers: TeamMember[];
  onRefresh: () => void;
  config: BrokerConfig;
}) {
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [open, setOpen] = useState(true);

  async function handleInvite() {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteError("Name and email are required"); return;
    }
    setInviting(true); setInviteError(null); setInviteLink(null);
    try {
      const res = await fetch(`${API_BASE}/api/broker/team/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName: inviteName.trim(), email: inviteEmail.trim() }),
      });
      const data = await safeJson(res);
      if (!res.ok) { setInviteError(data.error ?? "Failed to create invite"); return; }
      setInviteLink(data.inviteLink);
      setInviteName(""); setInviteEmail("");
      onRefresh();
    } catch { setInviteError("Network error. Please try again."); }
    finally { setInviting(false); }
  }

  async function handleRemoveMember(id: number) {
    if (!confirm("Remove this team member? They will lose access to the team dashboard.")) return;
    setRemovingId(id);
    try {
      await fetch(`${API_BASE}/api/broker/team/members/${id}`, {
        method: "DELETE", credentials: "include",
      });
      onRefresh();
    } catch { alert("Failed to remove member."); }
    finally { setRemovingId(null); }
  }

  function copyLink(link: string, token: string) {
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  }

  function getMemberInviteLink(member: TeamMember) {
    return `${window.location.origin}${import.meta.env.BASE_URL}team-join?token=${member.inviteToken}`;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" style={{ color: accent }} />
          <h2 className="font-bold text-slate-900">Team Members</h2>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">{teamMembers.length}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-6 py-5 space-y-5">
          {/* Invite form */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Invite a New Agent</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Agent Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Agent Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="agent@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
              </div>
            </div>
            {inviteError && (
              <p className="text-xs text-red-500">{inviteError}</p>
            )}
            <button
              onClick={handleInvite}
              disabled={inviting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-all hover:opacity-90"
              style={{ backgroundColor: accent }}>
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Generate Invite Link
            </button>
            {inviteLink && (
              <div className="mt-2 p-3 rounded-xl bg-green-50 border border-green-200">
                <p className="text-xs font-bold text-green-700 mb-2">Invite link created! Share with the agent:</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-800 font-mono break-all flex-1 truncate">{inviteLink}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteLink); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-700 text-white text-xs font-bold hover:bg-green-800 transition-colors shrink-0">
                    <Copy className="w-3 h-3" />Copy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Members list */}
          {teamMembers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No team members yet.</p>
              <p className="text-xs mt-1">Invite an agent above to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teamMembers.map((member) => {
                const memberInviteLink = getMemberInviteLink(member);
                return (
                  <div key={member.id}
                    className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    {member.headshotUrl ? (
                      <img src={member.headshotUrl} alt={member.displayName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-black"
                        style={{ backgroundColor: accent + "20", color: accent }}>
                        {member.displayName[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 truncate">{member.displayName}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          member.status === "active"
                            ? "bg-green-50 text-green-600 border border-green-200"
                            : "bg-amber-50 text-amber-600 border border-amber-200"
                        }`}>
                          {member.status === "active" ? "Active" : "Invited"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{member.email}</p>
                      {member.phone && <p className="text-xs text-slate-400">{member.phone}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {member.status === "invited" && (
                        <button
                          onClick={() => copyLink(memberInviteLink, member.inviteToken)}
                          title="Copy invite link"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                          {copiedToken === member.inviteToken
                            ? <><Check className="w-3 h-3 text-emerald-500" />Copied</>
                            : <><Link2 className="w-3 h-3" />Resend</>}
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingId === member.id}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                        {removingId === member.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Team Member Personal Profile Panel ─────────────────────────── */
function TeamMemberProfilePanel({
  accent, membership, onUpdate,
}: {
  accent: string;
  membership: TeamMembership;
  onUpdate: () => void;
}) {
  const [form, setForm] = useState({
    displayName: membership.displayName,
    phone: membership.phone ?? "",
    headshotUrl: membership.headshotUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleHeadshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch(`${API_BASE}/api/photo-upload`, { method: "POST", body: fd, credentials: "include" });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setForm((f) => ({ ...f, headshotUrl: data.photoUrl }));
    } catch (err: any) {
      setError(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave() {
    setSaving(true); setSuccess(null); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/broker/member/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setSuccess("Profile updated!");
      setTimeout(() => setSuccess(null), 3000);
      onUpdate();
    } catch (err: any) {
      setError(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <User className="w-5 h-5" style={{ color: accent }} />
        <h2 className="font-bold text-slate-900">My Profile</h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">Team Agent</span>
      </div>

      <div className="flex items-center gap-4">
        {form.headshotUrl ? (
          <img src={form.headshotUrl} alt={form.displayName}
            className="w-14 h-14 rounded-full object-cover border border-slate-200 shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <Camera className="w-6 h-6 text-slate-400" />
          </div>
        )}
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleHeadshotUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? "Uploading…" : "Update Headshot"}
          </button>
          <p className="text-[11px] text-slate-400 mt-1">Your personal photo (not the team logo)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Display Name</label>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="(555) 123-4567"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200">
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-all hover:opacity-90"
        style={{ backgroundColor: accent }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        Save Profile
      </button>
    </motion.div>
  );
}

/* ─── Gift Code Purchase Panel ───────────────────────────────────── */
function GiftCodePurchasePanel({ accent }: { accent: string }) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingCodes, setExistingCodes] = useState<{ code: string; redeemedAt: string | null; createdAt: string; redeemerName: string | null; redeemerEmail: string | null }[]>([]);
  const [codesLoaded, setCodesLoaded] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function loadCodes() {
    try {
      const res = await fetch(`${API_BASE}/api/stripe/my-gift-codes`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setExistingCodes(data);
      }
    } catch {}
    setCodesLoaded(true);
  }

  async function handlePurchase() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/stripe/gift-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start checkout.");
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const redeemed = existingCodes.filter((c) => c.redeemedAt).length;
  const available = existingCodes.filter((c) => !c.redeemedAt).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.18 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
    >
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex items-center gap-2 mb-1 flex-1 min-w-[200px]">
          <Gift className="w-5 h-5 shrink-0" style={{ color: accent }} />
          <div>
            <h2 className="font-bold text-slate-900">Gift Codes for Clients</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Give your homeowner clients 1 year of Pro access as a closing gift. Each code is $36.
            </p>
          </div>
        </div>

        {/* Price callout */}
        <div className="flex items-baseline gap-1 shrink-0">
          <span className="text-3xl font-black text-slate-900">$36</span>
          <span className="text-slate-400 text-sm">/code</span>
        </div>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        {/* Qty selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Quantity</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 font-bold text-lg transition-colors"
              disabled={qty <= 1}
            >−</button>
            <span className="w-10 text-center text-lg font-black text-slate-900 tabular-nums">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(50, q + 1))}
              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 font-bold text-lg transition-colors"
              disabled={qty >= 50}
            >+</button>
          </div>
        </div>

        {/* Total */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total</label>
          <div className="h-9 flex items-center px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-black tabular-nums">
            ${(qty * 36).toFixed(2)}
          </div>
        </div>

        {/* Buy button */}
        <button
          onClick={handlePurchase}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 shadow-sm h-9"
          style={{ backgroundColor: accent }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          {loading ? "Redirecting…" : `Buy ${qty} Code${qty > 1 ? "s" : ""}`}
        </button>

        {/* View existing codes toggle */}
        <button
          onClick={() => { setShowCodes((v) => !v); if (!codesLoaded) loadCodes(); }}
          className="h-9 flex items-center gap-1.5 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Gift className="w-4 h-4" />
          My Codes
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-red-600 font-medium">{error}</p>}

      {/* Existing codes panel */}
      {showCodes && (
        <div className="mt-5 pt-5 border-t border-slate-100">
          {!codesLoaded ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : existingCodes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-3">No gift codes purchased yet.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Your Gift Codes</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">{available} available</span>
                {redeemed > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">{redeemed} used</span>}
              </div>
              <div className="grid gap-2 max-h-72 overflow-y-auto pr-1">
                {existingCodes.map((c) => (
                  <div key={c.code} className={`flex items-start justify-between gap-3 px-4 py-3 rounded-xl border ${c.redeemedAt ? "bg-slate-50 border-slate-100" : "bg-white border-slate-200"}`}>
                    <div className="flex-1 min-w-0">
                      <span className={`font-mono font-semibold text-sm tracking-widest block ${c.redeemedAt ? "text-slate-400 line-through" : "text-slate-800"}`}>{c.code}</span>
                      {c.redeemedAt && (
                        <div className="mt-1">
                          <p className="text-xs text-slate-500 font-medium">
                            Redeemed by{" "}
                            <span className="font-semibold text-slate-700">
                              {c.redeemerName || c.redeemerEmail || "a homeowner"}
                            </span>
                          </p>
                          {c.redeemerEmail && c.redeemerName && (
                            <p className="text-xs text-slate-400">{c.redeemerEmail}</p>
                          )}
                          <p className="text-xs text-slate-400">
                            {new Date(c.redeemedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      )}
                    </div>
                    {c.redeemedAt ? (
                      <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold shrink-0 mt-0.5">Used</span>
                    ) : (
                      <button onClick={() => copyCode(c.code)} className="text-slate-400 hover:text-primary transition-colors shrink-0 mt-0.5" title="Copy code">
                        {copiedCode === c.code ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Trusted Service Providers Panel ────────────────────────────── */
const SERVICE_CATEGORIES = [
  "HVAC", "Plumbing", "Electrical", "Roofing", "Landscaping", "Pest Control",
  "Cleaning", "Handyman", "Painting", "Flooring", "Windows & Doors",
  "Appliances", "Pool & Spa", "Foundation & Waterproofing", "Moving & Storage", "Other",
];

interface ServiceProvider {
  id: number;
  brokerSubdomain: string;
  category: string;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProviderFormState {
  category: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  note: string;
}

const emptyProviderForm = (): ProviderFormState => ({
  category: SERVICE_CATEGORIES[0],
  companyName: "",
  contactName: "",
  phone: "",
  email: "",
  website: "",
  note: "",
});

function TrustedServiceProvidersPanel({ accent }: { accent: string }) {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProviderFormState>(emptyProviderForm());
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/broker/providers`, { credentials: "include" });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setProviders(data.providers ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadProviders();
  }, [open, loadProviders]);

  function startAdd() {
    setEditId(null);
    setForm(emptyProviderForm());
    setShowForm(true);
    setError(null);
  }

  function startEdit(p: ServiceProvider) {
    setEditId(p.id);
    setForm({
      category: p.category,
      companyName: p.companyName,
      contactName: p.contactName ?? "",
      phone: p.phone ?? "",
      email: p.email ?? "",
      website: p.website ?? "",
      note: p.note ?? "",
    });
    setShowForm(true);
    setError(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setError(null);
  }

  async function saveProvider() {
    if (!form.companyName.trim()) { setError("Company name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const url = editId ? `${API_BASE}/api/broker/providers/${editId}` : `${API_BASE}/api/broker/providers`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      await loadProviders();
      setShowForm(false);
      setEditId(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteProvider(id: number) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/broker/providers/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const d = await safeJson(res); throw new Error(d.error ?? "Failed to delete"); }
      setProviders(prev => prev.filter(p => p.id !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  const grouped = SERVICE_CATEGORIES.reduce<Record<string, ServiceProvider[]>>((acc, cat) => {
    const list = providers.filter(p => p.category === cat);
    if (list.length) acc[cat] = list;
    return acc;
  }, {});

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.09 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}18` }}>
            <Wrench className="w-5 h-5" style={{ color: accent }} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">My Trusted Service Providers</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Add local vendors your clients can rely on — Maintly will recommend them during AI chats when relevant
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {providers.length > 0 && !open && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: accent }}>{providers.length}</span>
          )}
          {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="px-6 pb-6 border-t border-slate-100 pt-4">

              {/* Info callout */}
              <div className="flex items-start gap-3 p-4 rounded-xl mb-5" style={{ background: `${accent}0d`, border: `1px solid ${accent}30` }}>
                <Wrench className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accent }} />
                <p className="text-xs text-slate-600 leading-relaxed">
                  When one of your clients asks Maintly about a home maintenance task — like finding an HVAC technician or a roofer — Maintly will mention your recommended provider for that category. It's always framed as a helpful suggestion, never a hard sell.
                </p>
              </div>

              {loading && (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Provider list */}
              {!loading && providers.length === 0 && !showForm && (
                <p className="text-sm text-slate-400 text-center py-4">No providers yet. Add your first trusted vendor below.</p>
              )}

              {!loading && Object.keys(grouped).length > 0 && (
                <div className="space-y-3 mb-5">
                  {Object.entries(grouped).map(([cat, list]) => (
                    <div key={cat} className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{cat}</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {list.map(p => (
                          <div key={p.id} className="px-4 py-3 flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-slate-900">{p.companyName}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                {p.contactName && (
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <User className="w-3 h-3" />{p.contactName}
                                  </span>
                                )}
                                {p.phone && (
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Phone className="w-3 h-3" />{p.phone}
                                  </span>
                                )}
                                {p.email && (
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Mail className="w-3 h-3" />{p.email}
                                  </span>
                                )}
                                {p.website && (
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Globe className="w-3 h-3" />{p.website}
                                  </span>
                                )}
                              </div>
                              {p.note && <p className="text-xs text-slate-400 italic mt-1">"{p.note}"</p>}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteProvider(p.id)} disabled={deletingId === p.id}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                {deletingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add/Edit form */}
              {showForm && (
                <div className="border border-slate-200 rounded-xl p-5 mb-5 bg-slate-50/50">
                  <p className="text-sm font-bold text-slate-800 mb-4">{editId ? "Edit Provider" : "Add New Provider"}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
                      <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2" style={{ "--tw-ring-color": accent } as any}>
                        {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Company Name *</label>
                      <input type="text" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                        placeholder="e.g. Sunrise HVAC Co." className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2" style={{ "--tw-ring-color": accent } as any} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Name</label>
                      <input type="text" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                        placeholder="e.g. Mike Johnson" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2" style={{ "--tw-ring-color": accent } as any} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                      <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="e.g. (555) 123-4567" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2" style={{ "--tw-ring-color": accent } as any} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="e.g. mike@sunrisehvac.com" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2" style={{ "--tw-ring-color": accent } as any} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Website</label>
                      <input type="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                        placeholder="e.g. https://sunrisehvac.com" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2" style={{ "--tw-ring-color": accent } as any} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Note <span className="font-normal text-slate-400">(optional — shown to Maintly as context)</span></label>
                      <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                        placeholder='e.g. "Ask for the senior discount" or "Preferred partner — always answers same day"' className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2" style={{ "--tw-ring-color": accent } as any} />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 mt-4">
                    <button onClick={cancelForm} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
                    <button onClick={saveProvider} disabled={saving}
                      className="text-sm font-semibold text-white px-5 py-2 rounded-lg flex items-center gap-2 transition-opacity hover:opacity-90"
                      style={{ background: accent }}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {editId ? "Save Changes" : "Add Provider"}
                    </button>
                  </div>
                </div>
              )}

              {/* Add button */}
              {!showForm && (
                <button onClick={startAdd}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-colors hover:opacity-80"
                  style={{ borderColor: `${accent}50`, color: accent }}>
                  <Plus className="w-4 h-4" />
                  Add Trusted Provider
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Pre-Create Client Panel ────────────────────────────────────── */
interface DocEntry {
  objectPath: string;
  fileName: string;
  contentType: string;
  fileSizeBytes?: number;
  displayName?: string;
}

function PreCreateClientPanel({ accent }: { accent: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [duration, setDuration] = useState<"1year" | "3years">("1year");

  const [form, setForm] = useState({
    clientEmail: "",
    clientName: "",
    fullAddress: "",
    zipCode: "",
    homeType: "single_family",
    yearBuilt: "",
    sqft: "2500_4000",
    roofType: "asphalt",
    waterSource: "municipal",
    sewerSystem: "municipal",
    pestSchedule: "no",
    landscaping: "mostly_grass",
    foundationType: "",
    crawlSpaceSealed: "not_sure",
    allergies: "no",
    allergiesDetails: "",
    bedrooms: "",
    bathrooms: "",
    poolOrHotTub: "no",
    // Maintly-accuracy fields
    grassType: "",
    hvacType: "",
    roofAgeYear: "",
    sidingType: "",
    pastPestIssues: "no",
    pastPestIssuesNotes: "",
  });

  const [docs, setDocs] = useState<DocEntry[]>([]);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [isNewConstruction, setIsNewConstruction] = useState(false);
  const [newConstructionData, setNewConstructionData] = useState<NewConstructionData>(emptyNewConstruction);

  function setField(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocUploading(true);
    try {
      const fd = new FormData();
      fd.append("document", file);
      const res = await fetch(`${API_BASE}/api/broker/precreate-doc-upload`, {
        method: "POST", body: fd, credentials: "include",
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setDocs((prev) => [...prev, data]);
    } catch (err: any) {
      setError(err.message ?? "Document upload failed");
    } finally {
      setDocUploading(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  }

  async function handlePurchase() {
    setError(null);
    if (!form.clientEmail.trim()) { setError("Client email is required"); return; }
    if (!form.zipCode.trim()) { setError("ZIP code is required"); return; }

    const isCrawlSpace = form.foundationType === "crawl_space";
    const derivedFinishedBasement = form.foundationType === "basement_finished" ? "yes" : "no";

    const quizAnswers = {
      zip: form.zipCode.trim(),
      homeAge: form.yearBuilt
        ? (Number(form.yearBuilt) >= new Date().getFullYear() - 10 ? "resale_recent" : "resale_old")
        : "resale_old",
      homeType: form.homeType,
      roofType: form.roofType,
      waterSource: form.waterSource,
      sewerSystem: form.sewerSystem,
      pestSchedule: form.pestSchedule,
      sqft: form.sqft,
      allergies: form.allergies,
      allergiesDetails: form.allergiesDetails,
      crawlSpace: isCrawlSpace ? "yes" : "no",
      crawlSpaceSealed: isCrawlSpace ? form.crawlSpaceSealed : undefined,
      landscaping: form.landscaping,
      yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : undefined,
    };

    const propertyData = {
      fullAddress: form.fullAddress.trim() || null,
      zipCode: form.zipCode.trim(),
      homeType: form.homeType,
      yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : null,
      sqft: form.sqft,
      roofType: form.roofType,
      waterSource: form.waterSource,
      sewerSystem: form.sewerSystem,
      landscaping: form.landscaping,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms || null,
      finishedBasement: derivedFinishedBasement,
      poolOrHotTub: form.poolOrHotTub,
      foundationType: form.foundationType || null,
      crawlSpaceSealed: isCrawlSpace ? form.crawlSpaceSealed : null,
      grassType: form.grassType || null,
      hvacType: form.hvacType || null,
      roofAgeYear: form.roofAgeYear ? Number(form.roofAgeYear) : null,
      sidingType: form.sidingType || null,
      pastPestIssues: form.pastPestIssues || null,
      pastPestIssuesNotes: form.pastPestIssues === "yes" ? (form.pastPestIssuesNotes || null) : null,
    };

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/broker/precreate-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientEmail: form.clientEmail.trim().toLowerCase(),
          clientName: form.clientName.trim() || null,
          propertyData,
          quizAnswers,
          documentPaths: docs,
          duration,
          newConstructionData: isNewConstruction ? newConstructionData : null,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) { setError(data.error ?? "Could not start checkout."); return; }
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const SelectField = ({ label, id, value, onChange, children }: { label: string; id: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent"
        style={{ "--tw-ring-color": accent } as React.CSSProperties}
      >
        {children}
      </select>
    </div>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.19 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
      >
        <div className="flex items-start gap-4 flex-wrap justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-[220px]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: accent + "18" }}>
              <UserPlus className="w-5 h-5" style={{ color: accent }} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Create Client Account (Pre-Paid Gift)</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Pre-build a client's full home dashboard — calendar, documents, and 13 months Pro — ready before they log in.
              </p>
            </div>
          </div>
        </div>

        {/* ── Duration selector ── */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1-Year option */}
          <button
            type="button"
            onClick={() => setDuration("1year")}
            className={`relative flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all ${duration === "1year" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">$36</span>
              <span className="text-slate-400 text-sm">/ 1 year</span>
            </div>
            <p className="text-xs font-semibold" style={{ color: accent }}>13 months Pro · ~$3/mo · 1 month free</p>
            {duration === "1year" && (
              <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center bg-emerald-500 text-white text-[10px] font-black">✓</span>
            )}
          </button>

          {/* 3-Year option */}
          <button
            type="button"
            onClick={() => setDuration("3years")}
            className={`relative flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all ${duration === "3years" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <div className="flex items-center gap-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">$99</span>
                <span className="text-slate-400 text-sm">/ 3 years</span>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500 text-white uppercase tracking-wide">Best Value</span>
            </div>
            <p className="text-xs font-semibold text-blue-600">37 months Pro · ~$33/yr · 1 month free</p>
            {duration === "3years" && (
              <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center bg-blue-500 text-white text-[10px] font-black">✓</span>
            )}
          </button>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98] shadow-sm"
            style={{ backgroundColor: accent }}
          >
            <PlusCircle className="w-4 h-4" />
            Create Client Account · {duration === "3years" ? "$99" : "$36"}
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>AI calendar pre-generated · Documents pre-loaded · Activation link sent by you</span>
          </div>
        </div>
      </motion.div>

      {/* ── Pre-Create Modal ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-3xl z-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: accent + "18" }}>
                    <UserPlus className="w-4 h-4" style={{ color: accent }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Create Client Account</h3>
                    <p className="text-xs text-slate-400">$36 · 13 months Pro · AI calendar included</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-6">

                {/* Client Info */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Client Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                        Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={form.clientEmail}
                        onChange={(e) => setField("clientEmail", e.target.value)}
                        placeholder="client@example.com"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                        style={{ "--tw-ring-color": accent } as React.CSSProperties}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Full Name</label>
                      <input
                        type="text"
                        value={form.clientName}
                        onChange={(e) => setField("clientName", e.target.value)}
                        placeholder="Jane Smith"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                        style={{ "--tw-ring-color": accent } as React.CSSProperties}
                      />
                    </div>
                  </div>
                </div>

                {/* Property Info */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Property Details</p>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Full Address</label>
                    <input
                      type="text"
                      value={form.fullAddress}
                      onChange={(e) => setField("fullAddress", e.target.value)}
                      placeholder="123 Oak Lane, Raleigh, NC"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                      style={{ "--tw-ring-color": accent } as React.CSSProperties}
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                        ZIP Code <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.zipCode}
                        onChange={(e) => setField("zipCode", e.target.value)}
                        placeholder="27612"
                        maxLength={5}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                        style={{ "--tw-ring-color": accent } as React.CSSProperties}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Year Built</label>
                      <input
                        type="number"
                        value={form.yearBuilt}
                        onChange={(e) => setField("yearBuilt", e.target.value)}
                        placeholder="2005"
                        min="1800" max={new Date().getFullYear()}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                        style={{ "--tw-ring-color": accent } as React.CSSProperties}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Bedrooms</label>
                      <input
                        type="number"
                        value={form.bedrooms}
                        onChange={(e) => setField("bedrooms", e.target.value)}
                        placeholder="3"
                        min="1" max="20"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                        style={{ "--tw-ring-color": accent } as React.CSSProperties}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Bathrooms</label>
                      <input
                        type="text"
                        value={form.bathrooms}
                        onChange={(e) => setField("bathrooms", e.target.value)}
                        placeholder="2.5"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                        style={{ "--tw-ring-color": accent } as React.CSSProperties}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <SelectField label="Home Type" id="homeType" value={form.homeType} onChange={(v) => setField("homeType", v)}>
                      <option value="single_family">Single Family</option>
                      <option value="townhome">Townhome</option>
                      <option value="condo">Condo/Apt</option>
                      <option value="other">Other</option>
                    </SelectField>
                    <SelectField label="Square Footage" id="sqft" value={form.sqft} onChange={(v) => setField("sqft", v)}>
                      <option value="under_1500">Under 1,500 sq ft</option>
                      <option value="1500_2500">1,500–2,500 sq ft</option>
                      <option value="2500_4000">2,500–4,000 sq ft</option>
                      <option value="over_4000">Over 4,000 sq ft</option>
                    </SelectField>
                    <SelectField label="Roof Type" id="roofType" value={form.roofType} onChange={(v) => setField("roofType", v)}>
                      <option value="asphalt">Asphalt Shingles</option>
                      <option value="metal">Metal Roof</option>
                      <option value="tile">Tile Roof</option>
                      <option value="flat">Flat Roof</option>
                      <option value="other">Other/Unknown</option>
                    </SelectField>
                    <SelectField label="Water Source" id="waterSource" value={form.waterSource} onChange={(v) => setField("waterSource", v)}>
                      <option value="municipal">Municipal/City</option>
                      <option value="well">Private Well</option>
                    </SelectField>
                    <SelectField label="Sewer" id="sewerSystem" value={form.sewerSystem} onChange={(v) => setField("sewerSystem", v)}>
                      <option value="municipal">Municipal Sewer</option>
                      <option value="septic">Septic System</option>
                    </SelectField>
                    <SelectField label="Landscaping" id="landscaping" value={form.landscaping} onChange={(v) => setField("landscaping", v)}>
                      <option value="mostly_grass">Mostly Grass</option>
                      <option value="natural_areas">Natural/Mulch Areas</option>
                      <option value="minimal">Minimal</option>
                    </SelectField>
                    <SelectField label="Pest Prevention" id="pestSchedule" value={form.pestSchedule} onChange={(v) => setField("pestSchedule", v)}>
                      <option value="yes">Yes, on schedule</option>
                      <option value="no">No schedule</option>
                      <option value="not_sure">Not sure</option>
                    </SelectField>
                    <SelectField label="Foundation Type" id="foundationType" value={form.foundationType} onChange={(v) => { setField("foundationType", v); setField("crawlSpaceSealed", "not_sure"); }}>
                      <option value="">Unknown</option>
                      <option value="slab">Slab</option>
                      <option value="crawl_space">Crawl Space</option>
                      <option value="basement_finished">Basement — Finished</option>
                      <option value="basement_unfinished">Basement — Unfinished</option>
                    </SelectField>
                    {form.foundationType === "crawl_space" && (
                      <SelectField label="Crawl Space Sealed?" id="crawlSpaceSealed" value={form.crawlSpaceSealed} onChange={(v) => setField("crawlSpaceSealed", v)}>
                        <option value="yes">Yes, sealed</option>
                        <option value="no">No, open/vented</option>
                        <option value="not_sure">Not sure</option>
                      </SelectField>
                    )}
                    <SelectField label="Pool / Hot Tub" id="poolOrHotTub" value={form.poolOrHotTub} onChange={(v) => setField("poolOrHotTub", v)}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </SelectField>
                    <SelectField label="Allergies / Pets" id="allergies" value={form.allergies} onChange={(v) => setField("allergies", v)}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </SelectField>
                    {form.allergies === "yes" && (
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Allergy / Pet Details</label>
                        <input
                          type="text"
                          value={form.allergiesDetails}
                          onChange={(e) => setField("allergiesDetails", e.target.value)}
                          placeholder="e.g. dog, pollen, dust mites"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                          style={{ "--tw-ring-color": accent } as React.CSSProperties}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Exterior & Systems (new Maintly-accuracy fields) */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Exterior &amp; Systems <span className="font-normal normal-case text-slate-400">(optional — improves AI accuracy)</span></p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <SelectField label="Grass / Lawn Type" id="grassType" value={form.grassType} onChange={(v) => setField("grassType", v)}>
                      <option value="">Unknown</option>
                      <option value="fescue">Fescue</option>
                      <option value="bermuda">Bermuda</option>
                      <option value="zoysia">Zoysia</option>
                      <option value="st_augustine">St. Augustine</option>
                      <option value="kentucky_bluegrass">Kentucky Bluegrass</option>
                      <option value="centipede">Centipede</option>
                      <option value="ryegrass">Ryegrass</option>
                      <option value="no_grass">No grass / Xeriscaped</option>
                      <option value="other">Other</option>
                    </SelectField>
                    <SelectField label="HVAC Type" id="hvacType" value={form.hvacType} onChange={(v) => setField("hvacType", v)}>
                      <option value="">Unknown</option>
                      <option value="central_air_gas">Central A/C + Gas</option>
                      <option value="central_air_electric">Central A/C + Electric</option>
                      <option value="heat_pump">Heat Pump</option>
                      <option value="mini_split">Mini-Split</option>
                      <option value="boiler_radiator">Boiler / Radiator</option>
                      <option value="window_units">Window Units</option>
                      <option value="other">Other</option>
                    </SelectField>
                    <SelectField label="Siding / Exterior" id="sidingType" value={form.sidingType} onChange={(v) => setField("sidingType", v)}>
                      <option value="">Unknown</option>
                      <option value="vinyl">Vinyl Siding</option>
                      <option value="hardiplank">HardiPlank / Fiber Cement</option>
                      <option value="wood">Wood / Cedar</option>
                      <option value="brick">Brick</option>
                      <option value="stucco">Stucco</option>
                      <option value="stone">Stone / Veneer</option>
                      <option value="aluminum">Aluminum</option>
                      <option value="other">Other / Mixed</option>
                    </SelectField>
                    <SelectField label="Past Pest Issues" id="pastPestIssues" value={form.pastPestIssues} onChange={(v) => { setField("pastPestIssues", v); if (v !== "yes") setField("pastPestIssuesNotes", ""); }}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </SelectField>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Roof Last Replaced — Year</label>
                    <input
                      type="number"
                      value={form.roofAgeYear}
                      onChange={(e) => setField("roofAgeYear", e.target.value)}
                      placeholder={String(new Date().getFullYear() - 10)}
                      min="1950" max={new Date().getFullYear()}
                      className="w-full sm:w-48 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                      style={{ "--tw-ring-color": accent } as React.CSSProperties}
                    />
                  </div>
                  {form.pastPestIssues === "yes" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Pest Issue Details</label>
                      <input
                        type="text"
                        value={form.pastPestIssuesNotes}
                        onChange={(e) => setField("pastPestIssuesNotes", e.target.value)}
                        placeholder="e.g. Termite treatment in 2019, rodent exclusion done"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                        style={{ "--tw-ring-color": accent } as React.CSSProperties}
                      />
                    </div>
                  )}
                </div>

                {/* New Construction */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">New Construction Details <span className="font-normal normal-case text-slate-400">(optional)</span></p>
                  <NewConstructionCheckbox
                    checked={isNewConstruction}
                    onChange={setIsNewConstruction}
                    accent={accent}
                  />
                  {isNewConstruction && (
                    <NewConstructionSection
                      data={newConstructionData}
                      onChange={setNewConstructionData}
                      accent={accent}
                    />
                  )}
                </div>

                {/* Documents */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Initial Documents <span className="font-normal normal-case text-slate-400">(optional)</span></p>
                  <p className="text-xs text-slate-400">Upload warranties, HOA docs, insurance, or inspection reports. These will be pre-loaded into the client's Home Documents section.</p>
                  <div className="flex flex-wrap gap-2">
                    {docs.map((doc, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
                        <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-xs font-medium text-emerald-800 truncate max-w-[150px]">{doc.fileName}</span>
                        <button onClick={() => setDocs((prev) => prev.filter((_, j) => j !== i))}
                          className="text-emerald-400 hover:text-red-400 transition-colors ml-1">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <input ref={docInputRef} type="file" className="hidden" onChange={handleDocUpload}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic" />
                  <button
                    onClick={() => docInputRef.current?.click()}
                    disabled={docUploading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {docUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {docUploading ? "Uploading…" : "Upload Document"}
                  </button>
                </div>

                {/* Price summary */}
                <div className="rounded-2xl p-4 border"
                  style={{ backgroundColor: accent + "08", borderColor: accent + "30" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">
                        Pre-Created Client Account · {duration === "3years" ? "3 Years" : "1 Year"}
                      </p>
                      <ul className="mt-1.5 space-y-0.5">
                        {[
                          duration === "3years" ? "37 months of Pro access (1 month free)" : "13 months of Pro access (1 month free)",
                          "AI-generated 12-month maintenance calendar",
                          docs.length > 0 ? `${docs.length} document${docs.length > 1 ? "s" : ""} pre-loaded` : "Document storage included",
                          "Your branding applied to their dashboard",
                          "Secure activation link for client hand-off",
                        ].map((item) => (
                          <li key={item} className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Check className="w-3 h-3 shrink-0" style={{ color: accent }} />{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black text-slate-900">{duration === "3years" ? "$99" : "$36"}</p>
                      <p className="text-xs font-semibold" style={{ color: accent }}>{duration === "3years" ? "~$33/yr" : "~$3/mo"}</p>
                      <p className="text-xs text-slate-400">one-time</p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pb-2">
                  <button
                    onClick={handlePurchase}
                    disabled={loading || docUploading}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 shadow-sm"
                    style={{ backgroundColor: accent }}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    {loading ? "Starting checkout…" : `Pay ${duration === "3years" ? "$99" : "$36"} & Create Account`}
                  </button>
                  <button onClick={() => setOpen(false)}
                    className="px-5 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════════════════════ */
export default function BrokerDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const { setPreviewSubdomain } = useBranding();
  const [, navigate] = useLocation();

  const [config, setConfig] = useState<BrokerConfig | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [membership, setMembership] = useState<TeamMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renewingClientId, setRenewingClientId] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);

  /* ── Edit Branding modal state ────────────────────────────────── */
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ logoUrl: "", agentPhotoUrl: "", phoneNumber: "", tagline: "", welcomeMessage: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/"); return; }
    if (!user.isBroker) { navigate("/choose-role"); return; }
    load();
  }, [authLoading, user]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [meRes, clientsRes] = await Promise.all([
        fetch(`${API_BASE}/api/broker/me`, { credentials: "include" }),
        fetch(`${API_BASE}/api/broker/clients`, { credentials: "include" }),
      ]);
      if (!meRes.ok) {
        const d = await safeJson(meRes);
        setError(d.error ?? "Could not load broker profile.");
        return;
      }
      const meData = await safeJson(meRes);
      setConfig(meData.config);
      setIsTeamMember(!!meData.isTeamMember);
      setIsTeamLeader(!!meData.isTeamLeader);
      setTeamMembers(meData.teamMembers ?? []);
      setMembership(meData.membership ?? null);
      if (clientsRes.ok) setClients((await safeJson(clientsRes)).clients ?? []);
    } catch { setError("Network error. Please refresh."); }
    finally { setLoading(false); }
  }, []);

  async function renewClient(clientId: number, clientEmail: string) {
    setRenewingClientId(clientId);
    try {
      const res = await fetch(`${API_BASE}/api/broker/client-renew-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ clientUserId: clientId, clientEmail }),
      });
      const data = await safeJson(res);
      if (!res.ok) { alert(data.error ?? "Could not start renewal checkout."); return; }
      if (data.url) window.location.href = data.url;
    } catch { alert("Network error. Please try again."); }
    finally { setRenewingClientId(null); }
  }

  function getPersonalInviteLink() {
    if (!config) return "";
    const base = `${window.location.origin}${import.meta.env.BASE_URL}invite/${config.subdomain}`;
    if (isTeamMember && membership?.memberUserId) {
      return `${base}?member=${membership.memberUserId}`;
    }
    return base;
  }

  function copyInviteLink() {
    if (!config) return;
    navigator.clipboard.writeText(getPersonalInviteLink());
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }

  function copyFullMessage() {
    if (!config) return;
    const link = getPersonalInviteLink();
    const msg = `Hi [Client Name],

I wanted to give you this personal gift to help with your new home. MaintainHome.ai is an app that will streamline your homeownership experience. You'll be able to track maintenance, talk to your AI assistant Maintly, keep all your documents in one place, and stay on top of everything about your most important investment.

Click here to get started: ${link}`;
    navigator.clipboard.writeText(msg);
    setMessageCopied(true);
    setTimeout(() => setMessageCopied(false), 3000);
  }

  function openEditModal() {
    if (!config) return;
    setEditForm({
      logoUrl: config.logoUrl ?? "",
      agentPhotoUrl: config.agentPhotoUrl ?? "",
      phoneNumber: config.phoneNumber ?? "",
      tagline: config.tagline ?? "",
      welcomeMessage: config.welcomeMessage ?? "",
    });
    setEditSuccess(null);
    setEditError(null);
    setEditOpen(true);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setEditError(null);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch(`${API_BASE}/api/logo-upload`, { method: "POST", body: fd, credentials: "include" });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setEditForm((f) => ({ ...f, logoUrl: data.logoUrl }));
    } catch (err: any) {
      setEditError(err.message ?? "Logo upload failed");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setEditError(null);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch(`${API_BASE}/api/photo-upload`, { method: "POST", body: fd, credentials: "include" });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setEditForm((f) => ({ ...f, agentPhotoUrl: data.photoUrl }));
    } catch (err: any) {
      setEditError(err.message ?? "Photo upload failed");
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function handleEditSave() {
    if (!config) return;
    setEditSaving(true);
    setEditSuccess(null);
    setEditError(null);
    try {
      const res = await fetch(`${API_BASE}/api/broker/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editForm),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setConfig((prev) => prev ? {
        ...prev,
        logoUrl: editForm.logoUrl || null,
        agentPhotoUrl: editForm.agentPhotoUrl || null,
        phoneNumber: editForm.phoneNumber || null,
        tagline: editForm.tagline || null,
        welcomeMessage: editForm.welcomeMessage || null,
      } : prev);
      setEditSuccess("Branding updated successfully. Changes are live.");
    } catch (err: any) {
      setEditError(err.message ?? "Failed to save branding");
    } finally {
      setEditSaving(false);
    }
  }

  /* ── Derived stats ─────────────────────────────────────────────── */
  const proClients = clients.filter((c) => isPro(c.subscriptionStatus));
  const imminentClients = clients.filter((c) => c.imminentAlertCount > 0);
  const avgScore = clients.length > 0
    ? Math.round(clients.reduce((s, c) => s + c.activityScore, 0) / clients.length) : null;

  const accent = MH_PRIMARY;
  const isGift = config?.monetizationModel === "closing_gift";
  const inviteLink = getPersonalInviteLink();

  /* ── Loading ─────────────────────────────────────────────────────── */
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: accent }} />
          <p className="text-slate-500 text-sm">Loading your partner dashboard…</p>
        </div>
      </div>
    );
  }

  /* ── Error ────────────────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <Building2 className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-black text-slate-900 mb-3">Broker Account Not Found</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">{error}</p>
          <div className="flex flex-col gap-2">
            <button onClick={() => navigate("/broker-onboard")}
              className="w-full px-5 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors">
              Apply for a White-Label Account
            </button>
            <button onClick={() => navigate("/")}
              className="w-full px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!config) return null;

  const monetizationLabel = isGift
    ? `Closing Gift · ${config.giftDuration === "3years" ? "3 Years" : "1 Year"}`
    : "Private Label";
  const MIcon = isGift ? Gift : CreditCard;

  /* ════════════════════════════════════════════════════════════════
     Dashboard render
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {config.logoUrl
              ? <img src={config.logoUrl} alt={config.brokerName} className="h-7 max-w-[110px] object-contain" />
              : <img src={`${BASE}images/logo-icon.png`} alt="MaintainHome" className="w-7 h-7 object-contain" />
            }
            {config.agentPhotoUrl && (
              <img src={config.agentPhotoUrl} alt={config.brokerName}
                className="w-7 h-7 rounded-full object-cover border border-slate-200 hidden sm:block" />
            )}
            <span className="font-bold text-slate-900 text-sm hidden sm:block">Partner Dashboard</span>
            <span className="text-slate-300 hidden sm:block">·</span>
            <span className="text-xs font-semibold truncate hidden sm:block" style={{ color: accent }}>
              {isTeamMember && membership ? membership.displayName : config.brokerName}
            </span>
            {isTeamMember && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                <Users className="w-3 h-3" />Team Agent
              </span>
            )}
            {isTeamLeader && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 shrink-0">
                <Users className="w-3 h-3" />Team Leader
              </span>
            )}
            {config.phoneNumber && (
              <span className="hidden lg:flex items-center gap-1 text-xs text-slate-400">
                <Phone className="w-3 h-3" />{config.phoneNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={copyInviteLink}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl text-white shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
              style={{ backgroundColor: accent }}>
              {linkCopied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Link2 className="w-3.5 h-3.5" />Invite Client</>}
            </button>
            {!isTeamMember && (
              <button onClick={openEditModal}
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors border border-slate-200">
                <Pencil className="w-3.5 h-3.5" />Edit Branding
              </button>
            )}
            <button onClick={() => { setPreviewSubdomain(config.subdomain); sessionStorage.setItem("mh_active_role", "homeowner"); navigate("/"); }}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors border border-slate-200">
              <ExternalLink className="w-3.5 h-3.5" />Preview
            </button>
            <button onClick={() => { sessionStorage.setItem("mh_active_role", "homeowner"); navigate("/"); }}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors border border-slate-200">
              <HomeIcon className="w-3.5 h-3.5" />My Home
            </button>
            <button onClick={async () => { await logout(); navigate("/"); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors">
              <LogOut className="w-3.5 h-3.5" /><span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 flex-1">

        {/* ════════════════════════════════════════════════════════
            HERO — dark slate, MaintainHome theme
        ════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl text-white relative overflow-hidden bg-slate-900"
        >
          {/* Animated radial glow — top right */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            style={{ background: `radial-gradient(ellipse at 85% 10%, ${accent}55 0%, transparent 55%)` }}
          />
          {/* Animated radial glow — bottom left */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0.25, 0.5, 0.25] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
            style={{ background: `radial-gradient(ellipse at 15% 90%, ${accent}35 0%, transparent 50%)` }}
          />
          {/* Noise texture overlay for depth */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />

          <div className="relative px-6 sm:px-10 py-10 sm:py-14 text-center">

            {/* Pioneer badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full mb-6"
              style={{ backgroundColor: accent + "30", border: `1px solid ${accent}50` }}
            >
              <Star className="w-3 h-3" style={{ color: accent }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>
                Pioneer Partner · Approved
              </span>
            </motion.div>

            {/* Logo + Agent photo — side-by-side */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-5"
            >
              {/* Logo */}
              {config.logoUrl ? (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/15">
                  <img src={config.logoUrl} alt={config.brokerName}
                    className="h-16 sm:h-20 max-w-[240px] object-contain" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ backgroundColor: accent + "33", border: `2px solid ${accent}40` }}>
                  <Building2 className="w-10 h-10" style={{ color: accent }} />
                </div>
              )}

              {/* Vertical divider between logo and headshot (desktop only) */}
              {config.agentPhotoUrl && (
                <div className="hidden sm:block w-px self-stretch bg-white/15 mx-1" />
              )}

              {/* Agent headshot — large and prominent */}
              {config.agentPhotoUrl && (
                <div className="flex flex-col items-center gap-2.5">
                  <img
                    src={config.agentPhotoUrl}
                    alt={config.brokerName}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-xl"
                    style={{ border: `2.5px solid ${accent}60` }}
                  />
                  {config.phoneNumber && (
                    <a
                      href={`tel:${config.phoneNumber}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-sm border border-white/15 hover:bg-white/20 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />{config.phoneNumber}
                    </a>
                  )}
                </div>
              )}

              {/* Phone only (no headshot) */}
              {!config.agentPhotoUrl && config.phoneNumber && (
                <a
                  href={`tel:${config.phoneNumber}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-sm border border-white/15 hover:bg-white/20 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />{config.phoneNumber}
                </a>
              )}
            </motion.div>

            {/* Broker name */}
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="text-3xl sm:text-4xl font-black mb-2 leading-tight text-white"
            >
              {config.brokerName}
            </motion.h1>

            {/* Tagline in accent color */}
            {config.tagline && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="text-lg sm:text-xl font-bold mb-4"
                style={{ color: accent }}
              >
                {config.tagline}
              </motion.p>
            )}

            {/* Welcome line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.38, duration: 0.5 }}
              className="text-white/55 text-sm sm:text-base max-w-lg mx-auto mb-7 leading-relaxed"
            >
              Welcome to your branded client retention platform. Help your clients own their homes better — and keep them for life.
            </motion.p>

            {/* Subdomain + type + model chips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="flex items-center justify-center gap-3 flex-wrap"
            >
              <span className="text-white/30 text-xs font-mono">{config.subdomain}.maintainhome.ai</span>
              <span className="text-white/15">·</span>
              <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: accent + "28", color: accent }}>
                {config.type === "team_leader" ? "Team Leader" : "Individual Agent"}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-white/65">
                <MIcon className="w-3 h-3 shrink-0" />{monetizationLabel}
              </span>
            </motion.div>

            {/* Quick-action buttons inside hero */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.52, duration: 0.4 }}
              className="flex items-center justify-center gap-3 mt-8 flex-wrap"
            >
              <button
                onClick={copyInviteLink}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-extrabold text-sm transition-all hover:scale-[1.04] active:scale-[0.98]"
                style={{
                  backgroundColor: accent,
                  boxShadow: `0 0 32px ${accent}70, 0 4px 16px ${accent}55`,
                  color: "#fff",
                }}
              >
                {linkCopied ? <><Check className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy Invite Link</>}
              </button>
              <button
                onClick={() => { setPreviewSubdomain(config.subdomain); sessionStorage.setItem("mh_active_role", "homeowner"); navigate("/"); }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 transition-all border border-white/20 text-white/80 hover:text-white"
              >
                <ExternalLink className="w-4 h-4" />Preview Your Brand
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* ── 4 Stats ───────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4">

          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Total Clients"
            value={clients.length}
            iconBg={accent + "18"}
            iconColor={accent}
          />

          <StatCard
            icon={<Zap className="w-6 h-6" />}
            label="Active Pro"
            value={proClients.length}
            iconBg="#fef3c7"
            iconColor="#f59e0b"
          />

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
            {avgScore !== null ? (
              <ScoreRing score={avgScore} color={scoreColor(avgScore)} />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-slate-300" />
              </div>
            )}
            <div>
              <p className="text-sm font-black text-slate-900 leading-tight">
                {avgScore !== null ? avgScore : "—"}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">Avg. Health Score</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${imminentClients.length > 0 ? "bg-red-50" : "bg-slate-50"}`}>
              <AlertTriangle className={`w-6 h-6 ${imminentClients.length > 0 ? "text-red-500" : "text-slate-300"}`} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 leading-none">{imminentClients.length}</p>
              <p className="text-xs text-slate-400 font-medium mt-1">Imminent Alerts</p>
            </div>
          </div>
        </motion.div>

        {/* ── Team Members (Team Leader only) ─────────────────────── */}
        {isTeamLeader && config && (
          <TeamMembersPanel accent={accent} teamMembers={teamMembers} onRefresh={load} config={config} />
        )}

        {/* ── Team Member Personal Profile ─────────────────────────── */}
        {isTeamMember && membership && (
          <TeamMemberProfilePanel accent={accent} membership={membership} onUpdate={load} />
        )}

        {/* ── Pre-Create Client Account ────────────────────────────── */}
        <PreCreateClientPanel accent={accent} />

        {/* ── Buy Gift Codes ───────────────────────────────────────── */}
        <GiftCodePurchasePanel accent={accent} />

        {/* ── Trusted Service Providers ────────────────────────────── */}
        {!isTeamMember && <TrustedServiceProvidersPanel accent={accent} />}

        {/* ── Invite + Agent Profile row ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Invite card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.14 }}
            className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="w-5 h-5" style={{ color: accent }} />
              <h2 className="font-bold text-slate-900">Invite New Client</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Copy the message below and send it to your client — your invite link is already embedded.
            </p>

            {/* Pre-written message preview */}
            <div className="relative bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 flex-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Ready-to-send message</p>
              <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                <p>Hi <span className="font-semibold text-slate-500 italic">[Client Name]</span>,</p>
                <p>
                  I wanted to give you this personal gift to help with your new home.{" "}
                  <span className="font-semibold text-slate-900">MaintainHome.ai</span> is an app that will streamline
                  your homeownership experience. You'll be able to track maintenance, talk to your AI assistant{" "}
                  <span className="font-semibold text-slate-900">Maintly</span>, keep all your documents in one place,
                  and stay on top of everything about your most important investment.
                </p>
                <p>
                  Click here to get started:{" "}
                  <span className="font-mono text-xs break-all" style={{ color: accent }}>{inviteLink}</span>
                </p>
              </div>
            </div>

            {/* Primary CTA — copy full message */}
            <button
              onClick={copyFullMessage}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-white font-extrabold text-base transition-all hover:scale-[1.02] active:scale-[0.99]"
              style={{
                backgroundColor: accent,
                boxShadow: messageCopied
                  ? `0 4px 20px ${accent}30`
                  : `0 6px 28px ${accent}55, 0 2px 8px ${accent}30`,
              }}
            >
              {messageCopied
                ? <><Check className="w-5 h-5" />Message copied!</>
                : <><Copy className="w-5 h-5" />Copy Full Message</>}
            </button>

            {/* Secondary: link-only */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 flex-1 min-w-0">
                <span className="text-xs text-slate-500 font-mono truncate min-w-0">{inviteLink}</span>
              </div>
              <button
                onClick={copyInviteLink}
                title="Copy link only"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
              >
                {linkCopied ? <><Check className="w-3.5 h-3.5 text-emerald-500" />Copied</> : <><Copy className="w-3.5 h-3.5" />Link only</>}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Short link:{" "}
              <strong className="text-slate-600 font-mono">maintainhome.ai/{config.subdomain}</strong>
            </p>
          </motion.div>

          {/* Agent Profile card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.17 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" style={{ color: accent }} />
              <h2 className="font-bold text-slate-900">Agent Profile</h2>
            </div>

            {/* Logo */}
            {config.logoUrl ? (
              <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-center border border-slate-100">
                <img src={config.logoUrl} alt="logo" className="max-h-10 max-w-full object-contain" />
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-center border border-slate-100">
                <Building2 className="w-6 h-6 text-slate-300" />
              </div>
            )}

            {/* Agent photo */}
            {config.agentPhotoUrl ? (
              <div className="flex items-center gap-3">
                <img src={config.agentPhotoUrl} alt={config.brokerName}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{config.brokerName}</p>
                  <p className="text-xs text-slate-400 capitalize">{config.type.replace("_", " ")}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-400">No headshot uploaded — contact support to update.</p>
              </div>
            )}

            {/* Phone */}
            {config.phoneNumber && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <p className="text-sm font-semibold text-slate-700">{config.phoneNumber}</p>
              </div>
            )}

            {/* Tagline */}
            {config.tagline && (
              <p className="text-xs text-slate-500 italic border-l-2 pl-3 leading-relaxed"
                style={{ borderColor: accent + "50" }}>
                "{config.tagline}"
              </p>
            )}

            {/* Model chip */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <MIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800 leading-tight">{monetizationLabel}</p>
                <p className="text-xs text-slate-400">Offer model</p>
              </div>
            </div>

            <button onClick={() => { setPreviewSubdomain(config.subdomain); sessionStorage.setItem("mh_active_role", "homeowner"); navigate("/"); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm hover:opacity-80 transition-colors mt-auto"
              style={{ borderColor: accent, color: accent }}>
              <ExternalLink className="w-4 h-4" />Preview Your Brand
            </button>
            <p className="text-xs text-slate-400 text-center">
              To update your profile,{" "}
              <a href="mailto:support@maintainhome.ai" className="hover:underline" style={{ color: accent }}>contact support</a>
            </p>
          </motion.div>
        </div>

        {/* ── Client table ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="w-5 h-5" style={{ color: accent }} />
              <h2 className="font-bold text-slate-900">{isTeamMember ? "My Clients" : "Your Clients"}</h2>
              {clients.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">{clients.length}</span>
              )}
              {isTeamMember && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                  <User className="w-3 h-3" />Assigned to me
                </span>
              )}
              {isGift && config.giftDuration && !isTeamMember && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                  <Gift className="w-3 h-3" />
                  Gift · {config.giftDuration === "3years" ? "3 Years" : "1 Year"}
                </span>
              )}
            </div>
            <button onClick={load} className="text-slate-400 hover:text-slate-600 transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {clients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Users className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-slate-500 text-sm font-medium">No clients yet</p>
              <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                Share your invite link to start bringing clients in under your branded experience.
              </p>
              <button onClick={copyInviteLink}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-extrabold mt-2 hover:scale-[1.03] active:scale-[0.98] transition-all"
                style={{ backgroundColor: accent, boxShadow: `0 6px 24px ${accent}50` }}>
                <Copy className="w-4 h-4" />Copy Invite Link
              </button>
            </div>
          ) : (
            <>
              {/* Desktop column headers */}
              <div className="hidden md:grid gap-3 px-6 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                style={{ gridTemplateColumns: "2fr 90px 95px 120px 90px 110px 44px" }}>
                <span>Client</span>
                <span>Joined</span>
                <span>Plan</span>
                <span>Health Score</span>
                <span>Last Active</span>
                <span>Renew</span>
                <span />
              </div>

              <div className="divide-y divide-slate-100">
                {clients.map((client, idx) => {
                  const expiry = isGift && config.giftDuration
                    ? giftExpiry(client.createdAt, config.giftDuration)
                    : null;

                  return (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * idx, duration: 0.3 }}
                      className="group"
                    >
                      {/* ─ Mobile row ─ */}
                      <div className="md:hidden flex items-center gap-3 px-6 py-4 hover:bg-slate-50/80 transition-colors">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black"
                          style={{ backgroundColor: accent + "20", color: accent }}>
                          {(client.name ?? client.email)[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{client.name ?? "—"}</p>
                          <p className="text-xs text-slate-400 truncate">{client.email}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {client.hasCalendar && <Calendar className="w-3.5 h-3.5 text-blue-400" />}
                          {client.imminentAlertCount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                          {isPro(client.subscriptionStatus)
                            ? <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f59e0b18", color: "#d97706" }}>Pro</span>
                            : expiry
                              ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${expiry.expired ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"}`}>Gift</span>
                              : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Free</span>
                          }
                          <button
                            onClick={() => renewClient(client.id, client.email)}
                            disabled={renewingClientId === client.id}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-all disabled:opacity-50"
                            title="Renew 1 year Pro for this client"
                          >
                            {renewingClientId === client.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <RefreshCw className="w-3 h-3" />}
                            $36
                          </button>
                        </div>
                      </div>

                      {/* ─ Desktop row ─ */}
                      <div className="hidden md:grid gap-3 px-6 py-4 hover:bg-slate-50/80 transition-colors items-center"
                        style={{ gridTemplateColumns: "2fr 90px 95px 120px 90px 110px 44px" }}>

                        {/* Client */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black"
                            style={{ backgroundColor: accent + "20", color: accent }}>
                            {(client.name ?? client.email)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-slate-900 truncate">{client.name ?? "—"}</p>
                              {client.imminentAlertCount > 0 && (
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0"
                                  title={`${client.imminentAlertCount} imminent alert${client.imminentAlertCount > 1 ? "s" : ""}`} />
                              )}
                              {client.hasCalendar && (
                                <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" title="AI calendar built" />
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate">{client.email}</p>
                            {isTeamLeader && teamMembers.filter(m => m.status === "active").length > 0 && (
                              <select
                                value={client.assignedMemberId ?? ""}
                                onChange={async (e) => {
                                  const memberId = e.target.value ? parseInt(e.target.value) : null;
                                  await fetch(`${API_BASE}/api/broker/clients/${client.id}/assign`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    credentials: "include",
                                    body: JSON.stringify({ memberId }),
                                  });
                                  load();
                                }}
                                className="mt-1 text-[10px] text-slate-500 border border-slate-200 rounded-lg px-1.5 py-0.5 bg-white cursor-pointer hover:border-slate-300 focus:outline-none max-w-[120px]"
                              >
                                <option value="">Unassigned</option>
                                {teamMembers.filter(m => m.status === "active").map(m => (
                                  <option key={m.id} value={m.memberUserId ?? ""}>
                                    {m.displayName}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>

                        {/* Joined */}
                        <span className="text-xs text-slate-400">
                          {new Date(client.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                        </span>

                        {/* Plan */}
                        <div>
                          {client.isPrecreated && !client.isActivated ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">
                                <Clock className="w-3 h-3" />Pending
                              </span>
                              <p className="text-[10px] mt-0.5 font-medium text-slate-400">Not activated yet</p>
                            </div>
                          ) : isPro(client.subscriptionStatus) ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                              style={{ backgroundColor: "#f59e0b18", color: "#d97706" }}>
                              <Zap className="w-3 h-3" />{client.isPrecreated ? "Pre-Created" : "Pro"}
                            </span>
                          ) : expiry ? (
                            <div>
                              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${expiry.expired ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"}`}>
                                <Gift className="w-3 h-3" />Gift
                              </span>
                              <p className={`text-[10px] mt-0.5 font-medium ${expiry.expired ? "text-red-400" : "text-slate-400"}`}>
                                {expiry.label}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Free</span>
                          )}
                        </div>

                        {/* Health Score */}
                        <ScoreBar score={client.activityScore} />

                        {/* Last Active */}
                        <span className="text-xs text-slate-400">{relativeDate(client.lastActiveAt)}</span>

                        {/* Renew button */}
                        <button
                          onClick={() => renewClient(client.id, client.email)}
                          disabled={renewingClientId === client.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 hover:border-emerald-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          title="Renew 1 year Pro for this client"
                        >
                          {renewingClientId === client.id
                            ? <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                            : <RefreshCw className="w-3 h-3 shrink-0" />}
                          Renew · $36
                        </button>

                        {/* View button */}
                        <button
                          title="View client (coming soon)"
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>

        {/* ── Big-ticket spotlight (Imminent only) ──────────────────── */}
        {imminentClients.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.24 }}
            className="rounded-2xl p-6 border"
            style={{
              backgroundColor: "#fef2f2",
              borderColor: "#fecaca",
              borderLeftWidth: "4px",
              borderLeftColor: "#ef4444",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="font-bold text-red-900">Big-Ticket Alerts Across Your Clients</h2>
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">{imminentClients.length}</span>
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-500 text-[10px] font-semibold border border-red-200 ml-1">Imminent — Next 12 Months</span>
            </div>
            <div className="space-y-3">
              {imminentClients.slice(0, 5).map((client) => (
                <div key={client.id} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-red-100 shadow-sm">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black bg-red-100 text-red-600 mt-0.5">
                    {(client.name ?? client.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{client.name ?? client.email}</p>
                    <ul className="mt-1 space-y-0.5">
                      {client.imminentAlerts.map((alert, i) => (
                        <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                          <span className="text-red-400 mt-0.5 shrink-0">•</span>
                          {alert}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-red-600 mt-3 text-center">
              These clients have major home systems due within the next 12 months — consider reaching out proactively.
            </p>
          </motion.div>
        )}

        {/* ── How-to guide ──────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.26 }}
          className="rounded-2xl p-6 sm:p-8 text-white bg-slate-900">
          <div className="mb-5">
            <h2 className="font-extrabold text-lg sm:text-xl"
              style={{ background: "linear-gradient(135deg, #1f9e6e 0%, #3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Invite or Gift Your Way — Retain Your Clients For Life
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { step: "1", title: "Copy your invite link", desc: "Share via email, text, or your website. Clients instantly see your brand." },
              { step: "2", title: "Client signs up or receives your gift", desc: "They see your logo, photo, and welcome message on first login — whether they sign up themselves or you pre-build their account as a closing gift." },
              { step: "3", title: "They build their plan", desc: "Clients complete the home quiz, get their AI maintenance calendar, and track everything about their most important investment — all under your brand." },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: accent + "30" }}>
                  <span className="font-black text-xs" style={{ color: accent }}>{item.step}</span>
                </div>
                <div>
                  <p className="font-bold text-sm mb-1">{item.title}</p>
                  <p className="text-white/50 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="border-t border-slate-200 py-4 mt-2">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-center gap-2">
          <img src={`${BASE}images/logo-icon.png`} alt="MaintainHome.ai" className="w-4 h-4 object-contain opacity-40" />
          <span className="text-xs text-slate-400">
            Powered by <a href="https://maintainhome.ai" className="font-semibold hover:text-slate-600 transition-colors">MaintainHome.ai</a>
          </span>
          <span className="text-slate-200">·</span>
          <a href="mailto:support@maintainhome.ai" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Support</a>
        </div>
      </div>

      {/* ── Edit Branding Modal ─────────────────────────────────────── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setEditOpen(false); }}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${MH_PRIMARY}18` }}>
                  <Pencil className="w-4 h-4" style={{ color: MH_PRIMARY }} />
                </div>
                <h2 className="text-base font-black text-slate-900">Edit My Branding</h2>
              </div>
              <button onClick={() => setEditOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">

              {/* Success banner */}
              {editSuccess && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <p className="text-sm text-green-700 font-medium">{editSuccess}</p>
                </div>
              )}

              {/* Error banner */}
              {editError && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600">{editError}</p>
                </div>
              )}

              {/* ── Logo ───────────────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Company Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                    {editForm.logoUrl
                      ? <img src={editForm.logoUrl} alt="Logo" className="max-h-12 max-w-[72px] object-contain" />
                      : <Building2 className="w-6 h-6 text-slate-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
                      {logoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {logoUploading ? "Uploading…" : "Upload New Logo"}
                    </button>
                    <p className="text-xs text-slate-400 mt-1.5">JPG, PNG, SVG · Max 2MB</p>
                  </div>
                </div>
              </div>

              {/* ── Agent Photo ────────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Agent / Team Photo <span className="font-normal normal-case text-slate-400">(optional)</span></label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                    {editForm.agentPhotoUrl
                      ? <img src={editForm.agentPhotoUrl} alt="Agent" className="w-full h-full object-cover" />
                      : <User className="w-6 h-6 text-slate-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
                      {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      {photoUploading ? "Uploading…" : "Upload New Photo"}
                    </button>
                    <p className="text-xs text-slate-400 mt-1.5">JPG, PNG · Max 2MB</p>
                  </div>
                </div>
              </div>

              {/* ── Phone Number ───────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="e.g. 336.380.1851"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": MH_PRIMARY } as React.CSSProperties}
                />
              </div>

              {/* ── Tagline ─────────────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Tagline</label>
                <input
                  type="text"
                  value={editForm.tagline}
                  onChange={(e) => setEditForm((f) => ({ ...f, tagline: e.target.value }))}
                  placeholder="e.g. Your trusted real estate partner"
                  maxLength={120}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": MH_PRIMARY } as React.CSSProperties}
                />
                <p className="text-xs text-slate-400 mt-1">{editForm.tagline.length}/120</p>
              </div>

              {/* ── Welcome Message ─────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Welcome Message</label>
                <textarea
                  rows={3}
                  value={editForm.welcomeMessage}
                  onChange={(e) => setEditForm((f) => ({ ...f, welcomeMessage: e.target.value }))}
                  placeholder="A personal note shown to new clients on your invite page…"
                  maxLength={400}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                  style={{ "--tw-ring-color": MH_PRIMARY } as React.CSSProperties}
                />
                <p className="text-xs text-slate-400 mt-1">{editForm.welcomeMessage.length}/400</p>
              </div>

              {/* ── Save / Cancel ───────────────────────────────────────── */}
              <div className="flex gap-3 pt-1 pb-2">
                <button
                  onClick={handleEditSave}
                  disabled={editSaving || logoUploading || photoUploading}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 shadow-sm"
                  style={{ backgroundColor: MH_PRIMARY }}>
                  {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={() => setEditOpen(false)}
                  className="px-5 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
