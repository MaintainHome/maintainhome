import { useState, useEffect, useCallback } from "react";
import {
  Shield, Eye, EyeOff, RefreshCw, Loader2, CheckCircle2, Circle, Copy,
  UserPlus, Trash2, Sparkles, MessageSquare, ExternalLink, ChevronDown, ChevronUp,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const TOKEN_KEY = "mh_admin_token";

interface ChecklistItem {
  key: string;
  title: string;
  description: string;
  group: string;
}

interface ChecklistStatus {
  itemKey: string;
  tested: boolean;
  testedAt: string | null;
  notes: string | null;
}

interface TestAccount {
  role: "homeowner" | "broker" | "builder";
  email: string;
  name: string;
  subdomain?: string;
  magicLinkUrl: string;
}

interface FeedbackReport {
  id: number;
  userEmail: string;
  userName: string | null;
  category: "bug" | "suggestion" | "other";
  description: string;
  pageUrl: string | null;
  hasScreenshot: boolean;
  status: string;
  createdAt: string;
}

const CHECKLIST: ChecklistItem[] = [
  { key: "signup_quiz_calendar", group: "Onboarding", title: "New user signup + quiz + calendar generation",
    description: "Sign up via the homepage, complete the quiz, and verify a personalized calendar is generated." },
  { key: "magic_link_login", group: "Onboarding", title: "Magic link login",
    description: "Request a magic link as an existing user and confirm the login flow works." },
  { key: "terms_acceptance", group: "Onboarding", title: "Terms & Conditions acceptance",
    description: "On first sign-in, the Terms modal appears and saves the acceptance." },

  { key: "maintly_chat", group: "Core Features", title: "Maintly chat (with photo/document upload)",
    description: "Open Maintly chat, send a message, attach an image, attach a PDF — verify response and storage." },
  { key: "home_profile_updates", group: "Core Features", title: "Home profile updates (incl. new construction fields)",
    description: "Edit profile fields (HVAC, year built, square footage, new construction data). Confirm persistence." },
  { key: "maintenance_history_export", group: "Core Features", title: "Maintenance history + export (Pro only)",
    description: "Mark tasks done, add notes, then export the printable history as a Pro user." },

  { key: "broker_invite_flow", group: "Broker Dashboard", title: "Broker dashboard — invite client",
    description: "From a broker account, create a new client invite and verify the invite landing renders branded." },
  { key: "broker_gift_codes", group: "Broker Dashboard", title: "Broker dashboard — gift codes",
    description: "Create a gift code, redeem it on a fresh account, confirm Pro is granted." },
  { key: "broker_prepaid_package", group: "Broker Dashboard", title: "Broker dashboard — pre-paid package",
    description: "Run the Pre-Create Client (gift) flow end-to-end including Stripe checkout." },

  { key: "builder_assign_package", group: "Builder Dashboard", title: "Builder dashboard — assign 1-Year Care package",
    description: "From a builder account, deliver a Builder Care Package to a homeowner email." },
  { key: "builder_warranty_tracking", group: "Builder Dashboard", title: "Builder dashboard — warranty tracking",
    description: "Verify warranty expirations widget and the upcoming warranty list shows on the dashboard." },

  { key: "dual_role_switch", group: "Roles", title: "Dual-role switch (homeowner ↔ broker)",
    description: "As a user with both broker and homeowner roles, switch back and forth via the role-switcher." },
];

const GROUPS = Array.from(new Set(CHECKLIST.map(c => c.group)));

export default function AdminTesting() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [statusByKey, setStatusByKey] = useState<Record<string, ChecklistStatus>>({});
  const [editingNotesKey, setEditingNotesKey] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const [accounts, setAccounts] = useState<TestAccount[]>([]);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [createMsgKind, setCreateMsgKind] = useState<"success" | "error">("success");
  const [clearing, setClearing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<FeedbackReport[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState<number | null>(null);

  const fetchChecklist = useCallback(async (tok: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/testing/checklist`, {
        headers: { "X-Admin-Token": tok },
      });
      if (res.status === 401) {
        setAuthenticated(false);
        setAuthError("Invalid token. Double-check the value of ADMIN_SECRET.");
        return;
      }
      if (res.status === 503) {
        setAuthenticated(false);
        setAuthError(
          "Admin access is not configured on this server. Set the ADMIN_SECRET deployment secret and redeploy.",
        );
        return;
      }
      if (!res.ok) {
        setAuthenticated(false);
        setAuthError(`Server error (${res.status}). Try again.`);
        return;
      }
      const data = await res.json();
      setAuthenticated(true);
      const map: Record<string, ChecklistStatus> = {};
      for (const item of (data.items ?? []) as ChecklistStatus[]) {
        map[item.itemKey] = item;
      }
      setStatusByKey(map);
    } catch {
      setAuthError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFeedback = useCallback(async (tok: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/testing/feedback`, {
        headers: { "X-Admin-Token": tok },
      });
      if (!res.ok) return;
      const data = await res.json();
      setFeedback(data.reports ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    if (token) fetchChecklist(token);
  }, [token, fetchChecklist]);

  async function login() {
    if (!tokenInput.trim()) return;
    setAuthError(null);
    const tok = tokenInput.trim();
    setToken(tok);
    localStorage.setItem(TOKEN_KEY, tok);
    await fetchChecklist(tok);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setAuthenticated(false);
    setStatusByKey({});
    setAccounts([]);
  }

  async function toggleTested(key: string, current: boolean) {
    const newVal = !current;
    setStatusByKey(prev => ({
      ...prev,
      [key]: { itemKey: key, tested: newVal, testedAt: newVal ? new Date().toISOString() : null, notes: prev[key]?.notes ?? null },
    }));
    try {
      await fetch(`${API_BASE}/api/admin/testing/checklist/${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": token },
        body: JSON.stringify({ tested: newVal, notes: statusByKey[key]?.notes ?? "" }),
      });
    } catch {}
  }

  async function saveNotes(key: string) {
    const current = statusByKey[key];
    setStatusByKey(prev => ({ ...prev, [key]: { ...prev[key], itemKey: key, tested: prev[key]?.tested ?? false, testedAt: prev[key]?.testedAt ?? null, notes: notesDraft } }));
    setEditingNotesKey(null);
    try {
      await fetch(`${API_BASE}/api/admin/testing/checklist/${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": token },
        body: JSON.stringify({ tested: current?.tested ?? false, notes: notesDraft }),
      });
    } catch {}
  }

  function showMsg(kind: "success" | "error", text: string) {
    setCreateMsgKind(kind);
    setCreateMsg(text);
  }

  async function createTestAccounts() {
    setCreating(true);
    setCreateMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/testing/create-test-accounts`, {
        method: "POST",
        headers: { "X-Admin-Token": token },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 503) {
          showMsg(
            "error",
            "Admin access is not configured on this server. Set the ADMIN_SECRET deployment secret and redeploy.",
          );
        } else if (res.status === 401) {
          showMsg("error", "Invalid admin token. Log out and try again.");
        } else {
          showMsg("error", data.error ?? `Failed to create (status ${res.status})`);
        }
        return;
      }
      setAccounts(data.accounts ?? []);
      showMsg("success", `Created ${data.created} test accounts.`);
    } catch {
      showMsg("error", "Network error");
    } finally {
      setCreating(false);
    }
  }

  async function clearTestAccounts() {
    if (!confirm("Clear all test white-label configs and pending magic links? Users (test.*@maintainhome.ai) are kept so existing data survives.")) return;
    setClearing(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/testing/test-accounts`, {
        method: "DELETE",
        headers: { "X-Admin-Token": token },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 503) {
          showMsg(
            "error",
            "Admin access is not configured on this server. Set the ADMIN_SECRET deployment secret and redeploy.",
          );
        } else if (res.status === 401) {
          showMsg("error", "Invalid admin token. Log out and try again.");
        } else {
          showMsg("error", data.error ?? `Failed to clear (status ${res.status})`);
        }
        return;
      }
      showMsg("success", data.message ?? "Cleared");
      setAccounts([]);
    } catch {
      showMsg("error", "Network error");
    } finally {
      setClearing(false);
    }
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1500);
  }

  // ─── Login screen ─────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Testing Tools</h1>
              <p className="text-xs text-slate-400">Enter your admin token to continue.</p>
            </div>
          </div>
          <div className="relative mb-3">
            <input
              type={showToken ? "text" : "password"}
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              placeholder="Admin token"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-primary focus:outline-none pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowToken(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {authError && <p className="text-red-400 text-xs mb-3">{authError}</p>}
          <button
            onClick={login}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // ─── Authenticated dashboard ──────────────────────────────────────────
  const totalCount = CHECKLIST.length;
  const doneCount = CHECKLIST.filter(c => statusByKey[c.key]?.tested).length;
  const pct = Math.round((doneCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900">Admin Testing Tools</h1>
              <p className="text-xs text-slate-500">{doneCount}/{totalCount} flows tested · {pct}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchChecklist(token)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={logout}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="h-1 bg-slate-200">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Create Test Accounts ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                Batch Test Accounts
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Generates 3 homeowners, 2 brokers, and 2 builders with realistic data and ready-to-use magic links.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={createTestAccounts}
                disabled={creating}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-colors shadow-sm"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Create Test Accounts
              </button>
              <button
                onClick={clearTestAccounts}
                disabled={clearing}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors"
              >
                {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Clear
              </button>
            </div>
          </div>
          {createMsg && (
            <div
              className={
                createMsgKind === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg px-3 py-2 mb-3"
                  : "bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2 mb-3"
              }
            >
              {createMsg}
            </div>
          )}
          {accounts.length > 0 && (
            <div className="space-y-2">
              {accounts.map(a => (
                <div key={a.email} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        a.role === "homeowner" ? "bg-blue-100 text-blue-700" :
                        a.role === "broker" ? "bg-purple-100 text-purple-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>{a.role}</span>
                      <span className="text-sm font-bold text-slate-900">{a.name}</span>
                      {a.subdomain && (
                        <span className="text-[11px] text-slate-500 font-mono">/{a.subdomain}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{a.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => copyLink(a.magicLinkUrl)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-primary hover:border-primary text-xs font-semibold transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      {copied === a.magicLinkUrl ? "Copied!" : "Copy link"}
                    </button>
                    <a
                      href={a.magicLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 text-xs font-semibold transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Checklist ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {GROUPS.map(group => (
            <div key={group} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{group}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {CHECKLIST.filter(c => c.group === group).map(item => {
                  const s = statusByKey[item.key];
                  const tested = s?.tested ?? false;
                  return (
                    <div key={item.key} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTested(item.key, tested)}
                          className="mt-0.5 shrink-0"
                          title={tested ? "Mark untested" : "Mark tested"}
                        >
                          {tested ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${tested ? "text-slate-500 line-through" : "text-slate-900"}`}>
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                          {tested && s?.testedAt && (
                            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                              Tested {new Date(s.testedAt).toLocaleString()}
                            </p>
                          )}
                          {editingNotesKey === item.key ? (
                            <div className="mt-2 flex flex-col gap-2">
                              <textarea
                                value={notesDraft}
                                onChange={e => setNotesDraft(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:outline-none text-xs resize-none"
                                placeholder="Notes (optional)"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => saveNotes(item.key)}
                                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingNotesKey(null)}
                                  className="px-3 py-1.5 rounded-lg text-slate-600 text-xs font-semibold hover:bg-slate-100"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : s?.notes ? (
                            <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                              <p className="text-xs text-slate-700 whitespace-pre-wrap">{s.notes}</p>
                              <button
                                onClick={() => { setEditingNotesKey(item.key); setNotesDraft(s.notes ?? ""); }}
                                className="text-[11px] text-primary font-semibold mt-1 hover:underline"
                              >
                                Edit notes
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingNotesKey(item.key); setNotesDraft(""); }}
                              className="text-[11px] text-slate-400 font-semibold mt-1.5 hover:text-primary"
                            >
                              + Add notes
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Recent Feedback ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => { setShowFeedback(s => !s); if (!showFeedback) fetchFeedback(token); }}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-slate-900">Recent Feedback Reports</span>
              {feedback.length > 0 && (
                <span className="text-[11px] font-bold text-slate-500 px-2 py-0.5 rounded-full bg-slate-100">{feedback.length}</span>
              )}
            </div>
            {showFeedback ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showFeedback && (
            <div className="border-t border-slate-100">
              {feedback.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-slate-500">No feedback reports yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {feedback.map(f => (
                    <div key={f.id} className="px-5 py-3">
                      <button
                        onClick={() => setExpandedFeedback(prev => prev === f.id ? null : f.id)}
                        className="w-full text-left flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              f.category === "bug" ? "bg-red-100 text-red-700" :
                              f.category === "suggestion" ? "bg-amber-100 text-amber-700" :
                              "bg-slate-100 text-slate-700"
                            }`}>{f.category}</span>
                            <span className="text-xs font-bold text-slate-900">{f.userName ?? f.userEmail}</span>
                            <span className="text-[11px] text-slate-400">{new Date(f.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className={`text-xs text-slate-600 ${expandedFeedback === f.id ? "" : "truncate"}`}>
                            {f.description}
                          </p>
                        </div>
                        {expandedFeedback === f.id ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />}
                      </button>
                      {expandedFeedback === f.id && (
                        <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap">
                          {f.description}
                          {f.pageUrl && (
                            <p className="mt-2 text-[11px] text-slate-400 font-mono break-all">Page: {f.pageUrl}</p>
                          )}
                          {f.hasScreenshot && (
                            <p className="mt-1 text-[11px] text-slate-400">📎 Screenshot attached (see email)</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
