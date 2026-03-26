import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, AlertTriangle, CheckCircle2, Wrench, DollarSign,
  Info, ChevronDown, ChevronUp, Lock, Check, FileDown, ClipboardList,
  X, Pencil, BookOpen, Zap, Star, MessageCircle, Paperclip, Upload,
  FileText, CalendarDays, Plus, Loader2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth, isPro } from "@/contexts/AuthContext";
import { AIChatModal } from "@/components/AIChatModal";
import { useLocation } from "wouter";

const MONTH_EMOJIS: Record<string, string> = {
  January: "❄️", February: "🌨️", March: "🌱", April: "🌧️",
  May: "🌸", June: "☀️", July: "🌞", August: "🏖️",
  September: "🍂", October: "🎃", November: "🍁", December: "🎄",
};

interface CalendarTask {
  task: string;
  difficulty: string;
  cost: string;
  why: string;
  tip: string;
}

interface MonthlyCalendar {
  month: string;
  tasks: CalendarTask[];
}

interface CalendarData {
  state: string;
  calendar: MonthlyCalendar[];
  big_ticket_alerts: string[];
  one_time_tasks: string[];
}

interface CalendarResultsProps {
  data: CalendarData;
  onReset: () => void;
  quizAnswers?: Record<string, string>;
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

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: CalendarTask;
  taskKey: string;
  isCompleted: boolean;
  completionNote: string;
  onMarkDone: (key: string, note: string) => void;
  onUnmark: (key: string) => void;
  showMarkDone: boolean;
}

