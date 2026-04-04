import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
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
      <Route path="/invite/:subdomain" component={InviteLanding} />
      <Route path="/invite" component={InviteLanding} />
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
