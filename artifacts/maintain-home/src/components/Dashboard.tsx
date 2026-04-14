import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useRef, type RefObject } from "react";
import {
  Calendar, ClipboardList, Zap, ArrowRight,
  CheckCircle2, Sparkles, ChevronRight, RefreshCw,
  AlertCircle, Check, Info, Wrench, DollarSign, X, Trash2, Bell, MessageCircle, Home as HomeIcon,
  Send, Loader2, User, TrendingDown, TrendingUp, Shield, ChevronDown, ChevronUp,
  Clock, TriangleAlert, Paperclip, FileText, Phone, Building2, Gift, Mail, UserCheck,
} from "lucide-react";
import { AIChatModal } from "@/components/AIChatModal";
import { AddToHomeScreenButton } from "@/components/AddToHomeScreen";
import { HomeDocumentsWidget } from "@/components/HomeDocumentsWidget";
import { isPro, useAuth } from "@/contexts/AuthContext";
import type { AuthUser } from "@/contexts/AuthContext";
import { DashboardTour } from "@/components/DashboardTour";
import type { TourStep } from "@/components/DashboardTour";
import { useBranding } from "@/contexts/BrandingContext";
import { useLocation } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const BASE = import.meta.env.BASE_URL;
const CURRENT_AVG_RATE = 6.79;

