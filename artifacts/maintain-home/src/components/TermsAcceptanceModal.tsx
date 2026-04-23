import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollText, ShieldCheck, LogOut, ChevronDown } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function TermsAcceptanceModal({ open, onAccept, onDecline }: Props) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declined, setDeclined] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setScrolledToBottom(false);
      setDeclined(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: 0 }), 50);
    }
  }, [open]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setScrolledToBottom(true);
    }
  }

  async function handleAccept() {
    setAccepting(true);
    try {
      await fetch(`${API_BASE}/api/user/accept-terms`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    onAccept();
    setAccepting(false);
  }

  async function handleDecline() {
    setDeclining(true);
    setDeclined(true);
    setTimeout(() => {
      onDecline();
    }, 2800);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-2xl bg-[#0f1a2e] border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "90vh" }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, #1f9e6e 0%, #3b82f6 100%)" }}>
                  <ScrollText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-black text-lg sm:text-xl leading-tight">
                    Before You Continue — Please Accept Our Terms
                  </h2>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Scroll through and read the full terms below.{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300 underline font-medium"
                    >
                      View full Terms of Service →
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Terms */}
            <div className="relative flex-1 min-h-0">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="h-full overflow-y-auto px-6 py-5 text-slate-300 text-sm leading-relaxed space-y-5"
                style={{ maxHeight: "50vh" }}
              >
                <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Terms of Service — MaintainHome.ai</p>
                <p className="text-slate-400 text-xs">Last updated: April 2026</p>

                <p>
                  Please read these Terms of Service ("Terms") carefully before using MaintainHome.ai ("the Service", "we", "us", or "our"). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, you must not use the Service.
                </p>

                <div>
                  <h3 className="text-white font-bold text-sm mb-1">1. Service Provided "As Is"</h3>
                  <p>
                    MaintainHome.ai is provided on an <strong className="text-white">"AS IS"</strong> and <strong className="text-white">"AS AVAILABLE"</strong> basis without any warranties of any kind, either express or implied. We make no representations or warranties regarding the accuracy, completeness, reliability, or fitness for any particular purpose of the Service, its content, or any information provided through it. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components.
                  </p>
                </div>

                <div>
                  <h3 className="text-white font-bold text-sm mb-1">2. No Professional Advice</h3>
                  <p>
                    The content, AI-generated responses, maintenance reminders, schedules, tips, and recommendations provided by MaintainHome.ai — including those generated by the "Maintly" AI assistant — are for <strong className="text-white">general informational and educational purposes only</strong>. Nothing in the Service constitutes or should be construed as professional advice of any kind, including but not limited to:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400 text-xs">
                    <li>Home inspection or engineering advice</li>
                    <li>Legal or regulatory advice</li>
                    <li>Financial, insurance, or investment advice</li>
                    <li>Licensed contractor or trade professional advice</li>
                    <li>Safety or code compliance guidance</li>
                  </ul>
                  <p className="mt-2">
                    Always consult a qualified licensed professional before making decisions about your property, safety systems, structural components, or any home improvement or repair project.
                  </p>
                </div>

                <div>
                  <h3 className="text-white font-bold text-sm mb-1">3. AI-Generated Content Disclaimer</h3>
                  <p>
                    MaintainHome.ai uses artificial intelligence to generate personalized content, reminders, and home maintenance guidance. <strong className="text-white">AI-generated responses may be inaccurate, incomplete, or inappropriate for your specific situation.</strong> We expressly disclaim all liability for any reliance on AI-generated content. You acknowledge that:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400 text-xs">
                    <li>AI outputs are not verified by licensed professionals</li>
                    <li>AI recommendations may not account for local building codes, HOA rules, or unique property conditions</li>
                    <li>Following AI-generated advice without professional review is done entirely at your own risk</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-white font-bold text-sm mb-1">4. No Liability for Property Damage</h3>
                  <p>
                    <strong className="text-white">We are not responsible for any property damage, personal injury, financial loss, or any other harm</strong> arising from your use of, or reliance on, the Service or any content, reminders, or advice generated by or through MaintainHome.ai. This includes but is not limited to damage caused by:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400 text-xs">
                    <li>Following maintenance recommendations from the Service</li>
                    <li>Relying on AI-generated guidance for repairs or improvements</li>
                    <li>Missed, delayed, or incorrect maintenance reminders</li>
                    <li>Incomplete or inaccurate home maintenance schedules</li>
                    <li>Any actions taken by contractors or service providers you engage through the Service</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-white font-bold text-sm mb-1">5. Limitation of Liability</h3>
                  <p>
                    To the fullest extent permitted by applicable law, MaintainHome.ai, its owners, officers, employees, contractors, affiliates, and agents shall <strong className="text-white">not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages</strong>, including without limitation:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400 text-xs">
                    <li>Loss of profits, data, goodwill, or business opportunities</li>
                    <li>Property damage or personal injury</li>
                    <li>Cost of substitute goods or services</li>
                    <li>Any damages arising from your reliance on AI-generated content</li>
                  </ul>
                  <p className="mt-2">
                    In no event shall our total cumulative liability to you exceed the amount you have paid us in the twelve (12) months preceding the claim, or $100 USD, whichever is less.
                  </p>
                </div>

                <div>
                  <h3 className="text-white font-bold text-sm mb-1">6. User Responsibilities</h3>
                  <p>
                    You are solely responsible for evaluating the suitability of any maintenance task, repair, or recommendation for your specific property. You agree to:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400 text-xs">
                    <li>Use the Service for lawful purposes only</li>
                    <li>Independently verify any maintenance recommendations before acting on them</li>
                    <li>Consult licensed professionals for all significant repair and safety decisions</li>
                    <li>Keep your account credentials secure</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-white font-bold text-sm mb-1">7. Privacy & Data</h3>
                  <p>
                    Your use of the Service is also governed by our Privacy Policy, available at maintainhome.ai/privacy. By using the Service, you consent to the collection and use of your information as described therein.
                  </p>
                </div>

                <div>
                  <h3 className="text-white font-bold text-sm mb-1">8. Modifications</h3>
                  <p>
                    We reserve the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the revised Terms. Material changes will be communicated via email or in-app notification.
                  </p>
                </div>

                <div>
                  <h3 className="text-white font-bold text-sm mb-1">9. Governing Law</h3>
                  <p>
                    These Terms shall be governed by and construed in accordance with the laws of the State of North Carolina, without regard to its conflict of law provisions.
                  </p>
                </div>

                <div>
                  <h3 className="text-white font-bold text-sm mb-1">10. Contact</h3>
                  <p>
                    Questions about these Terms? Contact us at <span className="text-green-400">support@maintainhome.ai</span>.
                  </p>
                </div>

                <div className="h-4" />
              </div>

              {/* Scroll hint */}
              {!scrolledToBottom && (
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0f1a2e] to-transparent flex items-end justify-center pb-2 pointer-events-none">
                  <div className="flex items-center gap-1 text-slate-500 text-xs animate-bounce">
                    <ChevronDown className="w-3.5 h-3.5" />
                    Scroll to continue
                  </div>
                </div>
              )}
            </div>

            {/* Declined message */}
            {declined && (
              <div className="px-6 py-3 bg-red-950/60 border-t border-red-800/50 text-red-300 text-sm text-center font-medium">
                You must accept the Terms &amp; Conditions to use MaintainHome.ai. Signing you out…
              </div>
            )}

            {/* Buttons */}
            <div className="px-6 py-5 border-t border-slate-700 shrink-0 space-y-3">
              <p className="text-center text-xs text-slate-400 leading-relaxed">
                I agree to the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 underline font-medium"
                >
                  Terms of Service
                </a>
                {" "}and{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 underline font-medium"
                >
                  Privacy Policy
                </a>
              </p>
              <button
                onClick={handleAccept}
                disabled={accepting || declining}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-extrabold text-base sm:text-lg transition-all disabled:opacity-60 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #1f9e6e 0%, #3b82f6 100%)" }}
              >
                <ShieldCheck className="w-5 h-5" />
                {accepting ? "Saving…" : "I Accept & Continue"}
              </button>

              <button
                onClick={handleDecline}
                disabled={accepting || declining}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-slate-400 hover:text-red-400 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                I Do Not Accept
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
