import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import BillActions from "./BillActions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const statusStyle: Record<string, string> = {
  DRAFT: "border-yellow-500/30 text-yellow-400",
  PENDING: "border-blue-500/30 text-blue-400",
  PAID: "border-emerald-500/30 text-emerald-400",
  OVERDUE: "border-red-500/30 text-red-400",
  VOID: "border-zinc-500/30 text-zinc-400",
};

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const bill = await prisma.bill.findFirst({
    where: { id, userId: session.user.id as string },
    include: { lineItems: true },
  });
  if (!bill) notFound();

  const balanceDue = bill.total - bill.amountPaid;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href="/bills">
            <Button variant="ghost" size="sm" className="mt-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{bill.billNumber}</h1>
            <p className="text-muted-foreground mt-1">
              {bill.vendorName}
              {bill.vendorEmail && ` · ${bill.vendorEmail}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={`text-sm ${statusStyle[bill.status] ?? ""}`}
          >
            {bill.status}
          </Badge>
          <BillActions billId={bill.id} status={bill.status} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-lg font-bold text-white">
              ${bill.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Amount Paid</p>
            <p className="text-lg font-bold text-emerald-400">
              ${bill.amountPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Balance Due</p>
            <p className={`text-lg font-bold ${balanceDue > 0 ? "text-red-400" : "text-emerald-400"}`}>
              ${balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Issue Date</p>
          <p className="font-medium">{new Date(bill.issueDate).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Due Date</p>
          <p className="font-medium">{new Date(bill.dueDate).toLocaleDateString()}</p>
        </div>
        {bill.paidAt && (
          <div>
            <p className="text-muted-foreground">Paid On</p>
            <p className="font-medium text-emerald-400">
              {new Date(bill.paidAt).toLocaleDateString()}
            </p>
          </div>
        )}
        {bill.category && (
          <div>
            <p className="text-muted-foreground">Category</p>
            <p className="font-medium">{bill.category}</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground">Currency</p>
          <p className="font-medium">{bill.currency}</p>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead>Account Code</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bill.lineItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    ${item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.accountCode ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    ${item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Separator className="my-4" />
          <div className="space-y-1 text-sm text-right">
            <div className="flex justify-end gap-12 text-muted-foreground">
              <span>Subtotal</span>
              <span>${bill.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            {bill.taxRate > 0 && (
              <div className="flex justify-end gap-12 text-muted-foreground">
                <span>Tax ({bill.taxRate}%)</span>
                <span>${bill.taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-end gap-12 font-bold text-white text-base">
              <span>Total</span>
              <span>${bill.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {bill.notes && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{bill.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
