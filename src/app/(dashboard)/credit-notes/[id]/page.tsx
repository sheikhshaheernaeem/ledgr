import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import CreditNoteActions from "./CreditNoteActions";

const statusStyle: Record<string, string> = {
  DRAFT: "border-zinc-500/30 text-zinc-400",
  ISSUED: "border-cyan-500/30 text-cyan-400",
  APPLIED: "border-emerald-500/30 text-emerald-400",
};

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function CreditNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const cn = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id as string, type: "CREDIT_NOTE" },
    include: {
      lineItems: true,
      relatedInvoice: { select: { id: true, invoiceNumber: true, total: true, status: true } },
    },
  });
  if (!cn) notFound();

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/credit-notes" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{cn.invoiceNumber}</h1>
          <p className="text-muted-foreground text-sm">{cn.clientName}</p>
        </div>
        <Badge variant="outline" className={statusStyle[cn.status] ?? ""}>{cn.status}</Badge>
        <CreditNoteActions creditNoteId={cn.id} status={cn.status} relatedInvoiceId={cn.relatedInvoiceId} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Issue Date</span><span>{new Date(cn.issueDate).toLocaleDateString()}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Client Email</span><span>{cn.clientEmail ?? "—"}</span></div>
          </CardContent>
        </Card>
        {cn.relatedInvoice && (
          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-3 text-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Credits Against Invoice</p>
              <Link href={`/invoices/${cn.relatedInvoice.id}`} className="block">
                <p className="font-mono font-semibold text-emerald-400 hover:text-emerald-300">{cn.relatedInvoice.invoiceNumber}</p>
                <p className="text-muted-foreground">Original total: {fmt(cn.relatedInvoice.total)}</p>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Items Credited</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cn.lineItems.map((item) => (
                <TableRow key={item.id} className="border-border">
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{fmt(item.unitPrice)}</TableCell>
                  <TableCell className="text-right">{fmt(item.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-4 pb-4 pt-3 space-y-1 text-sm border-t border-border">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{fmt(cn.subtotal)}</span></div>
            {cn.taxAmount > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax ({cn.taxRate}%)</span><span>{fmt(cn.taxAmount)}</span></div>}
            <div className="flex justify-between font-bold text-red-400 text-base"><span>Credit Total</span><span>({fmt(cn.total)})</span></div>
          </div>
        </CardContent>
      </Card>

      {cn.notes && (
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Reason</p>
            <p className="text-sm">{cn.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
