import { useState } from "react";
import { CreditCard } from "lucide-react";
import { BrandedPageHeader } from "@/components/BrandedPageHeader";
import { PricingSection } from "@/components/PricingSection";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";

export default function PricingPage() {
  const { loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <BrandedPageHeader
        title="Pricing"
        icon={<CreditCard className="w-4 h-4" />}
        maxWidth="max-w-5xl"
      />

      <PricingSection onOpenAuth={() => setAuthOpen(true)} />

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
