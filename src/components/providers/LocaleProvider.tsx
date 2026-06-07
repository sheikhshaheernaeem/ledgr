"use client";

import { createContext, useContext, useMemo } from "react";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export interface UserLocale {
  country: string;
  currency: string;
  locale: string;
  timezone: string;
  taxName: string;
  defaultTaxRate: number;
}

interface LocaleContextType extends UserLocale {
  fmt: (amount: number) => string;
  fmtDate: (date: Date | string | null | undefined) => string;
  fmtNumber: (n: number, decimals?: number) => string;
}

const DEFAULT: UserLocale = {
  country: "US",
  currency: "USD",
  locale: "en-US",
  timezone: "America/New_York",
  taxName: "Tax",
  defaultTaxRate: 0,
};

const LocaleContext = createContext<LocaleContextType>({
  ...DEFAULT,
  fmt: (n) => `$${n.toFixed(2)}`,
  fmtDate: (d) => (d ? new Date(d).toLocaleDateString() : "—"),
  fmtNumber: (n) => n.toFixed(2),
});

export function LocaleProvider({
  settings,
  children,
}: {
  settings: Partial<UserLocale>;
  children: React.ReactNode;
}) {
  const merged: UserLocale = { ...DEFAULT, ...settings };

  const value = useMemo<LocaleContextType>(
    () => ({
      ...merged,
      fmt: (amount) => formatCurrency(amount, merged.currency, merged.locale),
      fmtDate: (date) => formatDate(date, merged.locale, merged.timezone),
      fmtNumber: (n, decimals) => formatNumber(n, merged.locale, decimals),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [merged.currency, merged.locale, merged.timezone]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
