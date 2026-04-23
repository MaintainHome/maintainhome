import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ChevronDown, HelpCircle, MessageCircle } from "lucide-react";
import { useSupportModal } from "@/contexts/SupportContext";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL;

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "What is Maintly and what does it do?",
    answer:
      "Maintly is your AI-powered home ownership assistant built into MaintainHome.ai. When you chat with Maintly, it helps you track maintenance tasks, understand your personalized calendar, get answers about your home systems, and stay on top of seasonal care — all based on your specific home profile.",
  },
  {
    question: "How does the personalized maintenance calendar work?",
    answer:
      "After you complete the quick home profile quiz, our AI generates a 12-month maintenance calendar customized to your home's age, systems, region, and climate. It schedules tasks like HVAC filter changes, gutter cleaning, smoke detector checks, and more at the right time of year for you specifically.",
  },
  {
    question: "Is my data safe and private?",
    answer:
      "Yes. All your data is stored securely with encryption in transit and at rest. We do not sell your personal data. Your home profile information is used only to power your personalized experience. You can delete your account and all associated data at any time from the Home Profile settings page.",
  },
  {
    question: "How do I contact support?",
    answer:
      "You can reach us any time using the Contact Support button in the app — look for the '?' icon in the top-right corner of any page, or the 'Contact Support' link in the footer. You can also email us at support@maintainhome.ai. We typically respond within one business day.",
  },
  {
    question: "What is the difference between the Free and Pro plans?",
    answer:
      "The Free plan gives you access to your basic maintenance calendar and limited AI chat messages. The Pro plan unlocks unlimited Maintly AI chat, text/SMS reminders, document uploads, detailed maintenance history, PDF/CSV exports, and priority support. You can view full plan details on the Pricing page.",
  },
  {
    question: "How do text reminders work?",
    answer:
      "With a Pro plan, you'll receive SMS text reminders for upcoming maintenance tasks directly to your phone. These are sent a few days before each task is due so you have time to prepare. You can manage your reminder preferences in your Home Profile settings.",
  },
  {
    question: "I was invited by my real estate agent or builder — what does that mean?",
    answer:
      "Some brokers and home builders partner with MaintainHome.ai to offer it as a gift or benefit to their clients. If you were invited, your access may already be partially or fully covered by your agent or builder. You'll see their branding on your personalized home page. Everything still works exactly the same way.",
  },
  {
    question: "Can I update my home information after the initial quiz?",
    answer:
      "Yes! You can update your home profile at any time by visiting the Home Profile page from your dashboard. Changes to your home details may update your maintenance calendar recommendations on the next refresh.",
  },
  {
    question: "Where can I read the Terms of Service?",
    answer:
      "Our full Terms of Service are available at maintainhome.ai/terms (also linked from the footer of every page). They cover account use, subscriptions, AI disclaimers, your responsibilities, and our limitation of liability. We recommend giving them a quick read before relying on Maintly's recommendations for any major repair or safety decision.",
  },
];

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-white hover:bg-slate-50 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold text-slate-800 leading-snug">{item.question}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 bg-slate-50 border-t border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed">{item.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HelpPage() {
  const [, navigate] = useLocation();
  const { openSupport } = useSupportModal();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src={`${BASE}images/logo-icon.png`} alt="MaintainHome.ai" className="w-5 h-5 object-contain" />
            <h1 className="text-base font-bold text-slate-900 truncate">Help &amp; FAQ</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Intro card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Help &amp; FAQ</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Find answers to common questions about MaintainHome.ai. Can't find what you're looking for? Reach out and we'll help.
          </p>
        </div>

        {/* FAQ list */}
        <div className="space-y-3 mb-8">
          {FAQS.map((faq, i) => (
            <FAQAccordion
              key={i}
              item={faq}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>

        {/* Still need help */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-slate-800 mb-1">Still have a question?</h2>
          <p className="text-sm text-slate-500 mb-4">
            Our team is happy to help. Send us a message and we'll get back to you within one business day.
          </p>
          <button
            onClick={openSupport}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-colors shadow-sm shadow-primary/20"
          >
            <MessageCircle className="w-4 h-4" />
            Contact Support
          </button>
        </div>

        {/* Footer nav */}
        <div className="mt-8 text-center flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            ← Back to MaintainHome.ai
          </button>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <button
            onClick={() => navigate("/terms")}
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Terms of Service
          </button>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <button
            onClick={() => navigate("/privacy")}
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
}
