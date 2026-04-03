import { ArrowLeft } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL;

interface BrandedPageHeaderProps {
  title: string;
  icon?: React.ReactNode;
  maxWidth?: string;
  children?: React.ReactNode;
}

export function BrandedPageHeader({
  title,
  icon,
  maxWidth = "max-w-3xl",
  children,
}: BrandedPageHeaderProps) {
  const { branding } = useBranding();
  const [, navigate] = useLocation();

  return (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className={`${maxWidth} mx-auto px-4 sm:px-6 h-14 flex items-center gap-3`}>
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {branding ? (
          branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.brokerName}
              className="h-7 max-w-[130px] object-contain"
            />
          ) : (
            <span className="font-bold text-primary text-sm truncate">{branding.brokerName}</span>
          )
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {icon ?? (
              <img src={`${BASE}images/logo-icon.png`} alt="MaintainHome.ai" className="w-5 h-5 object-contain" />
            )}
            <h1 className="text-base font-bold text-slate-900 truncate">{title}</h1>
          </div>
        )}

        {branding && (
          <h1 className="text-sm font-semibold text-slate-500 truncate flex-1">{title}</h1>
        )}

        <div className="ml-auto flex items-center gap-2 shrink-0">{children}</div>
      </div>
    </div>
  );
}
