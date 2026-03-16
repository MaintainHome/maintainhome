import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-[#1A1A1A] text-white pt-16 pb-8 border-t-4 border-accent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          <div className="space-y-6">
            <Link href="/" className="inline-block relative">
              <img
                src={`${import.meta.env.BASE_URL}images/redwood-logo-white.png`}
                alt="Redwood Title Logo"
                className="h-48 w-auto object-contain mix-blend-screen opacity-90"
              />
            </Link>
            <p className="text-gray-400 max-w-sm">
              Rooted in Trust. Built for Protection. Growing with You. Providing seamless, reliable, and accurate title insurance services.
            </p>
          </div>
          
          <div>
            <h4 className="font-display text-xl font-semibold mb-6 text-accent">Quick Links</h4>
            <ul className="space-y-3">
              <li><a href="#about" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
              <li><a href="#services" className="text-gray-400 hover:text-white transition-colors">Our Services</a></li>
              <li><a href="#technology" className="text-gray-400 hover:text-white transition-colors">Technology</a></li>
              <li><a href="#states" className="text-gray-400 hover:text-white transition-colors">Service Areas</a></li>
            </ul>
          </div>
          
        </div>

        {/* ALTA Logos */}
        <div className="py-6 border-t border-gray-800 flex justify-center">
          <img
            src={`${import.meta.env.BASE_URL}images/alta-logos.png`}
            alt="ALTA Member and ALTA Registry"
            className="h-16 w-auto object-contain"
          />
        </div>
        
        <div className="pt-6 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Redwood Title. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
