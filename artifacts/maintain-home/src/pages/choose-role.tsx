import { useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, HomeIcon, ArrowRight, Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useLocation } from "wouter";

const ACCENT = "#1f9e6e";
const BASE = import.meta.env.BASE_URL;
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ChooseRole() {
  const { user, loading, logout } = useAuth();
  const { setPreviewSubdomain } = useBranding();
  const [, navigate] = useLocation();

  async function handleSwitchAccount() {
    await logout();
    navigate("/");
  }

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/"); return; }
    if (!user.isBroker) { navigate("/"); return; }
    // Builders have no homeowner account — send them straight to their dashboard
    if (user.isBuilder) {
      sessionStorage.setItem("mh_active_role", "broker");
      navigate("/broker-dashboard");
    }
  }, [loading, user]);

  function chooseHomeowner() {
    sessionStorage.setItem("mh_active_role", "homeowner");
    // Navigate immediately so the homeowner dashboard appears without delay.
    // Then load the broker's white-label config in the background so branding
    // is applied as soon as the fetch resolves.
    navigate("/");
    if (user?.isBroker) {
      fetch(`${API_BASE}/api/broker/me`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (data.config?.subdomain) {
            setPreviewSubdomain(data.config.subdomain);
          }
        })
        .catch(() => {});
    }
  }

  function chooseBroker() {
    sessionStorage.setItem("mh_active_role", "broker");
    navigate("/broker-dashboard");
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-5 relative overflow-hidden">

      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 20% 30%, ${ACCENT}40 0%, transparent 50%)` }} />
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 80% 70%, ${ACCENT}20 0%, transparent 50%)` }} />

      {/* Switch Account — top right */}
      <button
        onClick={handleSwitchAccount}
        className="fixed top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
      >
        <LogOut className="w-3.5 h-3.5" />
        Switch Account
      </button>

      <motion.div
        className="relative z-10 w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={`${BASE}images/logo-icon.png`} alt="MaintainHome.ai" className="w-12 h-12 object-contain" />
        </div>

        {/* Headline */}
        <div className="text-center mb-2">
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
            Welcome back, {firstName}!
          </h1>
          <p className="text-white/55 mt-3 text-base">
            You have two accounts. How would you like to continue?
          </p>
        </div>

        {/* Role cards */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">

          {/* Homeowner */}
          <motion.button
            onClick={chooseHomeowner}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 flex flex-col items-center gap-4 p-6 rounded-2xl text-left transition-all group"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1.5px solid rgba(255,255,255,0.12)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.22)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
            }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${ACCENT}25`, border: `1.5px solid ${ACCENT}50` }}>
              <HomeIcon className="w-7 h-7" style={{ color: ACCENT }} />
            </div>
            <div className="text-center">
              <p className="text-white font-black text-lg leading-tight mb-1">Continue as Homeowner</p>
              <p className="text-white/50 text-sm leading-relaxed">
                Access your maintenance calendar, Maintly chat, home profile, and history.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-semibold mt-auto" style={{ color: ACCENT }}>
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </div>
          </motion.button>

          {/* Broker */}
          <motion.button
            onClick={chooseBroker}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 flex flex-col items-center gap-4 p-6 rounded-2xl text-left transition-all"
            style={{
              background: `linear-gradient(135deg, ${ACCENT}22 0%, ${ACCENT}10 100%)`,
              border: `1.5px solid ${ACCENT}55`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = `${ACCENT}99`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = `${ACCENT}55`;
            }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${ACCENT}30`, border: `1.5px solid ${ACCENT}60` }}>
              <Building2 className="w-7 h-7" style={{ color: ACCENT }} />
            </div>
            <div className="text-center">
              <p className="text-white font-black text-lg leading-tight mb-1">Continue as Broker</p>
              <p className="text-white/50 text-sm leading-relaxed">
                Manage your white-label program, view clients, and edit your branding.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-semibold mt-auto" style={{ color: ACCENT }}>
              Go to Broker Dashboard <ArrowRight className="w-4 h-4" />
            </div>
          </motion.button>

        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          You can switch between your accounts at any time by signing out and back in.
        </p>
      </motion.div>
    </div>
  );
}
