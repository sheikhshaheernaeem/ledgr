"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Loader2, FileText, Share2, Download, Trash2, CheckCheck, Send } from "lucide-react";
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
  type: string;
  currency: string;
}

const statusStyle: Record<string, string> = {
  DRAFT: "border-zinc-500/30 text-zinc-400",
  SENT: "border-blue-500/30 text-blue-400",
  PAID: "border-emerald-500/30 text-emerald-400",
  OVERDUE: "border-red-500/30 text-red-400",
};


const FILTERS = ["All", "Outstanding", "Paid"] as const;
type Filter = (typeof FILTERS)[number];
type TabType = "invoices" | "quotes";

export default function InvoicesPage() {
  const { fmt, fmtDate } = useLocale();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [tab, setTab] = useState<TabType>("invoices");
  const [loading, setLoading] = useState(true);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [bulkActing, setBulkActing] = useState(false);

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

  function toggleSelect(id: string) {
    setSelectedInvoices(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedInvoices(prev =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map(i => i.id))
    );
  }

  async function bulkMarkStatus(status: string) {
    if (selectedInvoices.size === 0) return;
    setBulkActing(true);
    let success = 0;
    for (const id of selectedInvoices) {
      const res = await fetch(`/api/invoices/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) success++;
    }
    toast.success(`Marked ${success} invoice${success === 1 ? "" : "s"} as ${status.toLowerCase()}`);
    setSelectedInvoices(new Set());
    setBulkActing(false);
    load();
  }

  async function bulkDelete() {
    if (selectedInvoices.size === 0) return;
    if (!confirm(`Delete ${selectedInvoices.size} selected invoice(s)? This cannot be undone.`)) return;
    setBulkActing(true);
    let success = 0;
    for (const id of selectedInvoices) {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) success++;
    }
    toast.success(`Deleted ${success} invoice${success === 1 ? "" : "s"}`);
    setSelectedInvoices(new Set());
    setBulkActing(false);
    load();
  }

  const tabFiltered = invoices.filter(inv =>
    tab === "quotes" ? inv.type === "QUOTE" : inv.type !== "QUOTE"
  );

  const filtered = tabFiltered.filter(inv => {
    if (filter === "Outstanding") return ["SENT", "OVERDUE"].includes(inv.status);
    if (filter === "Paid") return inv.status === "PAID";
    return true;
  });

  const outstanding = invoices
    .filter(i => ["SENT", "OVERDUE"].includes(i.status) && i.type !== "QUOTE")
    .reduce((s, i) => s + i.total, 0);

  const allSelected = filtered.length > 0 && selectedInvoices.size === filtered.length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            {invoices.filter(i => ["SENT", "OVERDUE"].includes(i.status) && i.type !== "QUOTE").length} outstanding — {fmt(outstanding)} due
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API route file download, not page navigation */}
          <a href="/api/invoices/export" download>
            <Button variant="outline" className="gap-2 text-xs">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </a>
          <Link href="/invoices/new/quote">
            <Button variant="outline" className="gap-2 font-semibold">
              <Plus className="h-4 w-4" /> New Quote
            </Button>
          </Link>
          <Link href="/invoices/new">
            <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        <button
          onClick={() => { setTab("invoices"); setSelectedInvoices(new Set()); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "invoices" ? "border-emerald-500 text-emerald-400" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Invoices ({invoices.filter(i => i.type !== "QUOTE").length})
        </button>
        <button
          onClick={() => { setTab("quotes"); setSelectedInvoices(new Set()); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "quotes" ? "border-emerald-500 text-emerald-400" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Quotes ({invoices.filter(i => i.type === "QUOTE").length})
        </button>
      </div>

      <div className="flex gap-2">
        {FILTERS.map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}
            className={filter === f ? "bg-emerald-500 hover:bg-emerald-400 text-black" : ""}>
            {f}
          </Button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selectedInvoices.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-card">
          <span className="text-sm text-muted-foreground">{selectedInvoices.size} selected</span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            disabled={bulkActing}
            onClick={() => bulkMarkStatus("SENT")}
            className="gap-1.5 text-xs border-blue-500/30 text-blue-400 hover:text-blue-300"
          >
            {bulkActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Mark as Sent
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkActing}
            onClick={() => bulkMarkStatus("PAID")}
            className="gap-1.5 text-xs border-emerald-500/30 text-emerald-400 hover:text-emerald-300"
          >
            {bulkActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
            Mark as Paid
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkActing}
            onClick={bulkDelete}
            className="gap-1.5 text-xs border-red-500/30 text-red-400 hover:text-red-300"
          >
            {bulkActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Delete
          </Button>
        </div>
      )}

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">
            {tab === "quotes" ? "Quotes" : "Invoices"}{" "}
            <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No {tab === "quotes" ? "quotes" : "invoices"} found</p>
              <Link href={tab === "quotes" ? "/invoices/new/quote" : "/invoices/new"}>
                <Button variant="outline" size="sm" className="mt-3">
                  Create your first {tab === "quotes" ? "quote" : "invoice"}
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-border" />
                  </TableHead>
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
                  <TableRow key={inv.id} className={selectedInvoices.has(inv.id) ? "bg-emerald-500/5" : ""}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedInvoices.has(inv.id)}
                        onChange={() => toggleSelect(inv.id)}
                        className="rounded border-border"
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/invoices/${inv.id}`} className="text-emerald-400 hover:underline font-medium">
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{inv.clientName}</p>
                      {inv.clientEmail && <p className="text-xs text-muted-foreground">{inv.clientEmail}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(inv.issueDate)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(inv.dueDate)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {fmt(inv.total)}
                    </TableCell>
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
                            {inv.status === "DRAFT" && (
                              <DropdownMenuItem onClick={() => deleteInvoice(inv.id)} className="text-red-400">Delete</DropdownMenuItem>
                            )}
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
