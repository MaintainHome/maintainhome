import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, CheckCircle2, Paperclip, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const SUBJECTS = [
  "General Question",
  "Billing & Subscription",
  "Account Access",
  "Feature Request",
  "Bug Report",
  "Other",
];

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ContactSupportModal({ open, onClose }: Props) {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setSubject(SUBJECTS[0]);
      setMessage("");
      setFile(null);
      setFileError(null);
      setSuccess(false);
      setError(null);
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!f) { setFile(null); return; }
    if (!ALLOWED_TYPES.includes(f.type)) {
      setFileError("Only PNG, JPG, WebP, or GIF images are allowed.");
      setFile(null);
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError(`File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`);
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject || !message.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      let fileData: string | null = null;
      let fileName: string | null = null;
      let fileType: string | null = null;

      if (file) {
        fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        fileName = file.name;
        fileType = file.type;
      }

      const res = await fetch(`${API_BASE}/api/support/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject, message: message.trim(), fileData, fileName, fileType }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="support-modal-title"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10 rounded-t-3xl sm:rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Send className="w-4 h-4 text-primary" />
                </div>
                <h2 id="support-modal-title" className="text-base font-bold text-slate-900">
                  Contact Support
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close support form"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center py-8 gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900 mb-1">Message sent!</p>
                    <p className="text-sm text-slate-500">
                      We'll reply to <strong>{email}</strong> soon. Thanks for reaching out.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                  >
                    Done
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-sm text-slate-500 -mt-1">
                    Questions, feedback, or need help? We're here for you.
                  </p>

                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Name + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="support-name">
                        Your Name
                      </label>
                      <input
                        id="support-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Smith"
                        required
                        className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="support-email">
                        Email Address
                      </label>
                      <input
                        id="support-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jane@example.com"
                        required
                        className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="support-subject">
                      Subject
                    </label>
                    <select
                      id="support-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors appearance-none cursor-pointer"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="support-message">
                      Message
                    </label>
                    <textarea
                      id="support-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your question or issue..."
                      required
                      rows={5}
                      maxLength={5000}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
                    />
                    <p className="mt-1 text-[11px] text-slate-400 text-right">
                      {message.length}/5000
                    </p>
                  </div>

                  {/* File upload */}
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1.5">
                      Screenshot <span className="font-normal text-slate-400">(optional)</span>
                    </p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleFile}
                      className="hidden"
                      id="support-file"
                    />
                    <label
                      htmlFor="support-file"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-600 text-sm font-medium cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                      {file ? file.name : "Attach a screenshot"}
                    </label>
                    {file && (
                      <button
                        type="button"
                        onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                        className="ml-2 text-xs text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    {fileError && (
                      <p className="mt-1.5 text-xs text-red-600">{fileError}</p>
                    )}
                    {!fileError && (
                      <p className="mt-1.5 text-[11px] text-slate-400">PNG, JPG, WebP or GIF · max 5 MB</p>
                    )}
                  </div>

                  {/* Submit */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={submitting || !name.trim() || !email.trim() || !message.trim()}
                      className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-primary/20"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
