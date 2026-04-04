import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Upload, Loader2, Trash2, ChevronDown, ChevronUp,
  CalendarDays, Tag, Hash, CheckCircle2, AlertTriangle, Clock,
  FileText, X,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface WarrantyData {
  productName: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  expiryDate: string | null;
  coverageDetails: string | null;
  nextActions: string[];
  confidence: "high" | "medium" | "low";
}

interface WarrantyDoc {
  id: number;
  fileName: string;
  displayName: string | null;
  contentType: string;
  fileSizeBytes: number | null;
  warrantyData: WarrantyData | null;
  uploadedAt: string;
}

function daysUntilExpiry(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const expiry = new Date(dateStr);
  if (isNaN(expiry.getTime())) return null;
  return Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ dateStr }: { dateStr: string | null }) {
  if (!dateStr) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
        <CalendarDays className="w-3 h-3" />
        No expiry info
      </span>
    );
  }

  const days = daysUntilExpiry(dateStr);
  const formatted = new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  if (days === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
        <CalendarDays className="w-3 h-3" />
        Expires {formatted}
      </span>
    );
  }

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-950/60 border border-red-800/50 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        Expired {formatted}
      </span>
    );
  }

  if (days <= 90) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-950/60 border border-red-800/50 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        Expires {formatted} ({days}d)
      </span>
    );
  }

  if (days <= 180) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" />
        Expires {formatted}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" />
      Expires {formatted}
    </span>
  );
}

function WarrantyCard({
  doc,
  onDelete,
}: {
  doc: WarrantyDoc;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const d = doc.warrantyData;
  const name = d?.productName ?? doc.displayName ?? doc.fileName;

  async function handleDelete() {
    if (!confirm(`Remove "${name}" from your warranties?`)) return;
    setDeleting(true);
    try {
      await fetch(`${API_BASE}/api/warranties/${doc.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      onDelete(doc.id);
    } catch {
      setDeleting(false);
    }
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
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-white text-sm leading-tight truncate">{name}</span>
              {d?.confidence === "low" && (
                <span className="text-[10px] font-medium text-amber-400 bg-amber-950/40 border border-amber-800/50 px-1.5 py-0.5 rounded">
                  Low confidence
                </span>
              )}
            </div>
            <ExpiryBadge dateStr={d?.expiryDate ?? null} />
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
              title="Remove warranty"
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
              {(d.modelNumber || d.serialNumber) && (
                <div className="flex flex-wrap gap-3">
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

              {d.purchaseDate && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <CalendarDays className="w-3 h-3" />
                  <span className="text-slate-500">Purchased:</span>
                  <span className="text-slate-300">
                    {new Date(d.purchaseDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              )}

              {d.coverageDetails && (
                <div className="text-xs text-slate-300 bg-slate-900/50 rounded-lg px-3 py-2 leading-relaxed">
                  {d.coverageDetails}
                </div>
              )}

              {d.nextActions && d.nextActions.length > 0 && (
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
                Uploaded {new Date(doc.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {" · "}{doc.fileName}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function WarrantiesWidget() {
  const [warranties, setWarranties] = useState<WarrantyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/warranties`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setWarranties(data);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileRef.current) fileRef.current = e.target;
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/warranties/analyze`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch {
        throw new Error("Unexpected server response. Please try again.");
      }

      if (!res.ok) {
        throw new Error(data?.error ?? "Upload failed. Please try again.");
      }

      setWarranties((prev) => [data.doc, ...prev]);
      const productName = data.warrantyData?.productName ?? "document";
      setUploadSuccess(`"${productName}" warranty saved successfully!`);
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err: any) {
      setUploadError(err.message ?? "Failed to analyze document.");
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(id: number) {
    setWarranties((prev) => prev.filter((w) => w.id !== id));
  }

  const sortedWarranties = [...warranties].sort((a, b) => {
    const da = daysUntilExpiry(a.warrantyData?.expiryDate ?? null) ?? Infinity;
    const db2 = daysUntilExpiry(b.warrantyData?.expiryDate ?? null) ?? Infinity;
    return da - db2;
  });

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-700/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">My Warranties</h3>
            <p className="text-xs text-slate-500">
              {loading ? "Loading…" : warranties.length === 0 ? "No warranties yet" : `${warranties.length} warranty${warranties.length !== 1 ? " docs" : ""}`}
            </p>
          </div>
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {uploading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyzing…</>
          ) : (
            <><Upload className="w-3.5 h-3.5" />Upload</>
          )}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <AnimatePresence mode="popLayout">
        {uploadSuccess && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs rounded-xl px-3 py-2 mb-3"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            {uploadSuccess}
          </motion.div>
        )}

        {uploadError && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center justify-between gap-2 bg-red-950/60 border border-red-800/50 text-red-300 text-xs rounded-xl px-3 py-2 mb-3"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {uploadError}
            </div>
            <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-200 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {uploading && (
        <div className="flex flex-col items-center justify-center py-6 gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin absolute -top-1 -right-1" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Maintly is reading your warranty…</p>
            <p className="text-xs text-slate-400 mt-0.5">Extracting product info, dates & coverage</p>
          </div>
        </div>
      )}

      {!uploading && loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
        </div>
      )}

      {!uploading && !loading && warranties.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center">
            <FileText className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">No warranties uploaded yet</p>
            <p className="text-xs text-slate-600 mt-1">
              Upload a PDF or photo — Maintly extracts product info,<br />expiry dates & coverage automatically.
            </p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-emerald-400 border border-emerald-800/60 hover:bg-emerald-950/40 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload your first warranty
          </button>
        </div>
      )}

      {!uploading && !loading && sortedWarranties.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {sortedWarranties.map((doc) => (
              <WarrantyCard key={doc.id} doc={doc} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
          <p className="text-[10px] text-slate-600 text-center pt-1">
            Sorted by expiry date · PDFs up to 8MB, images up to 5MB
          </p>
        </div>
      )}
    </div>
  );
}
