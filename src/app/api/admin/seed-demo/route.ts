import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/admin/seed-demo
 *
 * Creates a realistic demo population so the 3-portal workflow can be seen working:
 *  - 2 demo accountants
 *  - 4 demo clients with companyName
 *  - 8 ClientServiceRequests at every status (OPEN, ALLOCATED, IN_PROGRESS, COMPLETED)
 *  - ManagedClient links between accountants and clients
 *  - A couple of monthly reports per client
 *  - Some unread messages
 *  - A DocumentRequest with pending items
 *
 * Idempotent — only creates demo accounts/data that don't already exist.
 * Admin-only.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const password = await bcrypt.hash("demo1234", 12);
  const created: Record<string, number> = {
    accountants: 0, clients: 0, requests: 0, reports: 0, messages: 0, docRequests: 0,
  };

  // ── Accountants ──
  const accountantSpecs = [
    { email: "sarah.kim@ledgr.demo", name: "Sarah Kim", companyName: "Kim CPA Services" },
    { email: "marcus.taylor@ledgr.demo", name: "Marcus Taylor", companyName: "Taylor & Co" },
  ];
  const accountants: { id: string; name: string }[] = [];
  for (const a of accountantSpecs) {
    const existing = await prisma.user.findUnique({ where: { email: a.email } });
    if (existing) {
      accountants.push({ id: existing.id, name: existing.name ?? "" });
      continue;
    }
    const u = await prisma.user.create({
      data: {
        email: a.email, name: a.name, companyName: a.companyName,
        password, role: "ACCOUNTANT", emailVerified: true,
      },
    });
    accountants.push({ id: u.id, name: u.name ?? "" });
    created.accountants++;
  }

  // ── Clients ──
  const clientSpecs = [
    { email: "founder@acmetech.demo", name: "Alex Chen", companyName: "Acme Tech", plan: "GROWTH" },
    { email: "ops@brightretail.demo", name: "Priya Patel", companyName: "Bright Retail Co", plan: "STARTER" },
    { email: "ceo@mavenagency.demo", name: "Jordan Lee", companyName: "Maven Agency", plan: "CFO" },
    { email: "hello@greeneats.demo", name: "Sam Rivera", companyName: "Green Eats", plan: "STARTER" },
  ];
  const clients: { id: string; name: string; companyName: string }[] = [];
  for (const c of clientSpecs) {
    let user = await prisma.user.findUnique({ where: { email: c.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: c.email, name: c.name, companyName: c.companyName,
          password, role: "CLIENT", emailVerified: true,
          subscription: { create: { plan: c.plan, status: "ACTIVE" } },
        },
      });
      created.clients++;
    }
    clients.push({ id: user.id, name: user.name ?? "", companyName: user.companyName ?? "" });
  }

  // ── Allocations: assign first 2 clients to accountant 1, next 2 to accountant 2 ──
  for (let i = 0; i < clients.length; i++) {
    const accountantIdx = i < 2 ? 0 : 1;
    await prisma.managedClient.upsert({
      where: { accountantId_clientId: { accountantId: accountants[accountantIdx].id, clientId: clients[i].id } },
      update: { isActive: true },
      create: { accountantId: accountants[accountantIdx].id, clientId: clients[i].id, isActive: true },
    });
  }

  // ── Service requests (one per status to show the full pipeline) ──
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const requestSpecs = [
    {
      client: 0, status: "OPEN", urgency: "HIGH", category: "TAX_PREP",
      title: "Prepare Q1 federal estimated tax",
      description: "Need Q1 estimate before April 15. Send me both calc + form.",
      createdDaysAgo: 1,
    },
    {
      client: 1, status: "OPEN", urgency: "MED", category: "BOARD_PACKAGE",
      title: "Build board package for April meeting",
      description: "Investors want MRR + cohort + runway slides. Use last 6mo data.",
      createdDaysAgo: 2,
    },
    {
      client: 0, status: "ALLOCATED", urgency: "MED", category: "AUDIT",
      title: "Year-end audit prep — pull supporting docs",
      description: "Big-4 auditor wants invoices + bank confirms for FY2025.",
      createdDaysAgo: 4, allocatedTo: 0,
    },
    {
      client: 2, status: "ALLOCATED", urgency: "HIGH", category: "LOAN_DOCS",
      title: "Loan application — package financials",
      description: "Bank needs P&L, BS, and projections. Due Friday.",
      createdDaysAgo: 3, allocatedTo: 1,
    },
    {
      client: 1, status: "IN_PROGRESS", urgency: "MED", category: "TAX_PREP",
      title: "Sales tax return Q4",
      description: "California CDTFA, due Jan 31.",
      createdDaysAgo: 7, allocatedTo: 0, started: true,
    },
    {
      client: 3, status: "COMPLETED", urgency: "LOW", category: "OTHER",
      title: "Catch-up bookkeeping for Sept-Nov",
      description: "Three months behind. Get books current.",
      createdDaysAgo: 14, allocatedTo: 1,
      completed: true,
      deliverableNote: "All caught up. P&L for each month attached. Question on the Nov vendor charges — left a note in the file.",
    },
    {
      client: 2, status: "COMPLETED", urgency: "MED", category: "BOARD_PACKAGE",
      title: "March board pack",
      description: "Quarterly board deck financial section.",
      createdDaysAgo: 10, allocatedTo: 1,
      completed: true,
      deliverableNote: "Board pack ready. Runway extended to 18mo on new burn. Key slides marked.",
    },
    {
      client: 0, status: "COMPLETED", urgency: "HIGH", category: "TAX_PREP",
      title: "Prior year amended return",
      description: "Missed a credit on the 2024 return. Need amendment.",
      createdDaysAgo: 21, allocatedTo: 0,
      completed: true,
      deliverableNote: "1040X filed. Refund expected in 8-12 weeks. Copy attached.",
    },
  ];

  for (const r of requestSpecs) {
    const existing = await prisma.clientServiceRequest.findFirst({
      where: { clientId: clients[r.client].id, title: r.title },
    });
    if (existing) continue;

    const createdAt = new Date(now - r.createdDaysAgo * day);
    const allocatedAt = r.allocatedTo !== undefined ? new Date(createdAt.getTime() + day) : null;
    const startedAt = r.started ? new Date(createdAt.getTime() + 2 * day) : null;
    const completedAt = r.completed ? new Date(now - day) : null;

    await prisma.clientServiceRequest.create({
      data: {
        clientId: clients[r.client].id,
        title: r.title,
        description: r.description,
        category: r.category,
        urgency: r.urgency,
        status: r.status,
        createdAt,
        assignedToId: r.allocatedTo !== undefined ? accountants[r.allocatedTo].id : null,
        allocatedAt, startedAt, completedAt,
        deliverableNote: r.completed ? r.deliverableNote : null,
        deliverableType: r.completed ? "report" : null,
      },
    });
    created.requests++;

    // For COMPLETED requests, also send a completion message
    if (r.completed) {
      await prisma.message.create({
        data: {
          userId: clients[r.client].id,
          role: "ACCOUNTANT",
          body: `✓ Completed: ${r.title}\n\n${r.deliverableNote}`,
          createdAt: completedAt!,
        },
      });
      created.messages++;
    }
  }

  // ── A monthly report per client to make My Books non-empty ──
  // eslint-disable-next-line react-hooks/purity
  const nowDate = new Date();
  const prevMonth = nowDate.getMonth() === 0 ? 12 : nowDate.getMonth();
  const prevYear = nowDate.getMonth() === 0 ? nowDate.getFullYear() - 1 : nowDate.getFullYear();
  for (const c of clients) {
    const existing = await prisma.report.findFirst({
      where: { userId: c.id, month: prevMonth, year: prevYear },
    });
    if (existing) continue;
    const revenue = Math.round(20000 + Math.random() * 50000);
    const expenses = Math.round(revenue * (0.4 + Math.random() * 0.4));
    await prisma.report.create({
      data: {
        userId: c.id,
        month: prevMonth, year: prevYear,
        totalIncome: revenue,
        totalExpenses: expenses,
        netProfit: revenue - expenses,
        status: "SENT",
        sentAt: new Date(now - 3 * day),
        clientApprovalToken: `demo-${c.id}-${prevMonth}`,
        aiSummary: `Solid month. Revenue ${revenue.toLocaleString()}, expenses ${expenses.toLocaleString()}, net profit ${(revenue - expenses).toLocaleString()}. Top categories: SaaS (15%), Marketing (12%), Salaries (40%). No anomalies flagged.`,
      },
    });
    created.reports++;
  }

  // ── Document request with pending items for one client ──
  const drlExists = await prisma.documentRequest.findFirst({
    where: { clientId: clients[0].id, title: "March receipts + Stripe statements" },
  });
  if (!drlExists) {
    await prisma.documentRequest.create({
      data: {
        clientId: clients[0].id,
        requesterId: accountants[0].id,
        title: "March receipts + Stripe statements",
        description: "Need these before we close March.",
        itemsJson: JSON.stringify([
          { label: "March 2026 bank statement", status: "submitted" },
          { label: "Stripe payouts CSV (March)", status: "pending" },
          { label: "Receipts over $500 from March", status: "pending" },
          { label: "AWS invoice (March)", status: "approved" },
        ]),
        status: "PARTIAL",
        dueAt: new Date(now + 5 * day),
      },
    });
    created.docRequests++;
  }

  // ── A couple of unread messages from accountant to client ──
  const msgsToCreate = [
    { client: 0, body: "Hey Alex — saw a weird $4,200 charge from 'UNKNOWN VENDOR' on the 14th. Can you confirm what this was for?" },
    { client: 1, body: "Hi Priya, Q1 books look clean. One question on the merchant fees — they almost doubled in March. Anything change with your payment processor?" },
  ];
  for (const m of msgsToCreate) {
    const exists = await prisma.message.findFirst({
      where: { userId: clients[m.client].id, body: { startsWith: m.body.slice(0, 30) }, role: "ACCOUNTANT" },
    });
    if (exists) continue;
    await prisma.message.create({
      data: {
        userId: clients[m.client].id,
        role: "ACCOUNTANT",
        body: m.body,
      },
    });
    created.messages++;
  }

  return NextResponse.json({
    success: true,
    created,
    credentials: {
      password: "demo1234",
      accountants: accountantSpecs.map((a) => a.email),
      clients: clientSpecs.map((c) => c.email),
    },
  });
}
