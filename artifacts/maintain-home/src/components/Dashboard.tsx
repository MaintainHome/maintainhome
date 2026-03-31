import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import {
  Calendar, ClipboardList, Zap, ArrowRight,
  CheckCircle2, Sparkles, ChevronRight, RefreshCw,
  AlertCircle, Check, Info, Wrench, DollarSign, X, Trash2, Bell, MessageCircle,
} from "lucide-react";
import { AIChatModal } from "@/components/AIChatModal";
import { DemoQuiz } from "@/components/DemoQuiz";
import { AddToHomeScreen } from "@/components/AddToHomeScreen";
import { isPro } from "@/contexts/AuthContext";
import type { AuthUser } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const MONTH_EMOJIS: Record<string, string> = {
  January:"❄️", February:"🌨️", March:"🌱", April:"🌧️",
  May:"🌸", June:"☀️", July:"🌞", August:"🏖️",
  September:"🍂", October:"🎃", November:"🍁", December:"🎄",
};

interface LogEntry {
  id: number;
  taskName: string;
  taskKey: string;
  month: string;
  completedAt: string;
  notes: string | null;
}

interface CalendarTask {
  task: string;
  difficulty: string;
  cost: string;
  why?: string;
  tip?: string;
}

interface CalendarMonth {
  month: string;
  tasks: CalendarTask[];
}

interface DashboardProps {
  user: AuthUser;
  savedCalendar: { quizAnswers: any; calendarData: any } | null;
  onOpenAIChat: () => void;
}

function getNextDueTasks(calendarData: any, limit = 5): { task: string; month: string; difficulty: string; cost: string }[] {
  if (!calendarData?.calendar) return [];
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const calendar: CalendarMonth[] = calendarData.calendar;
  const results: { task: string; month: string; difficulty: string; cost: string }[] = [];

  for (let i = 0; i < 12 && results.length < limit; i++) {
    const idx = (currentMonthIdx + i) % 12;
    const monthName = MONTHS[idx];
    const monthData = calendar.find((m) => m.month === monthName);
    if (!monthData) continue;
    for (const t of monthData.tasks) {
      if (results.length >= limit) break;
      results.push({ task: t.task, month: monthName, difficulty: t.difficulty, cost: t.cost });
    }
  }
  return results;
}

