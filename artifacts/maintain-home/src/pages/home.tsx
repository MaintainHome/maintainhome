import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Sparkles, ShieldCheck, BellRing, MapPin, Zap, User, LogOut, ClipboardList, LogIn, MessageCircle, Home as HomeIcon, CalendarDays, X } from "lucide-react";
import { Features } from "@/components/Features";
import { PricingSection } from "@/components/PricingSection";
import { AIChatModal } from "@/components/AIChatModal";
import { AuthModal } from "@/components/AuthModal";
import { Dashboard } from "@/components/Dashboard";
import { useAuth, isPro } from "@/contexts/AuthContext";
import { useBranding, PREVIEW_KEY } from "@/contexts/BrandingContext";
import { useLocation } from "wouter";

export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [welcomeBanner, setWelcomeBanner] = useState(false);
  const [brokerWelcomeBanner, setBrokerWelcomeBanner] = useState(false);
  const [savedCalendar, setSavedCalendar] = useState<{ quizAnswers: any; calendarData: any } | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const { user, loading: authLoading, logout } = useAuth();
  const { branding } = useBranding();
  const userIsPro = isPro(user);
  const [, navigate] = useLocation();

  // Show welcome banner when arriving from dashboard (e.g. after quiz completion)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      setWelcomeBanner(true);
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setWelcomeBanner(false), 6000);
    }
  }, []);

  // Track whether this page instance has already confirmed the homeowner role,
  // so a later re-render never incorrectly redirects back to choose-role.
  const confirmedHomeowner = useRef(false);

  // Dual-role routing: if this user is also an approved broker and hasn't chosen
  // the homeowner role for this session, send them to the role selection screen.
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!user.isBroker) return;

    // Sticky: once we've confirmed homeowner mode for this page instance, never redirect.
    if (confirmedHomeowner.current) return;

    const chosenRole = sessionStorage.getItem("mh_active_role");
    // Also accept previewSubdomain in sessionStorage as a valid homeowner signal
    // (set by Preview Profile button before navigate, so it might arrive first).
    const hasPreview = !!sessionStorage.getItem(PREVIEW_KEY);

    if (chosenRole === "homeowner" || hasPreview) {
      confirmedHomeowner.current = true;
      return;
    }

    navigate("/choose-role");
  }, [authLoading, user?.id, user?.isBroker]);

  // Show broker welcome message on first login under a branded subdomain
  useEffect(() => {
    if (!user || !branding?.welcomeMessage) return;
    const seenKey = `mh_broker_welcome_${user.id}_${branding.subdomain}`;
    if (localStorage.getItem(seenKey)) return;
    localStorage.setItem(seenKey, "1");
    setBrokerWelcomeBanner(true);
    const t = setTimeout(() => setBrokerWelcomeBanner(false), 10000);
    return () => clearTimeout(t);
  }, [user?.id, branding?.subdomain, branding?.welcomeMessage]);

  // When a user is signed in, load their saved calendar for the dashboard
  useEffect(() => {
    if (!user) return;
    fetch("/api/user/calendar/latest", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.calendarData) {
          setSavedCalendar({ quizAnswers: data.quizAnswers, calendarData: data.calendarData });
        }
      })
      .catch(() => {});
  }, [user?.id]);

  // Primary CTA: logged-in users go to quiz, guests open auth modal
  const handleTryNow = () => {
    if (user) {
      navigate("/quiz");
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      {/* Broker welcome message banner — shown once per user per subdomain */}
      <AnimatePresence>
        {brokerWelcomeBanner && branding?.welcomeMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="w-full bg-primary text-white py-3 px-5 flex items-center justify-between gap-3 relative z-50"
          >
            <div className="flex items-center gap-2 text-sm font-medium flex-1 justify-center">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{branding.welcomeMessage}</span>
            </div>
            <button
              onClick={() => setBrokerWelcomeBanner(false)}
              className="shrink-0 hover:opacity-70 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="w-full border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-32 flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5 sm:gap-3 hover:opacity-80 transition-opacity min-w-0 shrink">
            {branding ? (
              branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.brokerName}
                  className="h-8 sm:h-20 w-auto max-w-[160px] sm:max-w-[240px] object-contain shrink-0"
                />
              ) : (
                <span className="text-sm sm:text-3xl font-display font-black text-primary tracking-tight leading-tight">
                  {branding.brokerName}
                </span>
              )
            ) : (
              <>
                <img
                  src={`${import.meta.env.BASE_URL}images/logo-icon.png`}
                  alt="MaintainHome.ai Logo"
                  className="w-8 h-8 sm:w-28 sm:h-28 object-contain shrink-0"
                />
                <span className="text-sm sm:text-4xl font-display font-bold text-foreground tracking-tight leading-tight">
                  MaintainHome<span className="text-primary">.ai</span>
                </span>
              </>
            )}
          </a>

          <div className="flex items-center gap-2">
            {/* Mobile only: Try It Now — guests only */}
            {!user && (
              <button
                onClick={handleTryNow}
                className="sm:hidden flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm bg-primary text-white shadow-md shadow-primary/25 active:scale-95 transition-all"
              >
                <Zap className="w-3.5 h-3.5" />
                Try It Now
              </button>
            )}

            {/* Mobile auth: icon button */}
            {user ? (
              <div className="sm:hidden flex items-center gap-1">
                {userIsPro && (
                  <button
                    onClick={() => setShowAIChat(true)}
                    title="Ask Maintly"
                    className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => navigate("/calendar")}
                  title="My Calendar"
                  className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                >
                  <CalendarDays className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate("/home-profile")}
                  title="My Property Facts"
                  className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                >
                  <HomeIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate("/history")}
                  title="Maintenance History"
                  className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                >
                  <ClipboardList className="w-4 h-4" />
                </button>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="w-9 h-9 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors border border-red-100"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="sm:hidden flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}

            {/* Pricing link — desktop only, hidden for Pro members */}
            {!userIsPro && (
              <button
                onClick={() => navigate("/pricing")}
                className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-primary px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Pricing
              </button>
            )}

            {/* Desktop only: primary CTA */}
            {!user && (
              <button
                onClick={handleTryNow}
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 transition-all"
              >
                <Zap className="w-4 h-4" />
                Try It Now
              </button>
            )}

            {/* Desktop auth */}
            {user ? (
              <div className="hidden sm:flex items-center gap-1">
                <span className="text-sm font-semibold text-slate-700 px-2">
                  Hi {user.name ? user.name.split(" ")[0] : user.email.split("@")[0]}
                </span>
                <button
                  onClick={() => navigate("/calendar")}
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-primary hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <CalendarDays className="w-4 h-4" />
                  My Calendar
                </button>
                {userIsPro && (
                  <button
                    onClick={() => setShowAIChat(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-white px-3 py-2 rounded-lg transition-all"
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, #1f9e6e 0%, #3b82f6 100%)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ""; }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Ask Maintly
                  </button>
                )}
                <button
                  onClick={() => navigate("/home-profile")}
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-primary hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <HomeIcon className="w-4 h-4" />
                  My Property Facts
                </button>
                <button
                  onClick={() => navigate("/history")}
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-primary hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <ClipboardList className="w-4 h-4" />
                  History
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 text-sm font-semibold text-red-500 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 border border-red-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                <User className="w-4 h-4" />
                Sign Up / Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Logged-in: Dashboard view ── */}
      {user && !authLoading && (
        <main className="flex-1">
          <Dashboard
            user={user}
            savedCalendar={savedCalendar}
            onOpenAIChat={() => setShowAIChat(true)}
          />
        </main>
      )}

      {/* ── Guest: Marketing landing page ── */}
      {!user && !authLoading && (
      <main className="flex-1">
        <section className="relative w-full pt-8 pb-12 overflow-hidden">
          {/* Background Image & Overlay */}
          <div className="absolute inset-0 z-0">
            <img 
              src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
              alt="Modern home interior" 
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/80 to-slate-50/95" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              
              {/* Hero Copy */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="max-w-2xl"
              >
                <h1 className="text-[2rem] sm:text-4xl lg:text-5xl font-display font-black text-foreground leading-[1.15] mb-4 tracking-tight">
                  Overwhelmed by<br/>Home Ownership?<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">
                    Not Anymore.
                  </span>
                </h1>

                {branding?.tagline ? (
                  <p className="text-xl sm:text-2xl font-bold text-primary mb-5 max-w-lg leading-snug">
                    {branding.tagline}
                  </p>
                ) : (
                  <p className="text-xl sm:text-2xl font-bold text-foreground mb-5 max-w-lg leading-snug">
                    Simplify Your Life With Our Personalized{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500 whitespace-nowrap">
                      Ai-Powered
                    </span>
                    {" "}Plan To Own Your Home With Confidence:
                  </p>
                )}
                
                <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
                  <ul className="space-y-3">
                    {([
                      <>Help <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">Prevent</span> Costly Future Repairs</>,
                      <><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">Smart Reminders</span> to Change Air Filters &amp; Smoke Detector Batteries and more</>,
                      <>Interactive Home Ownership <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">Ai Chatbot</span> (Maintly)</>,
                      <>Printable <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">Maintenance History</span> Log for Your Property</>,
                      <>Custom <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">Monthly Home Care Schedule</span> Specific to Your Home, State, &amp; Region</>,
                    ] as React.ReactNode[]).map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3 text-emerald-700" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                          </svg>
                        </span>
                        <span className="text-base text-slate-700 leading-snug font-bold">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Mobile-only: Maintly intro card — shows above buttons */}
                <button onClick={handleTryNow} className="sm:hidden w-full flex items-center gap-5 bg-white rounded-2xl border border-slate-100 shadow-md px-6 py-5 text-left active:scale-[0.98] transition-transform">
                  <img
                    src={`${import.meta.env.BASE_URL}images/maintly_thumb.png`}
                    alt="Maintly"
                    className="w-24 h-24 object-contain flex-shrink-0"
                  />
                  <div>
                    <p className="text-lg font-bold text-slate-900">Chat with me, <span className="text-primary">"Maintly"</span></p>
                    <p className="text-sm text-slate-500 leading-snug mt-1">Your Custom Ai Home Ownership Chatbot.</p>
                  </div>
                </button>

                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 mt-6 sm:mt-0">
                  <button 
                    onClick={handleTryNow}
                    className="px-8 py-4 rounded-xl font-bold text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-1 active:translate-y-0 flex items-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    Try It Now
                  </button>
                  <button
                    onClick={handleTryNow}
                    className="hidden sm:flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg border-2 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/60 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Sparkles className="w-5 h-5" />
                    See it first
                  </button>
                </div>
              </motion.div>

              {/* Hero Form Preview / Graphic area */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="hidden lg:block relative"
              >
                {/* Decorative floating elements */}
                <div className="absolute top-10 -left-12 bg-white p-4 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-4 z-20 animate-bounce" style={{ animationDuration: '4s' }}>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <BellRing className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Change HVAC Filter</p>
                    <p className="text-xs text-slate-500">Due in 3 days</p>
                  </div>
                </div>
                
                <div className="absolute -bottom-6 right-10 bg-white p-4 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-4 z-20 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }}>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">NC Humidity Check</p>
                    <p className="text-xs text-slate-500">Customized for you</p>
                  </div>
                </div>

                {/* Conceptual UI Mockup */}
                <div className="w-full aspect-[4/3] bg-gradient-to-tr from-slate-100 to-white rounded-[2rem] border-8 border-white shadow-2xl shadow-slate-200/50 overflow-hidden relative">
                   <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-sm p-6 flex flex-col">
                     <div className="flex items-center justify-between mb-8">
                       <div className="w-32 h-6 bg-slate-200 rounded-full" />
                       <div className="w-10 h-10 bg-slate-200 rounded-full" />
                     </div>
                     <div className="space-y-4">
                       {/* Maintly chat teaser — fills the blank space */}
                       <div className="w-full bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-5">
                         <button
                           onClick={() => setShowAuthModal(true)}
                           className="shrink-0 focus:outline-none hover:scale-105 transition-transform"
                           aria-label="Sign up to chat with Maintly"
                         >
                           <img
                             src={`${import.meta.env.BASE_URL}images/maintly_point.png`}
                             alt="Maintly"
                             className="h-28 w-auto object-contain object-top drop-shadow-sm cursor-pointer"
                           />
                         </button>
                         <div>
                           <p className="text-base font-extrabold text-slate-900 leading-snug">
                             Chat with me,
                           </p>
                           <p className="text-base font-extrabold text-primary leading-snug mb-1">
                             "Maintly"
                           </p>
                           <p className="text-xs text-slate-500 leading-snug">
                             Your Custom Ai Home<br />Ownership Chatbot.
                           </p>
                         </div>
                       </div>
                       {/* Prevent costly repairs badge — sits directly under Maintly text */}
                       <div className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-primary/10 text-primary font-semibold border border-primary/20">
                         <ShieldCheck className="w-5 h-5 shrink-0" />
                         <span className="text-sm">Prevent costly repairs before they happen</span>
                       </div>
                       <div className="w-full h-16 bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex gap-4 opacity-40">
                         <div className="w-10 h-10 bg-slate-100 rounded-lg" />
                         <div className="space-y-2 flex-1 pt-1">
                           <div className="w-1/3 h-3 bg-slate-200 rounded-full" />
                           <div className="w-1/2 h-2 bg-slate-100 rounded-full" />
                         </div>
                       </div>
                     </div>
                   </div>
                </div>

              </motion.div>
            </div>
          </div>
        </section>

        <Features onTryNow={handleTryNow} />

        {/* Mobile-only CTA between features and pricing */}
        <div className="sm:hidden flex justify-center pb-8 pt-2">
          <button
            onClick={handleTryNow}
            className="px-10 py-4 rounded-xl font-bold text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/25 flex items-center gap-2 active:scale-95 transition-all"
          >
            <Zap className="w-5 h-5" />
            Try It Now
          </button>
        </div>

        <PricingSection onOpenAuth={handleTryNow} />

        {/* CTA Section */}
        <section className="py-24 relative">
          <div className="absolute inset-0 bg-slate-950 z-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-full max-h-96 bg-primary/20 blur-[120px] rounded-full z-0" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-semibold mb-6">
                <Sparkles className="w-4 h-4" />
                Free to start — no credit card needed
              </div>
              <h2 className="text-4xl sm:text-5xl font-display font-black text-white mb-4">
                Ready to Own Home Ownership?
              </h2>
              <p className="text-lg text-slate-300 max-w-xl mx-auto mb-10">
                Get your personalized AI-generated home maintenance calendar in minutes. Start with a free account — no password, no hassle.
              </p>
              <button
                onClick={handleTryNow}
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-xl bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-1"
              >
                <Zap className="w-6 h-6" />
                Try It Now
              </button>
              <p className="mt-4 text-sm text-slate-400">Takes about 2 minutes · Free · No password required</p>
            </motion.div>
          </div>
        </section>

      </main>
      )}

      {/* Footer */}
      <footer className="bg-slate-950 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-6 opacity-80">
            <img 
              src={`${import.meta.env.BASE_URL}images/logo-icon.png`} 
              alt="MaintainHome Logo" 
              className="h-16 w-16 object-contain"
            />
            <span className="text-2xl font-display font-bold text-white tracking-tight">
              MaintainHome<span className="text-primary">.ai</span>
            </span>
          </div>
          
          <p className="text-slate-400 text-sm max-w-2xl mb-6 leading-relaxed">
            <strong className="text-slate-300">Disclaimer:</strong> MaintainHome.ai provides general reminders only and is not responsible for maintenance, repairs, damage, or losses. This is not professional advice—always consult licensed experts for your home care needs.
          </p>
          
          <div className="text-slate-500 text-sm flex items-center justify-center gap-2">
            © 2026 MaintainHome.ai 
            <span className="w-1 h-1 rounded-full bg-slate-600 inline-block" /> 
            Powered by real estate expertise
          </div>
          {branding && (
            <div className="mt-4 flex justify-center">
              <a
                href="https://maintainhome.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-slate-500 hover:text-slate-400 text-xs font-medium"
              >
                <img
                  src="/images/logo-icon.png"
                  alt="MaintainHome.ai"
                  className="w-3.5 h-3.5 object-contain opacity-50"
                />
                Powered by MaintainHome.ai
              </a>
            </div>
          )}
        </div>
      </footer>
      {/* Auth Modal */}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* AI Chat Modal */}
      <AIChatModal
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        quizAnswers={savedCalendar?.quizAnswers}
      />

      {/* Welcome banner after login */}
      {welcomeBanner && user && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl shadow-xl text-sm font-semibold"
        >
          <span>👋 Welcome{user.name ? `, ${user.name.split(" ")[0]}` : " back"}! You're signed in.</span>
          <button onClick={() => setWelcomeBanner(false)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </motion.div>
      )}
    </div>
  );
}
