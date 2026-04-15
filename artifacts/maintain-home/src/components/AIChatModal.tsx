import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, User, Loader2, Zap, ChevronRight, Paperclip, FileText, ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, isPro } from "@/contexts/AuthContext";

// ── Constants ─────────────────────────────────────────────────────────────
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;  // 5 MB
const PDF_MAX_BYTES   = 8 * 1024 * 1024;  // 8 MB
const ALLOWED_TYPES   = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const BASE = import.meta.env.BASE_URL;

// ── Types ─────────────────────────────────────────────────────────────────
interface FileInfo {
  name: string;
  type: string;
  previewUrl?: string; // data URL for images
}

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  fileInfo?: FileInfo;
  isFileAnalysis?: boolean;
}

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizAnswers?: Record<string, string>;
  initialMessage?: string;
}

// ── Starter questions ─────────────────────────────────────────────────────
const STARTER_QUESTIONS = [
  "My HVAC is making a strange noise — what should I check first?",
  "How do I know when it's time to replace my water heater?",
  "What's the best way to prep my home before winter?",
  "How often should I check my crawl space for moisture?",
  "My roof is 15 years old — what should I be watching for?",
];

// ── Helper: format bytes ──────────────────────────────────────────────────
function fmtBytes(n: number) {
  return n < 1024 * 1024 ? `${(n / 1024).toFixed(0)}KB` : `${(n / 1024 / 1024).toFixed(1)}MB`;
}

