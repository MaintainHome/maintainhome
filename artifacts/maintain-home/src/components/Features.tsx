import { motion } from "framer-motion";
import { CalendarDays, BellRing, MapPin, Briefcase } from "lucide-react";

const featureList = [
  {
    icon: <CalendarDays className="w-6 h-6 text-primary" />,
    title: "2-Min Quiz → Custom Calendar",
    description: "Tell our AI about your home, and it builds your personalized 12-24 month maintenance plan instantly.",
  },
  {
    icon: <BellRing className="w-6 h-6 text-primary" />,
    title: "Smart Reminders",
    description: "Get timely Email or SMS alerts for every task, so you never miss a filter change or smoke detector battery again.",
  },
  {
    icon: <MapPin className="w-6 h-6 text-primary" />,
    title: "State-Specific Tips",
    description: "NC humidity, FL hurricanes, or CA wildfires—your plan is auto-adjusted for your specific climate risks.",
  },
  {
    icon: <Briefcase className="w-6 h-6 text-primary" />,
    title: 'Custom Ai Chatbot "Maintly"',
    description: '24/7 Access to an AI Powered Home Maintenance Advisor that integrates with your home\'s historical records.',
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export function Features() {
  return (
    <div className="w-full pt-12 pb-24 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Protect your biggest investment on autopilot.
          </h2>
          <p className="text-lg text-muted-foreground">
            Maintaining a home shouldn't require a master's degree in property management. 
            We do the heavy lifting so you can enjoy your weekend.
          </p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
        >
          {featureList.map((feature, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="bg-slate-900 rounded-2xl p-8 shadow-md shadow-slate-900/30 border border-slate-700 hover:shadow-xl hover:border-primary/40 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/30 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3 leading-tight">
                {feature.title}
              </h3>
              <p className="text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
