import { motion } from "framer-motion";
import { useState } from "react";
import { Sparkles, ArrowRight, ShieldCheck, BellRing, MapPin, Zap } from "lucide-react";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Features } from "@/components/Features";
import { DemoQuiz } from "@/components/DemoQuiz";
import { useGetWaitlistCount } from "@workspace/api-client-react";

export default function Home() {
  const { data: waitlistData } = useGetWaitlistCount();
  const count = waitlistData?.count || 0;
  const [showDemo, setShowDemo] = useState(false);

  const scrollToForm = () => {
    document.getElementById('waitlist-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToDemo = () => {
    setShowDemo(true);
    setTimeout(() => {
      document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      {/* Top Trust Banner */}
      <div className="w-full bg-gradient-to-r from-primary to-blue-600 text-white py-3 px-4 text-center text-sm font-medium flex items-center justify-center gap-2 relative z-50">
        <Sparkles className="w-4 h-4 text-yellow-300" />
        <span>First 50 signups get 50% off forever!</span>
        <Sparkles className="w-4 h-4 text-yellow-300 hidden sm:block" />
      </div>

      {/* Navigation */}
      <nav className="w-full border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 sm:h-32 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
            <img 
              src={`${import.meta.env.BASE_URL}images/logo-icon.png`} 
              alt="MaintainHome.ai Logo" 
              className="w-12 h-12 sm:w-28 sm:h-28 object-contain"
            />
            <span className="text-2xl sm:text-4xl font-display font-bold text-foreground tracking-tight">
              MaintainHome<span className="text-primary">.ai</span>
            </span>
          </a>
          <div className="flex items-center gap-3">
            {/* Mobile only: compact Try it! */}
            <button
              onClick={scrollToDemo}
              className="sm:hidden flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm bg-primary text-white shadow-md shadow-primary/25 active:scale-95 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              Try it!
            </button>
            {/* Desktop only: full demo CTA */}
            <button
              onClick={scrollToDemo}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 transition-all"
            >
              <Zap className="w-4 h-4" />
              Test Free Demo Now
            </button>
            {/* Desktop only: waitlist link */}
            <button 
              onClick={scrollToForm}
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors px-4 py-2 rounded-lg hover:bg-slate-50"
            >
              Join Waitlist
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
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
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 text-primary text-base font-semibold mb-6 border border-primary/20">
                  <ShieldCheck className="w-5 h-5" />
                  Prevent costly repairs before they happen
                </div>
                
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-foreground leading-[1.1] mb-6 tracking-tight">
                  AI-Powered<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">
                    Personalized
                  </span><br/>
                  Home Care Plan & Reminders.
                </h1>
                
                <p className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-lg">
                  Never forget air filters, smoke detector batteries, roof checks, crawl space moisture, lawn care & more. 
                  <span className="font-semibold text-foreground"> Tailored specifically to your state and climate.</span>
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <button 
                    onClick={scrollToForm}
                    className="px-8 py-4 rounded-xl font-bold text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-1 active:translate-y-0"
                  >
                    Get Early Access
                  </button>
                  <button
                    onClick={scrollToDemo}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg border-2 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/60 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Zap className="w-5 h-5" />
                    Try the AI Demo
                  </button>
                  
                  {count > 0 && (
                    <div className="flex items-center gap-3 px-2">
                      <div className="flex -space-x-3">
                        {/* Fake avatars for social proof */}
                        {[1, 2, 3].map((i) => (
                          <div key={i} className={`w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-500 shadow-sm z-${4-i}`}>
                            {String.fromCharCode(64 + i)}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm font-medium text-slate-600">
                        Join <span className="text-primary font-bold">thousands</span> of others
                      </p>
                    </div>
                  )}
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
                       <div className="w-full h-24 bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex gap-4">
                         <div className="w-12 h-12 bg-slate-100 rounded-lg" />
                         <div className="space-y-2 flex-1 pt-1">
                           <div className="w-1/3 h-4 bg-slate-200 rounded-full" />
                           <div className="w-2/3 h-3 bg-slate-100 rounded-full" />
                         </div>
                       </div>
                       <div className="w-full h-24 bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex gap-4 opacity-70">
                         <div className="w-12 h-12 bg-slate-100 rounded-lg" />
                         <div className="space-y-2 flex-1 pt-1">
                           <div className="w-1/2 h-4 bg-slate-200 rounded-full" />
                           <div className="w-3/4 h-3 bg-slate-100 rounded-full" />
                         </div>
                       </div>
                       <div className="w-full h-24 bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex gap-4 opacity-40">
                         <div className="w-12 h-12 bg-slate-100 rounded-lg" />
                         <div className="space-y-2 flex-1 pt-1">
                           <div className="w-1/3 h-4 bg-slate-200 rounded-full" />
                           <div className="w-1/2 h-3 bg-slate-100 rounded-full" />
                         </div>
                       </div>
                     </div>
                   </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <Features />

        {/* Form Section */}
        <section id="waitlist-form" className="py-24 relative">
          <div className="absolute inset-0 bg-slate-900 z-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-full max-h-96 bg-primary/20 blur-[120px] rounded-full z-0" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <WaitlistForm />
          </div>
        </section>

        {/* Demo Section */}
        <section id="demo-section" className="py-24 bg-gradient-to-b from-slate-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {!showDemo ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-6">
                  <Zap className="w-4 h-4" />
                  Live AI Preview — No signup needed
                </div>
                <h2 className="text-4xl sm:text-5xl font-display font-black text-foreground mb-4">
                  See it in action
                </h2>
                <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-10">
                  Answer 11 quick questions about your home and get a real AI-generated 12-month maintenance calendar — personalized to your state and climate.
                </p>
                <button
                  onClick={() => setShowDemo(true)}
                  className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-xl bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-1"
                >
                  <Sparkles className="w-6 h-6" />
                  Try the AI Demo
                </button>
                <p className="mt-4 text-sm text-slate-400">Takes about 2 minutes · Free · No account required</p>
              </motion.div>
            ) : (
              <div>
                <div className="text-center mb-10">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
                    <Zap className="w-4 h-4" />
                    AI Demo
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-display font-black text-foreground">
                    Your Personalized Home Calendar
                  </h2>
                </div>
                <DemoQuiz />
              </div>
            )}
          </div>
        </section>
      </main>

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
    </div>
  );
}
