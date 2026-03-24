import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarResults } from "@/components/CalendarResults";

interface QuizAnswers {
  zip: string;
  homeAge: string;
  homeType: string;
  sqft: string;
  allergies: string;
  allergiesDetails: string;
  crawlSpace: string;
  landscaping: string;
}

const TOTAL_STEPS = 7;

const STEP_TITLES = [
  "What's your ZIP code?",
  "How old is your home?",
  "What type of home is it?",
  "Approximately how large is your home?",
  "Any pets or family members with allergies?",
  "Does the home have a crawl space?",
  "What's your lawn / landscaping like?",
];

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all duration-150 ${
        selected
          ? "border-primary bg-primary/10 text-primary shadow-sm"
          : "border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50 text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

export function DemoQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    zip: "",
    homeAge: "",
    homeType: "",
    sqft: "",
    allergies: "",
    allergiesDetails: "",
    crawlSpace: "",
    landscaping: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [direction, setDirection] = useState<1 | -1>(1);

  const set = (key: keyof QuizAnswers, value: string) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  const canProceed = () => {
    switch (step) {
      case 0: return answers.zip.trim().length >= 5;
      case 1: return !!answers.homeAge;
      case 2: return !!answers.homeType;
      case 3: return !!answers.sqft;
      case 4: return !!answers.allergies;
      case 5: return !!answers.crawlSpace;
      case 6: return !!answers.landscaping;
      default: return false;
    }
  };

  const next = () => {
    if (!canProceed()) return;
    if (step < TOTAL_STEPS - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      submit();
    }
  };

  const back = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      setResults(data);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResults(null);
    setError(null);
    setStep(0);
    setAnswers({
      zip: "", homeAge: "", homeType: "", sqft: "",
      allergies: "", allergiesDetails: "", crawlSpace: "", landscaping: "",
    });
  };

  if (results) {
    return <CalendarResults data={results} onReset={reset} />;
  }

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-slate-500 mb-2 font-medium">
          <span>Step {step + 1} of {TOTAL_STEPS}</span>
          <span>{Math.round(((step + 1) / TOTAL_STEPS) * 100)}% complete</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full"
            animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6">
                {STEP_TITLES[step]}
              </h3>

              {/* Step 0: ZIP */}
              {step === 0 && (
                <div className="space-y-2">
                  <Label htmlFor="quiz-zip" className="text-slate-600 font-medium">ZIP Code</Label>
                  <Input
                    id="quiz-zip"
                    value={answers.zip}
                    onChange={(e) => set("zip", e.target.value.replace(/\D/g, "").slice(0, 5))}
                    placeholder="e.g. 27514"
                    maxLength={5}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 text-lg tracking-widest font-mono"
                    onKeyDown={(e) => e.key === "Enter" && next()}
                    autoFocus
                  />
                  <p className="text-xs text-slate-400">Used to detect your state and climate zone.</p>
                </div>
              )}

              {/* Step 1: Home Age */}
              {step === 1 && (
                <div className="space-y-3">
                  {[
                    { value: "new_construction", label: "New construction" },
                    { value: "resale_recent", label: "Resale (built in last 10 years)" },
                    { value: "resale_old", label: "Resale (10+ years old)" },
                  ].map((opt) => (
                    <OptionButton
                      key={opt.value}
                      selected={answers.homeAge === opt.value}
                      onClick={() => set("homeAge", opt.value)}
                    >
                      {opt.label}
                    </OptionButton>
                  ))}
                </div>
              )}

              {/* Step 2: Home Type */}
              {step === 2 && (
                <div className="space-y-3">
                  {[
                    { value: "single_family", label: "Single family house" },
                    { value: "townhome", label: "Townhome" },
                    { value: "condo", label: "Condo / Apartment" },
                    { value: "other", label: "Other" },
                  ].map((opt) => (
                    <OptionButton
                      key={opt.value}
                      selected={answers.homeType === opt.value}
                      onClick={() => set("homeType", opt.value)}
                    >
                      {opt.label}
                    </OptionButton>
                  ))}
                </div>
              )}

              {/* Step 3: Square Footage */}
              {step === 3 && (
                <div className="space-y-3">
                  {[
                    { value: "under_1500", label: "Under 1,500 sq ft" },
                    { value: "1500_2500", label: "1,500 – 2,500 sq ft" },
                    { value: "2500_4000", label: "2,500 – 4,000 sq ft" },
                    { value: "over_4000", label: "Over 4,000 sq ft" },
                  ].map((opt) => (
                    <OptionButton
                      key={opt.value}
                      selected={answers.sqft === opt.value}
                      onClick={() => set("sqft", opt.value)}
                    >
                      {opt.label}
                    </OptionButton>
                  ))}
                </div>
              )}

              {/* Step 4: Allergies */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                    ].map((opt) => (
                      <OptionButton
                        key={opt.value}
                        selected={answers.allergies === opt.value}
                        onClick={() => set("allergies", opt.value)}
                      >
                        {opt.label}
                      </OptionButton>
                    ))}
                  </div>
                  {answers.allergies === "yes" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-2"
                    >
                      <Label htmlFor="quiz-allergies" className="text-slate-600 font-medium">
                        Any details? <span className="text-slate-400 font-normal">(Optional)</span>
                      </Label>
                      <Input
                        id="quiz-allergies"
                        value={answers.allergiesDetails}
                        onChange={(e) => set("allergiesDetails", e.target.value)}
                        placeholder="e.g. dog, dust, pollen"
                        className="h-11 rounded-xl bg-slate-50 border-slate-200"
                      />
                    </motion.div>
                  )}
                </div>
              )}

              {/* Step 5: Crawl Space */}
              {step === 5 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No / Not sure" },
                    ].map((opt) => (
                      <OptionButton
                        key={opt.value}
                        selected={answers.crawlSpace === opt.value}
                        onClick={() => set("crawlSpace", opt.value)}
                      >
                        {opt.label}
                      </OptionButton>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">A crawl space is the low area under some homes above the ground.</p>
                </div>
              )}

              {/* Step 6: Landscaping */}
              {step === 6 && (
                <div className="space-y-3">
                  {[
                    { value: "mostly_grass", label: "Mostly grass / turf lawn" },
                    { value: "natural_areas", label: "Natural areas / mulch beds / gardens" },
                    { value: "minimal", label: "Minimal landscaping" },
                  ].map((opt) => (
                    <OptionButton
                      key={opt.value}
                      selected={answers.landscaping === opt.value}
                      onClick={() => set("landscaping", opt.value)}
                    >
                      {opt.label}
                    </OptionButton>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-8 pb-8 flex items-center gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={back}
              disabled={loading}
              className="rounded-xl h-12 px-5 border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}

          <Button
            onClick={next}
            disabled={!canProceed() || loading}
            className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Building your calendar…
              </>
            ) : step === TOTAL_STEPS - 1 ? (
              <>
                <Sparkles className="mr-2 w-4 h-4" />
                Generate My Calendar
              </>
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