const SMS_CRITICAL_KEYWORDS = [
  "smoke detector", "air filter", "hvac filter", "drip faucet",
  "winterize", "insulate pipe", "fire alarm", "batteries", "gutter",
];
function isCriticalSmsTask(taskName: string): boolean {
  const lower = taskName.toLowerCase();
  return SMS_CRITICAL_KEYWORDS.some((kw) => lower.includes(kw));
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function getNextMonthInfo(currentMonthName: string): { month: string; year: number } {
  const idx = MONTHS.indexOf(currentMonthName);
  const yr = new Date().getFullYear();
  return idx === 11
    ? { month: MONTHS[0], year: yr + 1 }
    : { month: MONTHS[idx + 1], year: yr };
}

function snoozeStorageKey(month: string, year: number) {
  return `maintly_snoozed_v1_${month}_${year}`;
}

const MONTH_EMOJIS: Record<string, string> = {
  January:"❄️", February:"🌨️", March:"🌱", April:"🌧️",
  May:"🌸", June:"☀️", July:"🌞", August:"🏖️",
  September:"🍂", October:"🎃", November:"🍁", December:"🎄",
};


interface ChatFileInfo {
  name: string;
  type: string;
  previewUrl?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  isWelcome?: boolean;
  fileInfo?: ChatFileInfo;
  isFileAnalysis?: boolean;
}

const IMAGE_MAX   = 5 * 1024 * 1024;
const DOC_MAX     = 8 * 1024 * 1024;
const ALLOWED_EXT = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

function fmtBytes(n: number) {
  return n < 1024 * 1024 ? `${(n / 1024).toFixed(0)}KB` : `${(n / 1024 / 1024).toFixed(1)}MB`;
}

const MAINTLY_WELCOME: ChatMessage = {
  role: "assistant",
  isWelcome: true,
  content: `Hello friend! I'm Maintly.\nAsk me anything about your home — maintenance tips, repair schedules, or specific issues.\nI can also analyze photos and documents — warranties, insurance policies, HOA docs, deeds, manuals, and more.`,
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

// ── Home Health Score ─────────────────────────────────────────────────────
interface HomeProfileData {
  fullAddress?: string | null;
  bedrooms?: string | null;
  bathrooms?: string | null;
  yearBuilt?: string | null;
  lastRenovationYear?: string | null;
  mortgageRate?: string | null;
}

interface HealthScore {
  total: number;
  profile: number;
  calendar: number;
  completion: number;
  history: number;
}

function computeHealthScore(params: {
  homeProfile: HomeProfileData | null;
  hasCalendar: boolean;
  thisMonthTotal: number;
  thisMonthDone: number;
  logCount: number;
}): HealthScore {
  const { homeProfile, hasCalendar, thisMonthTotal, thisMonthDone, logCount } = params;

  let profile = 0;
  if (homeProfile?.fullAddress?.trim()) profile += 5;
  if (homeProfile?.bedrooms) profile += 4;
  if (homeProfile?.bathrooms) profile += 4;
  if (homeProfile?.yearBuilt) profile += 8;
  if (homeProfile?.lastRenovationYear) profile += 4;

  const calendar = hasCalendar ? 20 : 0;

  let completion = 0;
  if (thisMonthTotal === 0) {
    completion = hasCalendar ? 15 : 0;
  } else {
    const rate = thisMonthDone / thisMonthTotal;
    if (rate >= 1) completion = 30;
    else if (rate >= 0.5) completion = 22;
    else if (rate > 0) completion = 15;
    else completion = 5;
  }

  let history = 0;
  if (logCount >= 4) history = 25;
  else if (logCount >= 2) history = 16;
  else if (logCount >= 1) history = 8;

  const total = Math.min(100, profile + calendar + completion + history);
  return { total, profile, calendar, completion, history };
}

function ScoreGauge({ score }: { score: number }) {
  const r = 70;
  const cx = 100;
  const cy = 98;
  const arcLength = Math.PI * r;
  const filled = (score / 100) * arcLength;
  const color = score >= 80 ? "#1f9e6e" : score >= 60 ? "#f59e0b" : "#ef4444";
  const trackColor = score >= 80 ? "#d1fae5" : score >= 60 ? "#fef3c7" : "#fee2e2";
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-[180px] mx-auto">
      <path d={d} fill="none" stroke={trackColor} strokeWidth="16" strokeLinecap="round" />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${arcLength + 1}`}
        style={{ transition: "stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <text x="100" y="88" textAnchor="middle" fill={color} fontSize="32" fontWeight="900" fontFamily="system-ui">
        {score}
      </text>
    </svg>
  );
}

// ── Big-Ticket Forecasting ────────────────────────────────────────────────
interface BigTicketItem {
  key: string;
  name: string;
  emoji: string;
  avgLife: number;
  costRange: string;
  note?: string;
}

const BIG_TICKET_ITEMS: BigTicketItem[] = [
  { key: "roof",       name: "Roof",              emoji: "🏠", avgLife: 25, costRange: "$12,000–$25,000", note: "Asphalt shingles" },
  { key: "hvac",       name: "HVAC System",        emoji: "❄️", avgLife: 17, costRange: "$8,000–$15,000" },
  { key: "water",      name: "Water Heater",       emoji: "🚿", avgLife: 12, costRange: "$1,200–$3,500" },
  { key: "windows",    name: "Windows",            emoji: "🪟", avgLife: 25, costRange: "$8,000–$20,000" },
  { key: "paint",      name: "Exterior Paint",     emoji: "🎨", avgLife: 8,  costRange: "$3,000–$8,000" },
  { key: "panel",      name: "Electrical Panel",   emoji: "⚡", avgLife: 30, costRange: "$2,500–$6,000" },
  { key: "garage",     name: "Garage Door",        emoji: "🚪", avgLife: 15, costRange: "$1,000–$3,500" },
  { key: "appliances", name: "Major Appliances",   emoji: "🍳", avgLife: 12, costRange: "$1,000–$3,000 ea" },
];

interface ForecastResult extends BigTicketItem {
  dueYear: number;
  yearsLeft: number;
  urgency: "imminent" | "soon" | "planning";
}

function computeForecasts(yearBuilt: number, currentYear: number, roofType?: string, recentUpgrades: string[] = []): ForecastResult[] {
  return BIG_TICKET_ITEMS.map(item => {
    let life = item.avgLife;
    if (item.key === "roof" && roofType) {
      if (roofType === "metal" || roofType === "tile") life = 50;
      else if (roofType === "flat") life = 15;
    }
    let dueYear = yearBuilt + life;
    if (recentUpgrades.includes(item.key)) {
      dueYear = Math.max(dueYear, currentYear + 7);
    }
    const yearsLeft = dueYear - currentYear;
    const urgency: ForecastResult["urgency"] =
      yearsLeft <= 1 ? "imminent" :
      yearsLeft <= 4 ? "soon" : "planning";
    return { ...item, dueYear, yearsLeft, urgency };
  }).sort((a, b) => a.yearsLeft - b.yearsLeft);
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
  const { refreshUser, giftRedemptionResult, clearGiftRedemptionResult } = useAuth();
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
  const [extraThisMonthTasks, setExtraThisMonthTasks] = useState<(CalendarTask & { _key: string })[]>([]);
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null);
  const [taskChatOpen, setTaskChatOpen] = useState(false);
  const [taskChatMessage, setTaskChatMessage] = useState<string>("");

  // ── Mortgage Rate + Home Profile State ────────────────────────────────
  const [mortgageRate, setMortgageRate] = useState<number | null | undefined>(undefined);
  const [homeProfile, setHomeProfile] = useState<HomeProfileData | null>(null);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);

  // ── Inline Chat State ──────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([MAINTLY_WELCOME]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatAbortRef = useRef<AbortController | null>(null);

  // ── Onboarding Tour ────────────────────────────────────────────────────
  const [showTour, setShowTour] = useState(false);
  const tourRef1 = useRef<HTMLButtonElement | null>(null);
  const tourRef2 = useRef<HTMLButtonElement | null>(null);
  const tourRef3 = useRef<HTMLButtonElement | null>(null);
  const tourRef4 = useRef<HTMLButtonElement | null>(null);
  const tourRef5 = useRef<HTMLDivElement | null>(null);

  // Show tour once user data is loaded and they haven't seen it
  useEffect(() => {
    if (!user || user.hasSeenDashboardTour) return;
    const timer = setTimeout(() => setShowTour(true), 900);
    return () => clearTimeout(timer);
  }, [user?.hasSeenDashboardTour]);

  const completeTour = useCallback(async () => {
    setShowTour(false);
    try {
      await fetch(`${API_BASE}/api/user/complete-tour`, {
        method: "POST",
        credentials: "include",
      });
      await refreshUser();
    } catch {
      // Silently ignore — tour won't re-show since showTour is false
    }
  }, [refreshUser]);

  // File upload state for inline chat
  const [chatPendingFile, setChatPendingFile] = useState<File | null>(null);
  const [chatPendingPreview, setChatPendingPreview] = useState<string | null>(null);
  const [chatFileError, setChatFileError] = useState<string | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  function clearChatFile() {
    setChatPendingFile(null);
    setChatPendingPreview(null);
    setChatFileError(null);
    if (chatFileInputRef.current) chatFileInputRef.current.value = "";
  }

  function handleChatFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setChatFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_EXT.includes(file.type)) {
      setChatFileError("Only JPG, PNG images and PDFs are supported.");
      if (chatFileInputRef.current) chatFileInputRef.current.value = "";
      return;
    }
    const isImg = file.type.startsWith("image/");
    const maxB  = isImg ? IMAGE_MAX : DOC_MAX;
    if (file.size > maxB) {
      setChatFileError(`Too large (${fmtBytes(file.size)}). Max ${isImg ? "5MB" : "8MB"}.`);
      if (chatFileInputRef.current) chatFileInputRef.current.value = "";
      return;
    }
    setChatPendingFile(file);
    if (isImg) {
      const reader = new FileReader();
      reader.onload = (ev) => setChatPendingPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setChatPendingPreview(null);
    }
  }

  const { branding, setPreviewSubdomain } = useBranding();
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

  useEffect(() => {
    fetch(`${API_BASE}/api/user/home-profile`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const rate = data?.mortgageRate ? parseFloat(data.mortgageRate) : null;
        setMortgageRate(isNaN(rate as number) ? null : rate);
        setHomeProfile(data ? {
          fullAddress: data.fullAddress ?? null,
          bedrooms: data.bedrooms != null ? String(data.bedrooms) : null,
          bathrooms: data.bathrooms ?? null,
          yearBuilt: data.yearBuilt != null ? String(data.yearBuilt) : null,
          lastRenovationYear: data.lastRenovationYear != null ? String(data.lastRenovationYear) : null,
          mortgageRate: data.mortgageRate ?? null,
        } : null);
        if (Array.isArray(data?.resolvedBigTicketKeys)) {
          setResolvedKeys(new Set(data.resolvedBigTicketKeys as string[]));
        }
      })
      .catch(() => { setMortgageRate(null); setHomeProfile(null); });
  }, [user.id]);

  // Silently trigger SMS check on dashboard load (only when SMS is enabled)
  useEffect(() => {
    if (!user?.smsEnabled || !user?.smsPhone) return;
    fetch(`${API_BASE}/api/sms/trigger-check`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }, [user.id, user?.smsEnabled, user?.smsPhone]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Shared SSE reader for inline chat
  async function readChatSse(res: Response, onChunk: (text: string) => void): Promise<void> {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        if (!part.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(part.slice(6));
          if (data.done) return;
          if (data.content) onChunk(data.content);
        } catch {}
      }
    }
  }

  const sendInlineChat = useCallback(async (text: string) => {
    if (chatPendingFile) { sendInlineChatWithFile(text, chatPendingFile); return; }
    const trimmed = text.trim();
    if (!trimmed || chatStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);
    setChatInput("");
    setChatStreaming(true);

    const placeholder: ChatMessage = { role: "assistant", content: "", streaming: true };
    setChatMessages([...updatedHistory, placeholder]);

    chatAbortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        signal: chatAbortRef.current.signal,
        body: JSON.stringify({
          message: trimmed,
          history: chatMessages.filter(m => !m.isWelcome).map((m) => ({ role: m.role, content: m.content })),
          quizAnswers: savedCalendar?.quizAnswers ?? {},
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed." }));
        setChatMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: `Sorry, something went wrong: ${err.error ?? "Please try again."}` },
        ]);
        setChatStreaming(false);
        return;
      }

      let fullContent = "";
      await readChatSse(res, (chunk) => {
        fullContent += chunk;
        setChatMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: fullContent, streaming: true },
        ]);
      });

      setChatMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: fullContent },
      ]);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setChatMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "Connection lost. Please try again." },
        ]);
      }
    } finally {
      setChatStreaming(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages, chatStreaming, chatPendingFile, savedCalendar?.quizAnswers]);

  const sendInlineChatWithFile = useCallback(async (text: string, file: File) => {
    if (chatStreaming) return;
    const isImg = file.type.startsWith("image/");
    const fileInfo: ChatFileInfo = { name: file.name, type: file.type, previewUrl: chatPendingPreview ?? undefined };
    const userMsg: ChatMessage = {
      role: "user",
      content: text.trim() || `Please analyze this ${isImg ? "photo" : "document"}.`,
      fileInfo,
    };
    const assistantPlaceholder: ChatMessage = { role: "assistant", content: "", streaming: true, isFileAnalysis: true };
    setChatMessages(prev => [...prev, userMsg, assistantPlaceholder]);
    setChatInput("");
    clearChatFile();
    setChatStreaming(true);
    chatAbortRef.current = new AbortController();
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("message", text.trim());
      formData.append("quizAnswers", JSON.stringify(savedCalendar?.quizAnswers ?? {}));
      const res = await fetch("/api/ai/chat-with-file", {
        method: "POST",
        credentials: "include",
        signal: chatAbortRef.current.signal,
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed." }));
        setChatMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: `Sorry — ${err.error ?? "Please try again."}`, isFileAnalysis: true }]);
        return;
      }
      let fullContent = "";
      await readChatSse(res, (chunk) => {
        fullContent += chunk;
        setChatMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: fullContent, streaming: true, isFileAnalysis: true }]);
      });
      setChatMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: fullContent, isFileAnalysis: true }]);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setChatMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: "Connection lost. Please try again.", isFileAnalysis: true }]);
      }
    } finally {
      setChatStreaming(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatStreaming, chatPendingPreview, savedCalendar?.quizAnswers]);

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
    } catch {}

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
    navigate("/calendar");
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

  const handleRemindNextMonth = useCallback((task: CalendarTask & { _key: string }) => {
    setSnoozedThisMonth(prev => { const s = new Set(prev); s.add(task._key); return s; });
    setSnoozedConfirm(task._key);
    setTimeout(() => setSnoozedConfirm(c => c === task._key ? null : c), 3500);
    // Persist to next month via localStorage
    try {
      const now = new Date();
      const { month: nextMonth, year: nextYear } = getNextMonthInfo(MONTHS[now.getMonth()]);
      const lsKey = snoozeStorageKey(nextMonth, nextYear);
      const raw = localStorage.getItem(lsKey);
      const existing: CalendarTask[] = raw ? JSON.parse(raw) : [];
      const { _key, ...baseTask } = task;
      existing.push(baseTask);
      localStorage.setItem(lsKey, JSON.stringify(existing));
    } catch {}
  }, []);

  // Load tasks snoozed-to-this-month from localStorage
  useEffect(() => {
    try {
      const now = new Date();
      const lsKey = snoozeStorageKey(MONTHS[now.getMonth()], now.getFullYear());
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const tasks: CalendarTask[] = JSON.parse(raw);
        setExtraThisMonthTasks(tasks.map((t, i) => ({ ...t, _key: `snoozed-${i}` })));
      }
    } catch {}
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

  const allThisMonthTasks = [...thisMonthTasks, ...extraThisMonthTasks];
  const visibleThisMonthTasks = allThisMonthTasks.filter(t => !snoozedThisMonth.has(t._key));

  const rateDiff = mortgageRate != null ? mortgageRate - CURRENT_AVG_RATE : null;
  const rateIsBetter = rateDiff != null && rateDiff < 0;
  const rateIsHigher = rateDiff != null && rateDiff > 0;

  // ── Home Health Score ────────────────────────────────────────────────────
  const healthScore = computeHealthScore({
    homeProfile,
    hasCalendar: !!savedCalendar,
    thisMonthTotal: visibleThisMonthTasks.length + snoozedThisMonth.size,
    thisMonthDone: Object.keys(thisMonthCompleted).length,
    logCount: recentLog.length,
  });
  const scoreGrade = healthScore.total >= 80
    ? { label: "Excellent", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", msg: "Your home is well maintained — great work!" }
    : healthScore.total >= 60
    ? { label: "Good", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", msg: "A few things need attention to reach Excellent." }
    : { label: "Needs Attention", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", msg: "Several important tasks are overdue or incomplete." };

  // ── Big-Ticket Forecasts ─────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const yearBuiltNum = homeProfile?.yearBuilt ? parseInt(homeProfile.yearBuilt) : null;
  const roofType = savedCalendar?.quizAnswers?.roofType ?? undefined;
  const recentUpgradesRaw: string = savedCalendar?.quizAnswers?.recentUpgrades ?? "";
  const recentUpgradesArr = recentUpgradesRaw ? recentUpgradesRaw.split(",").filter(Boolean) : [];
  const allForecasts: ForecastResult[] = yearBuiltNum
    ? computeForecasts(yearBuiltNum, currentYear, roofType, recentUpgradesArr)
    : [];
  const [resolvedKeys, setResolvedKeys] = useState<Set<string>>(new Set());
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);
  const forecasts = allForecasts.filter((f) => !resolvedKeys.has(f.key));

  function openChatForTask(taskName: string) {
    const locationHint = state ? ` for a home in ${state}` : "";
    const message = `Can you give me detailed, step-by-step instructions for "${taskName}"${locationHint}? Please include safety tips, what tools I'll need, how long it typically takes, and any common mistakes to avoid.`;
    setTaskChatMessage(message);
    setTaskChatOpen(true);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Mobile: Add to Home Screen (compact inline button) ── */}
        <div className="sm:hidden flex justify-center">
          <AddToHomeScreenButton />
        </div>

        {/* ── Gift code redemption result banner ── */}
        <AnimatePresence>
          {giftRedemptionResult && giftRedemptionResult.isNewUser && giftRedemptionResult.ok ? (
            <motion.div
              key="gift-new-user"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden"
            >
              <div className="px-5 py-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-emerald-900">Welcome! Your Pro access is active 🎉</p>
                  <p className="text-xs text-emerald-700 mt-0.5">{giftRedemptionResult.message}</p>
                  <p className="text-xs text-emerald-600 mt-2 font-medium">
                    Next step: set up your home profile to generate your personalized 12-month maintenance plan.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => { clearGiftRedemptionResult(); navigate("/quiz"); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Set Up My Home
                    </button>
                    <button
                      onClick={clearGiftRedemptionResult}
                      className="px-3 py-2 rounded-xl text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      Do it later
                    </button>
                  </div>
                </div>
                <button
                  onClick={clearGiftRedemptionResult}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-emerald-400 hover:bg-emerald-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ) : giftRedemptionResult ? (
            <motion.div
              key="gift-existing"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`flex items-start gap-3 px-5 py-4 rounded-2xl border ${
                giftRedemptionResult.ok
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                giftRedemptionResult.ok ? "bg-emerald-100" : "bg-red-100"
              }`}>
                {giftRedemptionResult.ok
                  ? <Gift className="w-4.5 h-4.5 text-emerald-600" />
                  : <AlertCircle className="w-4.5 h-4.5 text-red-600" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${giftRedemptionResult.ok ? "text-emerald-800" : "text-red-800"}`}>
                  {giftRedemptionResult.ok ? "Gift code redeemed!" : "Gift code issue"}
                </p>
                <p className={`text-xs mt-0.5 ${giftRedemptionResult.ok ? "text-emerald-700" : "text-red-700"}`}>
                  {giftRedemptionResult.message}
                </p>
              </div>
              <button
                onClick={clearGiftRedemptionResult}
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  giftRedemptionResult.ok ? "text-emerald-500 hover:bg-emerald-100" : "text-red-400 hover:bg-red-100"
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ── Broker role switcher ── only shown if user also has a broker account */}
        {user.isBroker && (
          <motion.button
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => { setPreviewSubdomain(null); sessionStorage.setItem("mh_active_role", "broker"); navigate("/broker-dashboard"); }}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 active:scale-[0.99] transition-all"
            style={{ background: "linear-gradient(90deg, #1f9e6e 0%, #3b82f6 100%)" }}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 shrink-0" />
              <span>Partner Dashboard available</span>
            </div>
            <div className="flex items-center gap-1 text-white/80 text-xs font-bold">
              Switch <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </motion.button>
        )}

        {/* ── Hero Welcome ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-600/10 pointer-events-none" />
          <div className="relative flex flex-row items-center gap-3 sm:gap-5 px-4 py-3 sm:px-6 sm:py-4">
            <img
              src={`${BASE}images/maintly_thumb.png`}
              alt="Maintly"
              className="w-14 sm:w-20 h-auto object-contain shrink-0 drop-shadow-xl self-center"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Your Dashboard</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-display font-black text-white leading-tight">
                Welcome back, {firstName}!
              </h1>
              <p className="text-slate-200 mt-0.5 text-xs sm:text-sm leading-snug font-medium">
                {state
                  ? <>Your plan for <span className="text-primary font-bold">{state}</span>.</>
                  : "Your personalized maintenance plan."}
              </p>
              {branding?.tagline ? (
                <p className="text-primary text-xs mt-0.5 leading-snug font-semibold">
                  {branding.tagline}
                </p>
              ) : (
                <p className="text-slate-400 text-xs mt-0.5 leading-snug hidden sm:block">
                  Stay ahead of <span className="text-slate-300 font-semibold">costly repairs</span> with smart reminders and <span className="text-slate-300 font-semibold">Maintly's AI guidance</span>.
                </p>
              )}
            </div>
            <div className="shrink-0 flex flex-col items-center justify-center gap-1 pl-3 sm:pl-5 border-l border-white/10 self-stretch">
              {userIsPro ? (
                <>
                  <div className="relative">
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #1f9e6e 0%, #3b82f6 100%)",
                        boxShadow: "0 0 16px rgba(31,158,110,0.45), 0 0 10px rgba(59,130,246,0.3), 0 2px 8px rgba(0,0,0,0.3)",
                      }}
                    >
                      <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="white" />
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
                  </div>
                  <span
                    className="text-[11px] sm:text-xs font-black text-center leading-tight whitespace-nowrap tracking-tight"
                    style={{ color: "#4ade80", textShadow: "0 0 10px rgba(74,222,128,0.55)" }}
                  >Pro Member</span>
                  <span className="text-[10px] font-semibold text-center" style={{ color: "rgba(74,222,128,0.65)" }}>Full access ✓</span>
                </>
              ) : (
                <button
                  onClick={() => navigate("/home-profile")}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 group-hover:bg-amber-500/30 flex items-center justify-center transition-colors">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  </div>
                  <span className="text-[10px] font-black text-amber-400 text-center leading-tight whitespace-nowrap">Upgrade</span>
                  <span className="text-[9px] text-amber-500/70 text-center whitespace-nowrap">to Pro</span>
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
              ref={tourRef1}
              onClick={onOpenAIChat}
              className="flex flex-col items-start gap-1 pt-2 px-4 pb-4 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all text-left group overflow-hidden"
              onMouseEnter={e => { const el = e.currentTarget; el.style.background = "linear-gradient(135deg, #1f9e6e 0%, #3b82f6 100%)"; el.style.borderColor = "transparent"; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.background = ""; el.style.borderColor = ""; }}
            >
              <div className="w-14 h-16 overflow-hidden shrink-0">
                <img
                  src={`${BASE}images/maintly_wrench.png`}
                  alt="Maintly"
                  className="w-14"
                  style={{ height: "240%", objectFit: "cover", objectPosition: "top center" }}
                />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900 group-hover:text-white transition-colors">Talk to Maintly</p>
                <p className="text-xs sm:text-sm text-slate-500 group-hover:text-white/70 transition-colors leading-snug">
                  Your Personal Ai Home<br />Ownership Chatbot
                </p>
              </div>
            </button>
          ) : (
            <button
              ref={tourRef1}
              onClick={() => navigate("/home-profile")}
              className="flex flex-col items-start gap-1 pt-2 px-4 pb-4 bg-white rounded-2xl border border-dashed border-amber-300 hover:border-amber-400 hover:shadow-sm transition-all text-left group overflow-hidden"
            >
              <div className="w-14 h-16 overflow-hidden shrink-0 relative">
                <img
                  src={`${BASE}images/maintly_wrench.png`}
                  alt="Maintly"
                  className="w-14 grayscale opacity-50"
                  style={{ height: "240%", objectFit: "cover", objectPosition: "top center" }}
                />
              </div>
              <div>
                <p className="text-base font-bold text-amber-700">Talk to Maintly</p>
                <p className="text-xs sm:text-sm text-amber-500 leading-snug">
                  Pro feature<br />Upgrade to unlock
                </p>
              </div>
            </button>
          )}

          {/* Tile 2: Maintenance Log */}
          <button
            ref={tourRef2}
            onClick={() => navigate("/history")}
            className="flex flex-col items-start gap-2 p-4 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all text-left group"
            onMouseEnter={e => { const el = e.currentTarget; el.style.background = "linear-gradient(135deg, #1f9e6e 0%, #3b82f6 100%)"; el.style.borderColor = "transparent"; }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.background = ""; el.style.borderColor = ""; }}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <ClipboardList className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800 group-hover:text-white transition-colors">Historical Home Maintenance Log</p>
              <p className="text-xs sm:text-sm text-slate-500 group-hover:text-white/70 transition-colors leading-snug">Completed Tasks<br />&amp; Notes</p>
            </div>
          </button>

          {/* Tile 3: This Month Tasks */}
          <button
            ref={tourRef3}
            onClick={scrollToThisMonth}
            className="flex flex-col items-start gap-2 p-4 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all text-left group"
            onMouseEnter={e => { const el = e.currentTarget; el.style.background = "linear-gradient(135deg, #1f9e6e 0%, #3b82f6 100%)"; el.style.borderColor = "transparent"; }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.background = ""; el.style.borderColor = ""; }}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <CheckCircle2 className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800 group-hover:text-white transition-colors">To-Do List This Month</p>
              <p className="text-xs sm:text-sm text-slate-500 group-hover:text-white/70 transition-colors leading-snug">Custom Suggestions<br />For Your Home</p>
            </div>
          </button>

          {/* Tile 4: My Property Facts */}
          <button
            ref={tourRef4}
            onClick={() => navigate("/home-profile")}
            className="flex flex-col items-start gap-2 p-4 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all text-left group"
            onMouseEnter={e => { const el = e.currentTarget; el.style.background = "linear-gradient(135deg, #1f9e6e 0%, #3b82f6 100%)"; el.style.borderColor = "transparent"; }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.background = ""; el.style.borderColor = ""; }}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <HomeIcon className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800 group-hover:text-white transition-colors">My Property Facts</p>
              <p className="text-xs sm:text-sm text-slate-500 group-hover:text-white/70 transition-colors leading-snug">Detailed Facts About<br />Your Property</p>
            </div>
          </button>
        </motion.div>

        {/* ── Home Health Score ── */}
        <motion.div
          ref={tourRef5}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.09 }}
          className={`rounded-2xl border shadow-sm overflow-hidden ${scoreGrade.bg} ${scoreGrade.border}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/5">
            <div className="flex items-center gap-2">
              <Shield className={`w-4 h-4 ${scoreGrade.color}`} />
              <h2 className="text-base font-bold text-slate-900">Home Health Score</h2>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              healthScore.total >= 80 ? "bg-emerald-100 text-emerald-700" :
              healthScore.total >= 60 ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
            }`}>{scoreGrade.label}</span>
          </div>

          <div className="px-5 py-5 flex flex-col sm:flex-row items-center gap-5 sm:gap-8">
            {/* Gauge */}
            <div className="shrink-0 w-40 sm:w-44">
              <ScoreGauge score={healthScore.total} />
              <p className="text-center text-[11px] text-slate-500 -mt-1">out of 100</p>
            </div>

            {/* Right side */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <p className={`text-xl font-black ${scoreGrade.color} leading-tight`}>{scoreGrade.msg}</p>
              <p className="text-sm text-slate-600 mt-1.5 leading-snug">
                Your score is based on <span className="font-semibold text-slate-800">profile completeness</span>, <span className="font-semibold text-slate-800">task completion</span>, <span className="font-semibold text-slate-800">maintenance history</span>, and whether you have a <span className="font-semibold text-slate-800">personalized calendar</span>.
              </p>

              {/* Improvement hints for lower scores */}
              {healthScore.total < 80 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {!savedCalendar && (
                    <button onClick={() => navigate("/quiz")} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-primary hover:text-primary transition-colors shadow-sm">
                      + Generate calendar
                    </button>
                  )}
                  {!homeProfile?.yearBuilt && (
                    <button onClick={() => navigate("/home-profile")} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-primary hover:text-primary transition-colors shadow-sm">
                      + Add year built
                    </button>
                  )}
                  {!homeProfile?.fullAddress && (
                    <button onClick={() => navigate("/home-profile")} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-primary hover:text-primary transition-colors shadow-sm">
                      + Add home address
                    </button>
                  )}
                  {recentLog.length === 0 && (
                    <button onClick={() => navigate("/history")} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-primary hover:text-primary transition-colors shadow-sm">
                      + Log a completed task
                    </button>
                  )}
                </div>
              )}

              {/* Pro: breakdown toggle */}
              {userIsPro && (
                <button
                  onClick={() => setShowScoreBreakdown(v => !v)}
                  className="mt-3 flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {showScoreBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showScoreBreakdown ? "Hide breakdown" : "See detailed breakdown"}
                </button>
              )}
              {!userIsPro && (
                <p className="mt-3 text-[11px] text-slate-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <button onClick={() => navigate("/pricing")} className="hover:underline text-amber-600 font-semibold">Upgrade to Pro</button> for a detailed score breakdown
                </p>
              )}
            </div>
          </div>

          {/* Pro breakdown panel */}
          <AnimatePresence>
            {userIsPro && showScoreBreakdown && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="border-t border-black/5 px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      label: "Profile Completeness",
                      earned: healthScore.profile,
                      max: 25,
                      tip: healthScore.profile < 25 ? "Add year built, address & renovation year for full points." : "Profile is fully complete.",
                      action: () => navigate("/home-profile"),
                      actionLabel: "Edit Profile",
                    },
                    {
                      label: "Calendar Generated",
                      earned: healthScore.calendar,
                      max: 20,
                      tip: healthScore.calendar < 20 ? "Generate your personalized 12-month calendar." : "Calendar generated.",
                      action: () => navigate("/quiz"),
                      actionLabel: "Generate Calendar",
                    },
                    {
                      label: "This Month's Tasks",
                      earned: healthScore.completion,
                      max: 30,
                      tip: healthScore.completion < 30
                        ? Object.keys(thisMonthCompleted).length === 0
                          ? "Start completing your tasks for this month."
                          : "Keep going — complete all tasks for full points."
                        : "All tasks complete for this month!",
                      action: undefined,
                      actionLabel: null,
                    },
                    {
                      label: "Maintenance History",
                      earned: healthScore.history,
                      max: 25,
                      tip: recentLog.length === 0
                        ? "Log your first completed maintenance task."
                        : recentLog.length < 4
                        ? "Log a few more tasks to build your history."
                        : "Great maintenance history!",
                      action: () => navigate("/history"),
                      actionLabel: "View History",
                    },
                  ].map(item => {
                    const pct = Math.round((item.earned / item.max) * 100);
                    const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
                    return (
                      <div key={item.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-700">{item.label}</span>
                          <span className="text-xs font-black text-slate-900">{item.earned}<span className="text-slate-400 font-normal">/{item.max}</span></span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{item.tip}</p>
                        {item.action && item.earned < item.max && (
                          <button
                            onClick={item.action}
                            className="mt-1.5 text-[11px] font-bold text-primary hover:underline"
                          >
                            {item.actionLabel} →
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl leading-none">{MONTH_EMOJIS[currentMonthName] ?? "📅"}</span>
                <div>
                  <h2 className="text-lg font-display font-black text-white leading-tight">
                    This Month — {currentMonthName}
                  </h2>
                  <p className="text-xs text-white/55 mt-0.5">
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
                    ? `${snoozedThisMonth.size} task${snoozedThisMonth.size !== 1 ? "s" : ""} snoozed until next month.`
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
                            {!isCompleted && user?.smsEnabled && user?.smsPhone && isCriticalSmsTask(task.task) && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-violet-100 text-violet-700" title="Text reminder enabled for this task">
                                <Phone className="w-3.5 h-3.5" />
                                Text Alert
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Maintly pointing at Ask button */}
                        <div className="shrink-0 flex items-center gap-2 ml-2">
                          <img
                            src="/images/maintly_point.png"
                            alt="Maintly"
                            className="w-16 h-16 object-contain drop-shadow-sm select-none"
                          />
                          {userIsPro ? (
                            <button
                              onClick={() => openChatForTask(task.task)}
                              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 text-blue-700 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-[10px] font-bold whitespace-nowrap leading-tight">
                                <span className="sm:hidden">Ask<br/>Maintly</span>
                                <span className="hidden sm:inline">Ask Maintly<br/>About This Task</span>
                              </span>
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate("/pricing")}
                              title="Upgrade to Pro to ask Maintly"
                              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 transition-colors hover:bg-amber-100"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-[10px] font-bold whitespace-nowrap leading-tight">
                                <span className="sm:hidden">Ask<br/>Maintly</span>
                                <span className="hidden sm:inline">Ask Maintly<br/>About This Task</span>
                              </span>
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
                                  Task snoozed until next month ✓
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleRemindNextMonth(task)}
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

        {/* ── Chat with Maintly (inline persistent) ── */}
        <motion.div
          id="dashboard-chat"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className={`rounded-2xl overflow-hidden ${userIsPro ? "border border-primary/20 shadow-md shadow-primary/5" : "border border-slate-200 shadow-sm"} bg-white`}
        >
          {userIsPro ? (
            <>
              {/* ── IDLE: Hero welcome with pointing avatar + speech bubble ── */}
              {!chatMessages.some(m => !m.isWelcome) ? (
                <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/15 to-blue-600/5 pointer-events-none" />
                  <div className="relative flex items-end gap-4 sm:gap-6 px-5 pt-5 pb-6">
                    {/* Pointing avatar — stands at bottom, points right toward bubble */}
                    <img
                      src={`${BASE}images/maintly_point.png`}
                      alt="Maintly"
                      className="w-28 sm:w-36 h-auto object-contain shrink-0 self-end drop-shadow-2xl"
                    />

                    {/* Speech bubble */}
                    <div className="relative flex-1 min-w-0 mb-4">
                      {/* Tail pointing left toward avatar */}
                      <div
                        className="absolute bottom-6 -left-2.5 w-5 h-5 bg-white rotate-45"
                        style={{ boxShadow: "-2px 2px 4px rgba(0,0,0,0.08)" }}
                      />
                      <div className="relative bg-white rounded-2xl rounded-bl-sm px-5 py-4 shadow-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden border border-primary/20 shadow-sm shrink-0">
                            <img
                              src={`${BASE}images/maintly_thumb.png`}
                              alt="Maintly"
                              className="w-full"
                              style={{ height: "190%", objectFit: "cover", objectPosition: "top center" }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Maintly AI</span>
                        </div>
                        <p className="font-black text-slate-900 text-base sm:text-lg leading-tight mb-2">
                          Hello friend! I'm Maintly.
                        </p>
                        <p className="text-slate-600 text-sm leading-relaxed">
                          Ask me anything about your home — maintenance tips, repair schedules, or specific issues.{" "}
                          I can also analyze photos and documents — warranties, insurance policies, HOA docs, deeds, manuals, and more.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── ACTIVE: Compact header + scrollable conversation ── */
                <>
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-white border border-primary/20 shadow-sm">
                      <img
                        src={`${BASE}images/maintly_thumb.png`}
                        alt="Maintly"
                        className="w-full"
                        style={{ height: "190%", objectFit: "cover", objectPosition: "top center" }}
                      />
                    </div>
                    <p className="flex-1 font-bold text-slate-900 text-sm">Chat with Maintly</p>
                    <button
                      onClick={() => { chatAbortRef.current?.abort(); setChatMessages([MAINTLY_WELCOME]); clearChatFile(); }}
                      className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Clear
                    </button>
                  </div>

                  <div
                    ref={chatScrollRef}
                    className="h-[300px] overflow-y-auto px-4 py-4"
                  >
                    <div className="space-y-4">
                      {chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                        >
                          {msg.role === "user" ? (
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                              <User className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-0.5 bg-white border border-slate-100 shadow-sm">
                              <img
                                src={`${BASE}images/maintly_thumb.png`}
                                alt="Maintly"
                                className="w-full"
                                style={{ height: "190%", objectFit: "cover", objectPosition: "top center" }}
                              />
                            </div>
                          )}

                          <div className="max-w-[80%] flex flex-col gap-1">
                            {msg.fileInfo && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-primary/80 text-white self-end">
                                {msg.fileInfo.previewUrl ? (
                                  <img src={msg.fileInfo.previewUrl} alt={msg.fileInfo.name}
                                    className="w-28 h-20 object-cover rounded-lg" />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 shrink-0" />
                                    <span className="max-w-[140px] truncate">{msg.fileInfo.name}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {msg.isFileAnalysis && msg.role === "assistant" && (
                              <p className="text-[10px] font-bold text-primary uppercase tracking-wider px-1">
                                Analyzing uploaded file
                              </p>
                            )}
                            <div
                              className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                msg.role === "user"
                                  ? "bg-primary text-white rounded-tr-sm"
                                  : "bg-slate-100 text-slate-800 rounded-tl-sm"
                              }`}
                            >
                              {msg.content || (msg.streaming && (
                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                              ))}
                              {msg.streaming && msg.content && (
                                <span className="inline-block w-1.5 h-3.5 bg-slate-400 ml-0.5 animate-pulse rounded-sm align-middle" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Always-visible input bar ── */}
              <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-2">
                <AnimatePresence>
                  {chatPendingFile && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-3 px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl"
                    >
                      {chatPendingPreview ? (
                        <img src={chatPendingPreview} alt="preview"
                          className="w-9 h-9 object-cover rounded-lg shrink-0 border border-white shadow-sm" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{chatPendingFile.name}</p>
                        <p className="text-[10px] text-slate-400">{fmtBytes(chatPendingFile.size)}</p>
                      </div>
                      <button onClick={clearChatFile}
                        className="w-5 h-5 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0">
                        <X className="w-3 h-3 text-slate-500" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {chatFileError && (
                  <p className="text-xs text-red-600 font-semibold px-1">{chatFileError}</p>
                )}

                <div className="flex items-center gap-2 bg-slate-50 rounded-2xl border border-slate-200 px-3 py-2.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                  <button
                    type="button"
                    onClick={() => { setChatFileError(null); chatFileInputRef.current?.click(); }}
                    disabled={chatStreaming}
                    title="Upload a photo or PDF"
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                      chatPendingFile
                        ? "bg-primary text-white"
                        : "bg-slate-200 hover:bg-slate-300 text-slate-500 disabled:opacity-40"
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>

                  <input
                    ref={chatInputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendInlineChat(chatInput);
                      }
                    }}
                    placeholder={chatPendingFile ? "Add a question (optional)…" : "Ask Maintly anything about your home…"}
                    disabled={chatStreaming}
                    className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none disabled:opacity-60"
                  />
                  <button
                    onClick={() => sendInlineChat(chatInput)}
                    disabled={chatStreaming || (!chatInput.trim() && !chatPendingFile)}
                    className="w-8 h-8 rounded-full bg-primary hover:bg-primary/90 disabled:bg-slate-200 flex items-center justify-center transition-colors shrink-0"
                  >
                    {chatStreaming ? (
                      <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-white" />
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 text-center">
                  Photos (JPG/PNG, 5MB) &amp; PDFs (8MB) · Guidance only — consult a professional for safety issues.
                </p>

                <input
                  ref={chatFileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  onChange={handleChatFileSelect}
                  className="hidden"
                />
              </div>
            </>
          ) : (
            /* Free user — upgrade prompt with greyed avatar */
            <div className="relative overflow-hidden">
              <div className="flex items-end gap-4 px-5 pt-5 pb-4 bg-gradient-to-br from-slate-100 to-slate-50">
                <img
                  src={`${BASE}images/maintly_point.png`}
                  alt="Maintly"
                  className="w-24 h-auto object-contain shrink-0 self-end grayscale opacity-40"
                />
                <div className="relative flex-1 min-w-0 mb-3">
                  <div
                    className="absolute bottom-6 -left-2.5 w-5 h-5 bg-amber-50 rotate-45"
                    style={{ boxShadow: "-2px 2px 4px rgba(0,0,0,0.06)" }}
                  />
                  <div className="relative bg-amber-50 border border-amber-200 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm">
                    <p className="font-black text-slate-800 text-base mb-1">Unlock AI-Powered Guidance</p>
                    <p className="text-sm text-slate-500 leading-relaxed mb-3">
                      Upgrade to Pro to chat with Maintly — your personal home maintenance expert, personalized to your home.
                    </p>
                    <button
                      onClick={() => navigate("/pricing")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold transition-colors shadow-md shadow-amber-900/20"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Upgrade to Pro
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Your Home Support ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          {branding ? (
            /* ── White-label: branded agent card ── */
            <div>
              {/* Header strip */}
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <HomeIcon className="w-4 h-4 text-white/70" />
                  <h2 className="text-base font-bold text-white">Your Home Support</h2>
                </div>
              </div>

              {/* Body — mobile: logo → headshot → contact → col3  /  desktop: logo+contact | headshot | col3 */}
              <div className="flex flex-col sm:flex-row">

                {/* Logo — first on mobile (order-1), first on desktop (sm:order-1) */}
                <div className="order-1 sm:order-1 flex items-center justify-center px-6 py-5 shrink-0 sm:border-r-0 border-b sm:border-b-0 border-slate-100">
                  {branding.logoUrl && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-center w-full sm:w-auto">
                      <img
                        src={branding.logoUrl}
                        alt={branding.brokerName}
                        className="h-28 sm:h-20 max-w-[260px] sm:max-w-[200px] object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Headshot — second on mobile (order-2), third on desktop (sm:order-3) */}
                <div className="order-2 sm:order-3 flex items-center justify-center px-6 py-6 shrink-0 border-b sm:border-b-0 sm:border-l border-slate-100">
                  {branding.agentPhotoUrl ? (
                    <div className="w-28 h-28 rounded-full overflow-hidden shadow-lg shrink-0"
                      style={{ border: "4px solid #1f9e6e50" }}>
                      <img src={branding.agentPhotoUrl} alt={branding.brokerName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-full flex items-center justify-center shrink-0 shadow-lg"
                      style={{ backgroundColor: "#1f9e6e18", border: "4px solid #1f9e6e40" }}>
                      <span className="text-4xl font-black" style={{ color: "#1f9e6e" }}>{branding.brokerName[0]}</span>
                    </div>
                  )}
                </div>

                {/* Contact info — third on mobile (order-3), second on desktop (sm:order-2) */}
                <div className="order-3 sm:order-2 flex-1 flex flex-col gap-2 min-w-0 items-center sm:items-start text-center sm:text-left justify-center px-6 py-5 sm:border-l border-slate-100">
                  <p className="text-base font-bold text-slate-900 leading-tight">{branding.brokerName}</p>
                  {branding.phoneNumber && (
                    <a href={`tel:${branding.phoneNumber}`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline transition-colors"
                      style={{ color: "#1f9e6e" }}>
                      <Phone className="w-4 h-4 shrink-0" />{branding.phoneNumber}
                    </a>
                  )}
                  {branding.contactEmail && (
                    <a
                      href={`mailto:${branding.contactEmail}?subject=${encodeURIComponent("Home Maintenance Question")}&body=${encodeURIComponent(`Hi ${branding.brokerName},\n\nI have a question about my home maintenance. Could we connect?\n\nThanks!`)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all"
                    >
                      <Mail className="w-3.5 h-3.5 shrink-0" />Contact My Agent
                    </a>
                  )}
                </div>

                {/* Col 3 — Resale message + CTA (last on both mobile and desktop) */}
                <div className="order-4 sm:order-4 flex flex-col justify-center gap-3 px-6 py-5 sm:w-64 shrink-0 bg-slate-50/60 sm:border-l border-slate-100">
                  <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "#1f9e6e0d", border: "1px solid #1f9e6e25" }}>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      When you're ready to move, we can export your maintenance history — streamlining the listing process.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/history")}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: "#1f9e6e", boxShadow: "0 2px 12px rgba(31,158,110,0.3)" }}
                  >
                    <ClipboardList className="w-4 h-4 shrink-0" />
                    View Full Maintenance History
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Regular: generic Maintly version ── */
            <div>
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-white/70" />
                  <h2 className="text-base font-bold text-white">Your Home Support</h2>
                </div>
              </div>

              <div className="px-5 py-5 flex flex-col sm:flex-row items-center gap-5">
                {/* Maintly avatar */}
                <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-primary/30 shadow-md shrink-0">
                  <img
                    src={`${import.meta.env.BASE_URL}images/maintly-avatar.png`}
                    alt="Maintly"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = "none";
                      const parent = el.parentElement;
                      if (parent) {
                        parent.style.background = "linear-gradient(135deg, #1f9e6e20, #1f9e6e40)";
                        parent.style.display = "flex";
                        parent.style.alignItems = "center";
                        parent.style.justifyContent = "center";
                        parent.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1f9e6e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
                      }
                    }}
                  />
                </div>

                {/* Message + CTA */}
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-1">Your Maintenance History</p>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Your complete maintenance history is saved here. Keep track of everything you've done for your home.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/history")}
                    className="self-start inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-primary/20"
                    style={{ backgroundColor: "#1f9e6e" }}
                  >
                    <ClipboardList className="w-4 h-4 shrink-0" />
                    View Full Maintenance History
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Home Documents ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
        >
          {userIsPro ? (
            <HomeDocumentsWidget
              onAskMaintly={(message) => {
                setTaskChatMessage(message);
                setTaskChatOpen(true);
              }}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-amber-300 overflow-hidden">
              <div className="flex items-start gap-4 px-5 py-5">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-sm font-bold text-slate-900">Home Documents</h2>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">Pro</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">
                    Store warranties, insurance policies, HOA docs, receipts, and more. Maintly can also analyze your documents and answer questions about them.
                  </p>
                  <button
                    onClick={() => navigate("/pricing")}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm shadow-amber-900/10 bg-amber-500 hover:bg-amber-400"
                  >
                    <Zap className="w-4 h-4" />
                    Upgrade to Pro
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Future Big-Ticket Items (Pro) ── */}
        {userIsPro && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.17 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/70" />
                <h2 className="text-base font-bold text-white">Future Big-Ticket Items</h2>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-white/10 px-2 py-1 rounded-full uppercase tracking-wide">Pro</span>
            </div>

            {!yearBuiltNum ? (
              <div className="px-5 py-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 mb-1">Add your home's year built to unlock forecasts</p>
                  <p className="text-sm text-slate-500 leading-snug mb-3">
                    Once you enter the year your home was built, we'll predict when your roof, HVAC, water heater, and other major systems are likely to need replacement — along with estimated costs.
                  </p>
                  <button
                    onClick={() => navigate("/home-profile")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
                  >
                    Add Year Built →
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="px-5 py-4">
                  <p className="text-xs text-slate-500 leading-snug mb-1">
                    Based on your home built in <span className="font-semibold text-slate-700">{yearBuiltNum}</span> ({currentYear - yearBuiltNum} years old).
                    {roofType && roofType !== "asphalt" && (
                      <span> Roof lifespan adjusted for <span className="font-semibold text-slate-700">{roofType}</span> material.</span>
                    )}
                    {recentUpgradesArr.length > 0 && (
                      <span> Forecasts adjusted for recently upgraded systems.</span>
                    )}
                  </p>
                </div>

                <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {forecasts.map(item => {
                    const isImminent = item.urgency === "imminent";
                    const isSoon = item.urgency === "soon";
                    const cardBg = isImminent ? "bg-red-50 border-red-200" :
                      isSoon ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200";
                    const badgeColor = isImminent ? "bg-red-100 text-red-700" :
                      isSoon ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
                    const yearColor = isImminent ? "text-red-700" :
                      isSoon ? "text-amber-700" : "text-emerald-700";
                    const Icon = isImminent ? TriangleAlert : isSoon ? Clock : CheckCircle2;
                    const yearsLabel = item.yearsLeft < 0
                      ? `Overdue by ${Math.abs(item.yearsLeft)} yr${Math.abs(item.yearsLeft) !== 1 ? "s" : ""}`
                      : item.yearsLeft === 0 ? "Due this year"
                      : item.yearsLeft === 1 ? "Due next year (Imminent)"
                      : `~${item.yearsLeft} years`;
                    const badgeLabel = isImminent ? "Imminent" : isSoon ? "2–4 Years" : "5+ Years";
                    const isResolving = resolvingKey === item.key;
                    return (
                      <div key={item.key} className={`rounded-xl border px-4 py-3 ${cardBg}`}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-lg leading-none">{item.emoji}</span>
                            <div>
                              <p className="text-sm font-bold text-slate-900 leading-tight">{item.name}</p>
                              {item.note && <p className="text-[10px] text-slate-400">{item.note}</p>}
                            </div>
                          </div>
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                            {badgeLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${yearColor}`} />
                          <p className="text-xs text-slate-700 leading-snug">
                            <span className={`font-bold ${yearColor}`}>
                              {item.yearsLeft < 0 ? "Already due" : item.yearsLeft === 0 ? "Due this year" : `Due ~${item.dueYear}`}
                            </span>
                            {" "}(±3 yrs) · <span className="font-semibold">{item.costRange}</span>
                          </p>
                        </div>
                        {recentUpgradesArr.includes(item.key) && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              ✓ Recently upgraded · forecast adjusted
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
                          <span className={`text-[10px] font-medium ${yearColor}`}>{yearsLabel}</span>
                        </div>
                        <button
                          disabled={isResolving}
                          onClick={async () => {
                            setResolvingKey(item.key);
                            try {
                              const r = await fetch(`${API_BASE}/api/user/big-ticket/resolve`, {
                                method: "POST",
                                credentials: "include",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ key: item.key, name: item.name }),
                              });
                              if (r.ok) {
                                setResolvedKeys((prev) => new Set([...prev, item.key]));
                                setRecentLog((prev) => [{
                                  id: Date.now(),
                                  taskName: `Big-ticket item resolved: ${item.name}`,
                                  taskKey: `big-ticket-resolved-${item.key}`,
                                  month: new Date().toLocaleString("en-US", { month: "long" }),
                                  completedAt: new Date().toISOString(),
                                  notes: "Big-ticket item marked as resolved by homeowner",
                                }, ...prev]);
                              }
                            } finally {
                              setResolvingKey(null);
                            }
                          }}
                          className="mt-2.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/70 hover:bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
                        >
                          {isResolving ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          Mark as recently replaced / not due
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="px-5 pb-4">
                  <p className="text-[11px] text-slate-400 flex items-start gap-1 leading-snug">
                    <Info className="w-3 h-3 mt-0.5 shrink-0" />
                    These are estimates based on industry averages. Actual timing varies by brand, climate, usage, and maintenance history. Always get a professional inspection before major decisions.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── Future Big-Ticket teaser for free users ── */}
        {!userIsPro && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.17 }}
            className="bg-white rounded-2xl border border-dashed border-amber-300 overflow-hidden"
          >
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">Future Big-Ticket Items — Pro Feature</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">See when your roof, HVAC, water heater & more are due for replacement, with estimated costs.</p>
              </div>
              <button
                onClick={() => navigate("/pricing")}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-colors shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                Upgrade
              </button>
            </div>
          </motion.div>
        )}

        {/* ── My Mortgage Rate ── */}
        {mortgageRate !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16 }}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700">
              <h2 className="text-base font-bold text-white">My Mortgage Rate</h2>
              {mortgageRate !== null && (
                <span className="text-[11px] font-semibold text-white/55 uppercase tracking-wider">30-yr Fixed</span>
              )}
            </div>

            {mortgageRate === null ? (
              /* ── No rate entered ── */
              <div className="px-5 py-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm text-slate-600 leading-snug">
                  You haven't added your mortgage rate yet.{" "}
                  <button
                    onClick={() => navigate("/home-profile")}
                    className="font-bold text-primary hover:underline"
                  >
                    Click here
                  </button>
                  {" "}to update your home profile.
                </p>
              </div>
            ) : (
              /* ── Rate comparison ── */
              <div className="px-5 py-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-center bg-white rounded-xl border border-slate-200 py-3 px-4 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your Rate</p>
                    <p className={`text-3xl font-black ${rateIsBetter ? "text-emerald-600" : rateIsHigher ? "text-red-600" : "text-slate-800"}`}>
                      {mortgageRate.toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-2xl font-bold text-slate-300">vs</div>
                  <div className="flex-1 text-center bg-white rounded-xl border border-slate-200 py-3 px-4 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Avg 30yr Fixed</p>
                    <p className="text-3xl font-black text-slate-700">{CURRENT_AVG_RATE.toFixed(2)}%</p>
                  </div>
                </div>

                <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 ${
                  rateIsBetter ? "bg-emerald-100 text-emerald-800" : rateIsHigher ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"
                }`}>
                  {rateIsBetter
                    ? <TrendingDown className="w-5 h-5 shrink-0" />
                    : rateIsHigher
                    ? <TrendingUp className="w-5 h-5 shrink-0" />
                    : <Info className="w-5 h-5 shrink-0" />
                  }
                  <p className="text-sm font-semibold">
                    {rateIsBetter
                      ? `Great rate! You're ${Math.abs(rateDiff!).toFixed(2)}% below the current average.`
                      : rateIsHigher
                      ? `Your rate is ${rateDiff!.toFixed(2)}% above average. Consider contacting your lender about refinancing.`
                      : "Your rate matches the current average."}
                  </p>
                </div>

                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Info className="w-3 h-3 shrink-0" />
                  Rates change daily. This is not financial advice. Average rate is approximate for reference only.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Next Due Tasks ── */}
        {nextDueTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
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
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors duration-300 ${isDone ? "bg-emerald-500" : "bg-amber-400"}`} />
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

        {/* "Powered by MaintainHome.ai" badge — only shown on white-labeled subdomains */}
        {branding && (
          <div className="flex justify-center pt-2 pb-4">
            <a
              href="https://maintainhome.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600 text-xs font-medium"
            >
              <img
                src="/images/logo-icon.png"
                alt="MaintainHome.ai"
                className="w-3.5 h-3.5 object-contain opacity-60"
              />
              Powered by MaintainHome.ai
            </a>
          </div>
        )}

      </div>

      {/* Task-specific Maintly chat — opened from "This Month" task buttons */}
      <AIChatModal
        isOpen={taskChatOpen}
        onClose={() => setTaskChatOpen(false)}
        quizAnswers={savedCalendar?.quizAnswers ?? {}}
        initialMessage={taskChatMessage}
      />

      {/* ── First-Time Onboarding Tour ── */}
      {showTour && (
        <DashboardTour
          steps={[
            {
              ref: tourRef1 as RefObject<HTMLElement | null>,
              title: "Talk to Maintly",
              description: "Maintly is your personal AI home ownership chatbot. Ask him anything about maintenance, repairs, warranties, or your home documents — he's always ready to help!",
            },
            {
              ref: tourRef2 as RefObject<HTMLElement | null>,
              title: "Historical Home Maintenance Log",
              description: "All your completed maintenance tasks live here. Mark tasks as done from your monthly to-do list and they'll be logged automatically — with notes if you add them.",
            },
            {
              ref: tourRef3 as RefObject<HTMLElement | null>,
              title: "To-Do List This Month",
              description: "Your personalized monthly maintenance checklist, generated from your home quiz. Check off tasks as you complete them and they'll be saved to your log.",
            },
            {
              ref: tourRef4 as RefObject<HTMLElement | null>,
              title: "My Property Facts",
              description: "Add more details about your home — square footage, roof type, HVAC age, and more. The more Maintly knows about your property, the smarter your reminders get.",
            },
            {
              ref: tourRef5 as RefObject<HTMLElement | null>,
              title: "Home Health Score",
              description: "Your overall home health score is calculated from your maintenance activity, upcoming tasks, and home profile completeness. Aim to keep it in the green by staying on top of your monthly to-do list!",
            },
          ] as TourStep[]}
          onComplete={completeTour}
          onSkip={completeTour}
        />
      )}
    </div>
  );
}

