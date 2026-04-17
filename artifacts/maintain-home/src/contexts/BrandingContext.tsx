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
  contactEmail: string | null;
  accountType?: "broker" | "builder";
  warrantyPeriodMonths?: number | null;
}

interface BrandingContextType {
  branding: BrandingConfig | null;
  loading: boolean;
  previewSubdomain: string | null;
  setPreviewSubdomain: (sub: string | null) => void;
  setBrokerReferral: (subdomain: string) => void;
}

const BrandingContext = createContext<BrandingContextType | null>(null);

export const PREVIEW_KEY = "mh_preview_subdomain";
export const REFERRAL_KEY = "mh_referral_sub";

// Module-level callback registered by BrandingProvider so AuthContext can
// trigger a state reset without creating a circular import/hook dependency.
let _onClearBranding: (() => void) | null = null;

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

/**
 * Called on logout. Wipes all white-label storage and resets the
 * BrandingProvider's internal state so no broker branding lingers
 * on the main domain after sign-out.
 */
export function clearAllBranding() {
  localStorage.removeItem(REFERRAL_KEY);
  sessionStorage.removeItem(PREVIEW_KEY);
  _onClearBranding?.();
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewSubdomain, setPreviewSubdomainState] = useState<string | null>(
    () => sessionStorage.getItem(PREVIEW_KEY) || null,
  );
  const [forcedReferral, setForcedReferral] = useState<string | null>(null);

  const setPreviewSubdomain = useCallback((sub: string | null) => {
    setPreviewSubdomainState(sub);
    if (sub) {
      sessionStorage.setItem(PREVIEW_KEY, sub);
    } else {
      sessionStorage.removeItem(PREVIEW_KEY);
    }
  }, []);

  const setBrokerReferral = useCallback((subdomain: string) => {
    const sub = subdomain.toLowerCase().trim();
    localStorage.setItem(REFERRAL_KEY, sub);
    setForcedReferral(sub);
  }, []);

  // Register the module-level callback so clearAllBranding() can reset state.
  useEffect(() => {
    _onClearBranding = () => {
      setForcedReferral(null);
      setPreviewSubdomainState(null);
      setBranding(null);
      setLoading(false);
    };
    return () => {
      _onClearBranding = null;
    };
  }, []);

  useEffect(() => {
    // Only read localStorage referral if we are NOT on a real subdomain
    // and there is no forced referral already in state.
    const sub = detectSubdomain();
    const referral = sub ? null : detectReferralParam();
    const subdomain = previewSubdomain || sub || forcedReferral || referral;

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
  }, [previewSubdomain, forcedReferral]);

  return (
    <BrandingContext.Provider value={{ branding, loading, previewSubdomain, setPreviewSubdomain, setBrokerReferral }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used within BrandingProvider");
  return ctx;
}
