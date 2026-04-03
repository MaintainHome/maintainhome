import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { CalendarDays, RefreshCw, Sparkles } from "lucide-react";
import { DemoQuiz } from "@/components/DemoQuiz";
import { useAuth } from "@/contexts/AuthContext";
import { BrandedPageHeader } from "@/components/BrandedPageHeader";

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [savedCalendar, setSavedCalendar] = useState<{ quizAnswers: any; calendarData: any } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/user/calendar/latest`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.calendarData) {
          setSavedCalendar({ quizAnswers: data.quizAnswers, calendarData: data.calendarData });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (authLoading) return null;

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <BrandedPageHeader
        title="My Full Year Calendar"
        icon={<CalendarDays className="w-5 h-5 text-primary shrink-0" />}
        maxWidth="max-w-5xl"
      >
        {savedCalendar && (
          <button
            onClick={() => navigate("/quiz")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retake Quiz
          </button>
        )}
      </BrandedPageHeader>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Loading your calendar…</span>
          </div>
        ) : savedCalendar ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <DemoQuiz key="calendar-page" initialData={savedCalendar} />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-4 py-20 text-center"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">No calendar yet</h2>
            <p className="text-slate-500 text-sm max-w-sm">
              Answer a few quick questions about your home and get a personalized Ai-generated 12-month maintenance plan.
            </p>
            <button
              onClick={() => navigate("/quiz")}
              className="mt-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-colors shadow-md shadow-primary/20"
            >
              Generate My Calendar
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
