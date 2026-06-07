let rateCache: { rates: Record<string, number>; fetchedAt: number } | null = null;

export async function getExchangeRates(): Promise<Record<string, number>> {
  if (rateCache && Date.now() - rateCache.fetchedAt < 3_600_000) {
    return rateCache.rates;
  }
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 3600 } });
    const data = await res.json() as { rates: Record<string, number> };
    rateCache = { rates: data.rates, fetchedAt: Date.now() };
    return data.rates;
  } catch {
    return rateCache?.rates ?? { USD: 1 };
  }
}

export async function convertToUSD(amount: number, fromCurrency: string): Promise<{ baseCurrencyAmount: number; exchangeRate: number }> {
  if (fromCurrency === "USD") return { baseCurrencyAmount: amount, exchangeRate: 1 };
  const rates = await getExchangeRates();
  const rate = rates[fromCurrency];
  if (!rate) return { baseCurrencyAmount: amount, exchangeRate: 1 };
  return { baseCurrencyAmount: amount / rate, exchangeRate: rate };
}

export const COMMON_CURRENCIES = [
  "USD","EUR","GBP","CAD","AUD","JPY","CHF","CNY","INR","MXN",
  "BRL","AED","SGD","HKD","NOK","SEK","DKK","NZD","ZAR","PKR",
];
