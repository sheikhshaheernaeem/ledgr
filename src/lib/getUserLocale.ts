import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export interface ServerLocale {
  country: string;
  currency: string;
  locale: string;
  timezone: string;
  taxName: string;
  defaultTaxRate: number;
  fmt: (amount: number) => string;
  fmtDate: (date: Date | string | null | undefined) => string;
  fmtNum: (n: number, decimals?: number) => string;
}

const DEFAULTS = {
  country: "US",
  currency: "USD",
  locale: "en-US",
  timezone: "America/New_York",
  taxName: "Tax",
  defaultTaxRate: 0,
};

export async function getUserLocale(userId: string): Promise<ServerLocale> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { country: true, currency: true, locale: true, timezone: true, taxName: true, defaultTaxRate: true },
  });

  const s = { ...DEFAULTS, ...user };

  return {
    ...s,
    fmt: (amount) => formatCurrency(amount, s.currency, s.locale),
    fmtDate: (date) => formatDate(date, s.locale, s.timezone),
    fmtNum: (n, decimals) => formatNumber(n, s.locale, decimals),
  };
}
