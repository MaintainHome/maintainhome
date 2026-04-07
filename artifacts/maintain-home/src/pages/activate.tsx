import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, XCircle, Loader2, ArrowRight, Home as HomeIcon, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const BASE = import.meta.env.BASE_URL;

type Status = "loading" | "success" | "error";

export default function ActivatePage() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [clientName, setClientName] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("No activation token found. Please use the link provided by your agent.");
      return;
    }

    async function activate() {
      try {
        const res = await fetch(`${API_BASE}/api/auth/broker-activate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setMessage(data.error ?? "Activation failed. Please contact your agent for a new link.");
          return;
        }

        if (data.name) setClientName(data.name);
        await refreshUser();
        setStatus("success");
        setMessage(data.isNewActivation
          ? "Your home dashboard is ready — everything has been pre-configured for you."
          : "You're signed back in. Your dashboard is ready.");

        setTimeout(() => navigate("/"), 3000);
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again or contact your agent.");
      }
    }

    activate();
  }, [refreshUser, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">

        {/* Loading */}
        {status === "loading" && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-5">
              <Key className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Activating your account…</h2>
            <p className="text-slate-400 text-sm">Setting up your personalized home dashboard.</p>
            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mt-5" />
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-black text-slate-900 mb-2">
              Welcome{clientName ? `, ${clientName.split(" ")[0]}` : ""}!
            </h1>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed">{message}</p>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 text-left space-y-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">What's waiting for you</p>
              {[
                "Personalized 12-month maintenance calendar",
                "13 months of Pro access — active now",
                "Home profile with your property details",
                "Documents uploaded by your agent",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400 mb-4">Redirecting you to your dashboard in a moment…</p>

            <Button
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl"
              onClick={() => navigate("/")}
            >
              <HomeIcon className="w-4 h-4 mr-2" />
              Go to My Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-display font-black text-slate-900 mb-2">Activation Failed</h1>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed">{message}</p>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl"
                onClick={() => navigate("/")}
              >
                Go to Home
              </Button>
              <p className="text-xs text-slate-400 mt-2">
                If this keeps happening, ask your agent to resend the activation link or contact{" "}
                <a href="mailto:support@maintainhome.ai" className="text-primary hover:underline">support@maintainhome.ai</a>.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
