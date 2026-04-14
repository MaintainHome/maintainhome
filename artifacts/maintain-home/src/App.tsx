import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BrandingProvider, useBranding } from "@/contexts/BrandingContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import History from "@/pages/history";
import Quiz from "@/pages/quiz";
import HomeProfile from "@/pages/home-profile";
import CalendarPage from "@/pages/calendar-page";
import BrokerOnboard from "@/pages/broker-onboard";
import AdminBrokers from "@/pages/admin-brokers";
import BrokerDashboard from "@/pages/broker-dashboard";
import ChooseRole from "@/pages/choose-role";
import InviteLanding from "@/pages/invite-landing";
import CheckoutSuccess from "@/pages/checkout-success";
import PricingPage from "@/pages/pricing";
import ActivatePage from "@/pages/activate";
import TeamJoin from "@/pages/team-join";
import { PWASplashScreen } from "@/components/PWASplashScreen";
import { AddToHomeScreen } from "@/components/AddToHomeScreen";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ClearPreviewHandler() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("_clear_preview")) {
      sessionStorage.removeItem("mh_preview_subdomain");
      const url = new URL(window.location.href);
      url.searchParams.delete("_clear_preview");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);
  return null;
}

/** Dynamically replaces <link rel="manifest"> with a branding-aware version */
function DynamicManifest() {
  const { branding } = useBranding();
  useEffect(() => {
    const appName = branding?.brokerName ?? "MaintainHome.ai";
    const shortName = branding ? appName.split(" ").slice(0, 2).join(" ") : "MaintainHome";
    const themeColor = "#1f9e6e";
    const bgColor = "#0f172a";

    const manifest = {
      name: appName,
      short_name: shortName,
      description: branding
        ? `${appName} — AI-powered home maintenance reminders.`
        : "AI-Powered Home Maintenance Reminders — personalized to your state and climate.",
      start_url: "/",
      display: "standalone",
      background_color: bgColor,
      theme_color: themeColor,
      orientation: "portrait-primary",
      icons: [
        { src: branding?.logoUrl ?? "/images/logo-icon.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: branding?.logoUrl ?? "/images/logo-icon.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
    const url = URL.createObjectURL(blob);
    const existing = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (existing) {
      const old = existing.href;
      existing.href = url;
      // Revoke old blob URL if it was one we created
      if (old.startsWith("blob:")) URL.revokeObjectURL(old);
    }
    return () => URL.revokeObjectURL(url);
  }, [branding]);
  return null;
}

function AuthBrandingSync() {
  const { user } = useAuth();
  const { branding, setBrokerReferral } = useBranding();

  useEffect(() => {
    if (user?.referralSubdomain && !branding) {
      const hostname = window.location.hostname;
      const parts = hostname.split(".");
      const hasHostnameSubdomain = parts.length > 2 && parts[0] !== "www";
      if (!hasHostnameSubdomain) {
        setBrokerReferral(user.referralSubdomain);
      }
    }
  }, [user?.referralSubdomain, branding, setBrokerReferral]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/history" component={History} />
      <Route path="/quiz" component={Quiz} />
      <Route path="/home-profile" component={HomeProfile} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/broker-onboard" component={BrokerOnboard} />
      <Route path="/admin/brokers" component={AdminBrokers} />
      <Route path="/broker-dashboard" component={BrokerDashboard} />
      <Route path="/choose-role" component={ChooseRole} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/activate" component={ActivatePage} />
      <Route path="/team-join" component={TeamJoin} />
      <Route path="/invite/:subdomain" component={InviteLanding} />
      <Route path="/invite" component={InviteLanding} />
      <Route path="/:teamHandle/:agentHandle" component={InviteLanding} />
      <Route path="/:subdomain" component={InviteLanding} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <AuthProvider>
          <TooltipProvider>
            <ClearPreviewHandler />
            <AuthBrandingSync />
            <DynamicManifest />
            <PWASplashScreen />
            <AddToHomeScreen />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </BrandingProvider>
    </QueryClientProvider>
  );
}

export default App;
