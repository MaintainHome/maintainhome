import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Bot, User, Loader2, MessageCircle, Zap, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, isPro } from "@/contexts/AuthContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizAnswers?: Record<string, string>;
}

const STARTER_QUESTIONS = [
  "My HVAC is making a strange noise — what should I check?",
  "How often should I inspect my crawl space?",
  "When should I replace my roof shingles?",
  "What maintenance does a septic system need?",
  "How do I know if my water heater needs replacing?",
];

export function AIChatModal({ isOpen, onClose, quizAnswers }: AIChatModalProps) {
  const { user } = useAuth();
  const userIsPro = isPro(user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && userIsPro) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, userIsPro]);

  // Clear chat when closed
  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort();
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput("");
    setIsStreaming(true);

    // Add placeholder assistant message
    const assistantPlaceholder: Message = { role: "assistant", content: "", streaming: true };
    setMessages([...updatedHistory, assistantPlaceholder]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          message: trimmed,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          quizAnswers: quizAnswers ?? {},
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed." }));
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: `Sorry, something went wrong: ${err.error ?? "Please try again."}` },
        ]);
        setIsStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

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
            if (data.done) break;
            if (data.error) {
              fullContent += `\n\n_Error: ${data.error}_`;
            }
            if (data.content) {
              fullContent += data.content;
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "assistant", content: fullContent, streaming: true },
              ]);
            }
          } catch {
            // ignore malformed SSE chunks
          }
        }
      }

      // Finalize message
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: fullContent },
      ]);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "Connection lost. Please try again." },
        ]);
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
  };

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
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-slate-900 text-sm leading-tight">MaintainHome AI</h2>
                <p className="text-xs text-slate-500 truncate">
                  {quizAnswers?.zip
                    ? `Personalized for your home · ZIP ${quizAnswers.zip}`
                    : user?.zipCode
                    ? `Personalized for ZIP ${user.zipCode}`
                    : "Your home maintenance expert"}
                </p>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {!userIsPro ? (
              /* Pro gate for free users */
              <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center gap-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">AI Chat is a Pro feature</h3>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto">
                    Upgrade to Pro to ask unlimited questions to our AI home maintenance expert,
                    personalized to your home and location.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                  <Button
                    className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-white"
                    onClick={() => {
                      onClose();
                      setTimeout(() => {
                        document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
                      }, 200);
                    }}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    See Pro Plans
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
                    Maybe later
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Have a code? Use <code className="bg-slate-100 px-1 rounded font-mono">BETA2026</code> at signup for free Pro access.
                </p>
              </div>
            ) : (
              <>
                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {messages.length === 0 ? (
                    /* Welcome / starter state */
                    <div className="h-full flex flex-col items-center justify-center gap-6 py-4">
                      <div className="text-center">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                          <Bot className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="font-bold text-slate-900 mb-1">Ask MaintainHome AI</h3>
                        <p className="text-sm text-slate-500 max-w-xs">
                          Get expert advice personalized to your home and location. Try a question below or type your own.
                        </p>
                      </div>

                      <div className="w-full max-w-md space-y-2">
                        {STARTER_QUESTIONS.map((q) => (
                          <button
                            key={q}
                            onClick={() => sendMessage(q)}
                            className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-primary/5 hover:border-primary/30 transition-all text-sm text-slate-700 flex items-center gap-3 group"
                          >
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary shrink-0 transition-colors" />
                            <span>{q}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            msg.role === "user"
                              ? "bg-primary text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <User className="w-3.5 h-3.5" />
                          ) : (
                            <Bot className="w-3.5 h-3.5" />
                          )}
                        </div>

                        {/* Bubble */}
                        <div
                          className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                            msg.role === "user"
                              ? "bg-primary text-white rounded-tr-sm"
                              : "bg-slate-100 text-slate-800 rounded-tl-sm"
                          }`}
                        >
                          {msg.content || (msg.streaming && (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          ))}
                          {msg.streaming && msg.content && (
                            <span className="inline-block w-1.5 h-4 bg-slate-400 ml-0.5 animate-pulse rounded-sm align-middle" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input bar */}
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 shrink-0 bg-white">
                  <div className="flex items-center gap-2 bg-slate-50 rounded-2xl border border-slate-200 px-4 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about your home maintenance..."
                      disabled={isStreaming}
                      className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none disabled:opacity-60"
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={isStreaming || !input.trim()}
                      className="w-8 h-8 rounded-full bg-primary hover:bg-primary/90 disabled:bg-slate-200 flex items-center justify-center transition-colors shrink-0"
                    >
                      {isStreaming ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 text-center mt-2">
                    AI advice is for guidance only — always consult a licensed professional for safety issues.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
