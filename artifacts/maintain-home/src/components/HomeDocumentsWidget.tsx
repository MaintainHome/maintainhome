import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen, Upload, Loader2, Trash2, ChevronDown, ChevronUp,
  CalendarDays, Tag, Hash, CheckCircle2, AlertTriangle, Clock,
  FileText, X, Shield, Building2, Home, BookOpen, MoreHorizontal,
  Lock, Sparkles, Info,
} from "lucide-react";
import { useAuth, isPro } from "@/contexts/AuthContext";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type DocCategory = "warranty" | "hoa" | "insurance" | "deed" | "manual" | "other";

export interface DocumentData {
  documentType: DocCategory;
  documentTypeName: string;
  productName: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  issuer: string | null;
  policyNumber: string | null;
  purchaseDate: string | null;
  effectiveDate: string | null;
  expiryDate: string | null;
  renewalDate: string | null;
  coverageAmount: string | null;
  coverageDetails: string | null;
  importantTerms: string | null;
  nextActions: string[];
  confidence: "high" | "medium" | "low";
}

export interface HomeDoc {
  id: number;
  fileName: string;
  displayName: string | null;
  contentType: string;
  fileSizeBytes: number | null;
  docType: string;
  warrantyData: DocumentData | null;
  uploadedAt: string;
}

// ── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: { id: DocCategory | "all"; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "all",       label: "All",          icon: <FolderOpen className="w-3.5 h-3.5" />,  color: "text-slate-400" },
  { id: "warranty",  label: "Warranties",   icon: <Shield className="w-3.5 h-3.5" />,      color: "text-emerald-400" },
  { id: "hoa",       label: "HOA",          icon: <Building2 className="w-3.5 h-3.5" />,   color: "text-blue-400" },
  { id: "insurance", label: "Insurance",    icon: <Home className="w-3.5 h-3.5" />,         color: "text-violet-400" },
  { id: "deed",      label: "Deeds",        icon: <FileText className="w-3.5 h-3.5" />,    color: "text-amber-400" },
  { id: "manual",    label: "Manuals",      icon: <BookOpen className="w-3.5 h-3.5" />,    color: "text-cyan-400" },
  { id: "other",     label: "Other",        icon: <MoreHorizontal className="w-3.5 h-3.5" />, color: "text-slate-400" },
];

function getCatConfig(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function fmt(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Expiry badge ─────────────────────────────────────────────────────────────

function ExpiryBadge({ label, dateStr }: { label?: string; dateStr: string | null }) {
  if (!dateStr) return null;
  const days = daysUntil(dateStr);
  const formatted = fmt(dateStr);
  const prefix = label ?? "Expires";

  if (days === null) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
      <CalendarDays className="w-3 h-3" />{prefix} {formatted}
    </span>
  );

  if (days < 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-950/60 border border-red-800/50 px-2 py-0.5 rounded-full">
      <AlertTriangle className="w-3 h-3" />Expired {formatted}
    </span>
  );

  if (days <= 90) return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-950/60 border border-red-800/50 px-2 py-0.5 rounded-full">
      <AlertTriangle className="w-3 h-3" />{prefix} {formatted} ({days}d)
    </span>
  );

  if (days <= 180) return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" />{prefix} {formatted}
    </span>
  );

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" />{prefix} {formatted}
    </span>
  );
}

// ── Document card ─────────────────────────────────────────────────────────────

