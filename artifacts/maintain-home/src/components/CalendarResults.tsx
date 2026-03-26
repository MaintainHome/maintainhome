import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, AlertTriangle, CheckCircle2, Wrench, DollarSign,
  Info, ChevronDown, ChevronUp, Lock, Check, FileDown, ClipboardList,
  X, Pencil, BookOpen, Zap, Star, MessageCircle,
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

  const handleMarkDone = async (key: string, note: string) => {
    setCompletedTasks(prev => ({ ...prev, [key]: note }));
    if (!user) return;
    // Parse key: "MonthName-taskIndex"
    const dashIdx = key.lastIndexOf("-");
    const month = key.slice(0, dashIdx);
    const taskIdx = parseInt(key.slice(dashIdx + 1));
    const monthData = data.calendar?.find(m => m.month === month);
    const taskName = monthData?.tasks?.[taskIdx]?.task ?? key;
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

  const userIsPro = isPro(user);

  // Build history list for the demo history section
  const historyItems: { month: string; task: string; note: string; key: string }[] = [];
  orderedMonths.forEach((month, mIdx) => {
    if (!userIsPro && mIdx >= 2) return;
    month.tasks?.forEach((task, tIdx) => {
      const key = `${month.month}-${tIdx}`;
      if (completedTasks[key] !== undefined) {
        historyItems.push({ month: month.month, task: task.task, note: completedTasks[key], key });
      }
    });
  });

  const completedCount = Object.keys(completedTasks).length;

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

      {/* One-Time Tasks */}
      {data.one_time_tasks?.length > 0 && (
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-blue-900">One-Time Setup Tasks</h4>
          </div>
          <ul className="space-y-2">
            {data.one_time_tasks.map((task, i) => (
              <li key={i} className="flex gap-2 text-sm text-blue-800">
                <span className="text-blue-500 font-bold shrink-0">•</span>
                {task}
              </li>
            ))}
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

      {/* ── Maintenance History ── */}
      <div className="mb-8 rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Maintenance History</h4>
            <p className="text-xs text-slate-500">{user ? "Saved to your account" : "Demo mode only"}</p>
          </div>
          {completedCount > 0 && (
            <span className="ml-auto text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
              {completedCount} completed
            </span>
          )}
          {user && completedCount > 0 && (
            <button
              onClick={() => navigate("/history")}
              className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline ml-2"
            >
              <BookOpen className="w-3.5 h-3.5" />
              View All
            </button>
          )}
        </div>

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
            <p className="text-sm text-slate-400 font-medium">No tasks completed yet</p>
            <p className="text-xs text-slate-400 mt-1">Click any task above and mark it as done to see it here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {historyItems.map((item) => (
              <li key={item.key} className="flex items-start gap-3 px-5 py-3.5">
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
            ))}
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
