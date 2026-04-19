import { useLocation } from "wouter";
import { Home, ArrowLeft } from "lucide-react";

const BASE = import.meta.env.BASE_URL;

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8 opacity-70">
        <img
          src={`${BASE}images/logo-icon.png`}
          alt="MaintainHome.ai"
          className="w-10 h-10 object-contain"
        />
        <span className="text-xl font-bold text-slate-700 tracking-tight">
          MaintainHome<span className="text-primary">.ai</span>
        </span>
      </div>

      {/* 404 card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-8 py-10 max-w-md w-full text-center">
        <div className="text-6xl font-black text-slate-100 mb-4 select-none">404</div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Sorry, we couldn't find that page</h1>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          The page you're looking for may have moved, been removed, or the link might be incorrect.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-colors shadow-sm shadow-primary/20"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>

      {/* Footer links */}
      <div className="mt-8 flex items-center gap-4 text-xs text-slate-400">
        <button onClick={() => navigate("/privacy")} className="hover:text-slate-600 transition-colors">
          Privacy Policy
        </button>
        <span className="w-1 h-1 rounded-full bg-slate-300 inline-block" />
        <button onClick={() => navigate("/help")} className="hover:text-slate-600 transition-colors">
          Help / FAQ
        </button>
      </div>
    </div>
  );
}
