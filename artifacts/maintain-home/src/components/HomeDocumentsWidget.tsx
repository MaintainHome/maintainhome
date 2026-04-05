import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen, Upload, Loader2, Trash2,
  CalendarDays, Tag, Hash, CheckCircle2, AlertTriangle, Clock,
  FileText, X, Shield, Building2, Home, BookOpen, MoreHorizontal,
  Lock, Sparkles, Info, Eye, MessageSquare, Bot,
} from "lucide-react";
import { useAuth, isPro } from "@/contexts/AuthContext";
import { AIChatModal } from "@/components/AIChatModal";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Shared types ─────────────────────────────────────────────────────────────

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

export const CATEGORIES: { id: DocCategory | "all"; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "all",       label: "All",          icon: <FolderOpen className="w-3.5 h-3.5" />,     color: "text-slate-400" },
  { id: "warranty",  label: "Warranties",   icon: <Shield className="w-3.5 h-3.5" />,         color: "text-emerald-500" },
  { id: "hoa",       label: "HOA",          icon: <Building2 className="w-3.5 h-3.5" />,      color: "text-blue-500" },
  { id: "insurance", label: "Insurance",    icon: <Home className="w-3.5 h-3.5" />,            color: "text-violet-500" },
  { id: "deed",      label: "Deeds",        icon: <FileText className="w-3.5 h-3.5" />,       color: "text-amber-500" },
  { id: "manual",    label: "Manuals",      icon: <BookOpen className="w-3.5 h-3.5" />,       color: "text-cyan-500" },
  { id: "other",     label: "Other",        icon: <MoreHorizontal className="w-3.5 h-3.5" />, color: "text-slate-400" },
];

export function getCatConfig(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

// ── Date helpers ─────────────────────────────────────────────────────────────

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export function fmt(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Build Ask Maintly context message ────────────────────────────────────────

export function buildAskMessage(doc: HomeDoc): string {
  const d = doc.warrantyData;
  const cat = getCatConfig(doc.docType);
  const name = d?.documentTypeName ?? d?.productName ?? doc.displayName ?? doc.fileName;
  let msg = `Tell me about my ${cat.label.toLowerCase().replace(/s$/, "")} document for "${name}".`;
  if (d?.issuer) msg += ` It's issued by ${d.issuer}.`;
  if (d?.expiryDate) msg += ` It expires on ${fmt(d.expiryDate)}.`;
  else if (d?.renewalDate) msg += ` It renews on ${fmt(d.renewalDate)}.`;
  if (d?.coverageAmount) msg += ` Coverage amount: ${d.coverageAmount}.`;
  if (d?.policyNumber) msg += ` Policy/reference number: ${d.policyNumber}.`;
  if (d?.coverageDetails) {
    const trimmed = d.coverageDetails.length > 200 ? d.coverageDetails.substring(0, 200) + "…" : d.coverageDetails;
    msg += ` Coverage details: ${trimmed}`;
  }
  msg += " What should I know or do next?";
  return msg;
}

// ── Expiry badge ─────────────────────────────────────────────────────────────

export function ExpiryBadge({ label, dateStr }: { label?: string; dateStr: string | null }) {
  if (!dateStr) return null;
  const days = daysUntil(dateStr);
  const formatted = fmt(dateStr);
  const prefix = label ?? "Expires";

  if (days === null) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
      <CalendarDays className="w-3 h-3" />{prefix} {formatted}
    </span>
  );
  if (days < 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      <AlertTriangle className="w-3 h-3" />Expired {formatted}
    </span>
  );
  if (days <= 90) return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      <AlertTriangle className="w-3 h-3" />{prefix} {formatted} ({days}d)
    </span>
  );
  if (days <= 180) return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" />{prefix} {formatted}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" />{prefix} {formatted}
    </span>
  );
}

// ── Doc Details Modal ─────────────────────────────────────────────────────────

