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
  roofType: string;
  waterSource: string;
  sewerSystem: string;
  pestSchedule: string;
  sqft: string;
  allergies: string;
  allergiesDetails: string;
  crawlSpace: string;
  crawlSpaceSealed: string;
  landscaping: string;
}

// Step index constants
const S_ZIP = 0;
const S_HOME_AGE = 1;
const S_HOME_TYPE = 2;
const S_ROOF_TYPE = 3;
const S_WATER_SOURCE = 4;
const S_SEWER = 5;
const S_PEST = 6;
const S_SQFT = 7;
const S_ALLERGIES = 8;
const S_CRAWL_SPACE = 9;
const S_CRAWL_SEALED = 10; // conditional
const S_LANDSCAPING = 11;

const STEP_TITLES: Record<number, string> = {
  [S_ZIP]: "What's your ZIP code?",
  [S_HOME_AGE]: "How old is your home?",
  [S_HOME_TYPE]: "What type of home is it?",
  [S_ROOF_TYPE]: "What type of roof does the home have?",
  [S_WATER_SOURCE]: "What's the water source?",
  [S_SEWER]: "What's the sewer / waste system?",
  [S_PEST]: "Is the property on a pest prevention schedule?",
  [S_SQFT]: "Approximately how large is your home?",
  [S_ALLERGIES]: "Any pets or family members with allergies?",
  [S_CRAWL_SPACE]: "Does the home have a crawl space?",
  [S_CRAWL_SEALED]: "Is the crawl space sealed / encapsulated?",
  [S_LANDSCAPING]: "What's your lawn / landscaping like?",
};

