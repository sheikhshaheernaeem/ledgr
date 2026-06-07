import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileX } from "lucide-react";

const statusStyle: Record<string, string> = {
  DRAFT: "border-zinc-500/30 text-zinc-400",
  ISSUED: "border-blue-500/30 text-blue-400",
  APPLIED: "border-emerald-500/30 text-emerald-400",
};

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function CreditNotesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const notes = await prisma.invoice.findMany({
    where: { userId: session.user.id as string, type: "CREDIT_NOTE" },
    include: { relatedInvoice: { select: { invoiceNumber: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Credit Notes</h1>
          <p className="text-muted-foreground mt-1">Issue refunds and credits against paid invoices</p>
        </div>
        <Link href="/credit-notes/new">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2">
            <Plus className="h-4 w-4" /> New Credit Note
          </Button>
        </Link>
      </div>

      {notes.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileX className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No credit notes yet</p>
            <p className="text-sm mt-1">Create a credit note to issue a refund or credit against an invoice.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Credit Note #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Related Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.map((cn) => (
                  <TableRow key={cn.id} className="border-border">
                    <TableCell className="font-mono text-sm">{cn.invoiceNumber}</TableCell>
                    <TableCell>{cn.clientName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {cn.relatedInvoice?.invoiceNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(cn.issueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-400">
                      ({fmt(cn.total)})
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusStyle[cn.status] ?? ""}>
                        {cn.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/credit-notes/${cn.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
