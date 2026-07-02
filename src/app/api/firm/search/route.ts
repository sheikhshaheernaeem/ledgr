import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN" && role !== "QA") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = session.user.id as string;
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ results: [] });

  const isAdmin = role === "ADMIN" || role === "QA"; // QA auditor sees all clients
  const clientIds = isAdmin
    ? (await prisma.user.findMany({ where: { role: "CLIENT" }, select: { id: true } })).map((u) => u.id)
    : (await prisma.managedClient.findMany({ where: { accountantId: userId, isActive: true }, select: { clientId: true } })).map((mc) => mc.clientId);

  if (clientIds.length === 0) return NextResponse.json({ results: [] });

  // Run 4 queries in parallel
  const [clients, txns, reports, anomalies] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: { in: clientIds },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { companyName: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
      select: { id: true, name: true, email: true, companyName: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId: { in: clientIds },
        description: { contains: q, mode: "insensitive" },
      },
      take: 8,
      orderBy: { date: "desc" },
      select: { id: true, userId: true, description: true, amount: true, date: true, category: true },
    }),
    prisma.report.findMany({
      where: { userId: { in: clientIds }, aiSummary: { contains: q, mode: "insensitive" } },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, userId: true, month: true, year: true, netProfit: true, status: true },
    }),
    prisma.anomalyFlag.findMany({
      where: { userId: { in: clientIds }, dismissed: false, reason: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, userId: true, reason: true, severity: true, transactionId: true },
    }),
  ]);

  const clientMap = new Map<string, string>();
  for (const c of clients) clientMap.set(c.id, c.companyName ?? c.name ?? c.email);

  // Look up names for other clients referenced in non-client hits
  const missingIds = [
    ...new Set([
      ...txns.map((t) => t.userId).filter((id) => !clientMap.has(id)),
      ...reports.map((r) => r.userId).filter((id) => !clientMap.has(id)),
      ...anomalies.map((a) => a.userId).filter((id) => !clientMap.has(id)),
    ]),
  ];
  if (missingIds.length > 0) {
    const extra = await prisma.user.findMany({
      where: { id: { in: missingIds } },
      select: { id: true, name: true, email: true, companyName: true },
    });
    for (const c of extra) clientMap.set(c.id, c.companyName ?? c.name ?? c.email);
  }

  type Result = {
    kind: "client" | "transaction" | "report" | "anomaly";
    href: string;
    title: string;
    detail: string;
    clientName?: string;
  };

  const results: Result[] = [];

  for (const c of clients) {
    results.push({
      kind: "client",
      href: `/firm/${c.id}`,
      title: c.companyName ?? c.name ?? c.email,
      detail: c.email,
    });
  }
  for (const t of txns) {
    results.push({
      kind: "transaction",
      href: `/firm/${t.userId}?tab=transactions`,
      title: t.description,
      detail: `${t.amount.toFixed(2)} · ${t.category ?? "uncategorized"} · ${new Date(t.date).toLocaleDateString()}`,
      clientName: clientMap.get(t.userId),
    });
  }
  for (const r of reports) {
    results.push({
      kind: "report",
      href: `/firm/${r.userId}?tab=reports`,
      title: `${new Date(r.year, r.month - 1).toLocaleString("en-US", { month: "long", year: "numeric" })} report`,
      detail: `${r.status.toLowerCase()} · net ${r.netProfit.toFixed(0)}`,
      clientName: clientMap.get(r.userId),
    });
  }
  for (const a of anomalies) {
    results.push({
      kind: "anomaly",
      href: `/firm/${a.userId}?tab=anomalies`,
      title: a.reason,
      detail: `${a.severity.toLowerCase()} severity`,
      clientName: clientMap.get(a.userId),
    });
  }

  return NextResponse.json({ results });
}
