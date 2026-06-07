import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all invoices
  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id, status: { not: "DRAFT" } },
    select: { clientId: true, clientName: true, issueDate: true, total: true, status: true },
    orderBy: { issueDate: "asc" },
  });

  // Group by client first invoice month (cohort)
  const clientFirstMonth: Record<string, string> = {};
  for (const inv of invoices) {
    const clientKey = inv.clientId || inv.clientName;
    const month = `${inv.issueDate.getFullYear()}-${String(inv.issueDate.getMonth() + 1).padStart(2, "0")}`;
    if (!clientFirstMonth[clientKey] || month < clientFirstMonth[clientKey]) {
      clientFirstMonth[clientKey] = month;
    }
  }

  // Get all months
  const allMonths = [...new Set(invoices.map(i =>
    `${i.issueDate.getFullYear()}-${String(i.issueDate.getMonth() + 1).padStart(2, "0")}`
  ))].sort();

  // Get unique cohort months
  const cohortMonths = [...new Set(Object.values(clientFirstMonth))].sort();

  // Build cohort table
  const cohorts = cohortMonths.map(cohortMonth => {
    const cohortClients = Object.entries(clientFirstMonth)
      .filter(([, month]) => month === cohortMonth)
      .map(([clientKey]) => clientKey);

    const cohortSize = cohortClients.length;
    const cohortMRR = invoices
      .filter(i => {
        const key = i.clientId || i.clientName;
        const m = `${i.issueDate.getFullYear()}-${String(i.issueDate.getMonth() + 1).padStart(2, "0")}`;
        return cohortClients.includes(key) && m === cohortMonth;
      })
      .reduce((s, i) => s + i.total, 0);

    const retention = allMonths
      .filter(m => m >= cohortMonth)
      .slice(0, 12)
      .map((month, idx) => {
        const activeClients = cohortClients.filter(clientKey =>
          invoices.some(i => {
            const key = i.clientId || i.clientName;
            const m = `${i.issueDate.getFullYear()}-${String(i.issueDate.getMonth() + 1).padStart(2, "0")}`;
            return key === clientKey && m === month;
          })
        ).length;

        const mrr = invoices
          .filter(i => {
            const key = i.clientId || i.clientName;
            const m = `${i.issueDate.getFullYear()}-${String(i.issueDate.getMonth() + 1).padStart(2, "0")}`;
            return cohortClients.includes(key) && m === month;
          })
          .reduce((s, i) => s + i.total, 0);

        return {
          month,
          periodIndex: idx,
          activeClients,
          retentionRate: cohortSize > 0 ? (activeClients / cohortSize) * 100 : 0,
          mrr,
          mrrRetention: cohortMRR > 0 ? (mrr / cohortMRR) * 100 : 0,
        };
      });

    return { cohortMonth, cohortSize, cohortMRR, retention };
  });

  // Summary metrics
  const totalMRR = invoices
    .filter(i => {
      const now = new Date();
      const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const im = `${i.issueDate.getFullYear()}-${String(i.issueDate.getMonth() + 1).padStart(2, "0")}`;
      return im === m;
    })
    .reduce((s, i) => s + i.total, 0);

  const totalARR = totalMRR * 12;

  return NextResponse.json({ cohorts, allMonths, summary: { totalMRR, totalARR, cohortCount: cohortMonths.length } });
}
