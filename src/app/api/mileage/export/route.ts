import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

  const entries = await prisma.mileageEntry.findMany({
    where: {
      userId: session.user.id,
      date: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
    orderBy: { date: "asc" },
  });

  const header = ["Date", "Description", "From", "To", "Miles", "Rate", "Amount", "Purpose"];
  const rows = entries.map((e) => [
    new Date(e.date).toLocaleDateString("en-US"),
    `"${e.description.replace(/"/g, '""')}"`,
    `"${(e.fromAddress ?? "").replace(/"/g, '""')}"`,
    `"${(e.toAddress ?? "").replace(/"/g, '""')}"`,
    e.miles.toString(),
    e.ratePerMile.toFixed(2),
    e.amount.toFixed(2),
    e.purpose,
  ]);

  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="mileage-${year}.csv"`,
    },
  });
}
