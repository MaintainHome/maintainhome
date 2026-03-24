import { motion } from "framer-motion";
import { RefreshCw, AlertTriangle, CheckCircle2, Wrench, DollarSign, Info, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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
}

function TaskCard({ task }: { task: CalendarTask }) {
  const [expanded, setExpanded] = useState(false);
  const isPro = task.difficulty?.toLowerCase().includes("pro");

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-slate-900 text-sm">{task.task}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              isPro
                ? "bg-orange-100 text-orange-700"
                : "bg-emerald-100 text-emerald-700"
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
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {task.why && (
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600"><span className="font-medium text-slate-800">Why it matters:</span> {task.why}</p>
            </div>
          )}
          {task.tip && (
            <div className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600"><span className="font-medium text-slate-800">Tip:</span> {task.tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CalendarResults({ data, onReset }: CalendarResultsProps) {
  const currentMonth = new Date().toLocaleString("default", { month: "long" });
  const currentMonthIndex = data.calendar?.findIndex(m => m.month === currentMonth);
  const orderedMonths = currentMonthIndex >= 0
    ? [...data.calendar.slice(currentMonthIndex), ...data.calendar.slice(0, currentMonthIndex)]
    : (data.calendar ?? []);

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
        <p className="text-muted-foreground">Click any task to see details, tips, and why it matters in {data.state}.</p>
      </div>

      {/* Big Ticket Alerts */}
      {data.big_ticket_alerts?.length > 0 && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-5">
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

      {/* Monthly Calendar Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {orderedMonths.map((month, idx) => {
          const isCurrentMonth = month.month === currentMonth;
          return (
            <div
              key={month.month}
              className={`rounded-2xl border p-5 ${
                isCurrentMonth
                  ? "border-primary/40 bg-primary/5 ring-2 ring-primary/20"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{MONTH_EMOJIS[month.month] ?? "📅"}</span>
                <div>
                  <h4 className="font-bold text-slate-900">{month.month}</h4>
                  {isCurrentMonth && (
                    <span className="text-xs text-primary font-semibold">← This month</span>
                  )}
                </div>
                <span className="ml-auto text-xs text-slate-400 font-medium">
                  {month.tasks?.length ?? 0} task{(month.tasks?.length ?? 0) !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {month.tasks?.length > 0 ? (
                  month.tasks.map((task, ti) => <TaskCard key={ti} task={task} />)
                ) : (
                  <p className="text-sm text-slate-400 italic">No major tasks this month.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

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

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
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

      {/* Disclaimer */}
      <p className="text-xs text-center text-slate-400 max-w-2xl mx-auto leading-relaxed">
        This is general information only and not professional advice. Always consult licensed professionals for your home. MaintainHome.ai is not responsible for any actions taken based on this calendar.
      </p>
    </motion.div>
  );
}
