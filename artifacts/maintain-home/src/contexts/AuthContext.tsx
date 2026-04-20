import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { clearAllBranding } from "./BrandingContext";

export type SubscriptionStatus = "free" | "pro_monthly" | "pro_annual" | "promo_pro";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  zipCode: string | null;
  fullAccess: boolean;
  subscriptionStatus: SubscriptionStatus;
  isBroker: boolean;
  isBuilder: boolean;
  smsEnabled: boolean;
  smsPhone: string | null;
  hasSeenDashboardTour: boolean;
  hasAcceptedTerms: boolean;
  referralSubdomain: string | null;
}

export function isPro(user: AuthUser | null): boolean {
  if (!user) return false;
  return (
    user.subscriptionStatus === "pro_monthly" ||
    user.subscriptionStatus === "pro_annual" ||
    user.subscriptionStatus === "promo_pro"
  );
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  giftRedemptionResult: { ok: boolean; message: string; isNewUser?: boolean } | null;
  clearGiftRedemptionResult: () => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [giftRedemptionResult, setGiftRedemptionResult] = useState<{ ok: boolean; message: string; isNewUser?: boolean } | null>(null);

  const clearGiftRedemptionResult = useCallback(() => setGiftRedemptionResult(null), []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("gift_applied") === "1") {
          const isNewUser = urlParams.get("new_user") === "1";
          urlParams.delete("gift_applied");
          urlParams.delete("new_user");
          const newSearch = urlParams.toString();
          const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
          window.history.replaceState({}, "", newUrl);
          const message = isNewUser
            ? "Welcome! Your 1-year Pro access has been activated via gift code."
            : "Gift code redeemed! You now have 1 year of Pro access.";
          setGiftRedemptionResult({ ok: true, message, isNewUser });
          localStorage.removeItem("mh_pending_gift");
          return;
        }

        const pendingGift = localStorage.getItem("mh_pending_gift");
        if (pendingGift) {
          localStorage.removeItem("mh_pending_gift");
          try {
            const redeemRes = await fetch("/api/auth/redeem-gift", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ code: pendingGift }),
            });
            const redeemData = await redeemRes.json();
            if (redeemRes.ok) {
              const refreshed = await fetch("/api/auth/me", { credentials: "include" });
              if (refreshed.ok) setUser(await refreshed.json());
              setGiftRedemptionResult({ ok: true, message: redeemData.message ?? "Gift code redeemed! You now have 1 year of Pro access." });
            } else {
              setGiftRedemptionResult({ ok: false, message: redeemData.error ?? "Gift code could not be redeemed." });
            }
          } catch {
            setGiftRedemptionResult({ ok: false, message: "Gift code redemption failed. Try again in Settings." });
          }
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
    }
    sessionStorage.removeItem("mh_active_role");
    clearAllBranding();
    setUser(null);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, giftRedemptionResult, clearGiftRedemptionResult, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
