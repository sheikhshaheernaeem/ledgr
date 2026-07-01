"use client";

import { useState, useEffect, use, useMemo, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft, AlertTriangle, Building2, Upload, CheckCircle2, Clock,
  Send, Edit3, X, Sparkles, FileText, Hash, Mail, Pencil,
  BookOpen, GitMerge, Lock, Wand2, FileCheck,
} from "lucide-react";

/* ── types ── */
interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  category: string | null;
  subcategory: string | null;
  status: string;
  confidence: number | null;
  notes: string | null;
  reconciled: boolean;
}
interface Statement {
  id: string; filename: string; rowCount: number; status: string;
  periodStart: string | null; periodEnd: string | null; createdAt: string; errorMsg: string | null;
}
interface Report {
  id: string; month: number; year: number;
  totalIncome: number; totalExpenses: number; netProfit: number;
  status: string; aiSummary: string | null;
  draftedAt: string | null;
  accountantApprovedAt: string | null;
  accountantApprovedById: string | null;
  clientApprovedAt: string | null;
  sentAt: string | null;
  createdAt: string;
}
interface Anomaly {
  id: string; transactionId: string | null; entityType: string; entityId: string;
  reason: string; severity: string; riskScore: number; createdAt: string;
}
interface Message {
  id: string; body: string; role: string; readAt: string | null;
  createdAt: string; reportId: string | null; transactionId: string | null;
}
interface ClientData {
  client: { id: string; name: string | null; email: string; companyName: string | null; createdAt: string };
  summary: {
    thisMonth: { revenue: number; expenses: number; netProfit: number; transactionCount: number };
    invoices: { open: number; overdue: number; openAmount: number };
    lastReport: Report | null;
    pendingApprovalCount: number;
    anomalyCount: number;
    uncategorizedCount: number;
    unreadMessages: number;
  };
  statements: Statement[];
  transactions: Transaction[];
  categoryBreakdown: { category: string; amount: number }[];
  reports: Report[];
  anomalies: Anomaly[];
  messages: Message[];
}

const CATEGORIES = [
  "Revenue", "Sales", "Refunds",
  "Cost of Goods Sold", "Salaries & Wages", "Contractors",
  "Rent", "Utilities", "Software & SaaS", "Marketing", "Advertising",
  "Travel", "Meals", "Office Supplies", "Insurance", "Legal & Professional",
  "Bank Fees", "Interest", "Taxes", "Equipment", "Repairs",
  "Other Income", "Other Expense", "Uncategorized",
];

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtD = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const monthName = (m: number, y: number) => new Date(y, m - 1).toLocaleString("en-US", { month: "long", year: "numeric" });

const severityBadge: Record<string, string> = {
  HIGH: "border-rose-500/40 bg-rose-500/10 text-rose-400",
  MEDIUM: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  LOW: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
};

const reportStatusBadge: Record<string, string> = {
  DRAFT: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  ACCOUNTANT_APPROVED: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
  SENT: "border-violet-500/40 bg-violet-500/10 text-violet-400",
  REVIEWED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  APPROVED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
};

type Tab = "overview" | "transactions" | "anomalies" | "reports" | "statements" | "notes" | "internal" | "time";

