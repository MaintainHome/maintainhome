import { useLocation } from "wouter";
import { ArrowLeft, ScrollText } from "lucide-react";

const BASE = import.meta.env.BASE_URL;

interface Section {
  heading: string;
  body: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    heading: "1. Introduction",
    body: (
      <p>
        MaintainHome.ai (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) provides an AI-powered home
        ownership platform designed to help users track maintenance, manage documents, receive reminders,
        and chat with Maintly, our AI assistant. These Terms govern your use of the website, mobile app
        (PWA and native), white-label versions, and all related services (collectively, the &ldquo;Service&rdquo;).
      </p>
    ),
  },
  {
    heading: "2. Definitions",
    body: (
      <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
        <li><strong className="text-slate-800">User</strong> &mdash; Any individual or entity using the Service.</li>
        <li><strong className="text-slate-800">Pro User</strong> &mdash; A subscriber who has paid for a paid plan.</li>
        <li><strong className="text-slate-800">White-Label Partner</strong> &mdash; Real estate brokers, teams, or home builders using a branded version of the Service.</li>
        <li><strong className="text-slate-800">Maintly</strong> &mdash; Our AI-powered chatbot and assistant.</li>
        <li><strong className="text-slate-800">Content</strong> &mdash; Any data, documents, notes, photos, or other materials you upload or input.</li>
      </ul>
    ),
  },
  {
    heading: "3. Eligibility and Accounts",
    body: (
      <p>
        You must be at least 18 years old to use the Service. You are responsible for maintaining the
        confidentiality of your account and password. You agree to provide accurate information,
        including during the onboarding quiz and Home Profile setup. You are responsible for all
        activity that occurs under your account.
      </p>
    ),
  },
  {
    heading: "4. The Service",
    body: (
      <p>
        We provide personalized maintenance calendars, AI chat with Maintly, document upload and storage,
        a maintenance history log, reminders (email, in-app, and optional SMS), and white-label versions
        for brokers and builders. All features are provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo;
        and may change, be added to, or be removed at any time.
      </p>
    ),
  },
  {
    heading: "5. Subscriptions and Payments",
    body: (
      <>
        <p>
          Pro membership is offered on a monthly or annual basis. Paid plans auto-renew at the then-current
          rate until you cancel. Payments are processed via Stripe. Pro members receive 200 Maintly AI
          messages per calendar month; additional usage may be purchased as &ldquo;Power Ups&rdquo; ($4.99
          for 200 additional messages, valid for the current calendar month only and non-rollover).
        </p>
        <p className="mt-3">
          All fees are non-refundable except where required by law. Gift, prepaid, and white-label-issued
          subscriptions are non-refundable once activated. You may cancel auto-renewal at any time from
          your account settings; cancellation will take effect at the end of the current billing period.
        </p>
      </>
    ),
  },
  {
    heading: "6. AI and Maintenance Advice — Important Disclaimers",
    body: (
      <>
        <p>
          Maintly is an AI tool that provides <strong className="text-slate-800">general information and
          suggestions only</strong>. Maintly is <strong className="text-slate-800">not</strong> a licensed
          contractor, inspector, engineer, or professional advisor. All content, AI-generated responses,
          maintenance reminders, schedules, tips, and recommendations are for informational and
          educational purposes only.
        </p>
        <p className="mt-3">
          You are solely responsible for any actions you take based on Maintly&rsquo;s output. We are{" "}
          <strong className="text-slate-800">not responsible</strong> for any property damage, repair
          costs, injury, or financial loss resulting from following (or failing to follow)
          Maintly&rsquo;s suggestions. Always consult qualified, licensed professionals for inspections,
          repairs, code compliance, and any decisions involving safety or significant cost.
        </p>
        <p className="mt-3 text-xs text-slate-500 italic">
          AI outputs may be inaccurate, incomplete, or inappropriate for your specific situation. AI
          recommendations may not account for local building codes, HOA rules, or unique property conditions.
        </p>
      </>
    ),
  },
  {
    heading: "7. User Content",
    body: (
      <p>
        You retain ownership of all Content you upload to the Service (documents, photos, notes,
        warranties, etc.). By uploading Content, you grant us a limited, non-exclusive, worldwide,
        royalty-free license to store, process, and display that Content solely to operate and improve
        the Service for you. We do not sell your Content. You represent that you have the right to
        upload any Content you provide and that it does not infringe on the rights of any third party.
      </p>
    ),
  },
  {
    heading: "8. Acceptable Use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1.5 mt-2 marker:text-slate-400">
          <li>Use the Service for any unlawful purpose or in violation of any applicable law.</li>
          <li>Attempt to reverse engineer, scrape, or interfere with the Service or its security.</li>
          <li>Submit content that is fraudulent, defamatory, harassing, or infringes intellectual property rights.</li>
          <li>Resell, sublicense, or commercially exploit the Service except as expressly permitted under a White-Label Partner agreement.</li>
          <li>Upload viruses, malware, or any code intended to disrupt the Service or other users.</li>
        </ul>
        <p className="mt-3">
          We may suspend or terminate accounts that violate these rules, with or without notice.
        </p>
      </>
    ),
  },
  {
    heading: "9. Intellectual Property",
    body: (
      <p>
        The Service, including all software, branding, designs, text, graphics, and the Maintly assistant
        (excluding User Content), is owned by MaintainHome.ai and is protected by copyright, trademark,
        and other intellectual property laws. We grant you a personal, non-transferable, non-exclusive
        license to use the Service for its intended purpose. White-Label Partners receive a separate
        limited license under their partnership agreement.
      </p>
    ),
  },
  {
    heading: "10. White-Label Partner Programs",
    body: (
      <p>
        Real estate brokers, teams, and home builders may purchase pre-loaded gift accounts (currently
        $45 for 1 year, or $119 for 3 years) and provide a co-branded experience to their clients.
        Partners are responsible for the accuracy of any branding, contact details, and service-provider
        recommendations they configure. Clients of partners remain users of MaintainHome.ai and are
        bound by these Terms.
      </p>
    ),
  },
  {
    heading: "11. Privacy and Data",
    body: (
      <p>
        Your use of the Service is also governed by our{" "}
        <a href="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</a>.
        By using the Service, you consent to the collection and use of your information as described
        therein. You may request access to, correction of, or deletion of your personal data at any
        time from the Home Profile settings page.
      </p>
    ),
  },
  {
    heading: "12. SMS / Text Reminders",
    body: (
      <p>
        Pro Users may opt in to SMS text reminders. By providing a phone number and enabling SMS, you
        consent to receive automated text messages from MaintainHome.ai related to your maintenance
        tasks. Standard message and data rates may apply. You can opt out at any time by replying
        STOP, or by disabling SMS reminders in your Home Profile settings.
      </p>
    ),
  },
  {
    heading: "13. Disclaimer of Warranties",
    body: (
      <p>
        The Service is provided <strong className="text-slate-800">&ldquo;as is&rdquo;</strong> and{" "}
        <strong className="text-slate-800">&ldquo;as available&rdquo;</strong> without warranties of any
        kind, either express or implied, including but not limited to implied warranties of
        merchantability, fitness for a particular purpose, non-infringement, or accuracy. We do not
        warrant that the Service will be uninterrupted, error-free, secure, or that defects will be
        corrected.
      </p>
    ),
  },
  {
    heading: "14. Limitation of Liability",
    body: (
      <>
        <p>
          To the fullest extent permitted by applicable law, MaintainHome.ai, its owners, officers,
          employees, contractors, affiliates, and agents shall{" "}
          <strong className="text-slate-800">not be liable for any indirect, incidental, special,
          consequential, exemplary, or punitive damages</strong>, including loss of profits, data,
          goodwill, property damage, personal injury, or business opportunities, arising from your use
          of the Service or reliance on any AI-generated content.
        </p>
        <p className="mt-3">
          In no event shall our total cumulative liability to you exceed the greater of (a) the amount
          you paid us in the twelve (12) months preceding the claim, or (b) $100 USD.
        </p>
      </>
    ),
  },
  {
    heading: "15. Indemnification",
    body: (
      <p>
        You agree to indemnify and hold harmless MaintainHome.ai and its affiliates from any claims,
        damages, losses, liabilities, and expenses (including reasonable attorneys&rsquo; fees) arising
        out of or related to your use of the Service, your User Content, your violation of these Terms,
        or your violation of any rights of a third party.
      </p>
    ),
  },
  {
    heading: "16. Governing Law, Changes to Terms, and Contact Us",
    body: (
      <>
        <p>
          <strong className="text-slate-800">Governing Law.</strong> These Terms are governed by the
          laws of the State of North Carolina, USA, without regard to its conflict-of-law principles.
          Any dispute arising under these Terms shall be resolved in the state or federal courts
          located in North Carolina.
        </p>
        <p className="mt-3">
          <strong className="text-slate-800">Changes to Terms.</strong> We may update these Terms from
          time to time. Material changes will be communicated by email or in-app notice. Continued use
          of the Service after changes take effect constitutes your acceptance of the revised Terms.
        </p>
        <p className="mt-3">
          <strong className="text-slate-800">Contact.</strong> Questions about these Terms? Contact us
          at{" "}
          <a href="mailto:support@maintainhome.ai" className="text-primary hover:underline font-medium">
            support@maintainhome.ai
          </a>{" "}
          or use the Contact Support option in the app.
        </p>
      </>
    ),
  },
];

