import { NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/fx";

export async function GET() {
  try {
    const rates = await getExchangeRates();
    return NextResponse.json({ rates, base: "USD", updatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Failed to fetch rates" }, { status: 500 });
  }
}