interface FirmNote {
  id: string;
  authorId: string;
  clientId: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FirmTimeEntry {
  id: string;
  operatorId: string;
  clientId: string;
  description: string | null;
  category: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
  billableRate: number | null;
  billable: boolean;
  invoiced: boolean;
}

export default function ClientWorkspacePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [approveReport, setApproveReport] = useState<Report | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [sendingToClient, setSendingToClient] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/managed-clients/${clientId}`);
      if (!res.ok) {
        if (res.status === 404) toast.error("Client not found or access revoked");
        else throw new Error();
        return;
      }
      setData(await res.json());
    } catch {
      toast.error("Failed to load client data");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function updateTxCategory(txId: string, category: string) {
    try {
      const res = await fetch(`/api/transactions/${txId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, status: "APPROVED" }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Category updated → ${category}`);
      setEditingTxId(null);
      load();
    } catch {
      toast.error("Failed to update category");
    }
  }

  async function dismissAnomaly(anomalyId: string) {
    try {
      const res = await fetch(`/api/anomaly-flags/${anomalyId}/dismiss`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Anomaly dismissed");
      load();
    } catch {
      toast.error("Failed to dismiss anomaly");
    }
  }

  async function approveAndSend(report: Report, sendToClient: boolean) {
    setSendingToClient(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/accountant-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendToClient,
          revisionNotes: revisionNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to approve");
      }
      toast.success(sendToClient ? "Report approved and sent to client" : "Report approved");
      setApproveReport(null);
      setRevisionNotes("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setSendingToClient(false);
    }
  }

  if (loading) return (
    <div className="p-12 text-center text-sm text-muted-foreground font-mono">
      <Clock className="h-5 w-5 animate-spin mx-auto mb-3" />
      loading client workspace…
    </div>
  );
  if (!data) return (
    <div className="p-8 space-y-4 max-w-6xl mx-auto">
      <Link href="/firm" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> back to clients
      </Link>
      <p className="text-muted-foreground">Client not found or you no longer have access.</p>
    </div>
  );

  const { client, summary, statements, transactions, reports, anomalies } = data;
  const displayName = client.companyName || client.name || client.email;
  const totalRevenue = transactions.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
  const actionsNeeded = summary.pendingApprovalCount + summary.anomalyCount + summary.uncategorizedCount;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* breadcrumb */}
        <Link href="/firm" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono">
          <ArrowLeft className="h-3 w-3" /> firm / clients / <span className="text-foreground">{displayName.toLowerCase()}</span>
        </Link>

        {/* header */}
        <div className="flex items-start justify-between gap-4 flex-wrap border-b border-border/60 pb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg border border-border bg-card flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-3 font-mono">
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>
                <span>·</span>
                <span>since {fmtDate(client.createdAt)}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <MonoBadge>
              <Hash className="h-3 w-3" />{transactions.length} txns
            </MonoBadge>
            <MonoBadge>
              <Upload className="h-3 w-3" />{statements.length} uploads
            </MonoBadge>
            <MonoBadge>
              <FileText className="h-3 w-3" />{reports.length} reports
            </MonoBadge>
          </div>
        </div>

        {/* Per-client tools row */}
        <div className="flex flex-wrap gap-2">
          <ToolLink href={`/firm/${clientId}/journal`} icon={BookOpen} label="Journal entries" />
          <ToolLink href={`/firm/${clientId}/reconcile`} icon={GitMerge} label="Reconcile" />
          <ToolLink href={`/firm/${clientId}/year-end`} icon={Lock} label="Year-end" />
          <ToolLink href={`/firm/${clientId}/bulk-categorize`} icon={Wand2} label="Bulk categorize" />
          <ToolLink href={`/firm/${clientId}/doc-requests`} icon={FileCheck} label="Doc requests" />
        </div>

        {/* Action banner */}
        {actionsNeeded > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {actionsNeeded} action{actionsNeeded > 1 ? "s" : ""} need your attention
              </p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs font-mono">
                {summary.pendingApprovalCount > 0 && (
                  <button onClick={() => setTab("reports")} className="text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline">
                    → {summary.pendingApprovalCount} report{summary.pendingApprovalCount > 1 ? "s" : ""} awaiting your approval
                  </button>
                )}
                {summary.anomalyCount > 0 && (
                  <button onClick={() => setTab("anomalies")} className="text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline">
                    → {summary.anomalyCount} anomal{summary.anomalyCount > 1 ? "ies" : "y"} to review
                  </button>
                )}
                {summary.uncategorizedCount > 0 && (
                  <button onClick={() => setTab("transactions")} className="text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline">
                    → {summary.uncategorizedCount} uncategorized txn{summary.uncategorizedCount > 1 ? "s" : ""}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
          <Kpi label="revenue_mtd" value={fmt(summary.thisMonth.revenue)} color="text-emerald-400" sub={`${summary.thisMonth.transactionCount} txns`} />
          <Kpi label="expenses_mtd" value={fmt(summary.thisMonth.expenses)} color="text-rose-400" />
          <Kpi
            label="net_mtd"
            value={fmt(Math.abs(summary.thisMonth.netProfit))}
            color={summary.thisMonth.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}
            sub={summary.thisMonth.netProfit >= 0 ? "profit" : "loss"}
          />
          <Kpi
            label="open_invoices"
            value={summary.invoices.open.toString()}
            color="text-foreground"
            sub={summary.invoices.overdue > 0 ? `${summary.invoices.overdue} overdue` : "all current"}
          />
        </div>

        {/* tabs */}
        <div className="border-b border-border/60 flex gap-1 -mb-px overflow-x-auto">
          <TabBtn label="overview" active={tab === "overview"} onClick={() => setTab("overview")} />
          <TabBtn label={`transactions (${transactions.length})`} active={tab === "transactions"} onClick={() => setTab("transactions")} />
          <TabBtn label={`anomalies (${anomalies.length})`} active={tab === "anomalies"} onClick={() => setTab("anomalies")} badge={anomalies.length > 0} />
          <TabBtn label={`reports (${reports.length})`} active={tab === "reports"} onClick={() => setTab("reports")} badge={summary.pendingApprovalCount > 0} />
          <TabBtn label={`statements (${statements.length})`} active={tab === "statements"} onClick={() => setTab("statements")} />
          <TabBtn label="client thread" active={tab === "notes"} onClick={() => setTab("notes")} />
          <TabBtn label="internal" active={tab === "internal"} onClick={() => setTab("internal")} />
          <TabBtn label="time" active={tab === "time"} onClick={() => setTab("time")} />
        </div>

        {/* tab content */}
        <div className="pt-2">
          {tab === "overview" && (
            <OverviewTab data={data} totalRevenue={totalRevenue} totalExpenses={totalExpenses} onGoTab={setTab} />
          )}
          {tab === "transactions" && (
            <TransactionsTab
              transactions={transactions}
              editingTxId={editingTxId}
              onStartEdit={setEditingTxId}
              onSaveCategory={updateTxCategory}
            />
          )}
          {tab === "anomalies" && (
            <AnomaliesTab anomalies={anomalies} txns={transactions} onDismiss={dismissAnomaly} clientId={clientId} onScan={load} />
          )}
          {tab === "reports" && (
            <ReportsTab reports={reports} onApprove={(r) => setApproveReport(r)} />
          )}
          {tab === "statements" && (
            <StatementsTab statements={statements} />
          )}
          {tab === "notes" && (
            <NotesTab messages={data.messages} clientId={clientId} onSent={load} />
          )}
          {tab === "internal" && (
            <InternalNotesTab clientId={clientId} />
          )}
          {tab === "time" && (
            <TimeTab clientId={clientId} />
          )}
        </div>
      </div>

      {/* Approve report dialog */}
      <Dialog open={!!approveReport} onOpenChange={(open) => { if (!open) { setApproveReport(null); setRevisionNotes(""); } }}>
        <DialogContent>
          {approveReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Approve {monthName(approveReport.month, approveReport.year)} report
                </DialogTitle>
                <DialogDescription>
                  Your sign-off marks this report as accountant-reviewed. You can save it as approved internally, or approve and send to the client.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase">revenue</p>
                    <p className="font-semibold text-emerald-400">{fmtD(approveReport.totalIncome)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase">expenses</p>
                    <p className="font-semibold text-rose-400">{fmtD(approveReport.totalExpenses)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase">net</p>
                    <p className={`font-semibold ${approveReport.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {fmtD(approveReport.netProfit)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">
                    Note for the client <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Textarea
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    placeholder="e.g. Q1 looking solid — runway extended to ~14 months. Flagged 2 vendor charges to review."
                    className="text-sm font-normal"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => approveAndSend(approveReport, false)} disabled={sendingToClient}>
                  Approve only
                </Button>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
                  onClick={() => approveAndSend(approveReport, true)}
                  disabled={sendingToClient}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {sendingToClient ? "Sending..." : "Approve & send to client"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── subcomponents ── */

function ToolLink({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider border border-border bg-card/60 hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] hover:text-emerald-400 text-muted-foreground px-2.5 py-1.5 rounded-md transition-colors"
    >
      <Icon className="h-3 w-3" />{label}
    </Link>
  );
}

function MonoBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider border border-border bg-card/60 text-muted-foreground px-2 py-1 rounded-md">
      {children}
    </span>
  );
}