// ── Avatar component ──────────────────────────────────────────────────────
function MaintlyAvatar({ variant = "thumb" }: { variant?: "wrench" | "thumb" }) {
  const src = variant === "wrench"
    ? `${BASE}images/maintly_wrench.png`
    : `${BASE}images/maintly_thumb.png`;
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-white border border-slate-100 shadow-sm">
      <img src={src} alt="Maintly" className="w-full"
        style={{ height: "190%", objectFit: "cover", objectPosition: "top center" }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export function AIChatModal({ isOpen, onClose, quizAnswers, initialMessage }: AIChatModalProps) {
  const { user } = useAuth();
  const userIsPro = isPro(user);

  // Chat state
  const [messages, setMessages]           = useState<Message[]>([]);
  const [input, setInput]                 = useState("");
  const [isStreaming, setIsStreaming]      = useState(false);

  // File upload state
  const [pendingFile, setPendingFile]           = useState<File | null>(null);
  const [pendingPreview, setPendingPreview]     = useState<string | null>(null);
  const [fileError, setFileError]               = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const abortRef       = useRef<AbortController | null>(null);
  const initialMessageSentRef = useRef<string | null>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && userIsPro) setTimeout(() => inputRef.current?.focus(), 150);
    if (!isOpen) {
      setMessages([]);
      setInput("");
      clearPendingFile();
      initialMessageSentRef.current = null;
    }
  }, [isOpen, userIsPro]);

  // Abort on close
  useEffect(() => {
    if (!isOpen) abortRef.current?.abort();
  }, [isOpen]);

  // Auto-send initialMessage
  useEffect(() => {
    if (isOpen && userIsPro && initialMessage && initialMessageSentRef.current !== initialMessage) {
      initialMessageSentRef.current = initialMessage;
      const timer = setTimeout(() => sendMessage(initialMessage), 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialMessage, userIsPro]);

  // ── File helpers ────────────────────────────────────────────────────────
  function clearPendingFile() {
    setPendingFile(null);
    setPendingPreview(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Type check
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError("Only JPG, PNG images and PDF documents are supported.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Size check
    const isImage = file.type.startsWith("image/");
    const maxBytes = isImage ? IMAGE_MAX_BYTES : PDF_MAX_BYTES;
    const maxLabel = isImage ? "5MB" : "8MB";
    if (file.size > maxBytes) {
      setFileError(`File is too large (${fmtBytes(file.size)}). Max size is ${maxLabel} for ${isImage ? "images" : "PDFs"}.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setPendingFile(file);

    // Generate data URL preview for images only
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (ev) => setPendingPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPendingPreview(null);
    }
  }

  // ── SSE streaming helper ────────────────────────────────────────────────
  async function streamSse(res: Response, setContent: (fn: (prev: string) => string) => void): Promise<void> {
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
          if (data.error) setContent(prev => prev + `\n\n_Error: ${data.error}_`);
          if (data.content) setContent(prev => prev + data.content);
        } catch {}
      }
    }
  }

  // ── Send text message ───────────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    if (pendingFile) { sendMessageWithFile(text, pendingFile); return; }

    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setIsStreaming(true);
    setMessages([...history, { role: "assistant", content: "", streaming: true }]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          message: trimmed,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          quizAnswers: quizAnswers ?? {},
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed." }));
        setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: `Sorry — ${err.error ?? "Please try again."}` }]);
        return;
      }

      let fullContent = "";
      await streamSse(res, fn => {
        fullContent = fn(fullContent);
        setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: fullContent, streaming: true }]);
      });
      setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: fullContent }]);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: "Connection lost. Please try again." }]);
      }
    } finally {
      setIsStreaming(false);
    }
  };

  // ── Send message with file ──────────────────────────────────────────────
  const sendMessageWithFile = async (text: string, file: File) => {
    if (isStreaming) return;

    const isImage = file.type.startsWith("image/");
    const fileInfo: FileInfo = {
      name: file.name,
      type: file.type,
      previewUrl: pendingPreview ?? undefined,
    };

    const userMsg: Message = {
      role: "user",
      content: text.trim() || `Please analyze this ${isImage ? "photo" : "document"}.`,
      fileInfo,
    };
    const assistantPlaceholder: Message = {
      role: "assistant",
      content: "",
      streaming: true,
      isFileAnalysis: true,
    };
    const history = [...messages, userMsg];
    setMessages([...history, assistantPlaceholder]);
    setInput("");
    clearPendingFile();
    setIsStreaming(true);

    abortRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("message", text.trim());
      formData.append("quizAnswers", JSON.stringify(quizAnswers ?? {}));

      const res = await fetch("/api/ai/chat-with-file", {
        method: "POST",
        credentials: "include",
        signal: abortRef.current.signal,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed." }));
        setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: `Sorry — ${err.error ?? "Please try again."}`, isFileAnalysis: true }]);
        return;
      }

      let fullContent = "";
      await streamSse(res, fn => {
        fullContent = fn(fullContent);
        setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: fullContent, streaming: true, isFileAnalysis: true }]);
      });
      setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: fullContent, isFileAnalysis: true }]);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: "Connection lost. Please try again.", isFileAnalysis: true }]);
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
    clearPendingFile();
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            style={{ height: "clamp(520px, 85vh, 780px)" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-primary/5 to-blue-500/5 shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-white border border-primary/20 shadow-sm">
                <img src={`${BASE}images/maintly_wrench.png`} alt="Maintly" className="w-full"
                  style={{ height: "190%", objectFit: "cover", objectPosition: "top center" }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-slate-900 text-sm leading-tight">Maintly</h2>
                <p className="text-xs text-slate-500 truncate">
                  {quizAnswers?.zip
                    ? `Your home maintenance assistant · ZIP ${quizAnswers.zip}`
                    : user?.zipCode
                    ? `Your home maintenance assistant · ZIP ${user.zipCode}`
                    : "Your home maintenance assistant"}
                </p>
              </div>
              {messages.length > 0 && (
                <button onClick={clearChat}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                  Clear
                </button>
              )}
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {!userIsPro ? (
              /* Pro gate */
              <div className="flex-1 flex flex-col items-center justify-center px-8 py-8 text-center gap-6">
                <img src={`${BASE}images/maintly_wrench.png`} alt="Maintly"
                  className="w-32 h-32 object-contain drop-shadow-md" />
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Meet Maintly — Pro Members Only</h3>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto">
                    Upgrade to Pro to ask unlimited questions — including uploading photos and documents for AI analysis.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                  <Button className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-white"
                    onClick={() => { onClose(); setTimeout(() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }), 200); }}>
                    <Zap className="w-4 h-4 mr-2" />See Pro Plans
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Maybe later</Button>
                </div>
                <p className="text-xs text-slate-400">
                  Have a code? Use <code className="bg-slate-100 px-1 rounded font-mono">BETA2026</code> at signup for free Pro access.
                </p>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="min-h-full flex flex-col items-center justify-center gap-5 py-4">
                      <div className="flex flex-row items-center gap-4 w-full max-w-md">
                        <img src={`${BASE}images/maintly_wrench.png`} alt="Maintly"
                          className="h-24 sm:h-36 w-auto object-contain shrink-0 drop-shadow-md" />
                        <div>
                          <h3 className="font-bold text-slate-900 mb-1">Chat with Maintly</h3>
                          <p className="text-sm text-slate-500">
                            Your friendly home maintenance expert. Ask anything, or upload a photo or document for AI analysis.
                          </p>
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-primary font-semibold">
                            <Paperclip className="w-3.5 h-3.5" />
                            Photos &amp; PDFs supported
                          </div>
                        </div>
                      </div>
                      <div className="w-full max-w-md space-y-2">
                        {STARTER_QUESTIONS.map(q => (
                          <button key={q} onClick={() => sendMessage(q)}
                            className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-primary/5 hover:border-primary/30 transition-all text-base text-slate-700 flex items-center gap-3 group">
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary shrink-0 transition-colors" />
                            <span>{q}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        {/* Avatar */}
                        {msg.role === "user" ? (
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-0.5 bg-white border border-slate-100 shadow-sm">
                            <img src={`${BASE}images/maintly_thumb.png`} alt="Maintly" className="w-full"
                              style={{ height: "190%", objectFit: "cover", objectPosition: "top center" }} />
                          </div>
                        )}

                        <div className="max-w-[80%] flex flex-col gap-1.5">
                          {/* File attachment preview (user messages) */}
                          {msg.fileInfo && (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                              msg.role === "user" ? "bg-primary/80 text-white self-end" : "bg-slate-100 text-slate-700 self-start"
                            }`}>
                              {msg.fileInfo.previewUrl ? (
                                <img src={msg.fileInfo.previewUrl} alt={msg.fileInfo.name}
                                  className="w-32 h-24 object-cover rounded-lg" />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <FileText className="w-5 h-5 shrink-0" />
                                  <span className="max-w-[160px] truncate">{msg.fileInfo.name}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Assistant: "Analyzing file" label */}
                          {msg.isFileAnalysis && msg.role === "assistant" && (
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider px-1">
                              Analyzing uploaded file
                            </p>
                          )}

                          {/* Message bubble */}
                          <div className={`px-4 py-3 rounded-2xl text-lg sm:text-base leading-relaxed whitespace-pre-wrap ${
                            msg.role === "user"
                              ? "bg-primary text-white rounded-tr-sm"
                              : "bg-slate-100 text-slate-800 rounded-tl-sm"
                          }`}>
                            {msg.content || (msg.streaming && (
                              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                            ))}
                            {msg.streaming && msg.content && (
                              <span className="inline-block w-1.5 h-4 bg-slate-400 ml-0.5 animate-pulse rounded-sm align-middle" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 shrink-0 bg-white space-y-2">

                  {/* File preview bar */}
                  <AnimatePresence>
                    {pendingFile && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-3 px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl"
                      >
                        {pendingPreview ? (
                          <img src={pendingPreview} alt="preview"
                            className="w-10 h-10 object-cover rounded-lg shrink-0 border border-white shadow-sm" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{pendingFile.name}</p>
                          <p className="text-[10px] text-slate-400">{fmtBytes(pendingFile.size)}</p>
                        </div>
                        <button onClick={clearPendingFile}
                          className="w-6 h-6 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0">
                          <X className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* File error */}
                  <AnimatePresence>
                    {fileError && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-red-600 font-semibold px-1"
                      >
                        {fileError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Input row */}
                  <div className="flex items-center gap-2 bg-slate-50 rounded-2xl border border-slate-200 px-3 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                    {/* Paperclip button */}
                    <button
                      type="button"
                      onClick={() => { setFileError(null); fileInputRef.current?.click(); }}
                      disabled={isStreaming}
                      title="Upload a photo or PDF"
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                        pendingFile
                          ? "bg-primary text-white"
                          : "bg-slate-200 hover:bg-slate-300 text-slate-500 disabled:opacity-40"
                      }`}
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={pendingFile ? "Add a question about this file (optional)…" : "Ask Maintly anything about your home…"}
                      disabled={isStreaming}
                      className="flex-1 bg-transparent text-lg sm:text-base text-slate-800 placeholder:text-slate-400 outline-none disabled:opacity-60"
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={isStreaming || (!input.trim() && !pendingFile)}
                      className="w-8 h-8 rounded-full bg-primary hover:bg-primary/90 disabled:bg-slate-200 flex items-center justify-center transition-colors shrink-0"
                    >
                      {isStreaming
                        ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                        : <Send className="w-3.5 h-3.5 text-white" />
                      }
                    </button>
                  </div>

                  {/* Size hint */}
                  <p className="text-xs sm:text-[10px] text-slate-400 text-center leading-snug">
                    Photos (JPG/PNG, max 5MB) &amp; PDFs (max 8MB) · Maintly's advice is for guidance only.
                  </p>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
