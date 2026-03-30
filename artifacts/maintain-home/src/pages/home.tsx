import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Sparkles, ShieldCheck, BellRing, MapPin, Zap, User, LogOut, ClipboardList, LogIn, MessageCircle } from "lucide-react";
import { Features } from "@/components/Features";
import { PricingSection } from "@/components/PricingSection";
import { AIChatModal } from "@/components/AIChatModal";
import { AuthModal } from "@/components/AuthModal";
import { Dashboard } from "@/components/Dashboard";
import { useAuth, isPro } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [welcomeBanner, setWelcomeBanner] = useState(false);
  const [savedCalendar, setSavedCalendar] = useState<{ quizAnswers: any; calendarData: any } | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const { user, loading: authLoading, logout } = useAuth();
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
      {/* Top Trust Banner */}
      <div className="w-full bg-primary text-white py-3 px-4 text-center text-sm font-medium flex items-center justify-center gap-2 relative z-50">
        <Sparkles className="w-4 h-4 text-yellow-300" />
        <span>Beta testing — testers get first year FREE!</span>
        <Sparkles className="w-4 h-4 text-yellow-300 hidden sm:block" />
      </div>

      {/* Navigation */}
      <nav className="w-full border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-32 flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5 sm:gap-3 hover:opacity-80 transition-opacity min-w-0 shrink">
            <img 
              src={`${import.meta.env.BASE_URL}images/logo-icon.png`} 
              alt="MaintainHome.ai Logo" 
              className="w-8 h-8 sm:w-28 sm:h-28 object-contain shrink-0"
            />
            {/* Brand name — mobile + desktop */}
            <span className="text-sm sm:text-4xl font-display font-bold text-foreground tracking-tight leading-tight">
              MaintainHome<span className="text-primary">.ai</span>
            </span>
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
                  onClick={() => navigate("/history")}
                  title="My Maintenance Log"
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

            {/* Pricing link — desktop only */}
            <button
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-primary px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Pricing
            </button>

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
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700 px-2">
                  Hi {user.name ? user.name.split(" ")[0] : user.email.split("@")[0]}
                </span>
                {userIsPro && (
                  <button
                    onClick={() => setShowAIChat(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-white bg-primary hover:bg-primary/90 px-3 py-2 rounded-xl transition-colors shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Ask Maintly
                  </button>
                )}
                <button
                  onClick={() => navigate("/history")}
                  className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline px-3 py-2"
                >
                  <ClipboardList className="w-4 h-4" />
                  My Log
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
          {/* Pricing section still accessible for upgrades */}
          <PricingSection />
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
                  Overwhelmed by<br/>Home Maintenance?<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">
                    We Can Help.
                  </span>
                </h1>

                <p className="text-xl sm:text-2xl font-bold text-foreground mb-5 max-w-lg leading-snug">
                  Simplify Your Life With Our Personalized{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500 whitespace-nowrap">
                    Ai-Powered
                  </span>
                  {" "}Home Plan:
                </p>
                
                <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
                  <ul className="space-y-3">
                    {([
                      <>Help <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">Prevent</span> Costly Future Repairs</>,
                      <><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">Smart Reminders</span> to Change Air Filters &amp; Smoke Detector Batteries</>,
                      <>Interactive Home Maintenance <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">Ai Chatbot</span> (Maintly)</>,
                      <>Printable <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">Maintenance History</span> Log for Your Property</>,
                      <>Custom <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">Monthly Calendar</span> Specific to Your Home, State, &amp; Region</>,
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
                    <p className="text-sm text-slate-500 leading-snug mt-1">Your custom Ai Home Maintenance Chatbot.</p>
                  </div>
                </button>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
                             Your custom Ai Home<br />Maintenance Chatbot.
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
          <div className="absolute inset-0 bg-slate-900 z-0" />
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
                Ready to protect your home?
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