export function DocDetailsModal({
  doc,
  onClose,
  onDelete,
}: {
  doc: HomeDoc;
  onClose: () => void;
  onDelete: (id: number) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const d = doc.warrantyData;
  const cat = getCatConfig(doc.docType);
  const name = d?.documentTypeName ?? d?.productName ?? doc.displayName ?? doc.fileName;
  const primaryDate = d?.expiryDate ?? d?.renewalDate ?? null;
  const dateLabel = d?.expiryDate ? "Expires" : "Renews";

  async function handleDelete() {
    if (!confirm(`Permanently remove "${name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`${API_BASE}/api/documents/${doc.id}`, { method: "DELETE", credentials: "include" });
      onDelete(doc.id);
      onClose();
    } catch { setDeleting(false); }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          {/* Modal header */}
          <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                doc.docType === "warranty" ? "bg-emerald-100" :
                doc.docType === "hoa" ? "bg-blue-100" :
                doc.docType === "insurance" ? "bg-violet-100" :
                doc.docType === "deed" ? "bg-amber-100" :
                doc.docType === "manual" ? "bg-cyan-100" : "bg-slate-100"
              }`}>
                <span className={cat.color}>{cat.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{cat.label}</p>
                <h2 className="font-bold text-slate-900 text-base leading-tight">{name}</h2>
                {d?.confidence === "low" && (
                  <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                    Low confidence extraction
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            {/* Key dates row */}
            {(primaryDate || d?.effectiveDate || d?.purchaseDate) && (
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Key Dates</p>
                <div className="flex flex-wrap gap-2">
                  {primaryDate && <ExpiryBadge label={dateLabel} dateStr={primaryDate} />}
                  {d?.renewalDate && d?.expiryDate && d.renewalDate !== d.expiryDate && (
                    <ExpiryBadge label="Renews" dateStr={d.renewalDate} />
                  )}
                  {d?.effectiveDate && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      <CalendarDays className="w-3 h-3" />Effective {fmt(d.effectiveDate)}
                    </span>
                  )}
                  {d?.purchaseDate && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      <CalendarDays className="w-3 h-3" />Purchased {fmt(d.purchaseDate)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Details grid */}
            {(d?.issuer || d?.policyNumber || d?.modelNumber || d?.serialNumber || d?.coverageAmount) && (
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Details</p>
                <div className="bg-slate-50 rounded-2xl divide-y divide-slate-100 overflow-hidden border border-slate-100">
                  {d.issuer && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 w-24 shrink-0 font-medium">Issuer / Co.</span>
                      <span className="text-sm font-semibold text-slate-800">{d.issuer}</span>
                    </div>
                  )}
                  {d.policyNumber && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 w-24 shrink-0 font-medium">Policy / Ref #</span>
                      <span className="text-sm font-mono font-semibold text-slate-800">{d.policyNumber}</span>
                    </div>
                  )}
                  {d.coverageAmount && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 w-24 shrink-0 font-medium">Coverage</span>
                      <span className="text-sm font-bold text-emerald-600">{d.coverageAmount}</span>
                    </div>
                  )}
                  {d.modelNumber && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 w-24 shrink-0 font-medium">Model #</span>
                      <span className="text-sm font-mono font-semibold text-slate-800">{d.modelNumber}</span>
                    </div>
                  )}
                  {d.serialNumber && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 w-24 shrink-0 font-medium">Serial #</span>
                      <span className="text-sm font-mono font-semibold text-slate-800">{d.serialNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Coverage summary */}
            {d?.coverageDetails && (
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Summary</p>
                <div className="bg-slate-50 rounded-2xl px-4 py-3 text-sm text-slate-700 leading-relaxed border border-slate-100">
                  {d.coverageDetails}
                </div>
              </div>
            )}

            {/* Important terms */}
            {d?.importantTerms && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wide mb-0.5">Important Note</p>
                  <p className="text-sm text-amber-800 leading-relaxed">{d.importantTerms}</p>
                </div>
              </div>
            )}

            {/* Recommended actions */}
            {d?.nextActions && d.nextActions.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Recommended Actions</p>
                <ul className="space-y-2">
                  {d.nextActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-emerald-800 font-medium">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Maintly note */}
            <div className="flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-2xl px-4 py-3">
              <Bot className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-primary uppercase tracking-wide mb-0.5">Maintly knows this document</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ask Maintly about this document in the chat — he can answer questions about coverage, deadlines, or what to do next.
                </p>
              </div>
            </div>

            {/* File metadata */}
            <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
              <FileText className="w-3.5 h-3.5" />
              <span>{doc.fileName}</span>
              <span>·</span>
              <span>Uploaded {fmt(doc.uploadedAt)}</span>
              {doc.fileSizeBytes && <><span>·</span><span>{(doc.fileSizeBytes / 1024).toFixed(0)} KB</span></>}
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-slate-50">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Remove
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Dark-theme doc card (for Dashboard widget) ────────────────────────────────

function DarkDocCard({
  doc,
  onViewDetails,
  onAskMaintly,
  userIsPro,
}: {
  doc: HomeDoc;
  onViewDetails: (doc: HomeDoc) => void;
  onAskMaintly?: (message: string) => void;
  userIsPro: boolean;
}) {
  const d = doc.warrantyData;
  const cat = getCatConfig(doc.docType);
  const name = d?.documentTypeName ?? d?.productName ?? doc.displayName ?? doc.fileName;
  const primaryDate = d?.expiryDate ?? d?.renewalDate ?? null;
  const dateLabel = d?.expiryDate ? "Expires" : "Renews";
  const days = daysUntil(primaryDate);
  const isUrgent = days !== null && days <= 90;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`bg-slate-800/60 border rounded-2xl overflow-hidden transition-colors ${
        isUrgent ? "border-red-800/60" : "border-slate-700/60"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
            doc.docType === "warranty" ? "bg-emerald-900/40" :
            doc.docType === "hoa" ? "bg-blue-900/40" :
            doc.docType === "insurance" ? "bg-violet-900/40" :
            doc.docType === "deed" ? "bg-amber-900/40" :
            doc.docType === "manual" ? "bg-cyan-900/40" : "bg-slate-700/60"
          }`}>
            <span className={cat.color}>{cat.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-white text-sm leading-tight">{name}</span>
              {d?.confidence === "low" && (
                <span className="text-[10px] font-medium text-amber-400 bg-amber-950/40 border border-amber-800/50 px-1.5 py-0.5 rounded">
                  Low confidence
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {primaryDate ? (
                <ExpiryBadge label={dateLabel} dateStr={primaryDate} />
              ) : (
                <span className="text-xs text-slate-500">{cat.label}</span>
              )}
              {d?.issuer && (
                <span className="inline-flex items-center text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">
                  {d.issuer}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onViewDetails(doc)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 active:scale-[0.97] transition-all shadow-sm shadow-primary/20"
              >
                <Eye className="w-4 h-4" />
                View Details
              </button>
              {userIsPro ? (
                <button
                  onClick={() => onAskMaintly?.(buildAskMessage(doc))}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold text-primary border border-primary/40 hover:bg-primary/10 hover:border-primary active:scale-[0.97] transition-all"
                  title="Ask Maintly about this document"
                >
                  <MessageSquare className="w-4 h-4" />
                  Ask Maintly
                </button>
              ) : (
                <button
                  disabled
                  title="Upgrade to Pro to ask Maintly about your documents"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-50"
                >
                  <MessageSquare className="w-4 h-4" />
                  Ask Maintly
                  <span className="text-[10px] font-bold bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded ml-0.5">Pro</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Light-theme doc row (for Home Profile page) ───────────────────────────────

export function LightDocRow({
  doc,
  onViewDetails,
  onAskMaintly,
  userIsPro,
}: {
  doc: HomeDoc;
  onViewDetails: (doc: HomeDoc) => void;
  onAskMaintly?: (message: string) => void;
  userIsPro: boolean;
}) {
  const d = doc.warrantyData;
  const cat = getCatConfig(doc.docType);
  const name = d?.documentTypeName ?? d?.productName ?? doc.displayName ?? doc.fileName;
  const primaryDate = d?.expiryDate ?? d?.renewalDate ?? null;
  const dateLabel = d?.expiryDate ? "Expires" : "Renews";
  const days = daysUntil(primaryDate);
  const isUrgent = days !== null && days <= 90;

  return (
    <div className={`flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50 ${isUrgent ? "bg-red-50/50" : ""}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        doc.docType === "warranty" ? "bg-emerald-100" :
        doc.docType === "hoa" ? "bg-blue-100" :
        doc.docType === "insurance" ? "bg-violet-100" :
        doc.docType === "deed" ? "bg-amber-100" :
        doc.docType === "manual" ? "bg-cyan-100" : "bg-slate-100"
      }`}>
        <span className={cat.color}>{cat.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className="text-xs text-slate-400">{cat.label}</span>
          {primaryDate && (
            <>
              <span className="text-slate-200">·</span>
              <ExpiryBadge label={dateLabel} dateStr={primaryDate} />
            </>
          )}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <button
          onClick={() => onViewDetails(doc)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 active:scale-[0.97] transition-all shadow-sm shadow-primary/20"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">View Details</span>
          <span className="sm:hidden">Details</span>
        </button>
        {userIsPro ? (
          <button
            onClick={() => onAskMaintly?.(buildAskMessage(doc))}
            title="Ask Maintly about this document"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-primary border border-primary/30 hover:bg-primary/8 hover:border-primary/60 active:scale-[0.97] transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Ask Maintly</span>
            <span className="sm:hidden">Ask</span>
          </button>
        ) : (
          <button
            disabled
            title="Upgrade to Pro to ask Maintly about your documents"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Ask Maintly</span>
            <span className="sm:hidden">Ask</span>
            <span className="text-[9px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded ml-0.5 hidden sm:inline">Pro</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Shared data hook ─────────────────────────────────────────────────────────

export function useHomeDocuments() {
  const [docs, setDocs] = useState<HomeDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/documents`, { credentials: "include" });
      if (res.ok) setDocs(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function removeDoc(id: number) {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  function addDoc(doc: HomeDoc) {
    setDocs((prev) => [doc, ...prev]);
  }

  return { docs, loading, load, removeDoc, addDoc };
}

// ── Pro gate banner ───────────────────────────────────────────────────────────

function ProGateBanner({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3 text-center px-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${dark ? "bg-primary/10" : "bg-primary/10"}`}>
        <Lock className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className={`text-sm font-semibold mb-1 ${dark ? "text-white" : "text-slate-800"}`}>Pro feature</p>
        <p className={`text-xs leading-relaxed max-w-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
          Upload and analyze documents with Pro. Maintly automatically extracts dates, coverage, and recommended actions.
        </p>
      </div>
      <a
        href="/#pricing"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 text-white transition-colors shadow-md shadow-primary/20"
      >
        <Sparkles className="w-4 h-4" />
        Upgrade to Pro — from $4.99/mo
      </a>
    </div>
  );
}

// ── Main Dashboard widget (dark theme) ───────────────────────────────────────

export function HomeDocumentsWidget({ onAskMaintly }: { onAskMaintly?: (message: string) => void }) {
  const { user } = useAuth();
  const userIsPro = isPro(user);
  const { docs, loading, removeDoc, addDoc } = useHomeDocuments();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DocCategory | "all">("all");
  const [dragOver, setDragOver] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<HomeDoc | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!userIsPro) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/documents/analyze`, {
        method: "POST", body: fd, credentials: "include",
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch {
        throw new Error("Unexpected server response. Please try again.");
      }
      if (!res.ok) throw new Error(data?.error ?? "Upload failed. Please try again.");

      addDoc(data.doc);
      const docName = data.docData?.documentTypeName ?? data.docData?.productName ?? "document";
      setUploadSuccess(`"${docName}" saved!`);
      setTimeout(() => setUploadSuccess(null), 5000);
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

  const filtered = docs
    .filter((d) => activeTab === "all" || d.docType === activeTab)
    .sort((a, b) => {
      const da = daysUntil(a.warrantyData?.expiryDate ?? a.warrantyData?.renewalDate ?? null) ?? Infinity;
      const db2 = daysUntil(b.warrantyData?.expiryDate ?? b.warrantyData?.renewalDate ?? null) ?? Infinity;
      return da - db2;
    });

  const counts: Record<string, number> = { all: docs.length };
  for (const d of docs) { counts[d.docType] = (counts[d.docType] ?? 0) + 1; }

  const expiringCount = docs.filter((d) => {
    const days = daysUntil(d.warrantyData?.expiryDate ?? d.warrantyData?.renewalDate ?? null);
    return days !== null && days >= 0 && days <= 90;
  }).length;

  return (
    <>
      <div className="rounded-2xl bg-slate-900/80 border border-slate-700/60 overflow-hidden">
        {/* Header */}
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyzing…</> : <><Upload className="w-3.5 h-3.5" />Upload</>}
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Warranties, HOA docs, insurance, deeds & more — all analyzed by Maintly.
          </p>
        </div>

        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileInput} />

        {/* Category tabs */}
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
                    active ? "bg-primary text-white" : "text-slate-400 hover:text-white hover:bg-slate-700/60"
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

        {/* Notifications */}
        <AnimatePresence mode="popLayout">
          {uploadSuccess && (
            <motion.div key="success" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="mx-5 mb-3 flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs rounded-xl px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{uploadSuccess}
            </motion.div>
          )}
          {uploadError && (
            <motion.div key="error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="mx-5 mb-3 flex items-center justify-between gap-2 bg-red-950/60 border border-red-800/50 text-red-300 text-xs rounded-xl px-3 py-2">
              <div className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{uploadError}</div>
              <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-200 transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="px-5 pb-5">
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

          {!uploading && loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
            </div>
          )}

          {!uploading && !loading && !userIsPro && docs.length === 0 && <ProGateBanner dark />}

          {!uploading && !loading && !userIsPro && docs.length > 0 && (
            <div className="mb-3 flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs rounded-xl px-3 py-2">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Upgrade to Pro to upload and analyze new documents.</span>
            </div>
          )}

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

          {!uploading && !loading && filtered.length > 0 && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); if (userIsPro) setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`space-y-2 rounded-xl transition-colors ${dragOver ? "ring-2 ring-primary/40" : ""}`}
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((doc) => (
                  <DarkDocCard
                    key={doc.id}
                    doc={doc}
                    onViewDetails={setSelectedDoc}
                    onAskMaintly={onAskMaintly}
                    userIsPro={userIsPro}
                  />
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

      {/* Details modal */}
      {selectedDoc && (
        <DocDetailsModal
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDelete={(id) => { removeDoc(id); setSelectedDoc(null); }}
        />
      )}
    </>
  );
}

// ── Light-theme section for My Home Profile page ──────────────────────────────

export function HomeDocumentsSection() {
  const { user } = useAuth();
  const userIsPro = isPro(user);
  const { docs, loading, removeDoc, addDoc } = useHomeDocuments();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DocCategory | "all">("all");
  const [dragOver, setDragOver] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<HomeDoc | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleAskMaintly(message: string) {
    setChatMessage(message);
    setChatOpen(true);
  }

  async function handleFile(file: File) {
    if (!userIsPro) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/documents/analyze`, {
        method: "POST", body: fd, credentials: "include",
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch {
        throw new Error("Unexpected server response. Please try again.");
      }
      if (!res.ok) throw new Error(data?.error ?? "Upload failed. Please try again.");

      addDoc(data.doc);
      const docName = data.docData?.documentTypeName ?? data.docData?.productName ?? "document";
      setUploadSuccess(`"${docName}" saved successfully!`);
      setTimeout(() => setUploadSuccess(null), 6000);
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

  const expiringCount = docs.filter((d) => {
    const days = daysUntil(d.warrantyData?.expiryDate ?? d.warrantyData?.renewalDate ?? null);
    return days !== null && days >= 0 && days <= 90;
  }).length;

  const filtered = docs
    .filter((d) => activeTab === "all" || d.docType === activeTab)
    .sort((a, b) => {
      const da = daysUntil(a.warrantyData?.expiryDate ?? a.warrantyData?.renewalDate ?? null) ?? Infinity;
      const db2 = daysUntil(b.warrantyData?.expiryDate ?? b.warrantyData?.renewalDate ?? null) ?? Infinity;
      return da - db2;
    });

  const counts: Record<string, number> = { all: docs.length };
  for (const d of docs) { counts[d.docType] = (counts[d.docType] ?? 0) + 1; }

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-primary" />
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Home Documents
                  {expiringCount > 0 && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                      {expiringCount} expiring soon
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Warranties, HOA docs, insurance policies, deeds, manuals & more
                </p>
              </div>
            </div>
            {userIsPro ? (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm shadow-primary/20"
              >
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing…</> : <><Upload className="w-4 h-4" />Upload Document</>}
              </button>
            ) : (
              <a
                href="/#pricing"
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Upgrade
              </a>
            )}
          </div>
        </div>

        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileInput} />

        {/* Notifications */}
        <AnimatePresence mode="popLayout">
          {uploadSuccess && (
            <motion.div key="success" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="mx-5 mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-2.5 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />{uploadSuccess}
            </motion.div>
          )}
          {uploadError && (
            <motion.div key="error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="mx-5 mt-4 flex items-center justify-between gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{uploadError}</div>
              <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category tabs */}
        {docs.length > 0 && (
          <div className="px-5 pt-4 pb-2">
            <div className="flex gap-1 flex-wrap">
              {CATEGORIES.map((cat) => {
                const count = counts[cat.id] ?? 0;
                const active = activeTab === cat.id;
                if (cat.id !== "all" && count === 0) return null;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id as DocCategory | "all")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      active ? "bg-primary text-white shadow-sm" : "text-slate-500 bg-slate-100 hover:bg-slate-200"
                    }`}
                  >
                    <span className={active ? "text-white" : cat.color}>{cat.icon}</span>
                    {cat.label}
                    {count > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 rounded-full ${active ? "bg-white/25 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content */}
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
          </div>
        )}

        {!loading && uploading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-7 h-7 text-primary" />
              </div>
              <Loader2 className="w-5 h-5 text-primary animate-spin absolute -top-1 -right-1" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-800">Maintly is reading your document…</p>
              <p className="text-xs text-slate-500 mt-0.5">Extracting type, dates, coverage & key terms</p>
            </div>
          </div>
        )}

        {!loading && !uploading && !userIsPro && docs.length === 0 && <ProGateBanner />}

        {!loading && !uploading && !userIsPro && docs.length > 0 && (
          <div className="mx-5 my-3 flex items-center gap-2 bg-primary/5 border border-primary/15 text-primary text-sm rounded-xl px-4 py-2.5 font-medium">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Upgrade to Pro to upload and analyze new documents.</span>
          </div>
        )}

        {!loading && !uploading && userIsPro && filtered.length === 0 && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileRef.current?.click()}
            className={`m-5 flex flex-col items-center justify-center py-10 gap-3 text-center rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Upload className="w-7 h-7 text-slate-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-700">Upload your first document</p>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                Drop a PDF or photo here, or click to browse<br />
                <span className="text-slate-400">Maintly reads it and extracts key info automatically</span>
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {["Warranties", "Insurance", "HOA Docs", "Deeds", "Manuals"].map(t => (
                  <span key={t} className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && !uploading && filtered.length > 0 && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); if (userIsPro) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`divide-y divide-slate-50 transition-all ${dragOver ? "ring-2 ring-primary/20 ring-inset" : ""}`}
          >
            {filtered.map((doc) => (
              <LightDocRow
                key={doc.id}
                doc={doc}
                onViewDetails={setSelectedDoc}
                onAskMaintly={handleAskMaintly}
                userIsPro={userIsPro}
              />
            ))}
          </div>
        )}

        {!loading && docs.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              {docs.length} document{docs.length !== 1 ? "s" : ""} stored · sorted by expiry date
              {userIsPro && " · drag & drop to add more"}
            </p>
          </div>
        )}
      </div>

      {/* Details modal */}
      {selectedDoc && (
        <DocDetailsModal
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDelete={(id) => { removeDoc(id); setSelectedDoc(null); }}
        />
      )}

      {/* Ask Maintly chat modal */}
      <AIChatModal
        isOpen={chatOpen}
        onClose={() => { setChatOpen(false); setChatMessage(""); }}
        initialMessage={chatMessage}
      />
    </>
  );
}