function TaskCard({ task, taskKey, isCompleted, completionNote, onMarkDone, onUnmark, showMarkDone }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [marking, setMarking] = useState(false);
  const [noteText, setNoteText] = useState("");
  const isPro = task.difficulty?.toLowerCase().includes("pro");

  const handleConfirm = () => {
    onMarkDone(taskKey, noteText);
    setMarking(false);
    setNoteText("");
  };

  const handleCancel = () => {
    setMarking(false);
    setNoteText("");
  };

  return (
    <div className={`rounded-xl border overflow-hidden shadow-sm transition-all duration-200 ${
      isCompleted
        ? "border-emerald-200 bg-emerald-50"
        : "border-slate-100 bg-white"
    }`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full text-left p-4 flex items-start gap-3 transition-colors ${
          isCompleted ? "hover:bg-emerald-100/60" : "hover:bg-slate-50"
        }`}
      >
        {/* Completion indicator */}
        <div className={`shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          isCompleted
            ? "border-emerald-500 bg-emerald-500"
            : "border-slate-300 bg-white"
        }`}>
          {isCompleted && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm leading-snug mb-1.5 ${
            isCompleted ? "line-through text-slate-400" : "text-slate-900"
          }`}>
            {task.task}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              isPro ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
            }`}>
              <Wrench className="w-3 h-3" />
              {task.difficulty || "DIY"}
            </span>
            {task.cost && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                <DollarSign className="w-3 h-3" />
                {task.cost}
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                <Check className="w-3 h-3" />
                Done
              </span>
            )}
          </div>
        </div>

        {expanded
          ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
          : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
        }
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
              {task.why && (
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600">
                    <span className="font-medium text-slate-800">Why it matters:</span> {task.why}
                  </p>
                </div>
              )}
              {task.tip && (
                <div className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600">
                    <span className="font-medium text-slate-800">Tip:</span> {task.tip}
                  </p>
                </div>
              )}

              {/* Completion note (if done) */}
              {isCompleted && completionNote && (
                <div className="flex gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                  <Pencil className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-800">
                    <span className="font-medium">Note:</span> {completionNote}
                  </p>
                </div>
              )}

              {/* Mark as Done / Unmark actions */}
              {showMarkDone && !isCompleted && !marking && (
                <button
                  onClick={() => setMarking(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors mt-1"
                >
                  <Check className="w-4 h-4" />
                  Mark as Done
                </button>
              )}

              {showMarkDone && !isCompleted && marking && (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Optional note (e.g. Hired ABC Co., cost $150)"
                    rows={2}
                    className="w-full text-sm rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirm}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Confirm
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-sm font-medium transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {showMarkDone && isCompleted && (
                <button
                  onClick={() => onUnmark(taskKey)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mt-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Unmark
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── One-Time Task Row ────────────────────────────────────────────────────────

interface OneTimeTaskRowProps {
  taskKey: string;
  taskText: string;
  isCompleted: boolean;
  completionNote: string;
  onMarkDone: (key: string, note: string) => void;
  onUnmark: (key: string) => void;
}

function OneTimeTaskRow({ taskKey, taskText, isCompleted, completionNote, onMarkDone, onUnmark }: OneTimeTaskRowProps) {
  const [marking, setMarking] = useState(false);
  const [noteText, setNoteText] = useState("");

  const handleConfirm = () => {
    onMarkDone(taskKey, noteText);
    setMarking(false);
    setNoteText("");
  };

  return (
    <li className={`rounded-xl border p-3 transition-all duration-200 ${
      isCompleted ? "border-emerald-200 bg-emerald-50" : "border-blue-100 bg-white"
    }`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => !isCompleted && setMarking(!marking)}
          className={`shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            isCompleted
              ? "border-emerald-500 bg-emerald-500 cursor-default"
              : "border-blue-300 bg-white hover:border-emerald-400 cursor-pointer"
          }`}
        >
          {isCompleted && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${isCompleted ? "line-through text-slate-400" : "text-slate-700"}`}>
            {taskText}
          </p>
          {isCompleted && completionNote && (
            <p className="text-xs text-emerald-700 mt-1 italic">"{completionNote}"</p>
          )}
          {!isCompleted && !marking && (
            <button
              onClick={() => setMarking(true)}
              className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 mt-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Mark as Done
            </button>
          )}
          {!isCompleted && marking && (
            <div className="mt-2 space-y-2">
              <textarea
                autoFocus
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Optional note (e.g. Hired ABC Co., cost $150)"
                rows={2}
                className="w-full text-sm rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirm
                </button>
                <button
                  onClick={() => { setMarking(false); setNoteText(""); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-sm font-medium transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          )}
          {isCompleted && (
            <button
              onClick={() => onUnmark(taskKey)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors mt-1"
            >
              <X className="w-3 h-3" />
              Unmark
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

// ─── Main Results Component ───────────────────────────────────────────────────

export function CalendarResults({ data, onReset, quizAnswers }: CalendarResultsProps) {
  const currentMonth = new Date().toLocaleString("default", { month: "long" });
  const currentMonthIndex = data.calendar?.findIndex(m => m.month === currentMonth);
  const orderedMonths = currentMonthIndex >= 0
    ? [...data.calendar.slice(currentMonthIndex), ...data.calendar.slice(0, currentMonthIndex)]
    : (data.calendar ?? []);

  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showAIChat, setShowAIChat] = useState(false);

  const [completedTasks, setCompletedTasks] = useState<Record<string, string>>({});
  const [logEntryIds, setLogEntryIds] = useState<Record<string, number>>({});
  const [exportMsg, setExportMsg] = useState(false);
  const calendarSavedRef = useRef(false);

  // ── Custom Notes state ──
  const [customNotes, setCustomNotes] = useState<CustomNote[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [noteContent, setNoteContent] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // ── Document Uploads state ──
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadUploading, setUploadUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

  // Save calendar to account on mount (logged-in users only, once per generation)
  useEffect(() => {
    if (!user || calendarSavedRef.current) return;
    calendarSavedRef.current = true;
    fetch("/api/user/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ quizAnswers: quizAnswers ?? {}, calendarData: data }),
    }).catch(() => {});
  }, [user]);

  // Fetch custom notes and documents for logged-in users
  useEffect(() => {
    if (!user) return;
    fetch("/api/user/notes", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => setCustomNotes(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch("/api/user/documents", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => setDocuments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [user?.id]);

  const handleMarkDone = async (key: string, note: string) => {
    setCompletedTasks(prev => ({ ...prev, [key]: note }));
    if (!user) return;

    let taskName: string;
    let month: string;

    if (key.startsWith("one-time-")) {
      const idx = parseInt(key.slice("one-time-".length));
      taskName = data.one_time_tasks?.[idx] ?? key;
      month = "One-Time Tasks";
    } else {
      // Parse key: "MonthName-taskIndex"
      const dashIdx = key.lastIndexOf("-");
      month = key.slice(0, dashIdx);
      const taskIdx = parseInt(key.slice(dashIdx + 1));
      const monthData = data.calendar?.find(m => m.month === month);
      taskName = monthData?.tasks?.[taskIdx]?.task ?? key;
    }

    const zipCode = (quizAnswers as any)?.zip ?? null;
    try {
      const res = await fetch("/api/user/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ taskName, taskKey: key, month, notes: note || null, zipCode }),
      });
      if (res.ok) {
        const entry = await res.json();
        setLogEntryIds(prev => ({ ...prev, [key]: entry.id }));
      }
    } catch {}
  };

  const handleUnmark = async (key: string) => {
    setCompletedTasks(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (!user) return;
    const entryId = logEntryIds[key];
    if (entryId) {
      fetch(`/api/user/log/${entryId}`, { method: "DELETE", credentials: "include" }).catch(() => {});
      setLogEntryIds(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
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

  const handleDeleteNote = async (id: number) => {
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
    } catch (err: any) {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploadUploading(false);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    fetch(`/api/user/documents/${id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
  };

  const userIsPro = isPro(user);

  // Build unified history list
  type HistoryItem =
    | { type: "task"; key: string; month: string; task: string; note: string }
    | { type: "note"; note: CustomNote }
    | { type: "document"; doc: UserDocument };

  const historyItems: HistoryItem[] = [];
  orderedMonths.forEach((month, mIdx) => {
    if (!userIsPro && mIdx >= 2) return;
    month.tasks?.forEach((task, tIdx) => {
      const key = `${month.month}-${tIdx}`;
      if (completedTasks[key] !== undefined) {
        historyItems.push({ type: "task", month: month.month, task: task.task, note: completedTasks[key], key });
      }
    });
  });
  data.one_time_tasks?.forEach((task, i) => {
    const key = `one-time-${i}`;
    if (completedTasks[key] !== undefined) {
      historyItems.push({ type: "task", month: "One-Time Tasks", task, note: completedTasks[key], key });
    }
  });
  customNotes.forEach(note => historyItems.push({ type: "note", note }));
  documents.forEach(doc => historyItems.push({ type: "document", doc }));

  const completedCount = Object.keys(completedTasks).length;
  const totalHistoryCount = historyItems.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
          <CheckCircle2 className="w-4 h-4" />
          Personalized for {data.state}
        </div>
        <h3 className="text-3xl font-display font-bold text-foreground mb-2">
          Your 12-Month Home Calendar
        </h3>
        <p className="text-muted-foreground">
          Click any task to see details, tips, and why it matters in {data.state}.
        </p>
        {user ? (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Saved to your account — completions persist forever
            </div>
            {user.subscriptionStatus === "promo_pro" && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full text-xs text-primary font-semibold">
                <Star className="w-3.5 h-3.5 fill-primary/70" />
                Pro Access via Promo ✓
              </div>
            )}
            {(user.subscriptionStatus === "pro_monthly" || user.subscriptionStatus === "pro_annual") && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full text-xs text-primary font-semibold">
                <Zap className="w-3.5 h-3.5" />
                Pro Plan ✓
              </div>
            )}
            {userIsPro && (
              <button
                onClick={() => setShowAIChat(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-full text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Ask Maintly
              </button>
            )}
          </div>
        ) : (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Demo mode — completions reset when you refresh
          </div>
        )}
      </div>

      {/* One-Time Tasks */}
      {data.one_time_tasks?.length > 0 && (
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-blue-900">One-Time Setup Tasks</h4>
            <p className="text-xs text-blue-500 ml-auto">Click to mark as done</p>
          </div>
          <ul className="space-y-2">
            {data.one_time_tasks.map((task, i) => {
              const key = `one-time-${i}`;
              return (
                <OneTimeTaskRow
                  key={key}
                  taskKey={key}
                  taskText={task}
                  isCompleted={completedTasks[key] !== undefined}
                  completionNote={completedTasks[key] ?? ""}
                  onMarkDone={handleMarkDone}
                  onUnmark={handleUnmark}
                />
              );
            })}
          </ul>
        </div>
      )}

      {/* Monthly Calendar Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-4">
        {orderedMonths.map((month, idx) => {
          const isCurrentMonth = idx === 0;
          const isNextMonth = idx === 1;
          const isLocked = userIsPro ? false : idx >= 2;
          const showMarkDone = !isLocked;

          return (
            <div
              key={month.month}
              className={`relative rounded-2xl border overflow-hidden ${
                isCurrentMonth
                  ? "border-primary/40 bg-primary/5 ring-2 ring-primary/20"
                  : "border-slate-200 bg-white"
              }`}
            >
              {/* Card content — blurred when locked */}
              <div className={`p-5 ${isLocked ? "blur-sm select-none pointer-events-none" : ""}`}>
                {/* Month header */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{MONTH_EMOJIS[month.month] ?? "📅"}</span>
                  <div>
                    <h4 className="font-bold text-slate-900">{month.month}</h4>
                    {isCurrentMonth && (
                      <span className="text-xs text-primary font-semibold">← This month</span>
                    )}
                    {isNextMonth && (
                      <span className="text-xs text-slate-400 font-medium">Up next</span>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {showMarkDone && (() => {
                      const doneInMonth = month.tasks?.filter((_, ti) =>
                        completedTasks[`${month.month}-${ti}`] !== undefined
                      ).length ?? 0;
                      const total = month.tasks?.length ?? 0;
                      return doneInMonth > 0 ? (
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                          {doneInMonth}/{total} done
                        </span>
                      ) : null;
                    })()}
                    <span className="text-xs text-slate-400 font-medium">
                      {month.tasks?.length ?? 0} task{(month.tasks?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Task cards */}
                <div className="space-y-2">
                  {month.tasks?.length > 0 ? (
                    month.tasks.map((task, ti) => {
                      const key = `${month.month}-${ti}`;
                      return (
                        <TaskCard
                          key={key}
                          taskKey={key}
                          task={task}
                          isCompleted={completedTasks[key] !== undefined}
                          completionNote={completedTasks[key] ?? ""}
                          onMarkDone={handleMarkDone}
                          onUnmark={handleUnmark}
                          showMarkDone={showMarkDone}
                        />
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-400 italic">No major tasks this month.</p>
                  )}
                </div>
              </div>

              {/* Lock overlay for months 3–12 */}
              {isLocked && (
                <button
                  onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 backdrop-blur-[2px] hover:bg-white/80 transition-colors cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shadow-sm group-hover:bg-primary/10 transition-colors">
                    <Lock className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 text-center px-4 leading-tight">
                    Pro plan<br />unlocks this
                  </p>
                  <span className="text-xs text-primary font-semibold underline-offset-2 underline">
                    See pricing ↓
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Upgrade to Pro CTA — hidden for Pro users */}
      {!userIsPro && (
        <div className="mb-8 bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900">Upgrade to Pro — Unlock all 12 months</p>
            <p className="text-sm text-slate-500">
              From <strong>$4.99/month</strong> or <strong>$39.99/year</strong> (save 33%). Cancel anytime.
            </p>
          </div>
          <Button
            onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
            className="shrink-0 rounded-xl bg-primary hover:bg-primary/90 text-white px-6 gap-2"
          >
            <Zap className="w-4 h-4" />
            See Plans
          </Button>
        </div>
      )}

      {/* Big Ticket Alerts */}
      {data.big_ticket_alerts?.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h4 className="font-bold text-amber-900">Big-Ticket Alerts for {data.state}</h4>
          </div>
          <ul className="space-y-2">
            {data.big_ticket_alerts.map((alert, i) => (
              <li key={i} className="flex gap-2 text-sm text-amber-800">
                <span className="text-amber-500 font-bold shrink-0">•</span>
                {alert}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Maintenance History ── */}
      <div className="mb-8 rounded-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
              <ClipboardList className="w-4 h-4 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 text-sm">Maintenance History</h4>
              <p className="text-xs text-slate-500">{user ? "Saved to your account" : "Demo mode only"}</p>
            </div>
            {totalHistoryCount > 0 && (
              <span className="text-xs font-semibold text-slate-600 bg-slate-200 px-2.5 py-1 rounded-full shrink-0">
                {totalHistoryCount} {totalHistoryCount === 1 ? "entry" : "entries"}
              </span>
            )}
          </div>

          {/* Action buttons — logged-in users only */}
          {user && (
            <div className="flex flex-wrap gap-2 mt-3">
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
            </div>
          )}
        </div>

        {/* Add Custom Note Form */}
        <AnimatePresence>
          {showNoteForm && user && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-slate-200 bg-blue-50 px-5 py-4 space-y-3"
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
          {showUploadForm && user && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-slate-200 bg-blue-50 px-5 py-4 space-y-3"
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

        {!user && (
          <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 border-b border-amber-100">
            <span className="text-xs text-amber-700 font-medium">
              ⚠ Demo — history resets on refresh. <button onClick={() => document.getElementById("waitlist-form")?.scrollIntoView({ behavior: "smooth" })} className="underline">Sign in</button> to save permanently.
            </span>
          </div>
        )}

        {historyItems.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400 font-medium">No entries yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Mark tasks complete, add a note, or upload a document to track your home's history.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {historyItems.map((item, idx) => {
              if (item.type === "task") {
                return (
                  <li key={`task-${item.key}`} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-primary">{item.month}</span>
                        <span className="text-sm text-slate-700 font-medium">{item.task}</span>
                      </div>
                      {item.note && (
                        <p className="text-xs text-slate-500 mt-0.5 italic">"{item.note}"</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleUnmark(item.key)}
                      className="text-slate-300 hover:text-slate-500 transition-colors shrink-0 mt-0.5"
                      title="Unmark"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              }
              if (item.type === "note") {
                const n = item.note;
                return (
                  <li key={`note-${n.id}`} className="flex items-start gap-3 px-5 py-3.5 bg-blue-50/40">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Pencil className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-blue-600">
                          {new Date(n.noteDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span className="text-sm text-blue-900 font-medium">{n.title}</span>
                      </div>
                      <p className="text-xs text-blue-700 mt-0.5 leading-snug">{n.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(n.id)}
                      className="text-slate-300 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                      title="Delete note"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              }
              if (item.type === "document") {
                const d = item.doc;
                const ext = d.fileName.split(".").pop()?.toUpperCase() ?? "FILE";
                const dateStr = new Date(d.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                const isImage = d.contentType.startsWith("image/");
                return (
                  <li key={`doc-${d.id}`} className="flex items-start gap-3 px-5 py-3.5 bg-blue-50/40">
                    <div className="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      {isImage ? <FileText className="w-2.5 h-2.5 text-white" strokeWidth={2.5} /> : <Paperclip className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-blue-600">{dateStr}</span>
                        <span className="inline-flex items-center gap-0.5 text-xs font-bold bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded">{ext}</span>
                        <span className="text-sm text-blue-900 font-medium truncate max-w-[160px]">{d.fileName}</span>
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
                      className="text-slate-300 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                      title="Delete document"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              }
              return null;
            })}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
        <Button
          onClick={onReset}
          variant="outline"
          className="flex items-center gap-2 rounded-xl h-12 px-6"
        >
          <RefreshCw className="w-4 h-4" />
          Generate New Calendar
        </Button>
        <Button
          onClick={() => document.getElementById("waitlist-form")?.scrollIntoView({ behavior: "smooth" })}
          className="flex items-center gap-2 rounded-xl h-12 px-6 bg-primary hover:bg-primary/90 text-white"
        >
          Join the Waitlist for Full Access
        </Button>
      </div>

      {/* Export for Resale — disabled demo button */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <button
          disabled
          onClick={() => setExportMsg(true)}
          className="flex items-center gap-2 h-10 px-5 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 text-sm font-medium cursor-not-allowed opacity-70 hover:opacity-80 transition-opacity"
        >
          <FileDown className="w-4 h-4" />
          Export for Resale (PDF / CSV)
        </button>
        <p className="text-xs text-slate-400 text-center">
          Full export to PDF/CSV available in the launched app.
        </p>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-center text-slate-400 max-w-2xl mx-auto leading-relaxed mb-4">
        This is general information only and not professional advice. Always consult licensed professionals for your home. MaintainHome.ai is not responsible for any actions taken based on this calendar.
      </p>

      {/* AI Chat Modal — Pro users only, pre-loaded with quiz context */}
      <AIChatModal
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        quizAnswers={quizAnswers as Record<string, string>}
      />
    </motion.div>
  );
}
