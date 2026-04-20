import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bug, Lightbulb, MessageCircle, Loader2, CheckCircle2, Image as ImageIcon, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

type Category = "bug" | "suggestion" | "other";
type Stage = "form" | "sent" | "error";

const CATEGORIES: { value: Category; label: string; icon: typeof Bug; color: string }[] = [
  { value: "bug", label: "Bug", icon: Bug, color: "#ef4444" },
  { value: "suggestion", label: "Suggestion", icon: Lightbulb, color: "#f59e0b" },
  { value: "other", label: "Other", icon: MessageCircle, color: "#1f9e6e" },
];

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState<Category>("bug");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("form");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setCategory("bug");
        setDescription("");
        setFile(null);
        setFilePreview(null);
        setStage("form");
        setErrorMsg("");
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setErrorMsg("Please select an image file.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErrorMsg("Image must be under 5MB.");
      return;
    }
    setErrorMsg("");
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => setFilePreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg("Please describe the issue or feedback.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      let fileData: string | null = null;
      let fileName: string | null = null;
      if (file) {
        fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });
        fileName = file.name;
      }

      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description: description.trim(),
          pageUrl: window.location.href,
          fileData,
          fileName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Could not submit feedback.");
        setStage("error");
        return;
      }
      setStage("sent");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStage("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[calc(100vh-1.5rem)]"
        >
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Bug className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-base leading-tight">Report a Bug or Feedback</p>
                <p className="text-xs text-slate-500 leading-tight">We read every report personally.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {stage === "form" && (
            <form onSubmit={handleSubmit} className="px-6 pb-6">
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Category</label>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {CATEGORIES.map(c => {
                  const Icon = c.icon;
                  const active = category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <Icon className="w-5 h-5" style={{ color: active ? c.color : "#94a3b8" }} />
                      <span className={`text-xs font-bold ${active ? "text-slate-900" : "text-slate-500"}`}>
                        {c.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={
                  category === "bug"
                    ? "What happened? What did you expect?"
                    : category === "suggestion"
                    ? "What would make MaintainHome.ai better for you?"
                    : "Tell us anything…"
                }
                rows={5}
                maxLength={5000}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary focus:outline-none text-sm resize-none transition-colors mb-4"
                required
              />

              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Screenshot <span className="text-slate-400 font-normal normal-case">(optional)</span>
              </label>
              {filePreview ? (
                <div className="relative mb-4 rounded-xl overflow-hidden border border-slate-200">
                  <img src={filePreview} alt="Screenshot preview" className="w-full max-h-48 object-cover" />
                  <button
                    type="button"
                    onClick={() => { setFile(null); setFilePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-primary hover:text-primary transition-colors text-sm font-semibold mb-4"
                >
                  <ImageIcon className="w-4 h-4" />
                  Add a screenshot
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {user && (
                <p className="text-[11px] text-slate-400 mb-3">
                  Sending as <span className="font-semibold text-slate-600">{user.email}</span>
                </p>
              )}

              {errorMsg && (
                <p className="text-xs text-red-600 font-semibold mb-3">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={loading || !description.trim()}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary/20"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
                ) : (
                  <><Send className="w-4 h-4" />Send Feedback</>
                )}
              </button>
            </form>
          )}

          {stage === "sent" && (
            <div className="text-center px-6 pb-7">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Thanks — we got it!</h3>
              <p className="text-sm text-slate-600 mb-5">
                Your feedback was delivered to the team. We'll follow up if we need more details.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {stage === "error" && (
            <div className="text-center px-6 pb-7">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <X className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-red-600 text-sm font-medium mb-5">{errorMsg}</p>
              <button
                onClick={() => { setStage("form"); setErrorMsg(""); }}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
