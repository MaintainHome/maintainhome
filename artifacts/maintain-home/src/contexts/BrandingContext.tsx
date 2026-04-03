import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface BrandingConfig {
  subdomain: string;
  brokerName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
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

function detectSubdomain(): string | null {
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  if (parts.length <= 2) return null;
  const sub = parts[0].toLowerCase();
  if (sub === "www") return null;
  return sub;
}

function hexToHsl(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyBrandingCss(branding: BrandingConfig | null) {
  const root = document.documentElement;
  if (!branding) {
    root.style.removeProperty("--color-primary");
    root.style.removeProperty("--color-secondary");
    return;
  }
  const primaryHsl = hexToHsl(branding.primaryColor);
  if (primaryHsl) root.style.setProperty("--color-primary", primaryHsl);
  const secondaryHsl = hexToHsl(branding.secondaryColor);
  if (secondaryHsl) root.style.setProperty("--color-secondary", secondaryHsl);
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
    const subdomain = previewSubdomain || detectSubdomain();

    if (!subdomain) {
      setBranding(null);
      setLoading(false);
      applyBrandingCss(null);
      return;
    }

    setLoading(true);
    const headers: Record<string, string> = { "X-Subdomain": subdomain };

    fetch("/api/branding", { headers })
      .then((r) => r.json())
      .then((data) => {
        const b = data.branding ?? null;
        setBranding(b);
        applyBrandingCss(b);
      })
      .catch(() => {
        setBranding(null);
        applyBrandingCss(null);
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
