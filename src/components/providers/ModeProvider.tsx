"use client";

import { createContext, useContext, useCallback, useState } from "react";
import type { Family } from "@/config/tiers";

export const MODE_COOKIE = "ledgr-mode";

interface ModeContextType {
  mode: Family;
  setMode: (mode: Family) => void;
}

const ModeContext = createContext<ModeContextType>({ mode: "ai", setMode: () => {} });

export function ModeProvider({
  initialMode,
  children,
}: {
  initialMode: Family;
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<Family>(initialMode);

  const setMode = useCallback((next: Family) => {
    setModeState(next);
    if (typeof document !== "undefined") {
      document.cookie = `${MODE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    }
  }, []);

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}

export function useMode() {
  return useContext(ModeContext);
}
