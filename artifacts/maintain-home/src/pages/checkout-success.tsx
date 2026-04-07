import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, XCircle, Loader2, Copy, Check, ArrowRight, Gift, UserPlus, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Status = "loading" | "ok_subscription" | "ok_gift" | "ok_precreate" | "error" | "pending";

export default function CheckoutSuccess() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [giftCodes, setGiftCodes] = useState<string[]>([]);
  const [plan, setPlan] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);
  const [activationLink, setActivationLink] = useState<string>("");
  const [clientEmail, setClientEmail] = useState<string>("");
  const [clientName, setClientName] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setStatus("error");
      setMessage("No session ID found. If you completed a purchase, please contact support.");
      return;
    }

    let attempts = 0;
    const maxAttempts = 8;

    async function verify() {
      try {
        const res = await fetch(`${API_BASE}/api/stripe/verify-session?session_id=${sessionId}`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setMessage(data.error ?? "Verification failed. Please contact support.");
          return;
        }

        if (data.status === "pending" && attempts < maxAttempts) {
          attempts++;
          setTimeout(verify, 2000);
          return;
        }

        await refreshUser();

        if (data.type === "subscription") {
          setStatus("ok_subscription");
          setPlan(data.plan ?? "monthly");
          setMessage(data.message ?? "You're now a Pro member!");
        } else if (data.type === "gift_code") {
          setStatus("ok_gift");
          setGiftCodes(data.codes ?? []);
          setMessage(data.message ?? "Gift codes generated!");
        } else if (data.type === "broker_precreate") {
          setStatus("ok_precreate");
          setActivationLink(data.activationLink ?? "");
          setClientEmail(data.clientEmail ?? "");
          setClientName(data.clientName ?? null);
          setMessage(data.message ?? "Client account created!");
        } else if (data.type === "broker_precreate_error") {
          setStatus("error");
          setMessage(data.message ?? "Account setup failed. Please contact support.");
        } else {
          setStatus("ok_subscription");
          setMessage(data.message ?? "Payment confirmed!");
        }
      } catch {
        setStatus("error");
        setMessage("Network error verifying payment. If you were charged, please contact support.");
      }
    }

    verify();
  }, [refreshUser]);

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function copyAllCodes() {
    navigator.clipboard.writeText(giftCodes.join("\n")).catch(() => {});
    setCopied("all");
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">

        {/* Loading */}
        {status === "loading" && (
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Confirming your payment…</h2>
            <p className="text-slate-400">This only takes a moment. We're generating the AI calendar now.</p>
          </div>
        )}

        {/* Subscription success */}
        {status === "ok_subscription" && (
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-black text-slate-900 mb-2">You're Pro!</h1>
            <p className="text-slate-600 mb-6">{message}</p>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 text-sm text-slate-700">
              {plan === "annual"
                ? "Your annual subscription gives you full access for 12 months."
                : "Your monthly subscription renews automatically. Cancel anytime."}
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl"
              onClick={() => navigate("/")}
            >
              Go to My Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Gift code success */}
        {status === "ok_gift" && (
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-black text-slate-900 mb-2">Gift Codes Ready!</h1>
              <p className="text-slate-600">{message}</p>
            </div>

            <div className="space-y-2 mb-5">
              {giftCodes.map((code) => (
                <div
                  key={code}
                  className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                >
                  <span className="font-mono font-semibold text-slate-800 tracking-widest text-sm">{code}</span>
                  <button
                    onClick={() => copyText(code, code)}
                    className="text-slate-400 hover:text-primary transition-colors shrink-0"
                    title="Copy"
                  >
                    {copied === code ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            {giftCodes.length > 1 && (
              <Button
                variant="outline"
                className="w-full rounded-xl mb-3 border-slate-200"
                onClick={copyAllCodes}
              >
                {copied === "all" ? (
                  <><Check className="w-4 h-4 mr-2 text-primary" />Copied all codes!</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" />Copy all codes</>
                )}
              </Button>
            )}

            <p className="text-xs text-slate-500 text-center mb-5">
              Share these codes with your homeowner clients. Each code grants 1 year of Pro access at{" "}
              <span className="font-semibold">MaintainHome.ai</span>.
            </p>

            <Button
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl"
              onClick={() => navigate("/broker-dashboard")}
            >
              Back to Broker Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Broker pre-create success */}
        {status === "ok_precreate" && (
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-black text-slate-900 mb-2">Client Account Created!</h1>
              <p className="text-slate-600 text-sm">
                {clientName ? `${clientName}'s` : "The client's"} dashboard is fully pre-loaded with their home data, AI calendar, and 13 months of Pro access.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {/* Client info */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Account Created For</p>
                <p className="text-sm font-semibold text-emerald-900">{clientName || "—"}</p>
                <p className="text-xs text-emerald-700">{clientEmail}</p>
              </div>

              {/* Activation link */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Activation Link — Send to Client
                </p>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <span className="text-xs text-slate-600 font-mono flex-1 break-all min-w-0">{activationLink}</span>
                  <button
                    onClick={() => copyText(activationLink, "link")}
                    className="text-slate-400 hover:text-primary transition-colors shrink-0"
                    title="Copy link"
                  >
                    {copied === "link"
                      ? <Check className="w-4 h-4 text-primary" />
                      : <Copy className="w-4 h-4" />
                    }
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Send this link to {clientEmail}. When they click it, they'll be instantly signed in to their pre-loaded dashboard — no password needed.
                </p>
              </div>

              {/* What's included */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">What's Pre-Loaded</p>
                <ul className="space-y-1">
                  {[
                    "13 months of Pro access (starts today)",
                    "Personalized AI 12-month maintenance calendar",
                    "Home profile with all property details",
                    "Your broker branding applied",
                    "Any documents you uploaded",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl"
                onClick={() => copyText(activationLink, "link2")}
              >
                {copied === "link2"
                  ? <><Check className="w-4 h-4 mr-2" />Copied!</>
                  : <><Copy className="w-4 h-4 mr-2" />Copy Activation Link</>
                }
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-xl border-slate-200"
                onClick={() => navigate("/broker-dashboard")}
              >
                Back to Broker Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Error */}
        {(status === "error" || status === "pending") && (
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-display font-black text-slate-900 mb-2">
              {status === "pending" ? "Payment Pending" : "Something Went Wrong"}
            </h1>
            <p className="text-slate-600 mb-6">{message}</p>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl"
                onClick={() => navigate("/")}
              >
                Return Home
              </Button>
              <Button
                variant="ghost"
                className="w-full text-slate-500 text-sm"
                onClick={() => window.location.reload()}
              >
                Try refreshing
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