function Kpi({ label, value, color = "text-foreground", sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="font-mono text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function TabBtn({ label, active, onClick, badge }: { label: string; active: boolean; onClick: () => void; badge?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
        active
          ? "border-emerald-400 text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {badge && (
        <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
      )}
    </button>
  );
}

/* Overview tab — action items + summary */
function OverviewTab({
  data, totalRevenue, totalExpenses, onGoTab,
}: {
  data: ClientData; totalRevenue: number; totalExpenses: number; onGoTab: (t: Tab) => void;
}) {
  const recentTxns = data.transactions.slice(0, 5);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Action queue */}
      <div className="lg:col-span-2 space-y-4">
        <Card title="action_queue">
          {data.summary.pendingApprovalCount === 0 && data.summary.anomalyCount === 0 && data.summary.uncategorizedCount === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
              <p className="text-sm font-medium text-foreground">All clear</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">no pending actions for this client</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {data.summary.pendingApprovalCount > 0 && (
                <ActionRow
                  icon={FileText}
                  label={`${data.summary.pendingApprovalCount} report${data.summary.pendingApprovalCount > 1 ? "s" : ""} awaiting your approval`}
                  sub="Review the AI-drafted P&L and approve before sending to the client"
                  onClick={() => onGoTab("reports")}
                />
              )}
              {data.summary.anomalyCount > 0 && (
                <ActionRow
                  icon={AlertTriangle}
                  label={`${data.summary.anomalyCount} anomaly flag${data.summary.anomalyCount > 1 ? "s" : ""}`}
                  sub="Unusual transactions, duplicates, or large variances flagged for your attention"
                  onClick={() => onGoTab("anomalies")}
                />
              )}
              {data.summary.uncategorizedCount > 0 && (
                <ActionRow
                  icon={Edit3}
                  label={`${data.summary.uncategorizedCount} uncategorized transaction${data.summary.uncategorizedCount > 1 ? "s" : ""}`}
                  sub="Recent uploads that haven't been categorized — categorize before month-end close"
                  onClick={() => onGoTab("transactions")}
                />
              )}
            </ul>
          )}
        </Card>

        <Card title="recent_activity">
          {recentTxns.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {recentTxns.map((tx) => (
                <li key={tx.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                  <div className="font-mono text-[11px] text-muted-foreground w-16 shrink-0">
                    {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{tx.description}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{tx.category ?? "uncategorized"}</p>
                  </div>
                  <div className={`font-mono text-sm font-medium ${tx.type === "CREDIT" ? "text-emerald-400" : "text-rose-400"}`}>
                    {tx.type === "CREDIT" ? "+" : "-"}{fmtD(tx.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* P&L panel */}
      <div className="space-y-4">
        <Card title="pl_all_time">
          <div className="p-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">revenue</span><span className="font-mono text-emerald-400">{fmtD(totalRevenue)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">expenses</span><span className="font-mono text-rose-400">{fmtD(totalExpenses)}</span></div>
            <div className="border-t border-border/60 pt-3 flex justify-between font-semibold">
              <span>net</span>
              <span className={`font-mono ${totalRevenue - totalExpenses >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {totalRevenue - totalExpenses >= 0 ? "+" : ""}{fmtD(totalRevenue - totalExpenses)}
              </span>
            </div>
          </div>
        </Card>
        <Card title="expense_categories">
          {data.categoryBreakdown.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No expenses yet.</p>
          ) : (
            <ul className="p-3 space-y-2">
              {data.categoryBreakdown.slice(0, 6).map(({ category, amount }) => {
                const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                return (
                  <li key={category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="truncate">{category}</span>
                      <span className="font-mono text-muted-foreground">{fmt(amount)}</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/60 bg-card/60">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      {children}
    </div>
  );
}

function ActionRow({ icon: Icon, label, sub, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; sub: string; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} className="w-full px-4 py-3 hover:bg-card/60 text-left flex items-start gap-3 transition-colors">
        <div className="w-8 h-8 rounded-md border border-border bg-background flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-amber-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        </div>
        <span className="text-xs text-muted-foreground font-mono mt-1">→</span>
      </button>
    </li>
  );
}

/* Transactions tab with inline category edit */
function TransactionsTab({
  transactions, editingTxId, onStartEdit, onSaveCategory,
}: {
  transactions: Transaction[];
  editingTxId: string | null;
  onStartEdit: (id: string | null) => void;
  onSaveCategory: (id: string, category: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "uncategorized" | "credits" | "debits">("all");
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter === "uncategorized" && t.category && t.category !== "Uncategorized") return false;
      if (filter === "credits" && t.type !== "CREDIT") return false;
      if (filter === "debits" && t.type !== "DEBIT") return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [transactions, search, filter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-9 text-sm"
        />
        <div className="flex gap-1 text-xs font-mono">
          {(["all", "uncategorized", "credits", "debits"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1.5 rounded-md border transition-colors ${
                filter === f ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground font-mono">{filtered.length} of {transactions.length}</span>
      </div>

      <div className="rounded-lg border border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 border-b border-border/60">
            <tr className="text-left">
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">date</th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">description</th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">category</th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right">amount</th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">conf.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.map((tx) => (
              <tr key={tx.id} className="hover:bg-card/30">
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                  {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
                <td className="px-3 py-2 max-w-[280px]">
                  <p className="truncate text-foreground">{tx.description}</p>
                  {tx.subcategory && <p className="text-[11px] text-muted-foreground font-mono">{tx.subcategory}</p>}
                </td>
                <td className="px-3 py-2 min-w-[180px]">
                  {editingTxId === tx.id ? (
                    <div className="flex items-center gap-1">
                      <select
                        defaultValue={tx.category ?? "Uncategorized"}
                        onChange={(e) => onSaveCategory(tx.id, e.target.value)}
                        className="text-xs border border-emerald-500/40 bg-card rounded px-2 py-1 font-mono flex-1"
                        autoFocus
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <button onClick={() => onStartEdit(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onStartEdit(tx.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded border border-border bg-background hover:border-emerald-500/40 hover:text-emerald-400 transition-colors group"
                    >
                      {tx.category ?? "uncategorized"}
                      <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100" />
                    </button>
                  )}
                </td>
                <td className={`px-3 py-2 text-right font-mono text-sm ${tx.type === "CREDIT" ? "text-emerald-400" : "text-rose-400"}`}>
                  {tx.type === "CREDIT" ? "+" : "-"}{fmtD(tx.amount)}
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                  {tx.confidence != null ? `${(tx.confidence * 100).toFixed(0)}%` : "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-sm text-muted-foreground">No transactions match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* Anomalies tab */
function AnomaliesTab({ anomalies, txns, onDismiss, clientId, onScan }: {
  anomalies: Anomaly[]; txns: Transaction[]; onDismiss: (id: string) => void;
  clientId: string; onScan: () => void;
}) {
  const [scanning, setScanning] = useState(false);

  async function runScan() {
    setScanning(true);
    try {
      const res = await fetch("/api/ai/anomaly-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: clientId }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`Scanned ${data.scanned} txns — flagged ${data.flagged} new`);
      onScan();
    } catch {
      toast.error("Anomaly scan failed");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-muted-foreground">
          {anomalies.length} active flag{anomalies.length !== 1 ? "s" : ""} · scans last 90 days
        </p>
        <Button size="sm" onClick={runScan} disabled={scanning} variant="outline">
          {scanning ? <><Clock className="h-3.5 w-3.5 mr-1.5 animate-spin" />scanning...</> : <><Sparkles className="h-3.5 w-3.5 mr-1.5" />run scan</>}
        </Button>
      </div>

      {anomalies.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border/60 bg-card/40">
          <CheckCircle2 className="h-10 w-10 text-emerald-400/60 mx-auto mb-3" />
          <p className="font-medium text-foreground">No anomalies flagged</p>
          <p className="text-sm text-muted-foreground mt-1">Click &quot;run scan&quot; to check for duplicates, unusual amounts, and fraud signals.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {anomalies.map((a) => {
            const tx = a.transactionId ? txns.find((t) => t.id === a.transactionId) : null;
            return (
              <li key={a.id} className="rounded-lg border border-border/60 bg-card/40 p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-md border border-border bg-background flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${severityBadge[a.severity] ?? severityBadge.MEDIUM}`}>
                      {a.severity}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      risk_score: {(a.riskScore * 100).toFixed(0)}%
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">·</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{fmtDate(a.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground">{a.reason}</p>
                  {tx && (
                    <div className="mt-2 text-xs font-mono text-muted-foreground bg-background border border-border/60 rounded px-2 py-1.5">
                      <span className="text-foreground">{tx.description}</span> · {fmtDate(tx.date)} · <span className={tx.type === "CREDIT" ? "text-emerald-400" : "text-rose-400"}>{fmtD(tx.amount)}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onDismiss(a.id)}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground border border-border bg-background hover:border-foreground/40 rounded px-2.5 py-1.5 shrink-0"
                >
                  dismiss
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* Reports tab with approve button */
function ReportsTab({ reports, onApprove }: { reports: Report[]; onApprove: (r: Report) => void }) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-16 rounded-lg border border-border/60 bg-card/40">
        <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="font-medium text-foreground">No reports yet</p>
        <p className="text-sm text-muted-foreground mt-1">Reports are auto-drafted on the 2nd of each month. You review before they go to the client.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {reports.map((r) => {
        const needsApproval = r.status === "DRAFT" && !r.accountantApprovedAt;
        return (
          <div key={r.id} className="rounded-lg border border-border/60 bg-card/40 p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-semibold text-foreground">{monthName(r.month, r.year)}</h3>
                  <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${reportStatusBadge[r.status] ?? "border-border text-muted-foreground"}`}>
                    {r.status.toLowerCase().replace(/_/g, " ")}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-x-4 text-sm font-mono mt-2">
                  <span><span className="text-muted-foreground">revenue:</span> <span className="text-emerald-400">{fmtD(r.totalIncome)}</span></span>
                  <span><span className="text-muted-foreground">expenses:</span> <span className="text-rose-400">{fmtD(r.totalExpenses)}</span></span>
                  <span><span className="text-muted-foreground">net:</span> <span className={r.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>{fmtD(r.netProfit)}</span></span>
                </div>
                <div className="flex gap-3 mt-2 text-[11px] font-mono text-muted-foreground flex-wrap">
                  {r.draftedAt && <span>drafted: {fmtDate(r.draftedAt)}</span>}
                  {r.accountantApprovedAt && <span>approved: {fmtDate(r.accountantApprovedAt)}</span>}
                  {r.sentAt && <span>sent: {fmtDate(r.sentAt)}</span>}
                  {r.clientApprovedAt && <span className="text-emerald-400">client_approved: {fmtDate(r.clientApprovedAt)}</span>}
                </div>
              </div>
              {needsApproval && (
                <Button size="sm" onClick={() => onApprove(r)} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Approve
                </Button>
              )}
            </div>
            {r.aiSummary && (
              <details className="mt-3">
                <summary className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-foreground inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> ai_summary
                </summary>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed bg-background border border-border/60 rounded p-3">{r.aiSummary}</p>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* Statements tab */
function StatementsTab({ statements }: { statements: Statement[] }) {
  if (statements.length === 0) {
    return (
      <div className="text-center py-16 rounded-lg border border-border/60 bg-card/40">
        <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="font-medium text-foreground">No uploads yet</p>
        <p className="text-sm text-muted-foreground mt-1">Client will upload bank statement CSVs from their portal.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-card/60 border-b border-border/60">
          <tr className="text-left">
            <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">file</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">period</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-center">rows</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">status</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">uploaded</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {statements.map((s) => (
            <tr key={s.id} className="hover:bg-card/30">
              <td className="px-3 py-2 font-mono text-xs">{s.filename}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground font-mono">
                {s.periodStart && s.periodEnd ? `${fmtDate(s.periodStart)} – ${fmtDate(s.periodEnd)}` : "—"}
              </td>
              <td className="px-3 py-2 text-center font-mono text-xs">{s.rowCount}</td>
              <td className="px-3 py-2">
                <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                  s.status === "CATEGORIZED" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : s.status === "ERROR" ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-400"
                }`}>
                  {s.status.toLowerCase()}
                </span>
                {s.errorMsg && <p className="text-[10px] text-rose-400 mt-0.5 max-w-[200px] truncate">{s.errorMsg}</p>}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{fmtDate(s.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Notes / messages tab */
function NotesTab({ messages, clientId, onSent }: { messages: Message[]; clientId: string; onSent: () => void }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: clientId, body: body.trim(), role: "ACCOUNTANT" }),
      });
      if (!res.ok) throw new Error();
      setBody("");
      toast.success("Note sent");
      onSent();
    } catch {
      toast.error("Failed to send note");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <Card title="message_thread">
          {messages.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">No messages yet. Start the conversation below.</p>
          ) : (
            <ul className="p-3 space-y-3 max-h-[500px] overflow-y-auto">
              {[...messages].reverse().map((m) => (
                <li key={m.id} className={`flex ${m.role === "ACCOUNTANT" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    m.role === "ACCOUNTANT" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-card border border-border"
                  }`}>
                    <p>{m.body}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1">
                      {m.role.toLowerCase()} · {fmtDate(m.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="compose">
          <div className="p-3 space-y-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Note to client about their books..."
              rows={3}
              className="text-sm"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={send} disabled={sending || !body.trim()} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {sending ? "sending..." : "send"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
      <Card title="info">
        <div className="p-4 text-xs text-muted-foreground space-y-2">
          <p>Notes sent here go directly to the client&apos;s portal. They&apos;ll see them as messages from their accountant.</p>
          <p>Use this for: requesting more docs, explaining categorizations, flagging issues to address before close.</p>
        </div>
      </Card>
    </div>
  );
}

/* ── Internal Notes (firm-only, hidden from client) ── */
function InternalNotesTab({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<FirmNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/firm/notes?clientId=${clientId}`);
      if (res.ok) setNotes(await res.json());
    } finally { setLoading(false); }
  }, [clientId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function add() {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/firm/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, body: body.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Note saved");
      setBody("");
      load();
    } catch { toast.error("Failed to save note"); }
    finally { setSaving(false); }
  }

  async function togglePin(n: FirmNote) {
    await fetch(`/api/firm/notes/${n.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !n.pinned }),
    });
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete this note?")) return;
    await fetch(`/api/firm/notes/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <Card title="firm_only_notes">
          <div className="p-3 space-y-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Internal note — NOT visible to the client..."
              rows={3}
              className="text-sm"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={add} disabled={saving || !body.trim()} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                {saving ? "saving..." : "save note"}
              </Button>
            </div>
          </div>
        </Card>
        {loading ? (
          <div className="text-center py-6 text-sm text-muted-foreground"><Clock className="h-4 w-4 animate-spin mx-auto" /></div>
        ) : notes.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground rounded-lg border border-border/60 bg-card/40">
            No internal notes yet. Use these for: client quirks, history, who to call for what, things to remember.
          </div>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className={`rounded-lg border p-3 ${n.pinned ? "border-amber-500/30 bg-amber-500/[0.05]" : "border-border/60 bg-card/40"}`}>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{n.body}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {n.pinned && "📌 "}{fmtDate(n.createdAt)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => togglePin(n)} className="text-xs font-mono text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-card">
                      {n.pinned ? "unpin" : "pin"}
                    </button>
                    <button onClick={() => del(n.id)} className="text-xs font-mono text-muted-foreground hover:text-rose-400 px-2 py-1 rounded hover:bg-card">
                      delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Card title="info">
        <div className="p-4 text-xs text-muted-foreground space-y-2">
          <p><strong className="text-foreground">Firm-only.</strong> These notes are NEVER visible to the client.</p>
          <p>Use for: quirks, history, follow-up reminders, internal status. Pin important ones to the top.</p>
        </div>
      </Card>
    </div>
  );
}

/* ── Time Tracking ── */
function TimeTab({ clientId }: { clientId: string }) {
  const [entries, setEntries] = useState<FirmTimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<FirmTimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("BOOKKEEPING");
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/firm/time?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
        setActiveTimer(data.activeTimer ?? null);
      }
    } finally { setLoading(false); }
  }, [clientId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function startTimer() {
    setRunning(true);
    try {
      const res = await fetch("/api/firm/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, description: description || undefined, category }),
      });
      if (!res.ok) throw new Error();
      toast.success("Timer started");
      setDescription("");
      load();
    } catch { toast.error("Failed to start timer"); }
    finally { setRunning(false); }
  }

  async function stopTimer(id: string) {
    setRunning(true);
    try {
      await fetch(`/api/firm/time/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stop: true }),
      });
      toast.success("Timer stopped");
      load();
    } finally { setRunning(false); }
  }

  async function del(id: string) {
    if (!confirm("Delete this entry?")) return;
    await fetch(`/api/firm/time/${id}`, { method: "DELETE" });
    load();
  }

  const totalSec = entries.reduce((s, e) => s + (e.durationSec ?? 0), 0);
  const billableSec = entries.filter((e) => e.billable).reduce((s, e) => s + (e.durationSec ?? 0), 0);

  function fmtDur(sec: number | null) {
    if (sec == null) return "—";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  }

  return (
    <div className="space-y-4">
      {/* Active timer or start widget */}
      {activeTimer ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.08] p-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Timer running</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                started {new Date(activeTimer.startedAt).toLocaleTimeString()} · {activeTimer.category?.toLowerCase() ?? "—"}
                {activeTimer.description && ` · ${activeTimer.description}`}
              </p>
            </div>
            <Button onClick={() => stopTimer(activeTimer.id)} disabled={running} className="bg-rose-500 hover:bg-rose-400 text-white font-semibold">
              Stop
            </Button>
          </div>
        </div>
      ) : (
        <Card title="start_a_timer">
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you working on?"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 border border-input bg-background rounded-md px-3 text-sm"
              >
                <option value="BOOKKEEPING">Bookkeeping</option>
                <option value="TAX">Tax prep</option>
                <option value="REPORTING">Reporting</option>
                <option value="MEETING">Meeting</option>
                <option value="ADMIN">Admin</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button onClick={startTimer} disabled={running} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                Start timer
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
        <div className="bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">total_time</p>
          <p className="text-xl font-bold text-foreground">{fmtDur(totalSec)}</p>
        </div>
        <div className="bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">billable</p>
          <p className="text-xl font-bold text-emerald-400">{fmtDur(billableSec)}</p>
        </div>
        <div className="bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">entries</p>
          <p className="text-xl font-bold text-foreground">{entries.length}</p>
        </div>
      </div>

      {/* Entries list */}
      {loading ? null : entries.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground rounded-lg border border-border/60 bg-card/40">
          No time logged for this client yet.
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card/60 border-b border-border/60">
              <tr className="text-left">
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">when</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">what</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">cat</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right">duration</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">billable</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-card/30">
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(e.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td className="px-3 py-2 text-sm">{e.description ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{e.category?.toLowerCase() ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-sm">{fmtDur(e.durationSec)}</td>
                  <td className="px-3 py-2">
                    {e.billable ? <span className="text-emerald-400 text-xs font-mono">✓</span> : <span className="text-muted-foreground text-xs font-mono">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => del(e.id)} className="text-muted-foreground hover:text-rose-400 text-xs">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
