import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, LogOut, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DemoQuiz } from "@/components/DemoQuiz";

export default function Quiz() {
  const { user, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [stage, setStage] = useState<"quiz" | "saving" | "ready">("quiz");
  const [checkingCalendar, setCheckingCalendar] = useState(true);

  // Redirect guests to home
  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading]);

  // If user already has a calendar, send them straight to the dashboard
  useEffect(() => {
    if (!user) return;
    fetch("/api/user/calendar/latest", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.calendarData) {
          navigate("/");
        } else {
          setCheckingCalendar(false);
        }
      })
      .catch(() => setCheckingCalendar(false));
  }, [user?.id]);

  const handleCalendarReady = async (data: any, answers: any) => {
    setStage("saving");
    try {
      await fetch("/api/user/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quizAnswers: answers, calendarData: data }),
      });
    } catch {
      // Saving failed silently — calendar is still stored in CalendarResults state
    }
    setStage("ready");
    setTimeout(() => navigate("/?welcome=1"), 2200);
  };

  if (loading || checkingCalendar || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  // Success / redirect state
  if (stage === "saving" || stage === "ready") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="text-center px-6"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-display font-black text-foreground mb-2">
            Your plan is ready!
          </h2>
          <p className="text-slate-500 text-lg mb-2">
            Taking you to your personal dashboard…
          </p>
          <div className="flex items-center justify-center gap-2 text-primary text-sm font-semibold">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>Setting everything up</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Minimal header */}
      <nav className="w-full border-b border-border/50 bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <img
              src={`${import.meta.env.BASE_URL}images/logo-icon.png`}
              alt="MaintainHome.ai"
              className="w-7 h-7 object-contain"
            />
            <span className="text-sm font-bold text-foreground">
              MaintainHome<span className="text-primary">.ai</span>
            </span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Intro banner */}
      <div className="max-w-2xl mx-auto w-full px-4 pt-8 pb-2 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-3">
          <Sparkles className="w-4 h-4" />
          Hi {user.name ? user.name.split(" ")[0] : "there"}! Let's build your home care plan.
        </div>
        <p className="text-slate-500 text-sm">
          Answer a few quick questions and get your personalized 12-month maintenance calendar.
        </p>
      </div>

      {/* Quiz */}
      <div className="flex-1 py-6">
        <DemoQuiz onCalendarReady={handleCalendarReady} />
      </div>
    </div>
  );
}
