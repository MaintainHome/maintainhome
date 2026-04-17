import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, XCircle, Trash2, Clock, RefreshCw, Eye, EyeOff,
  Building2, User, ChevronDown, ChevronUp, Loader2, Shield, Phone,
  HardHat,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const TOKEN_KEY = "mh_admin_token";

interface BrokerRequest {
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
  accountType: "broker" | "builder";
  warrantyPeriodMonths: number | null;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

type StatusTab = "pending" | "approved" | "rejected";
type AccountTab = "brokers" | "builders";

export default function AdminBrokers() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [requests, setRequests] = useState<BrokerRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [accountTab, setAccountTab] = useState<AccountTab>("brokers");
  const [statusTab, setStatusTab] = useState<StatusTab>("pending");
  const [expanded, setExpanded] = useState<number | null>(null);

  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});
  const [editFields, setEditFields] = useState<Record<number, Partial<BrokerRequest>>>({});

  const fetchRequests = useCallback(async (tok: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/broker-requests`, {
        headers: { "X-Admin-Token": tok },
      });
      if (res.status === 401) {
        setAuthenticated(false);
        setAuthError("Invalid token");
        return;
      }
      const data = await res.json();
      setAuthenticated(true);
      setRequests(data.requests ?? []);
    } catch {
      setAuthError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  async function login() {
    if (!tokenInput.trim()) return;
    setAuthError(null);
    const tok = tokenInput.trim();
    setToken(tok);
    localStorage.setItem(TOKEN_KEY, tok);
    await fetchRequests(tok);
  }

  useEffect(() => {
    if (token) fetchRequests(token);
  }, [token, fetchRequests]);

  async function approve(req: BrokerRequest) {
    setActionLoading(req.id);
    const overrides = editFields[req.id] ?? {};
    try {
      const res = await fetch(`${API_BASE}/api/admin/broker-requests/${req.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": token },
        body: JSON.stringify({
          logoUrl: overrides.logoUrl ?? req.logoUrl ?? "",
          tagline: overrides.tagline ?? req.tagline ?? "",
          welcomeMessage: overrides.welcomeMessage ?? req.welcomeMessage ?? "",
          phoneNumber: overrides.phoneNumber ?? req.phoneNumber ?? "",
        }),
      });
      if (res.ok) {
        await fetchRequests(token);
        setExpanded(null);
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function reject(req: BrokerRequest) {
    setActionLoading(req.id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/broker-requests/${req.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": token },
        body: JSON.stringify({ reason: rejectReason[req.id] ?? "" }),
      });
      if (res.ok) {
        await fetchRequests(token);
        setExpanded(null);
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this request permanently?")) return;
    setActionLoading(id);
    try {
      await fetch(`${API_BASE}/api/admin/broker-requests/${id}`, {
        method: "DELETE",
        headers: { "X-Admin-Token": token },
      });
      await fetchRequests(token);
    } finally {
      setActionLoading(null);
    }
  }

  function setEdit(id: number, field: string, value: string) {
    setEditFields((p) => ({ ...p, [id]: { ...p[id], [field]: value } }));
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-5">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black text-slate-900 text-center mb-1">Admin Access</h1>
          <p className="text-sm text-slate-500 text-center mb-6">Enter your admin token to continue</p>
          <div className="relative mb-4">
            <input
              type={showToken ? "text" : "password"}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder="Admin token"
              className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/30 text-slate-900"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {authError && <p className="text-red-600 text-sm text-center mb-3">{authError}</p>}
          <button
            onClick={login}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all"
          >
            Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  /* ── Filter by account type first, then by status ── */
  const accountFiltered = requests.filter((r) => {
    const at = r.accountType ?? "broker";
    return accountTab === "builders" ? at === "builder" : at !== "builder";
  });

  const filtered = accountFiltered.filter((r) => r.status === statusTab);

  const statusCounts: Record<StatusTab, number> = {
    pending: accountFiltered.filter((r) => r.status === "pending").length,
    approved: accountFiltered.filter((r) => r.status === "approved").length,
    rejected: accountFiltered.filter((r) => r.status === "rejected").length,
  };

  const brokerCount = requests.filter((r) => (r.accountType ?? "broker") !== "builder").length;
  const builderCount = requests.filter((r) => r.accountType === "builder").length;

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">White-Label Applications</h1>
            <p className="text-slate-400 text-sm mt-1">{requests.length} total applications</p>
          </div>
          <button
            onClick={() => fetchRequests(token)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Account type tabs (Brokers / Builders) ── */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setAccountTab("brokers"); setExpanded(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${accountTab === "brokers" ? "bg-white text-slate-900" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
          >
            <Building2 className="w-4 h-4" />
            Brokers
            {brokerCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${accountTab === "brokers" ? "bg-slate-900 text-white" : "bg-slate-600 text-slate-300"}`}>
                {brokerCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setAccountTab("builders"); setExpanded(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${accountTab === "builders" ? "bg-white text-slate-900" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
          >
            <HardHat className="w-4 h-4" />
            Builders
            {builderCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${accountTab === "builders" ? "bg-slate-900 text-white" : "bg-slate-600 text-slate-300"}`}>
                {builderCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Status sub-tabs ── */}
        <div className="flex gap-2 mb-6">
          {(["pending", "approved", "rejected"] as StatusTab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setStatusTab(t); setExpanded(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${statusTab === t ? "bg-primary text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {statusCounts[t] > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${statusTab === t ? "bg-white/20 text-white" : "bg-slate-600 text-slate-300"}`}>
                  {statusCounts[t]}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            No {statusTab} {accountTab === "builders" ? "builder" : "broker"} applications
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((req) => {
            const isExpanded = expanded === req.id;
            const isBusy = actionLoading === req.id;
            const edits = editFields[req.id] ?? {};
            const isBuilder = (req.accountType ?? "broker") === "builder";

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
              >
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : req.id)}
                >
                  <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    {isBuilder
                      ? <HardHat className="w-4 h-4 text-primary" />
                      : req.type === "team_leader"
                        ? <Building2 className="w-4 h-4 text-primary" />
                        : <User className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white text-sm">{req.brokerName}</p>
                      {isBuilder && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 border border-amber-700/30">
                          Builder
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs">{req.subdomain}.maintainhome.ai · {req.contactEmail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {req.agentPhotoUrl && (
                      <img src={req.agentPhotoUrl} alt={req.brokerName}
                        className="w-7 h-7 rounded-full object-cover border border-slate-700" />
                    )}
                    {req.phoneNumber && (
                      <span className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
                        <Phone className="w-3 h-3" />{req.phoneNumber}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-800 px-5 py-5 space-y-5">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Account Type</p>
                        <p className="text-white capitalize">{isBuilder ? "🏗️ Builder" : "🏡 Broker"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Type</p>
                        <p className="text-white capitalize">{req.type.replace("_", " ")}</p>
                      </div>
                      {isBuilder && req.warrantyPeriodMonths && (
                        <div>
                          <p className="text-slate-500 text-xs mb-1">Warranty Period</p>
                          <p className="text-white">{req.warrantyPeriodMonths} months</p>
                        </div>
                      )}
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Logo URL</p>
                        <p className="text-white truncate">{req.logoUrl ?? "—"}</p>
                      </div>
                      {req.agentPhotoUrl && (
                        <div>
                          <p className="text-slate-500 text-xs mb-1">{isBuilder ? "Contact Photo" : "Agent Photo"}</p>
                          <img src={req.agentPhotoUrl} alt="Agent" className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                        </div>
                      )}
                      {req.phoneNumber && (
                        <div>
                          <p className="text-slate-500 text-xs mb-1">Phone</p>
                          <p className="text-white">{req.phoneNumber}</p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <p className="text-slate-500 text-xs mb-1">Tagline</p>
                        <p className="text-white">{req.tagline ?? "—"}</p>
                      </div>
                      {req.welcomeMessage && (
                        <div className="col-span-2">
                          <p className="text-slate-500 text-xs mb-1">Welcome Message</p>
                          <p className="text-white">{req.welcomeMessage}</p>
                        </div>
                      )}
                      {req.rejectionReason && (
                        <div className="col-span-2">
                          <p className="text-slate-500 text-xs mb-1">Rejection Reason</p>
                          <p className="text-amber-400">{req.rejectionReason}</p>
                        </div>
                      )}
                    </div>

                    {statusTab === "pending" && (
                      <div className="space-y-3 pt-2 border-t border-slate-800">
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Override before approving (optional)</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="text-xs text-slate-500 mb-1 block">Logo URL override</label>
                            <input type="url" value={edits.logoUrl ?? req.logoUrl ?? ""}
                              onChange={(e) => setEdit(req.id, "logoUrl", e.target.value)}
                              placeholder="https://..."
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-slate-500 mb-1 block">Phone override</label>
                            <input type="tel" value={edits.phoneNumber ?? req.phoneNumber ?? ""}
                              onChange={(e) => setEdit(req.id, "phoneNumber", e.target.value)}
                              placeholder="(555) 867-5309"
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-slate-500 mb-1 block">Tagline override</label>
                            <input type="text" value={edits.tagline ?? req.tagline ?? ""}
                              onChange={(e) => setEdit(req.id, "tagline", e.target.value)}
                              placeholder="Your tagline..."
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <button
                            onClick={() => reject(req)}
                            disabled={isBusy}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm font-semibold transition-all disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Reject
                          </button>
                          <button
                            onClick={() => approve(req)}
                            disabled={isBusy}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-all disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Approve
                          </button>
                        </div>

                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Rejection reason (optional)</label>
                          <input
                            type="text"
                            value={rejectReason[req.id] ?? ""}
                            onChange={(e) => setRejectReason((p) => ({ ...p, [req.id]: e.target.value }))}
                            placeholder="Subdomain taken, incomplete info, etc."
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {(statusTab === "approved" || statusTab === "rejected") && (
                      <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                        <div className="flex items-center gap-2">
                          {statusTab === "approved"
                            ? <><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-green-400 text-sm font-semibold">Approved</span></>
                            : <><XCircle className="w-4 h-4 text-red-400" /><span className="text-red-400 text-sm font-semibold">Rejected</span></>}
                        </div>
                        <div className="flex gap-2">
                          {statusTab === "rejected" && (
                            <button
                              onClick={() => approve(req)}
                              disabled={isBusy}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Re-approve
                            </button>
                          )}
                          {statusTab === "approved" && (
                            <button
                              onClick={() => reject(req)}
                              disabled={isBusy}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-all"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Revoke
                            </button>
                          )}
                          <button
                            onClick={() => remove(req.id)}
                            disabled={isBusy}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 text-xs font-semibold transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 p-5 bg-slate-900 rounded-2xl border border-slate-800">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Test a Subdomain</p>
          <TestSubdomainPanel />
        </div>
      </div>
    </div>
  );
}

function TestSubdomainPanel() {
  const [sub, setSub] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function test() {
    if (!sub.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/branding`, {
        headers: { "X-Subdomain": sub.trim() },
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult("Error fetching branding");
    } finally {
      setLoading(false);
    }
  }

  function activatePreview() {
    if (!sub.trim()) return;
    sessionStorage.setItem("mh_preview_subdomain", sub.trim());
    window.location.href = "/";
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={sub}
          onChange={(e) => setSub(e.target.value)}
          placeholder="smith"
          className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none"
        />
        <button onClick={test} disabled={loading} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all flex items-center gap-1.5">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
          Test API
        </button>
        <button onClick={activatePreview} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-all flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Preview
        </button>
      </div>
      {result && (
        <pre className="text-xs text-slate-300 bg-slate-950 rounded-xl p-4 overflow-auto max-h-48 whitespace-pre-wrap">
          {result}
        </pre>
      )}
      <p className="text-slate-500 text-xs">
        "Test API" calls <code>/api/branding</code> directly. "Preview" redirects to <code>/</code> with the branding active — clear it by visiting <code>/?_clear_preview=1</code>.
      </p>
    </div>
  );
}
