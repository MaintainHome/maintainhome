import { Check, Zap, Star, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth, isPro } from "@/contexts/AuthContext";

const FREE_FEATURES = [
  "Current month + next month calendar",
  "AI-personalized for your ZIP code",
  "Task details & tips",
  "Mark tasks as done",
];

const PRO_FEATURES = [
  "Full 12-month maintenance calendar",
  "Complete maintenance log history",
  "Smart email reminders (coming soon)",
  "Seasonal alerts & big-ticket warnings",
  "PDF export (coming soon)",
  "Priority support",
];

function UpgradeMessage() {
  return (
    <div className="mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 text-center">
      <strong>Stripe integration coming soon.</strong><br />
      Use promo code <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">BETA2026</code> at signup for free Pro access.
    </div>
  );
}

export function PricingSection() {
  const { user } = useAuth();
  const proUser = isPro(user);
  const [showFreeMsg, setShowFreeMsg] = useState(false);
  const [showMonthlyMsg, setShowMonthlyMsg] = useState(false);
  const [showAnnualMsg, setShowAnnualMsg] = useState(false);

  const MONTHLY_PRICE = 4.99;
  const ANNUAL_PRICE = 39.99;
  const ANNUAL_MONTHLY_EQUIV = (ANNUAL_PRICE / 12).toFixed(2);
  const ANNUAL_SAVINGS_PCT = Math.round((1 - ANNUAL_PRICE / (MONTHLY_PRICE * 12)) * 100);

  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4" />
            Simple, transparent pricing
          </div>
          <h2 className="text-4xl sm:text-5xl font-display font-black text-foreground mb-4">
            Plans for every homeowner
          </h2>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Start free, upgrade when you're ready. No hidden fees.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid sm:grid-cols-3 gap-6 items-stretch">

          {/* Free */}
          <div className="flex flex-col rounded-2xl border-2 border-slate-200 bg-white p-7 shadow-sm">
            <div className="mb-6">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Free</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-display font-black text-slate-900">$0</span>
                <span className="text-slate-400 text-sm">/month</span>
              </div>
              <p className="text-sm text-slate-500">Basic access, forever free</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex gap-2.5 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
              <li className="flex gap-2.5 text-sm text-slate-400 line-through">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                Months 3–12 locked
              </li>
            </ul>

            {user && !proUser ? (
              <div className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-500 text-sm font-semibold text-center">
                Your current plan
              </div>
            ) : !user ? (
              <Button
                variant="outline"
                className="w-full rounded-xl border-slate-300"
                onClick={() => {
                  document.getElementById("waitlist-form")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Get started free
              </Button>
            ) : null}
          </div>

          {/* Monthly Pro */}
          <div className="flex flex-col rounded-2xl border-2 border-primary/30 bg-white p-7 shadow-sm">
            <div className="mb-6">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Pro Monthly</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-display font-black text-slate-900">${MONTHLY_PRICE}</span>
                <span className="text-slate-400 text-sm">/month</span>
              </div>
              <p className="text-sm text-slate-500">Billed monthly, cancel anytime</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex gap-2.5 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            {proUser ? (
              <div className="px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold text-center flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                You have Pro access
              </div>
            ) : (
              <div>
                <Button
                  className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white"
                  onClick={() => setShowMonthlyMsg((v) => !v)}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Upgrade to Pro Monthly
                </Button>
                {showMonthlyMsg && <UpgradeMessage />}
              </div>
            )}
          </div>

          {/* Annual Pro — Best Value */}
          <div className="flex flex-col rounded-2xl border-2 border-primary bg-gradient-to-b from-primary/5 to-white p-7 shadow-lg relative overflow-hidden">
            {/* Best Value badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 bg-primary text-white rounded-full text-xs font-bold">
              <Star className="w-3 h-3 fill-white" />
              Best Value
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Pro Annual</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-display font-black text-slate-900">${ANNUAL_MONTHLY_EQUIV}</span>
                <span className="text-slate-400 text-sm">/month</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-500">
                  ${ANNUAL_PRICE}/year
                </span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Save {ANNUAL_SAVINGS_PCT}%
                </span>
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex gap-2.5 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            {proUser ? (
              <div className="px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold text-center flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                You have Pro access
              </div>
            ) : (
              <div>
                <Button
                  className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                  onClick={() => setShowAnnualMsg((v) => !v)}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Upgrade to Pro Annual
                </Button>
                {showAnnualMsg && <UpgradeMessage />}
              </div>
            )}
          </div>
        </div>

        {/* Promo note */}
        <p className="mt-8 text-center text-sm text-slate-400">
          Have a promo code? Enter it at signup to unlock Pro access instantly.
        </p>
      </div>
    </section>
  );
}
