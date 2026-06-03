"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Loader2, FileText, Share2, Download } from "lucide-react";
import Link from "next/link";

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string | null;
  issueDate: string;
  dueDate: string;
  status: string;
  total: number;
  publicToken: string | null;
}

const statusStyle: Record<string, string> = {
  DRAFT: "border-zinc-500/30 text-zinc-400",
  SENT: "border-blue-500/30 text-blue-400",
  PAID: "border-emerald-500/30 text-emerald-400",
  OVERDUE: "border-red-500/30 text-red-400",
};

const FILTERS = ["All", "Outstanding", "Paid"] as const;
type Filter = (typeof FILTERS)[number];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/invoices");
    if (res.ok) setInvoices(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/invoices/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { toast.success(`Marked as ${status.toLowerCase()}`); load(); }
    else toast.error("Update failed");
  }

  async function deleteInvoice(id: string) {
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Invoice deleted"); load(); }
    else toast.error("Cannot delete — only DRAFT invoices can be deleted");
  }

  const filtered = invoices.filter(inv => {
    if (filter === "Outstanding") return ["SENT", "OVERDUE"].includes(inv.status);
    if (filter === "Paid") return inv.status === "PAID";
    return true;
  });

  const outstanding = invoices.filter(i => ["SENT", "OVERDUE"].includes(i.status)).reduce((s, i) => s + i.total, 0);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            {invoices.filter(i => ["SENT", "OVERDUE"].includes(i.status)).length} outstanding — $
            {outstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })} due
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/invoices/export">
            <Button variant="outline" className="gap-2 text-xs">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </a>
          <Link href="/invoices/new">
            <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        {FILTERS.map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}
            className={filter === f ? "bg-emerald-500 hover:bg-emerald-400 text-black" : ""}>
            {f}
          </Button>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Invoices <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span></CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No invoices found</p>
              <Link href="/invoices/new"><Button variant="outline" size="sm" className="mt-3">Create your first invoice</Button></Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link href={`/invoices/${inv.id}`} className="text-emerald-400 hover:underline font-medium">
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{inv.clientName}</p>
                      {inv.clientEmail && <p className="text-xs text-muted-foreground">{inv.clientEmail}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(inv.issueDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-medium">${inv.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${statusStyle[inv.status] ?? ""}`}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {inv.publicToken && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Copy share link"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `${window.location.origin}/p/${inv.publicToken}`
                              );
                              toast.success("Share link copied!");
                            }}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.location.href = `/invoices/${inv.id}`}>View</DropdownMenuItem>
                            {inv.status === "DRAFT" && <DropdownMenuItem onClick={() => updateStatus(inv.id, "SENT")}>Mark Sent</DropdownMenuItem>}
                            {inv.status === "SENT" && <DropdownMenuItem onClick={() => updateStatus(inv.id, "PAID")}>Mark Paid</DropdownMenuItem>}
                            {inv.status === "DRAFT" && <DropdownMenuItem onClick={() => deleteInvoice(inv.id)} className="text-red-400">Delete</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