function DocCard({ doc, onDelete }: { doc: HomeDoc; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const d = doc.warrantyData;
  const cat = getCatConfig(doc.docType);
  const name = d?.documentTypeName ?? d?.productName ?? doc.displayName ?? doc.fileName;
  const expiryDate = d?.expiryDate ?? null;
  const renewalDate = d?.renewalDate ?? null;
  const primaryDate = expiryDate ?? renewalDate;
  const dateLabel = expiryDate ? "Expires" : "Renews";

  async function handleDelete() {
    if (!confirm(`Remove "${name}"?`)) return;
    setDeleting(true);
    try {
      await fetch(`${API_BASE}/api/documents/${doc.id}`, { method: "DELETE", credentials: "include" });
      onDelete(doc.id);
    } catch { setDeleting(false); }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={cat.color}>{cat.icon}</span>
              <span className="font-semibold text-white text-sm leading-tight">{name}</span>
              {d?.confidence === "low" && (
                <span className="text-[10px] font-medium text-amber-400 bg-amber-950/40 border border-amber-800/50 px-1.5 py-0.5 rounded">
                  Low confidence
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <ExpiryBadge label={dateLabel} dateStr={primaryDate} />
              {renewalDate && expiryDate && renewalDate !== expiryDate && (
                <ExpiryBadge label="Renews" dateStr={renewalDate} />
              )}
              {d?.issuer && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  {d.issuer}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-50"
              title="Remove document"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {expanded && d && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2.5 overflow-hidden"
            >
              {/* IDs */}
              {(d.modelNumber || d.serialNumber || d.policyNumber) && (
                <div className="flex flex-wrap gap-3">
                  {d.policyNumber && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Hash className="w-3 h-3" />
                      <span className="text-slate-500">Policy/Ref:</span>
                      <span className="text-slate-300 font-mono">{d.policyNumber}</span>
                    </div>
                  )}
                  {d.modelNumber && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Tag className="w-3 h-3" />
                      <span className="text-slate-500">Model:</span>
                      <span className="text-slate-300 font-mono">{d.modelNumber}</span>
                    </div>
                  )}
                  {d.serialNumber && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Hash className="w-3 h-3" />
                      <span className="text-slate-500">S/N:</span>
                      <span className="text-slate-300 font-mono">{d.serialNumber}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="flex flex-wrap gap-3">
                {d.purchaseDate && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <CalendarDays className="w-3 h-3" />
                    <span className="text-slate-500">Purchased:</span>
                    <span className="text-slate-300">{fmt(d.purchaseDate)}</span>
                  </div>
                )}
                {d.effectiveDate && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <CalendarDays className="w-3 h-3" />
                    <span className="text-slate-500">Effective:</span>
                    <span className="text-slate-300">{fmt(d.effectiveDate)}</span>
                  </div>
                )}
                {d.coverageAmount && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Shield className="w-3 h-3" />
                    <span className="text-slate-500">Coverage:</span>
                    <span className="text-slate-300 font-semibold">{d.coverageAmount}</span>
                  </div>
                )}
              </div>

              {/* Coverage */}
              {d.coverageDetails && (
                <div className="text-xs text-slate-300 bg-slate-900/50 rounded-lg px-3 py-2 leading-relaxed">
                  {d.coverageDetails}
                </div>
              )}

              {/* Important terms */}
              {d.importantTerms && (
                <div className="flex items-start gap-2 text-xs text-amber-300/90 bg-amber-950/20 border border-amber-800/30 rounded-lg px-3 py-2 leading-relaxed">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  {d.importantTerms}
                </div>
              )}

              {/* Next actions */}
              {d.nextActions?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Recommended Actions
                  </p>
                  <ul className="space-y-1">
                    {d.nextActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[10px] text-slate-600 pt-1">
                Uploaded {fmt(doc.uploadedAt)} · {doc.fileName}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Pro gate banner ───────────────────────────────────────────────────────────

function ProGateBanner() {
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-3 text-center px-4">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Lock className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white mb-1">Pro feature</p>
        <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
          Upload and analyze documents with Pro. Maintly will automatically extract dates,
          coverage, and recommended actions.
        </p>
      </div>
      <a
        href="/#pricing"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-white transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Upgrade to Pro
      </a>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

export function HomeDocumentsWidget() {
  const { user } = useAuth();
  const userIsPro = isPro(user);

  const [docs, setDocs] = useState<HomeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DocCategory | "all">("all");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/documents`, { credentials: "include" });
      if (res.ok) setDocs(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleFile(file: File) {
    if (!userIsPro) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/documents/analyze`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch {
        throw new Error("Unexpected server response. Please try again.");
      }
      if (!res.ok) throw new Error(data?.error ?? "Upload failed. Please try again.");

      setDocs((prev) => [data.doc, ...prev]);
      const docName = data.docData?.documentTypeName ?? data.docData?.productName ?? "document";
      setUploadSuccess(`"${docName}" saved successfully!`);
      setTimeout(() => setUploadSuccess(null), 5000);

      // Switch to the correct tab
      const category = data.docData?.documentType as DocCategory;
      if (category && category !== activeTab) setActiveTab(category);
    } catch (err: any) {
      setUploadError(err.message ?? "Failed to analyze document.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!userIsPro) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleDelete(id: number) {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  // Filter + sort: expiring soonest first
  const filtered = docs
    .filter((d) => activeTab === "all" || d.docType === activeTab)
    .sort((a, b) => {
      const da = daysUntil(a.warrantyData?.expiryDate ?? a.warrantyData?.renewalDate ?? null) ?? Infinity;
      const db2 = daysUntil(b.warrantyData?.expiryDate ?? b.warrantyData?.renewalDate ?? null) ?? Infinity;
      return da - db2;
    });

  // Count per category
  const counts: Record<string, number> = { all: docs.length };
  for (const d of docs) {
    counts[d.docType] = (counts[d.docType] ?? 0) + 1;
  }

  // Count expiring-soon for alert badge
  const expiringCount = docs.filter((d) => {
    const days = daysUntil(d.warrantyData?.expiryDate ?? d.warrantyData?.renewalDate ?? null);
    return days !== null && days >= 0 && days <= 90;
  }).length;

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-700/60 overflow-hidden">
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Home Documents
                {expiringCount > 0 && (
                  <span className="text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-800/50 px-1.5 py-0.5 rounded-full">
                    {expiringCount} expiring soon
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                {loading ? "Loading…" : `${docs.length} document${docs.length !== 1 ? "s" : ""} stored`}
              </p>
            </div>
          </div>

          {userIsPro && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyzing…</> : <><Upload className="w-3.5 h-3.5" />Upload</>}
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Warranties, HOA docs, insurance, deeds & more — all analyzed by Maintly.
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* ── Category tabs ── */}
      <div className="px-5 pb-3">
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => {
            const count = counts[cat.id] ?? 0;
            const active = activeTab === cat.id;
            if (cat.id !== "all" && count === 0 && !active) return null;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id as DocCategory | "all")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? "bg-primary text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/60"
                }`}
              >
                <span className={active ? "text-white" : cat.color}>{cat.icon}</span>
                {cat.label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1 rounded ${active ? "bg-white/20 text-white" : "bg-slate-700 text-slate-400"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Notifications ── */}
      <AnimatePresence mode="popLayout">
        {uploadSuccess && (
          <motion.div key="success" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="mx-5 mb-3 flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs rounded-xl px-3 py-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            {uploadSuccess}
          </motion.div>
        )}
        {uploadError && (
          <motion.div key="error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="mx-5 mb-3 flex items-center justify-between gap-2 bg-red-950/60 border border-red-800/50 text-red-300 text-xs rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {uploadError}
            </div>
            <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-200 transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      <div className="px-5 pb-5">
        {/* Uploading state */}
        {uploading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-7 h-7 text-primary" />
              </div>
              <Loader2 className="w-5 h-5 text-primary animate-spin absolute -top-1 -right-1" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">Maintly is reading your document…</p>
              <p className="text-xs text-slate-400 mt-0.5">Extracting type, dates, coverage & key terms</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {!uploading && loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
          </div>
        )}

        {/* Pro gate for non-pro users with no docs */}
        {!uploading && !loading && !userIsPro && docs.length === 0 && (
          <ProGateBanner />
        )}

        {/* Drop zone / empty state for pro users */}
        {!uploading && !loading && userIsPro && filtered.length === 0 && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileRef.current?.click()}
            className={`flex flex-col items-center justify-center py-8 gap-3 text-center rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-slate-700/60 hover:border-primary/50"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center">
              <Upload className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">
                {activeTab === "all" ? "No documents uploaded yet" : `No ${CATEGORIES.find(c => c.id === activeTab)?.label ?? "documents"} yet`}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Drop a PDF or photo here, or click to browse<br />
                <span className="text-slate-600">Maintly auto-extracts type, dates & coverage</span>
              </p>
            </div>
          </div>
        )}

        {/* Non-pro users who have docs — show docs but no upload */}
        {!uploading && !loading && !userIsPro && docs.length > 0 && (
          <div className="mb-3 flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs rounded-xl px-3 py-2">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Upgrade to Pro to upload and analyze new documents.</span>
          </div>
        )}

        {/* Document list */}
        {!uploading && !loading && filtered.length > 0 && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); if (userIsPro) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`space-y-2 rounded-xl transition-colors ${dragOver ? "ring-2 ring-primary/40" : ""}`}
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((doc) => (
                <DocCard key={doc.id} doc={doc} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
            <p className="text-[10px] text-slate-600 text-center pt-1">
              {userIsPro ? "Drop a new file to add · " : ""}
              Sorted by expiry date · PDFs up to 8MB, images up to 5MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
