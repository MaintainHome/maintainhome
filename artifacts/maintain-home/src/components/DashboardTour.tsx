import { useEffect, useRef, useState, useCallback, type RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Check, MapPin } from "lucide-react";

export interface TourStep {
  ref: RefObject<HTMLElement | null>;
  title: string;
  description: string;
}

interface Props {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
}

const SPOTLIGHT_PAD = 10;
const TOOLTIP_GAP = 16;

interface SpotlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function DashboardTour({ steps, onComplete, onSkip }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [tooltipSide, setTooltipSide] = useState<"below" | "above">("below");
  const frameRef = useRef<number>(0);
  const isLast = stepIdx === steps.length - 1;
  const currentStep = steps[stepIdx];

  const updateSpotlight = useCallback(() => {
    const el = currentStep?.ref?.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSpotlight({
      left: r.left - SPOTLIGHT_PAD,
      top: r.top - SPOTLIGHT_PAD,
      width: r.width + SPOTLIGHT_PAD * 2,
      height: r.height + SPOTLIGHT_PAD * 2,
    });
    const viewH = window.innerHeight;
    setTooltipSide(r.bottom + TOOLTIP_GAP + 180 > viewH ? "above" : "below");
  }, [currentStep]);

  // Scroll target into view then update spotlight
  useEffect(() => {
    const el = currentStep?.ref?.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    // Wait for scroll to settle, then measure
    const timer = setTimeout(() => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(updateSpotlight);
    }, 380);
    return () => clearTimeout(timer);
  }, [stepIdx, updateSpotlight]);

  // Re-measure on resize
  useEffect(() => {
    const onResize = () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(updateSpotlight);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateSpotlight]);

  function handleNext() {
    if (isLast) {
      onComplete();
    } else {
      setSpotlight(null);
      setStepIdx((i) => i + 1);
    }
  }

  // Tooltip horizontal position — clamp to screen
  function tooltipLeft(sl: SpotlightRect): number {
    const tooltipW = Math.min(320, window.innerWidth - 32);
    const idealCenter = sl.left + sl.width / 2;
    const left = idealCenter - tooltipW / 2;
    return Math.max(16, Math.min(left, window.innerWidth - tooltipW - 16));
  }

  const tooltipW = typeof window !== "undefined"
    ? Math.min(320, window.innerWidth - 32)
    : 320;

  return (
    <div className="fixed inset-0 z-[200]" style={{ pointerEvents: "none" }}>
      {/* Dark overlay */}
      <AnimatePresence>
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60"
          style={{ pointerEvents: "auto" }}
          onClick={onSkip}
        />
      </AnimatePresence>

      {/* Spotlight cut-out + ring */}
      <AnimatePresence mode="wait">
        {spotlight && (
          <motion.div
            key={`spotlight-${stepIdx}`}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{
              position: "fixed",
              left: spotlight.left,
              top: spotlight.top,
              width: spotlight.width,
              height: spotlight.height,
              borderRadius: 18,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
              border: "2.5px solid #1f9e6e",
              zIndex: 201,
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        {spotlight && (
          <motion.div
            key={`tooltip-${stepIdx}`}
            initial={{ opacity: 0, y: tooltipSide === "below" ? 10 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: tooltipSide === "below" ? 10 : -10 }}
            transition={{ duration: 0.22, ease: "easeOut", delay: 0.08 }}
            style={{
              position: "fixed",
              top: tooltipSide === "below"
                ? spotlight.top + spotlight.height + TOOLTIP_GAP
                : spotlight.top - TOOLTIP_GAP - 4,
              left: tooltipLeft(spotlight),
              width: tooltipW,
              transform: tooltipSide === "above" ? "translateY(-100%)" : undefined,
              zIndex: 202,
              pointerEvents: "auto",
            }}
          >
            {/* Arrow */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 ${
                tooltipSide === "below"
                  ? "top-0 -translate-y-full border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white"
                  : "bottom-0 translate-y-full border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"
              }`}
              style={{ filter: "drop-shadow(0 -1px 1px rgba(0,0,0,0.08))" }}
            />

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-2xl shadow-black/25 overflow-hidden border border-slate-100">
              {/* Header bar */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      Step {stepIdx + 1} of {steps.length}
                    </p>
                    <p className="text-sm font-bold text-slate-900 leading-tight">
                      {currentStep.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onSkip}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                  title="Skip tour"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress dots */}
              <div className="flex items-center gap-1.5 px-4 pb-3">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === stepIdx
                        ? "bg-primary w-5"
                        : i < stepIdx
                        ? "bg-primary/40 w-1.5"
                        : "bg-slate-200 w-1.5"
                    }`}
                  />
                ))}
              </div>

              {/* Description */}
              <p className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">
                {currentStep.description}
              </p>

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={onSkip}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors px-2 py-1"
                >
                  Skip Tour
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-colors shadow-sm shadow-primary/20 active:scale-[0.97]"
                >
                  {isLast ? (
                    <>
                      <Check className="w-4 h-4" />
                      Got It!
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
