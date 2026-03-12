"use client";

import { createContext, useContext, ReactNode } from "react";
import { useSettings } from "./useSettings";

const SettingsContext = createContext<ReturnType<typeof useSettings> | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const store = useSettings();
  return (
    <SettingsContext.Provider value={store}>{children}</SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettingsContext must be used within SettingsProvider");
  return ctx;
}

export function useSettingsOptional() {
  return useContext(SettingsContext);
}
