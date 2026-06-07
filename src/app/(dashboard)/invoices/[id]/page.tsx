import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import InvoiceActions from "./InvoiceActions";
import RecordPayment from "./RecordPayment";
import Link from "next/link";
import { getUserLocale } from "@/lib/getUserLocale";

const statusStyle: Record<string, string> = {
  DRAFT: "border-zinc-500/30 text-zinc-400",
  SENT: "border-blue-500/30 text-blue-400",
  PAID: "border-emerald-500/30 text-emerald-400",
  OVERDUE: "border-red-500/30 text-red-400",
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const [inv, loc] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, userId: session.user.id as string },
      include: { lineItems: true },
    }),
    getUserLocale(session.user.id as string),
  ]);
  if (!inv) notFound();

  // Late fee calculation for overdue invoices
  const now = new Date();
  let lateFeeAmount: number | null = null;
  if (inv.status === "OVERDUE" && inv.lateFeePct > 0) {
    const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86_400_000);
    if (daysOverdue > 0) {
      const monthlyRate = inv.lateFeePct / 100;
      lateFeeAmount = inv.total * monthlyRate * (daysOverdue / 30);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{inv.invoiceNumber}</h1>
          <p className="text-muted-foreground mt-1">{inv.clientName}{inv.clientEmail && ` · ${inv.clientEmail}`}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`text-sm ${statusStyle[inv.status] ?? ""}`}>{inv.status}</Badge>
          <Link href={`/invoices/${inv.id}/print`} target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Printer className="h-3.5 w-3.5" /> Download PDF
            </Button>
          </Link>
          <InvoiceActions invoiceId={inv.id} status={inv.status} type={inv.type} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div><p className="text-muted-foreground">Issue Date</p><p className="font-medium">{loc.fmtDate(inv.issueDate)}</p></div>
        <div><p className="text-muted-foreground">Due Date</p><p className="font-medium">{loc.fmtDate(inv.dueDate)}</p></div>
        {inv.paidAt && <div><p className="text-muted-foreground">Paid On</p><p className="font-medium text-emerald-400">{loc.fmtDate(inv.paidAt)}</p></div>}
      </div>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                {inv.lineItems.some(item => item.discount > 0) && <TableHead className="text-right">Disc %</TableHead>}
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inv.lineItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">{loc.fmt(item.unitPrice)}</TableCell>
                  {inv.lineItems.some(li => li.discount > 0) && (
                    <TableCell className="text-right">
                      {item.discount > 0 ? <span className="text-red-400">{item.discount}%</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  )}
                  <TableCell className="text-right">{loc.fmt(item.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Separator className="my-4" />
          <div className="space-y-1 text-sm text-right">
            {inv.discountAmount > 0 && (
              <div className="flex justify-end gap-12 text-muted-foreground">
                <span>Gross Subtotal</span>
                <span>{loc.fmt(inv.subtotal + inv.discountAmount)}</span>
              </div>
            )}
            {inv.discountAmount > 0 && (
              <div className="flex justify-end gap-12 text-red-400">
                <span>Discount</span>
                <span>-{loc.fmt(inv.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-end gap-12 text-muted-foreground"><span>Subtotal</span><span>{loc.fmt(inv.subtotal)}</span></div>
            {inv.taxRate > 0 && <div className="flex justify-end gap-12 text-muted-foreground"><span>{loc.taxName} ({inv.taxRate}%)</span><span>{loc.fmt(inv.taxAmount)}</span></div>}
            <div className="flex justify-end gap-12 font-bold text-foreground text-base"><span>Total</span><span>{loc.fmt(inv.total)}</span></div>
            {lateFeeAmount !== null && (
              <div className="flex justify-end gap-12 text-red-400 text-xs mt-1">
                <span>Late fee accrued ({inv.lateFeePct}%/mo)</span>
                <span>{loc.fmt(lateFeeAmount)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {inv.notes && (
        <Card className="border-border bg-card">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{inv.notes}</p>
          </CardContent>
        </Card>
      )}

      {inv.status !== "PAID" && (
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base">Record Payment</CardTitle></CardHeader>
          <CardContent>
            <RecordPayment
              invoiceId={inv.id}
              total={inv.total}
              amountPaid={inv.amountPaid}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
