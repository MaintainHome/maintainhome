import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ClipboardList, ArrowLeft, Loader2, LogOut, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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

export default function HistoryPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/user/log", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="w-full border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img
              src={`${import.meta.env.BASE_URL}images/logo-icon.png`}
              alt="MaintainHome.ai"
              className="w-8 h-8 object-contain"
            />
            <span className="text-lg font-display font-bold text-foreground">
              MaintainHome<span className="text-primary">.ai</span>
            </span>
          </a>
          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Back link */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-black text-foreground">
              My Maintenance History
            </h1>
          </div>
          <p className="text-slate-500 text-sm mb-8">
            All tasks you've marked as complete across your home calendars.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-slate-300" />
              </div>
              <p className="font-semibold text-slate-700 mb-1">No completed tasks yet</p>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                Go to the AI demo, generate your home calendar, and mark tasks as done — they'll appear here permanently.
              </p>
              <button
                onClick={() => navigate("/")}
                className="mt-5 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Generate My Calendar
              </button>
            </div>
          ) : (
            <div className="space-y-6">
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
                      <li key={entry.id} className="flex items-start gap-3 px-5 py-4">
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
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {entry.zipCode ? ` · ZIP ${entry.zipCode}` : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <p className="text-xs text-center text-slate-400 pb-4">
                {entries.length} task{entries.length !== 1 ? "s" : ""} completed total
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