function getActiveSteps(answers: QuizAnswers): number[] {
  const steps = [S_ZIP, S_HOME_AGE, S_HOME_TYPE, S_ROOF_TYPE, S_WATER_SOURCE, S_SEWER, S_PEST, S_SQFT, S_ALLERGIES, S_CRAWL_SPACE];
  if (answers.crawlSpace === "yes") steps.push(S_CRAWL_SEALED);
  steps.push(S_LANDSCAPING);
  return steps;
}

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
    roofType: "",
    waterSource: "",
    sewerSystem: "",
    pestSchedule: "",
    sqft: "",
    allergies: "",
    allergiesDetails: "",
    crawlSpace: "",
    crawlSpaceSealed: "",
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
      case S_ZIP:          return answers.zip.trim().length >= 5;
      case S_HOME_AGE:     return !!answers.homeAge;
      case S_HOME_TYPE:    return !!answers.homeType;
      case S_ROOF_TYPE:    return !!answers.roofType;
      case S_WATER_SOURCE: return !!answers.waterSource;
      case S_SEWER:        return !!answers.sewerSystem;
      case S_PEST:         return !!answers.pestSchedule;
      case S_SQFT:         return !!answers.sqft;
      case S_ALLERGIES:    return !!answers.allergies;
      case S_CRAWL_SPACE:  return !!answers.crawlSpace;
      case S_CRAWL_SEALED: return !!answers.crawlSpaceSealed;
      case S_LANDSCAPING:  return !!answers.landscaping;
      default:             return false;
    }
  };

  const next = () => {
    if (!canProceed()) return;
    const activeSteps = getActiveSteps(answers);
    const currentIndex = activeSteps.indexOf(step);
    if (currentIndex === activeSteps.length - 1) {
      submit();
    } else {
      setDirection(1);
      setStep(activeSteps[currentIndex + 1]);
    }
  };

  const back = () => {
    const activeSteps = getActiveSteps(answers);
    const currentIndex = activeSteps.indexOf(step);
    if (currentIndex > 0) {
      setDirection(-1);
      setStep(activeSteps[currentIndex - 1]);
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
      zip: "", homeAge: "", homeType: "", roofType: "",
      waterSource: "", sewerSystem: "", pestSchedule: "",
      sqft: "", allergies: "", allergiesDetails: "",
      crawlSpace: "", crawlSpaceSealed: "", landscaping: "",
    });
  };

  if (results) {
    return <CalendarResults data={results} onReset={reset} />;
  }

  const activeSteps = getActiveSteps(answers);
  const currentIndex = activeSteps.indexOf(step);
  const totalSteps = activeSteps.length;

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  const isLastStep = currentIndex === totalSteps - 1;

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-slate-500 mb-2 font-medium">
          <span>Step {currentIndex + 1} of {totalSteps}</span>
          <span>{Math.round(((currentIndex + 1) / totalSteps) * 100)}% complete</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full"
            animate={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
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

              {/* ZIP */}
              {step === S_ZIP && (
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

              {/* Home Age */}
              {step === S_HOME_AGE && (
                <div className="space-y-3">
                  {[
                    { value: "new_construction", label: "New construction" },
                    { value: "resale_recent", label: "Resale (built in last 10 years)" },
                    { value: "resale_old", label: "Resale (10+ years old)" },
                  ].map((opt) => (
                    <OptionButton key={opt.value} selected={answers.homeAge === opt.value} onClick={() => set("homeAge", opt.value)}>
                      {opt.label}
                    </OptionButton>
                  ))}
                </div>
              )}

              {/* Home Type */}
              {step === S_HOME_TYPE && (
                <div className="space-y-3">
                  {[
                    { value: "single_family", label: "Single family house" },
                    { value: "townhome", label: "Townhome" },
                    { value: "condo", label: "Condo / Apartment" },
                    { value: "other", label: "Other" },
                  ].map((opt) => (
                    <OptionButton key={opt.value} selected={answers.homeType === opt.value} onClick={() => set("homeType", opt.value)}>
                      {opt.label}
                    </OptionButton>
                  ))}
                </div>
              )}

              {/* Roof Type (NEW) */}
              {step === S_ROOF_TYPE && (
                <div className="space-y-3">
                  {[
                    { value: "asphalt", label: "Asphalt shingles" },
                    { value: "metal", label: "Metal" },
                    { value: "tile", label: "Tile" },
                    { value: "flat", label: "Flat roof" },
                    { value: "other", label: "Other / Not sure" },
                  ].map((opt) => (
                    <OptionButton key={opt.value} selected={answers.roofType === opt.value} onClick={() => set("roofType", opt.value)}>
                      {opt.label}
                    </OptionButton>
                  ))}
                </div>
              )}

              {/* Water Source (NEW) */}
              {step === S_WATER_SOURCE && (
                <div className="space-y-3">
                  {[
                    { value: "municipal", label: "Connected to municipal / city water" },
                    { value: "well", label: "Private well" },
                  ].map((opt) => (
                    <OptionButton key={opt.value} selected={answers.waterSource === opt.value} onClick={() => set("waterSource", opt.value)}>
                      {opt.label}
                    </OptionButton>
                  ))}
                </div>
              )}

              {/* Sewer System (NEW) */}
              {step === S_SEWER && (
                <div className="space-y-3">
                  {[
                    { value: "municipal", label: "Connected to municipal sewer" },
                    { value: "septic", label: "Septic system" },
                  ].map((opt) => (
                    <OptionButton key={opt.value} selected={answers.sewerSystem === opt.value} onClick={() => set("sewerSystem", opt.value)}>
                      {opt.label}
                    </OptionButton>
                  ))}
                </div>
              )}

              {/* Pest Schedule (NEW) */}
              {step === S_PEST && (
                <div className="space-y-3">
                  {[
                    { value: "yes", label: "Yes — monthly or quarterly service" },
                    { value: "no", label: "No" },
                    { value: "not_sure", label: "Not sure" },
                  ].map((opt) => (
                    <OptionButton key={opt.value} selected={answers.pestSchedule === opt.value} onClick={() => set("pestSchedule", opt.value)}>
                      {opt.label}
                    </OptionButton>
                  ))}
                </div>
              )}

              {/* Square Footage */}
              {step === S_SQFT && (
                <div className="space-y-3">
                  {[
                    { value: "under_1500", label: "Under 1,500 sq ft" },
                    { value: "1500_2500", label: "1,500 – 2,500 sq ft" },
                    { value: "2500_4000", label: "2,500 – 4,000 sq ft" },
                    { value: "over_4000", label: "Over 4,000 sq ft" },
                  ].map((opt) => (
                    <OptionButton key={opt.value} selected={answers.sqft === opt.value} onClick={() => set("sqft", opt.value)}>
                      {opt.label}
                    </OptionButton>
                  ))}
                </div>
              )}

              {/* Allergies */}
              {step === S_ALLERGIES && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                    ].map((opt) => (
                      <OptionButton key={opt.value} selected={answers.allergies === opt.value} onClick={() => set("allergies", opt.value)}>
                        {opt.label}
                      </OptionButton>
                    ))}
                  </div>
                  {answers.allergies === "yes" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
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

              {/* Crawl Space */}
              {step === S_CRAWL_SPACE && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No / Not sure" },
                    ].map((opt) => (
                      <OptionButton key={opt.value} selected={answers.crawlSpace === opt.value} onClick={() => set("crawlSpace", opt.value)}>
                        {opt.label}
                      </OptionButton>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">A crawl space is the low area under some homes above the ground.</p>
                </div>
              )}

              {/* Crawl Space Sealed — conditional, only appears if crawlSpace === "yes" */}
              {step === S_CRAWL_SEALED && (
                <div className="space-y-3">
                  {[
                    { value: "yes", label: "Yes — sealed / encapsulated" },
                    { value: "no", label: "No — open / vented" },
                    { value: "not_sure", label: "Not sure" },
                  ].map((opt) => (
                    <OptionButton key={opt.value} selected={answers.crawlSpaceSealed === opt.value} onClick={() => set("crawlSpaceSealed", opt.value)}>
                      {opt.label}
                    </OptionButton>
                  ))}
                  <p className="text-xs text-slate-400">Sealed crawl spaces need different maintenance than vented ones.</p>
                </div>
              )}

              {/* Landscaping */}
              {step === S_LANDSCAPING && (
                <div className="space-y-3">
                  {[
                    { value: "mostly_grass", label: "Mostly grass / turf lawn" },
                    { value: "natural_areas", label: "Natural areas / mulch beds / gardens" },
                    { value: "minimal", label: "Minimal landscaping" },
                  ].map((opt) => (
                    <OptionButton key={opt.value} selected={answers.landscaping === opt.value} onClick={() => set("landscaping", opt.value)}>
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
          {currentIndex > 0 && (
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
            ) : isLastStep ? (
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
