export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported currency/locale combos
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatNumber(
  value: number,
  locale = "en-US",
  decimals = 2
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(
  date: Date | string | null | undefined,
  locale = "en-US",
  timezone?: string
): string {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(timezone ? { timeZone: timezone } : {}),
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleDateString();
  }
}

export function formatDateShort(
  date: Date | string | null | undefined,
  locale = "en-US"
): string {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleDateString();
  }
}
