import { createContext, useContext, useState, type ReactNode } from "react";

interface SupportContextValue {
  openSupport: () => void;
}

const SupportContext = createContext<SupportContextValue>({ openSupport: () => {} });

export function useSupportModal() {
  return useContext(SupportContext);
}

export function SupportProvider({
  children,
  onOpen,
}: {
  children: ReactNode;
  onOpen: () => void;
}) {
  return (
    <SupportContext.Provider value={{ openSupport: onOpen }}>
      {children}
    </SupportContext.Provider>
  );
}