export function Dashboard({ user, savedCalendar, onOpenAIChat }: DashboardProps) {
  const [, navigate] = useLocation();
  const [recentLog, setRecentLog] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);
  const [nextDueTasks, setNextDueTasks] = useState(() => getNextDueTasks(savedCalendar?.calendarData));
  const [completingKeys, setCompletingKeys] = useState<Set<string>>(new Set());
  const [justDoneKey, setJustDoneKey] = useState<string | null>(null);
  const [thisMonthCompleted, setThisMonthCompleted] = useState<Record<string, string>>({});
  const [thisMonthMarking, setThisMonthMarking] = useState<string | null>(null);
  const [thisMonthNoteText, setThisMonthNoteText] = useState("");
  const [snoozedThisMonth, setSnoozedThisMonth] = useState<Set<string>>(new Set());
  const [snoozedConfirm, setSnoozedConfirm] = useState<string | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null);
  const [taskChatOpen, setTaskChatOpen] = useState(false);
  const [taskChatMessage, setTaskChatMessage] = useState<string>("");
  const userIsPro = isPro(user);
  const firstName = user.name ? user.name.split(" ")[0] : user.email.split("@")[0];
  const state = savedCalendar?.calendarData?.state ?? null;

  const currentMonthName = MONTHS[new Date().getMonth()];
  const thisMonthTasks: (CalendarTask & { _key: string })[] = (
    savedCalendar?.calendarData?.calendar?.find((m: CalendarMonth) => m.month === currentMonthName)?.tasks ?? []
  ).map((t: CalendarTask, i: number) => ({ ...t, _key: `tm-${i}` }));

  useEffect(() => {
    fetch(`${API_BASE}/api/user/log`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setRecentLog(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => setRecentLog([]))
      .finally(() => setLogLoading(false));
  }, [user.id]);

  const handleMarkDone = useCallback(async (item: { task: string; month: string; difficulty: string; cost: string }) => {
    const taskKey = item.task.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const stateKey = `${taskKey}-${item.month}`;
    if (completingKeys.has(stateKey)) return;

    setCompletingKeys((prev) => new Set(prev).add(stateKey));
    setJustDoneKey(stateKey);

    try {
      const res = await fetch(`${API_BASE}/api/user/log`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskName: item.task,
          taskKey,
          month: item.month,
          notes: null,
        }),
      });
      if (res.ok) {
        const newEntry: LogEntry = await res.json();
        setRecentLog((prev) => [newEntry, ...prev].slice(0, 4));
      }
    } catch {
      // silently ignore network errors — task still removed locally
    }

    setTimeout(() => {
      setNextDueTasks((prev) => prev.filter((t) => {
        const k = t.task.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        return `${k}-${t.month}` !== stateKey;
      }));
      setJustDoneKey(null);
      setCompletingKeys((prev) => { const s = new Set(prev); s.delete(stateKey); return s; });
    }, 900);
  }, [completingKeys]);

  function scrollToCalendar() {
    document.getElementById("dashboard-calendar")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToThisMonth() {
    const el = document.getElementById("dashboard-this-month");
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo({ top, behavior: "smooth" });
  }

  const handleThisMonthMarkDone = useCallback(async (taskKey: string, taskName: string, note: string) => {
    setThisMonthCompleted(prev => ({ ...prev, [taskKey]: note }));
    setThisMonthMarking(null);
    setThisMonthNoteText("");
    const slug = taskName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    try {
      const res = await fetch(`${API_BASE}/api/user/log`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskName, taskKey: slug, month: currentMonthName, notes: note || null }),
      });
      if (res.ok) {
        const entry: LogEntry = await res.json();
        setRecentLog(prev => [entry, ...prev].slice(0, 4));
      }
    } catch {}
  }, [currentMonthName]);

  const handleRemindNextMonth = useCallback((taskKey: string, taskName: string) => {
    setSnoozedThisMonth(prev => { const s = new Set(prev); s.add(taskKey); return s; });
    setSnoozedConfirm(taskKey);
    setTimeout(() => setSnoozedConfirm(c => c === taskKey ? null : c), 3500);
  }, []);

  const handleDeleteLogEntry = useCallback(async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this entry? This cannot be undone.")) return;
    setDeletingLogId(id);
    try {
      await fetch(`${API_BASE}/api/user/log/${id}`, { method: "DELETE", credentials: "include" });
      setRecentLog(prev => prev.filter(e => e.id !== id));
    } catch {}
    setDeletingLogId(null);
  }, []);

  const visibleThisMonthTasks = thisMonthTasks.filter(t => !snoozedThisMonth.has(t._key));

  function openChatForTask(taskName: string) {
    const locationHint = state ? ` for a home in ${state}` : "";
    const message = `Can you give me detailed, step-by-step instructions for "${taskName}"${locationHint}? Please include safety tips, what tools I'll need, how long it typically takes, and any common mistakes to avoid.`;
    setTaskChatMessage(message);
    setTaskChatOpen(true);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Mobile: Add to Home Screen ── */}
        <div className="sm:hidden flex justify-center">
          <AddToHomeScreen />
        </div>

        {/* ── Hero Welcome ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-600/10 pointer-events-none" />
          <div className="relative flex flex-row items-center gap-3 sm:gap-6 p-4 sm:p-8">
            {/* Avatar — always left, smaller on mobile */}
            <img
              src={`${import.meta.env.BASE_URL}images/maintly_thumb.png`}
              alt="Maintly"
              className="w-16 sm:w-28 h-auto object-contain shrink-0 drop-shadow-xl self-center"
            />
            {/* Text block */}
            <div className="flex-1 min-w-0 py-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider">Your Dashboard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-white leading-tight">
                Welcome back, {firstName}!
              </h1>
              <p className="text-slate-200 mt-1 text-sm sm:text-base leading-snug font-medium">
                {state
                  ? <>Your plan for <span className="text-primary font-bold">{state}</span>.</>
                  : "Your personalized maintenance plan."}
              </p>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-snug hidden sm:block">
                Stay ahead of <span className="text-slate-300 font-semibold">costly repairs</span> with smart reminders and <span className="text-slate-300 font-semibold">Maintly's Ai guidance</span>.
              </p>
            </div>
            {/* Right side: Pro Member badge */}
            <div className="shrink-0 flex flex-col items-center justify-center gap-1.5 pl-3 sm:pl-6 border-l border-white/10 self-stretch">
              {userIsPro ? (
                <>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-black text-primary text-center leading-tight whitespace-nowrap">Pro Member</span>
                  <span className="text-[10px] text-slate-400 text-center">Full access ✓</span>
                </>
              ) : (
                <button
                  onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 group-hover:bg-amber-500/30 flex items-center justify-center transition-colors">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-black text-amber-400 text-center leading-tight whitespace-nowrap">Upgrade</span>
                  <span className="text-[10px] text-amber-500/70 text-center whitespace-nowrap">to Pro</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Quick Action Cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {/* Ask Maintly */}
          {userIsPro ? (
            <button
              onClick={onOpenAIChat}
              className="flex flex-col items-start gap-1 pt-2 px-4 pb-4 bg-white rounded-2xl border border-slate-200 hover:bg-primary hover:border-primary hover:shadow-md hover:shadow-primary/25 transition-all text-left group overflow-hidden"
            >
              <div className="w-14 h-16 overflow-hidden shrink-0">
                <img
                  src={`${import.meta.env.BASE_URL}images/maintly_wrench.png`}
                  alt="Maintly"
                  className="w-14"
                  style={{ height: "240%", objectFit: "cover", objectPosition: "top center" }}
                />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900 group-hover:text-white transition-colors">Ask Maintly</p>
                <p className="text-xs sm:text-sm text-slate-500 group-hover:text-white/70 transition-colors leading-snug">
                  Your personal Ai<br />home care chatbot
                </p>
              </div>
            </button>
          ) : (
            <button
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              className="flex flex-col items-start gap-1 pt-2 px-4 pb-4 bg-white rounded-2xl border border-dashed border-amber-300 hover:border-amber-400 hover:shadow-sm transition-all text-left group overflow-hidden"
            >
              <div className="w-14 h-16 overflow-hidden shrink-0 relative">
                <img
                  src={`${import.meta.env.BASE_URL}images/maintly_wrench.png`}
                  alt="Maintly"
                  className="w-14 grayscale opacity-50"
                  style={{ height: "240%", objectFit: "cover", objectPosition: "top center" }}
                />
              </div>
              <div>
                <p className="text-base font-bold text-amber-700">Ask Maintly</p>
                <p className="text-xs sm:text-sm text-amber-500 leading-snug">
                  Pro feature<br />Upgrade to unlock
                </p>
              </div>
            </button>
          )}

          {/* Tile 2: Maintenance Log */}
          <button
            onClick={() => navigate("/history")}
            className="flex flex-col items-start gap-2 p-4 bg-white rounded-2xl border border-slate-200 hover:bg-primary hover:border-primary hover:shadow-md hover:shadow-primary/25 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <ClipboardList className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800 group-hover:text-white transition-colors">Maintenance Log</p>
              <p className="text-xs sm:text-sm text-slate-500 group-hover:text-white/70 transition-colors leading-snug">Completed tasks<br />&amp; notes</p>
            </div>
          </button>

          {/* Tile 3: This Month Tasks */}
          <button
            onClick={scrollToThisMonth}
            className="flex flex-col items-start gap-2 p-4 bg-white rounded-2xl border border-slate-200 hover:bg-primary hover:border-primary hover:shadow-md hover:shadow-primary/25 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <CheckCircle2 className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800 group-hover:text-white transition-colors">This Month</p>
              <p className="text-xs sm:text-sm text-slate-500 group-hover:text-white/70 transition-colors leading-snug">To Do List</p>
            </div>
          </button>

          {/* Tile 4: Full Year Maintenance Schedule */}
          <button
            onClick={scrollToCalendar}
            className="flex flex-col items-start gap-2 p-4 bg-white rounded-2xl border border-slate-200 hover:bg-primary hover:border-primary hover:shadow-md hover:shadow-primary/25 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <Calendar className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800 group-hover:text-white transition-colors">My Full Year</p>
              <p className="text-xs sm:text-sm text-slate-500 group-hover:text-white/70 transition-colors leading-snug">Calendar</p>
            </div>
          </button>
        </motion.div>

        {/* ── This Month ── */}
        {savedCalendar && (
          <motion.div
            id="dashboard-this-month"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="bg-white rounded-2xl border border-primary/20 shadow-sm overflow-hidden"
          >
            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary/8 to-emerald-50 border-b border-primary/15">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl leading-none">{MONTH_EMOJIS[currentMonthName] ?? "📅"}</span>
                <div>
                  <h2 className="text-lg font-display font-black text-slate-900 leading-tight">
                    This Month — {currentMonthName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {visibleThisMonthTasks.length} task{visibleThisMonthTasks.length !== 1 ? "s" : ""} · {Object.keys(thisMonthCompleted).length} completed
                  </p>
                </div>
              </div>
              <button
                onClick={scrollToCalendar}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">View Full Year</span>
                <span className="sm:hidden">Full Year</span>
              </button>
            </div>

            {/* Task cards */}
            {visibleThisMonthTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center px-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <p className="text-base font-bold text-slate-700">All caught up for {currentMonthName}!</p>
                <p className="text-sm text-slate-400">
                  {snoozedThisMonth.size > 0
                    ? `${snoozedThisMonth.size} task${snoozedThisMonth.size !== 1 ? "s" : ""} moved to next month.`
                    : "No tasks scheduled this month."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleThisMonthTasks.map((task) => {
                  const isProTask = task.difficulty?.toLowerCase().includes("pro");
                  const isCompleted = task._key in thisMonthCompleted;
                  const isMarking = thisMonthMarking === task._key;

                  return (
                    <div
                      key={task._key}
                      className={`transition-colors duration-300 ${isCompleted ? "bg-emerald-50/60" : "bg-white"}`}
                    >
                      {/* Task header */}
                      <div className="flex items-start gap-4 px-5 py-4">
                        {/* Big difficulty icon */}
                        <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                          isCompleted ? "bg-emerald-100" : isProTask ? "bg-orange-100" : "bg-emerald-100"
                        }`}>
                          {isCompleted
                            ? <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            : <Wrench className={`w-6 h-6 ${isProTask ? "text-orange-600" : "text-emerald-600"}`} />
                          }
                        </div>

                        {/* Task name + badges */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-base sm:text-lg font-bold leading-snug ${isCompleted ? "line-through text-slate-400" : "text-slate-900"}`}>
                            {task.task}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-3 py-1 rounded-full ${
                              isProTask ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
                            }`}>
                              <Wrench className="w-3.5 h-3.5" />
                              {task.difficulty || "DIY"}
                            </span>
                            {task.cost && (
                              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                                <DollarSign className="w-3.5 h-3.5" />
                                {task.cost}
                              </span>
                            )}
                            {isCompleted && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                <Check className="w-3.5 h-3.5" />
                                Done
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right section — Maintly pointing at Ask button beside him */}
                        <div className="shrink-0 flex items-center gap-2 ml-2">
                          {/* Maintly avatar — pointing right toward the button */}
                          <img
                            src="/images/maintly_point.png"
                            alt="Maintly"
                            className="w-16 h-16 object-contain drop-shadow-sm select-none"
                          />
                          {/* Ask Maintly button — Maintly's finger points here */}
                          {userIsPro ? (
                            <button
                              onClick={() => openChatForTask(task.task)}
                              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 text-blue-700 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-[10px] font-bold whitespace-nowrap leading-tight">Ask<br/>Maintly</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                              title="Upgrade to Pro to ask Maintly"
                              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 transition-colors hover:bg-amber-100"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-[10px] font-bold whitespace-nowrap leading-tight">Ask<br/>Maintly</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Why + Tip */}
                      {(task.why || task.tip) && (
                        <div className="px-5 pb-4 space-y-3">
                          {task.why && (
                            <div className="flex gap-3 bg-slate-50 rounded-xl p-3.5">
                              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Why it matters</p>
                                <p className="text-sm text-slate-700 leading-relaxed">{task.why}</p>
                              </div>
                            </div>
                          )}
                          {task.tip && (
                            <div className="flex gap-3 bg-blue-50 rounded-xl p-3.5">
                              <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider mb-1">How-to tip</p>
                                <p className="text-sm text-slate-700 leading-relaxed">{task.tip}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Completion note if done */}
                      {isCompleted && thisMonthCompleted[task._key] && (
                        <div className="mx-5 mb-4 flex gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                          <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <p className="text-sm text-emerald-800 italic">"{thisMonthCompleted[task._key]}"</p>
                        </div>
                      )}

                      {/* Mark as Done area */}
                      {!isCompleted && (
                        <div className="px-5 pb-5 space-y-2">
                          {isMarking ? (
                            <div className="space-y-3">
                              <textarea
                                autoFocus
                                value={thisMonthNoteText}
                                onChange={e => setThisMonthNoteText(e.target.value)}
                                placeholder="Optional note — e.g. Hired ABC Co., cost $150…"
                                rows={2}
                                className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleThisMonthMarkDone(task._key, task.task, thisMonthNoteText)}
                                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                  Confirm Done
                                </button>
                                <button
                                  onClick={() => { setThisMonthMarking(null); setThisMonthNoteText(""); }}
                                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => setThisMonthMarking(task._key)}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-sm transition-colors active:scale-[0.98]"
                              >
                                <Check className="w-4 h-4" />
                                Mark as Done
                              </button>
                              {snoozedConfirm === task._key ? (
                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold">
                                  <Bell className="w-4 h-4 shrink-0" />
                                  Task moved to next month ✓
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleRemindNextMonth(task._key, task.task)}
                                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-500 hover:text-blue-700 text-sm font-medium transition-colors active:scale-[0.98]"
                                >
                                  <Bell className="w-4 h-4" />
                                  Snooze Till Next Month
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer link */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={scrollToCalendar}
                className="flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
              >
                <Calendar className="w-4 h-4" />
                View Full Year Calendar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Next Due Tasks ── */}
        {nextDueTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.14 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-display font-bold text-foreground">Next Due Tasks</h2>
              </div>
              <button
                onClick={scrollToCalendar}
                className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline"
              >
                Full calendar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <AnimatePresence initial={false}>
              {nextDueTasks.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center"
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  <p className="text-base font-bold text-slate-700">No tasks due soon</p>
                  <p className="text-sm text-slate-400">Great job staying on top of things!</p>
                </motion.div>
              ) : (
                nextDueTasks.map((item) => {
                  const taskKey = item.task.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                  const stateKey = `${taskKey}-${item.month}`;
                  const isDone = justDoneKey === stateKey;
                  const isCompleting = completingKeys.has(stateKey);

                  return (
                    <motion.div
                      key={stateKey}
                      layout
                      initial={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                      transition={{ duration: 0.35 }}
                      className={`flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-slate-100 last:border-b-0 transition-colors duration-300 ${isDone ? "bg-emerald-50" : "bg-white"}`}
                    >
                      {/* Status dot */}
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors duration-300 ${isDone ? "bg-emerald-500" : "bg-amber-400"}`} />

                      {/* Task info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm sm:text-base font-bold leading-snug transition-colors duration-300 ${isDone ? "text-emerald-700 line-through decoration-emerald-400" : "text-slate-800"}`}>
                          {item.task}
                        </p>
                        {isDone ? (
                          <p className="text-xs sm:text-sm text-emerald-600 font-semibold mt-0.5">✓ Task completed!</p>
                        ) : (
                          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                            <span className="font-medium text-slate-600">{item.month}</span>
                            {" · "}{item.difficulty}
                            {" · "}<span className="text-emerald-600 font-medium">{item.cost}</span>
                          </p>
                        )}
                      </div>

                      {/* Mark as Done button */}
                      <button
                        onClick={() => handleMarkDone(item)}
                        disabled={isCompleting}
                        aria-label="Mark as done"
                        className={`
                          shrink-0 flex items-center justify-center gap-1.5
                          min-w-[44px] min-h-[44px] px-3 sm:px-4 rounded-xl
                          text-xs sm:text-sm font-bold
                          transition-all duration-200 active:scale-95
                          ${isDone
                            ? "bg-emerald-100 text-emerald-700 cursor-default"
                            : "bg-slate-100 hover:bg-emerald-500 hover:text-white text-slate-600"
                          }
                        `}
                      >
                        {isDone
                          ? <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                          : <><Check className="w-4 h-4" /><span className="hidden sm:inline">Done</span></>
                        }
                      </button>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Free user upgrade banner ── */}
        {!userIsPro && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-5 py-4"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">Upgrade to Pro for full access</p>
              <p className="text-xs text-amber-700 mt-0.5">Full 12-month calendar · Ask Maintly Ai · Email reminders · Maintenance history</p>
            </div>
            <button
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              className="shrink-0 px-4 py-2 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-colors whitespace-nowrap"
            >
              See Plans
            </button>
          </motion.div>
        )}

        {/* ── My Maintenance Calendar ── */}
        <motion.div
          id="dashboard-calendar"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-display font-bold text-foreground">My Maintenance Calendar</h2>
            </div>
            {savedCalendar && (
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                Saved ✓
              </span>
            )}
          </div>
          <div className="p-4 sm:p-6">
            {savedCalendar ? (
              <DemoQuiz key="saved" initialData={savedCalendar} />
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">No calendar yet</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
                  Answer a few quick questions about your home and get a full Ai-generated 12-month maintenance calendar.
                </p>
                <DemoQuiz key="fresh" initialData={null} />
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Recent Activity ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.28 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-display font-bold text-foreground">Recent Activity</h2>
            </div>
            <button
              onClick={() => navigate("/history")}
              className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline"
            >
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {logLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading history…</span>
              </div>
            ) : recentLog.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <ClipboardList className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm font-medium">No completed tasks yet</p>
                <p className="text-slate-400 text-xs mt-1">
                  Start maintaining your home today — completed tasks will appear here.
                </p>
              </div>
            ) : (
              recentLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 px-6 py-4 group">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{entry.taskName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {entry.month} · Completed {new Date(entry.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-slate-500 mt-1 italic truncate">"{entry.notes}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteLogEntry(entry.id)}
                    disabled={deletingLogId === entry.id}
                    className="shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                    title="Delete entry"
                  >
                    {deletingLogId === entry.id
                      ? <RefreshCw className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              ))
            )}
          </div>
          {recentLog.length > 0 && (
            <div className="px-6 py-3 border-t border-slate-50">
              <button
                onClick={() => navigate("/history")}
                className="flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
              >
                View full maintenance log <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>

        {/* ── Upgrade CTA (Free users) ── */}
        {!userIsPro && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.34 }}
            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary rounded-full text-xs font-bold mb-4">
              <Zap className="w-3.5 h-3.5" />
              Unlock Full Access
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-black text-white mb-2">
              Upgrade to Pro — Get your full 12-month plan
            </h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
              Free users see 2 months. Pro unlocks all 12 months, the Ai assistant, email reminders, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                className="px-6 py-3 rounded-xl font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-colors"
              >
                See Plans &amp; Pricing
              </button>
              <button
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                className="px-6 py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Enter Promo Code
              </button>
            </div>
          </motion.div>
        )}

      </div>

      {/* Task-specific Maintly chat — opened from "This Month" task buttons */}
      <AIChatModal
        isOpen={taskChatOpen}
        onClose={() => setTaskChatOpen(false)}
        quizAnswers={savedCalendar?.quizAnswers ?? {}}
        initialMessage={taskChatMessage}
      />
    </div>
  );
}
