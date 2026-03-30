import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Calendar, ClipboardList, Zap, ArrowRight,
  CheckCircle2, Sparkles, ChevronRight, RefreshCw,
  AlertCircle,
} from "lucide-react";
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
  const userIsPro = isPro(user);
  const firstName = user.name ? user.name.split(" ")[0] : user.email.split("@")[0];
  const state = savedCalendar?.calendarData?.state ?? null;
  const nextDueTasks = getNextDueTasks(savedCalendar?.calendarData);

  useEffect(() => {
    fetch(`${API_BASE}/api/user/log`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setRecentLog(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => setRecentLog([]))
      .finally(() => setLogLoading(false));
  }, [user.id]);

  function scrollToCalendar() {
    document.getElementById("dashboard-calendar")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 p-6 sm:p-8">
            <img
              src={`${import.meta.env.BASE_URL}images/maintly_thumb.png`}
              alt="Maintly"
              className="w-24 sm:w-32 h-auto object-contain shrink-0 drop-shadow-xl self-start sm:self-center"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Your Dashboard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-white leading-tight">
                Welcome back, {firstName}!
              </h1>
              <p className="text-slate-300 mt-1 text-sm sm:text-base leading-snug">
                {state
                  ? <>Here's your personalized home maintenance plan for <span className="text-primary font-semibold">{state}</span>.</>
                  : "Here's your personalized home maintenance plan."}
              </p>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Stay ahead of repairs with smart reminders and Ai guidance.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {userIsPro ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-full text-xs font-bold shadow-sm">
                  <Zap className="w-3.5 h-3.5" />
                  Pro Access
                </span>
              ) : (
                <button
                  onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-xs font-bold shadow-sm transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Free · Upgrade
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
                <p className="text-sm font-bold text-slate-900 group-hover:text-white transition-colors">Ask Maintly</p>
                <p className="text-xs text-slate-500 group-hover:text-white/70 transition-colors leading-snug">
                  Your Personal Ai<br />Home Care Chatbot
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
                <p className="text-sm font-bold text-amber-700">Ask Maintly</p>
                <p className="text-xs text-amber-500 leading-snug">
                  Pro feature<br />Upgrade to unlock
                </p>
              </div>
            </button>
          )}

          {/* My Calendar */}
          <button
            onClick={scrollToCalendar}
            className="flex flex-col items-start gap-2 p-4 bg-white rounded-2xl border border-slate-200 hover:bg-primary hover:border-primary hover:shadow-md hover:shadow-primary/25 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <Calendar className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 group-hover:text-white transition-colors">My Calendar</p>
              <p className="text-xs text-slate-400 group-hover:text-white/70 transition-colors">View all tasks</p>
            </div>
          </button>

          {/* Maintenance History */}
          <button
            onClick={() => navigate("/history")}
            className="flex flex-col items-start gap-2 p-4 bg-white rounded-2xl border border-slate-200 hover:bg-primary hover:border-primary hover:shadow-md hover:shadow-primary/25 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <ClipboardList className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 group-hover:text-white transition-colors">History</p>
              <p className="text-xs text-slate-400 group-hover:text-white/70 transition-colors">Completed tasks</p>
            </div>
          </button>

          {/* Pro badge or Upgrade */}
          {userIsPro ? (
            <div className="flex flex-col items-start gap-2 p-4 bg-gradient-to-br from-primary/5 to-blue-50 rounded-2xl border border-primary/20">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary">Pro Member</p>
                <p className="text-xs text-slate-400">Full access ✓</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              className="flex flex-col items-start gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-200 hover:border-amber-400 hover:shadow-md hover:shadow-amber-100 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800">Upgrade</p>
                <p className="text-xs text-amber-600">Unlock Pro</p>
              </div>
            </button>
          )}
        </motion.div>

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
            <div className="divide-y divide-slate-50">
              {nextDueTasks.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-6 py-3.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.task}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.month} · {item.difficulty} · {item.cost}</p>
                  </div>
                </div>
              ))}
            </div>
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
                <div key={entry.id} className="flex items-start gap-3 px-6 py-4">
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
    </div>
  );
}
