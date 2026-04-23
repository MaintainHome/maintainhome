import { useLocation } from "wouter";
import { useSupportModal } from "@/contexts/SupportContext";

export function PageFooter() {
  const [, navigate] = useLocation();
  const { openSupport } = useSupportModal();

  return (
    <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>© 2026 MaintainHome.ai</span>
        <span className="w-1 h-1 rounded-full bg-slate-300 inline-block" />
        <button
          onClick={() => navigate("/privacy")}
          className="hover:text-slate-600 transition-colors"
        >
          Privacy Policy
        </button>
        <span className="w-1 h-1 rounded-full bg-slate-300 inline-block" />
        <button
          onClick={() => navigate("/terms")}
          className="hover:text-slate-600 transition-colors"
        >
          Terms of Service
        </button>
        <span className="w-1 h-1 rounded-full bg-slate-300 inline-block" />
        <button
          onClick={() => navigate("/help")}
          className="hover:text-slate-600 transition-colors"
        >
          Help / FAQ
        </button>
        <span className="w-1 h-1 rounded-full bg-slate-300 inline-block" />
        <button
          onClick={openSupport}
          className="hover:text-slate-600 transition-colors"
        >
          Contact Support
        </button>
      </div>
    </footer>
  );
}
