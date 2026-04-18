import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, ClipboardList, Loader2, LogOut, Calendar,
  Pencil, Paperclip, FileText, Plus, Upload, CalendarDays, Check, X,
  AlertTriangle, Lock, FileDown, Zap, Trash2,
} from "lucide-react";
import { BrandedPageHeader } from "@/components/BrandedPageHeader";
import { useAuth, isPro } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

interface LogEntry {
  id: number;
  taskName: string;
  taskKey: string;
  month: string;
  completedAt: string;
  notes: string | null;
  zipCode: string | null;
}

interface CustomNote {
  id: number;
  title: string;
  noteDate: string;
  content: string;
  createdAt: string;
}

interface UserDocument {
  id: number;
  fileName: string;
  objectPath: string;
  contentType: string;
  fileSizeBytes: number | null;
  uploadedAt: string;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default function HistoryPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const userIsPro = isPro(user);

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [customNotes, setCustomNotes] = useState<CustomNote[]>([]);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Export state
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<null | "csv" | "pdf">(null);

  // Note form state
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [noteContent, setNoteContent] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // Upload form state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadUploading, setUploadUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/user/log", { credentials: "include" }).then(r => r.json()).catch(() => []),
      fetch("/api/user/notes", { credentials: "include" }).then(r => r.json()).catch(() => []),
      fetch("/api/user/documents", { credentials: "include" }).then(r => r.json()).catch(() => []),
    ]).then(([log, notes, docs]) => {
      setEntries(Array.isArray(log) ? log : []);
      setCustomNotes(Array.isArray(notes) ? notes : []);
      setDocuments(Array.isArray(docs) ? docs : []);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleExport = async (format: "csv" | "pdf") => {
    setExportLoading(format);
    setExportMsg(null);
    try {
      const res = await fetch(`/api/user/export.${format}`, { credentials: "include" });
      if (!res.ok) {
        const ct = res.headers.get("content-type") ?? "";
        const msg = ct.includes("json") ? (await res.json()).error : "Export failed. Please try again.";
        setExportMsg(msg ?? "Export failed. Please try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `maintainhome-history-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      setExportMsg("Export failed. Please try again.");
    } finally {
      setExportLoading(null);
    }
  };

  const handleAddNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim() || !noteDate) return;
    setNoteSubmitting(true);
    try {
      const res = await fetch("/api/user/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: noteTitle.trim(), noteDate, content: noteContent.trim() }),
      });
      if (res.ok) {
        const note = await res.json();
        setCustomNotes(prev => [note, ...prev]);
        setNoteTitle("");
        setNoteDate(new Date().toISOString().slice(0, 10));
        setNoteContent("");
        setShowNoteForm(false);
      }
    } catch {} finally {
      setNoteSubmitting(false);
    }
  };

  const handleDeleteLogEntry = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this entry? This cannot be undone.")) return;
    setEntries(prev => prev.filter(e => e.id !== id));
    fetch(`/api/user/log/${id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
  };

  const handleDeleteNote = (id: number) => {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    setCustomNotes(prev => prev.filter(n => n.id !== id));
    fetch(`/api/user/notes/${id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Only JPG, PNG, and PDF files are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 5 MB.`);
      return;
    }
    setUploadUploading(true);
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed");

      const docRes = await fetch("/api/user/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fileName: file.name, objectPath, contentType: file.type, fileSizeBytes: file.size }),
      });
      if (docRes.ok) {
        const doc = await docRes.json();
        setDocuments(prev => [doc, ...prev]);
        setShowUploadForm(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploadUploading(false);
    }
  };

  const handleDeleteDocument = (id: number) => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    setDocuments(prev => prev.filter(d => d.id !== id));
    fetch(`/api/user/documents/${id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const byMonth: Record<string, LogEntry[]> = {};
  entries.forEach((e) => {
    if (!byMonth[e.month]) byMonth[e.month] = [];
    byMonth[e.month].push(e);
  });

  const totalCount = entries.length + customNotes.length + (userIsPro ? documents.length : 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <BrandedPageHeader title="Maintenance History" icon={<ClipboardList className="w-5 h-5 text-primary shrink-0" />}>
        <span className="text-xs text-slate-500 hidden sm:block truncate max-w-[160px]">
          {user?.email}
        </span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </BrandedPageHeader>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="flex items-end gap-4 mb-2">
            <img
              src={`${import.meta.env.BASE_URL}images/maintly_maintain.png`}
              alt="Maintly"
              className="h-20 w-auto object-contain shrink-0 drop-shadow-sm"
            />
            <div>
              <h1 className="text-2xl font-display font-black text-foreground">
                My Maintenance History
              </h1>
              {!loading && (
                <p className="text-slate-500 text-sm">
                  {totalCount} {totalCount === 1 ? "entry" : "entries"} —{" "}
                  {userIsPro ? "tasks, notes & documents" : "tasks & notes"}
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6 mt-8">

              {/* ── Notes & Documents Card ── */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* Header with action buttons */}
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                      <ClipboardList className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">
                      {userIsPro ? "Notes & Documents" : "Custom Notes"}
                    </span>
                    {(customNotes.length + (userIsPro ? documents.length : 0)) > 0 && (
                      <span className="ml-auto text-xs font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                        {customNotes.length + (userIsPro ? documents.length : 0)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Add Custom Note — available to all users */}
                    <button
                      onClick={() => { setShowNoteForm(v => !v); setShowUploadForm(false); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        showNoteForm
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Custom Note
                    </button>

                    {/* Upload Document — Pro only */}
                    {userIsPro ? (
                      <button
                        onClick={() => { setShowUploadForm(v => !v); setShowNoteForm(false); setUploadError(null); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          showUploadForm
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload Document
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-slate-300 text-slate-400 cursor-not-allowed">
                        <Lock className="w-3.5 h-3.5" />
                        Upload Document <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">Pro</span>
                      </div>
                    )}

                    {/* Export — Pro only */}
                    {userIsPro && (
                      <>
                        <button
                          onClick={() => handleExport("pdf")}
                          disabled={exportLoading !== null}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-primary/40 bg-white text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                          title="Download a polished PDF of your maintenance history (great for resale)"
                        >
                          {exportLoading === "pdf"
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <FileDown className="w-3.5 h-3.5" />}
                          Export PDF
                        </button>
                        <button
                          onClick={() => handleExport("csv")}
                          disabled={exportLoading !== null}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                          title="Download a spreadsheet (CSV) of every task, note, and document"
                        >
                          {exportLoading === "csv"
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <FileDown className="w-3.5 h-3.5" />}
                          Export CSV
                        </button>
                      </>
                    )}
                  </div>

                  {/* Export error message */}
                  {exportMsg && (
                    <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-xs text-red-700 font-medium">{exportMsg}</p>
                      <button onClick={() => setExportMsg(null)} className="ml-auto text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Free user upgrade nudge for documents + export */}
                  {!userIsPro && (
                    <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                      <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-amber-800">
                          <span className="font-semibold">Pro feature:</span> Upload documents (warranties, invoices, receipts, photos) and export your full history as a polished PDF or CSV — perfect for resale.
                        </p>
                        <button
                          onClick={() => navigate("/#pricing")}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
                        >
                          <Zap className="w-3 h-3" />
                          Upgrade to Pro
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Add Custom Note Form */}
                <AnimatePresence>
                  {showNoteForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-b border-slate-200 bg-blue-50 px-5 py-4 space-y-3 overflow-hidden"
                    >
                      <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Pencil className="w-3.5 h-3.5" />
                        Custom Note
                      </p>
                      <input
                        type="text"
                        value={noteTitle}
                        onChange={e => setNoteTitle(e.target.value)}
                        placeholder="Title (e.g. Replaced HVAC filter, Hired plumber)"
                        maxLength={120}
                        className="w-full text-sm rounded-lg border border-blue-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-blue-400 shrink-0" />
                        <input
                          type="date"
                          value={noteDate}
                          onChange={e => setNoteDate(e.target.value)}
                          className="text-sm rounded-lg border border-blue-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                      </div>
                      <textarea
                        value={noteContent}
                        onChange={e => setNoteContent(e.target.value)}
                        placeholder="Detailed note — what was done, who did it, cost, warranty info, etc."
                        rows={3}
                        className="w-full text-sm rounded-lg border border-blue-200 bg-white px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddNote}
                          disabled={noteSubmitting || !noteTitle.trim() || !noteContent.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                        >
                          {noteSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Save Note
                        </button>
                        <button
                          onClick={() => { setShowNoteForm(false); setNoteTitle(""); setNoteContent(""); }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-sm font-medium transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Upload Document Form */}
                <AnimatePresence>
                  {showUploadForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-b border-slate-200 bg-blue-50 px-5 py-4 space-y-3 overflow-hidden"
                    >
                      <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5" />
                        Upload Document
                      </p>
                      <p className="text-xs text-blue-700">Accepted: JPG, PNG, PDF — max 5 MB per file.</p>
                      <div
                        className="border-2 border-dashed border-blue-300 rounded-xl bg-white px-4 py-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploadUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                            <p className="text-sm text-blue-600 font-medium">Uploading…</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-blue-300" />
                            <p className="text-sm text-blue-700 font-medium">Click to select file</p>
                            <p className="text-xs text-blue-400">Warranty, invoice, receipt, photo, or PDF</p>
                          </div>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                      />
                      {uploadError && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-red-700 font-medium">{uploadError}</p>
                        </div>
                      )}
                      <button
                        onClick={() => { setShowUploadForm(false); setUploadError(null); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-sm font-medium transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Notes & Documents list */}
                {customNotes.length === 0 && (!userIsPro || documents.length === 0) ? (
                  <div className="px-5 py-6 text-center text-slate-400 text-sm">
                    {customNotes.length === 0
                      ? "No custom notes yet — click \"Add Custom Note\" above to add one."
                      : "No documents yet — use the buttons above to add some."}
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {customNotes.map(n => (
                      <li key={`note-${n.id}`} className="flex items-start gap-3 px-5 py-4 bg-blue-50/40 group">
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                          <Pencil className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-blue-600">
                              {new Date(n.noteDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            <span className="text-sm text-blue-900 font-semibold">{n.title}</span>
                          </div>
                          <p className="text-xs text-blue-700 mt-0.5 leading-snug">{n.content}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteNote(n.id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete note"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                    {userIsPro && documents.map(d => {
                      const ext = d.fileName.split(".").pop()?.toUpperCase() ?? "FILE";
                      const dateStr = new Date(d.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      const isImage = d.contentType.startsWith("image/");
                      return (
                        <li key={`doc-${d.id}`} className="flex items-start gap-3 px-5 py-4 bg-blue-50/40 group">
                          <div className="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                            {isImage
                              ? <FileText className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                              : <Paperclip className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-blue-600">{dateStr}</span>
                              <span className="inline-flex items-center text-xs font-bold bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded">{ext}</span>
                              <span className="text-sm text-blue-900 font-semibold truncate max-w-[200px]">{d.fileName}</span>
                            </div>
                            {d.fileSizeBytes && (
                              <p className="text-xs text-blue-500 mt-0.5">{(d.fileSizeBytes / 1024).toFixed(0)} KB</p>
                            )}
                            <a
                              href={`/api/storage${d.objectPath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline mt-1"
                            >
                              <Upload className="w-3 h-3 rotate-180" />
                              View / Download
                            </a>
                          </div>
                          <button
                            onClick={() => handleDeleteDocument(d.id)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Delete document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* ── Completed Tasks by Month ── */}
              {entries.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="font-semibold text-slate-700 mb-1">No completed tasks yet</p>
                  <p className="text-sm text-slate-400 max-w-xs mx-auto">
                    Generate your home calendar and mark tasks as done — they'll appear here permanently.
                  </p>
                  <button
                    onClick={() => navigate("/")}
                    className="mt-5 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
                  >
                    Generate My Calendar
                  </button>
                </div>
              ) : (
                <>
                  {Object.entries(byMonth).map(([month, items]) => (
                    <div key={month} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center gap-2 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                        <Calendar className="w-4 h-4 text-primary" />
                        <h3 className="font-bold text-slate-800 text-sm">{month}</h3>
                        <span className="ml-auto text-xs text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                          {items.length} completed
                        </span>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {items.map((entry) => (
                          <li key={entry.id} className="flex items-start gap-3 px-5 py-4 group">
                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 leading-snug">
                                {entry.taskName}
                              </p>
                              {entry.notes && (
                                <p className="text-xs text-slate-500 mt-0.5 italic">"{entry.notes}"</p>
                              )}
                              <p className="text-xs text-slate-400 mt-1">
                                Completed{" "}
                                {new Date(entry.completedAt).toLocaleDateString("en-US", {
                                  month: "short", day: "numeric", year: "numeric",
                                })}
                                {entry.zipCode ? ` · ZIP ${entry.zipCode}` : ""}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteLogEntry(entry.id)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Delete entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  <p className="text-xs text-center text-slate-400 pb-4">
                    {entries.length} task{entries.length !== 1 ? "s" : ""} completed total
                  </p>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