export default function TermsOfService() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src={`${BASE}images/logo-icon.png`} alt="MaintainHome.ai" className="w-5 h-5 object-contain" />
            <h1 className="text-base font-bold text-slate-900 truncate">Terms of Service</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ScrollText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Terms of Service</h1>
              <p className="text-sm text-slate-400 mt-0.5">MaintainHome.ai &middot; Last updated: April 23, 2026</p>
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-8">
            <p className="text-xs sm:text-sm text-amber-900 font-semibold">
              PLEASE READ THESE TERMS OF SERVICE CAREFULLY.
            </p>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              By accessing or using MaintainHome.ai (the &ldquo;Service&rdquo;), you agree to be bound by
              these Terms. If you do not agree, do not use the Service.
            </p>
          </div>

          <div className="text-sm leading-relaxed text-slate-600 space-y-8">
            {SECTIONS.map((section) => (
              <section key={section.heading}>
                <h2 className="text-base font-semibold text-slate-800 mb-2">{section.heading}</h2>
                <div className="space-y-2">{section.body}</div>
              </section>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 italic">
              These Terms are provided in good faith. For specific legal questions, please consult an attorney.
            </p>
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-6 text-center flex items-center justify-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            ← Back to MaintainHome.ai
          </button>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <button
            onClick={() => navigate("/privacy")}
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
}
