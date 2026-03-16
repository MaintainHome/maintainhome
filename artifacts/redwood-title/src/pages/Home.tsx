import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactForm } from "@/components/ContactForm";
import { ShieldCheck, Search, FileSignature, Wrench, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden min-h-[85vh] flex items-center">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-suburban-luxury.png`} 
            alt="Beautiful suburban neighborhood" 
            className="w-full h-full object-cover"
          />
          {/* Elegant dark gradient overlay to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1105]/90 via-[#3a1d1d]/80 to-transparent"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/40 text-accent-foreground backdrop-blur-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              <span className="text-sm font-semibold tracking-wide text-white">Rooted in Trust. Built for Protection.</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-bold text-white leading-tight mb-6 text-balance">
              Your Trusted Partner in <span className="text-accent italic">Title Search & Insurance</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-200 mb-10 max-w-2xl font-light">
              Connect to cutting edge technology to empower unmatched thoroughness and efficiency.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
                size="lg" 
                className="bg-accent hover:bg-accent/90 text-primary-foreground text-lg px-8 py-7 rounded-full shadow-lg shadow-accent/20"
              >
                Get Started Today <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Marquee Ticker */}
        <div className="absolute bottom-0 w-full bg-primary/95 backdrop-blur-md border-y border-primary/20 py-4 overflow-hidden">
          <div className="w-[200%] flex animate-marquee">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-1 flex justify-around items-center text-white/80 font-medium text-sm md:text-base tracking-widest uppercase">
                <span className="whitespace-nowrap">North Carolina</span>
                <span className="text-accent">•</span>
                <span className="whitespace-nowrap">Florida</span>
                <span className="text-accent">•</span>
                <span className="whitespace-nowrap">Kansas</span>
                <span className="text-accent">•</span>
                <span className="whitespace-nowrap">Oklahoma</span>
                <span className="text-accent">•</span>
                <span className="whitespace-nowrap">Missouri</span>
                <span className="text-accent">•</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="text-center max-w-4xl mx-auto"
          >
            <h2 className="text-primary font-bold tracking-wider uppercase text-sm mb-3">About Us</h2>
            <h3 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-8">
              Welcome To A New Way To Do Title Work.
            </h3>
            <p className="text-xl text-muted-foreground leading-relaxed mb-10">
              Redwood Title has been at the forefront of providing seamless, reliable, and accurate title insurance services across 5 states. We are more than just a title insurance company; we are a team of dedicated professionals committed to ensuring that every transaction is handled with speed, precision, and exceptional service.
            </p>
            
            <div className="bg-secondary/50 rounded-2xl p-8 border border-border inline-block shadow-inner">
              <p className="font-display text-2xl text-primary italic">
                "Rooted in Trust. Built for Protection. Growing with You."
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section id="services" className="py-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-primary font-bold tracking-wider uppercase text-sm mb-3">What We Do</h2>
            <h3 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
              We Are Committed To Giving You True Value
            </h3>
            <p className="text-lg text-muted-foreground">
              At Redwood Title, we offer a comprehensive suite of title insurance services to protect homebuyers, lenders, and real estate professionals from potential risks and uncertainties associated with property ownership.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: ShieldCheck,
                title: "Title Insurance",
                desc: "Safeguarding property owners and lenders against defects, liens, or encumbrances on titles that could impact their ownership rights."
              },
              {
                icon: Search,
                title: "Title Search & Examination",
                desc: "Conducting in-depth title searches and examinations to uncover any potential issues that may affect property ownership."
              },
              {
                icon: FileSignature,
                title: "Closing & Escrow Services",
                desc: "Providing efficient and secure closing and escrow services to ensure smooth and timely real estate transactions."
              },
              {
                icon: Wrench,
                title: "Title Curative Services",
                desc: "Resolving title issues and clearing defects to provide a clean title for buyers and lenders."
              }
            ].map((service, idx) => (
              <motion.div 
                key={idx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { delay: idx * 0.1, duration: 0.5 } }
                }}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-border group"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary transition-colors">
                  <service.icon className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
                </div>
                <h4 className="text-2xl font-display font-bold mb-4 text-foreground">{service.title}</h4>
                <p className="text-muted-foreground leading-relaxed">
                  {service.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TECHNOLOGY SECTION */}
      <section id="technology" className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:w-1/2"
            >
              <h2 className="text-primary font-bold tracking-wider uppercase text-sm mb-3">More About Us</h2>
              <h3 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
                Proprietary Systems for Seamless Integration
              </h3>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                We understand that the real estate industry moves fast, and so should your title insurance company. That's why we've developed proprietary systems that integrate seamlessly with real estate agents, lenders, and attorneys.
              </p>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Our state-of-the-art technology ensures that all parties are aligned throughout the entire transaction process, reducing delays, enhancing communication, and ensuring the accuracy of information at every step.
              </p>
              
              <ul className="space-y-4">
                {['Reduced Delays', 'Enhanced Communication', 'Guaranteed Accuracy', 'Seamless Integration'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-accent" />
                    <span className="text-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:w-1/2 relative"
            >
              <div className="absolute inset-0 bg-accent rounded-[2rem] transform translate-x-4 translate-y-4 opacity-20"></div>
              <img 
                src={`${import.meta.env.BASE_URL}images/team-office.png`}
                alt="Our professional team" 
                className="relative z-10 rounded-[2rem] shadow-2xl object-cover w-full aspect-[4/3]"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* STATES SECTION */}
      <section id="states" className="py-24 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-10">
          <img 
            src={`${import.meta.env.BASE_URL}images/abstract-gold.png`} 
            alt="Texture" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h3 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
              Licensed Across 5 States
            </h3>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Whether you are buying or refinancing a property, our team has the local knowledge and regulatory expertise to handle your title insurance needs efficiently and accurately.
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {['North Carolina', 'Florida', 'Kansas', 'Oklahoma', 'Missouri'].map((state, idx) => (
              <motion.div
                key={state}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-6 rounded-2xl flex-grow md:flex-grow-0 text-center min-w-[200px] hover:bg-accent hover:border-accent transition-colors duration-300 cursor-default"
              >
                <span className="text-2xl font-display font-semibold text-white">{state}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section id="contact" className="py-24 bg-secondary">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-primary font-bold tracking-wider uppercase text-sm mb-3">Get In Touch</h2>
          <h3 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-lg text-muted-foreground mb-10">
            Contact us today to discover how Redwood Title can streamline your next real estate transaction with trust and precision.
          </p>
          <ContactForm />
        </div>
      </section>

      <Footer />
    </div>
  );
}
