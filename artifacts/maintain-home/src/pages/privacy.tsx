import { useLocation } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";

const BASE = import.meta.env.BASE_URL;

export default function PrivacyPolicy() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src={`${BASE}images/logo-icon.png`} alt="MaintainHome.ai" className="w-5 h-5 object-contain" />
            <h1 className="text-base font-bold text-slate-900 truncate">Privacy Policy</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
              <p className="text-sm text-slate-400 mt-0.5">Last updated: April 2026</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-8">
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-2">1. Information We Collect</h2>
              <p className="text-slate-600">
                We collect information you provide directly, including your name, email address, home details,
                and answers to our home profile quiz. We also collect usage data and device information to
                improve your experience.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-2">2. How We Use Your Information</h2>
              <p className="text-slate-600">
                Your information is used to generate your personalized home maintenance calendar, send you
                reminders, provide AI-powered recommendations, and communicate account updates. We do not
                sell your personal data to third parties.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-2">3. Subscriptions, Maintly Usage &amp; Power Ups</h2>
              <p className="text-slate-600">
                Pro membership is $5.99/month or $49/year and includes the full 12-month maintenance calendar plus
                up to 200 Maintly AI messages per calendar month. Free users have access to the current month's
                tasks but cannot use Maintly. Pro members who exceed their monthly Maintly allotment may purchase
                Power Ups for $4.99 each, which add 200 additional messages for the current month and do not roll
                over. Real-estate agents and home builders may purchase pre-loaded client gift accounts at a
                discounted rate (currently $45 for 1 year of Pro access, or $119 for 3 years) for the purpose of
                onboarding their clients. All prices are in USD and may change with notice. Subscriptions and
                Power Ups are non-refundable except where required by law.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-2">4. Data Storage and Security</h2>
              <p className="text-slate-600">
                All data is stored on secure, encrypted servers. We use industry-standard security practices
                including HTTPS encryption and access controls to protect your information. We retain your
                data for as long as your account is active or as required by law.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-2">4. Sharing with Third Parties</h2>
              <p className="text-slate-600">
                We may share limited data with trusted service providers (such as payment processors and email
                delivery services) solely to deliver our service. If you were referred by a broker or builder
                partner, they may have visibility into your account status as part of the white-label program.
                We do not share your detailed personal data beyond what is necessary.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-2">5. Cookies and Tracking</h2>
              <p className="text-slate-600">
                We use cookies and similar technologies to maintain your session, remember preferences, and
                analyze how the app is used. You can disable cookies in your browser settings, though some
                features may not work as intended.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-2">6. Your Rights</h2>
              <p className="text-slate-600">
                You may request access to, correction of, or deletion of your personal data at any time by
                contacting us or using the "Delete Account" option in your Home Profile settings. We will
                respond to all requests within 30 days.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-2">7. Children's Privacy</h2>
              <p className="text-slate-600">
                MaintainHome.ai is not intended for use by individuals under the age of 18. We do not
                knowingly collect personal information from minors.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-2">8. Changes to This Policy</h2>
              <p className="text-slate-600">
                We may update this policy from time to time. We will notify you of significant changes by
                email or via an in-app notice. Continued use of the service after changes constitutes
                acceptance of the updated policy.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-2">9. Contact Us</h2>
              <p className="text-slate-600">
                If you have questions about this Privacy Policy or how we handle your data, please contact
                us at{" "}
                <a href="mailto:support@maintainhome.ai" className="text-primary hover:underline font-medium">
                  support@maintainhome.ai
                </a>{" "}
                or use the Contact Support option in the app.
              </p>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 italic">
              This is a placeholder policy. Final legal text will be added before public launch.
            </p>
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            ← Back to MaintainHome.ai
          </button>
        </div>
      </div>
    </div>
  );
}
