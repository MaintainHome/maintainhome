import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface BrandingConfig {
  subdomain: string;
  brokerName: string;
  logoUrl: string | null;
  agentPhotoUrl: string | null;
  phoneNumber: string | null;
  tagline: string | null;
  welcomeMessage: string | null;
  type: "individual_agent" | "team_leader";
}

interface BrandingContextType {
  branding: BrandingConfig | null;
  loading: boolean;
  previewSubdomain: string | null;
  setPreviewSubdomain: (sub: string | null) => void;
}

const BrandingContext = createContext<BrandingContextType | null>(null);

const PREVIEW_KEY = "mh_preview_subdomain";
const REFERRAL_KEY = "mh_referral_sub";

function detectSubdomain(): string | null {
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  if (parts.length <= 2) return null;
  const sub = parts[0].toLowerCase();
  if (sub === "www") return null;
  return sub;
}

function detectReferralParam(): string | null {
  const params = new URLSearchParams(window.location.search);
  const broker = params.get("broker");
  const ref = params.get("_ref");
  const value = broker || ref;
  if (value) {
    const subdomain = value.toLowerCase().trim();
    localStorage.setItem(REFERRAL_KEY, subdomain);
    const url = new URL(window.location.href);
    url.searchParams.delete("_ref");
    url.searchParams.delete("broker");
    window.history.replaceState({}, "", url.toString());
    return subdomain;
  }
  return localStorage.getItem(REFERRAL_KEY);
}

export function getReferralSubdomain(): string | null {
  return localStorage.getItem(REFERRAL_KEY);
}

export function clearReferralSubdomain() {
  localStorage.removeItem(REFERRAL_KEY);
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewSubdomain, setPreviewSubdomainState] = useState<string | null>(
    () => sessionStorage.getItem(PREVIEW_KEY) || null,
  );

  const setPreviewSubdomain = useCallback((sub: string | null) => {
    setPreviewSubdomainState(sub);
    if (sub) {
      sessionStorage.setItem(PREVIEW_KEY, sub);
    } else {
      sessionStorage.removeItem(PREVIEW_KEY);
    }
  }, []);

  useEffect(() => {
    const referral = detectReferralParam();
    const subdomain = previewSubdomain || detectSubdomain() || referral;

    if (!subdomain) {
      setBranding(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const headers: Record<string, string> = { "X-Subdomain": subdomain };

    fetch("/api/branding", { headers })
      .then((r) => r.json())
      .then((data) => {
        setBranding(data.branding ?? null);
      })
      .catch(() => {
        setBranding(null);
      })
      .finally(() => setLoading(false));
  }, [previewSubdomain]);

  return (
    <BrandingContext.Provider value={{ branding, loading, previewSubdomain, setPreviewSubdomain }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used within BrandingProvider");
  return ctx;
}
