"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Loader2, RefreshCw, CheckCircle2, AlertCircle, Download, Repeat2, CheckCheck, XCircle } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  category: string | null;
  subcategory: string | null;
  confidence: number | null;
  status: "PENDING" | "APPROVED" | "EDITED";
  taxCategory: string | null;
  isRecurring: boolean;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [uploading, setUploading] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [detectingRecurring, setDetectingRecurring] = useState(false);
  const [bulkActing, setBulkActing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadTransactions() {
    const res = await fetch("/api/transactions");
    if (res.ok) setTransactions(await res.json());
  }

  useEffect(() => { loadTransactions(); }, []);

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleAll() {
    setSelected(prev => prev.size === transactions.length ? new Set() : new Set(transactions.map(t => t.id)));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/transactions/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Uploaded ${data.count} transactions`);
      await loadTransactions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleCategorize() {
    setCategorizing(true);
    try {
      const res = await fetch("/api/transactions/categorize", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Categorized ${data.count} transactions`);
      await loadTransactions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Categorization failed");
    } finally { setCategorizing(false); }
  }

  async function handleDetectRecurring() {
    setDetectingRecurring(true);
    try {
      const res = await fetch("/api/transactions/detect-recurring", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Detected ${data.count ?? 0} recurring transactions`);
      await loadTransactions();
    } catch (err) {
      toast.error("Failed to detect recurring");
    } finally { setDetectingRecurring(false); }
  }

  async function bulkAction(action: "approve" | "reject") {
    if (selected.size === 0) return;
    setBulkActing(true);
    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${action === "approve" ? "Approved" : "Rejected"} ${selected.size} transactions`);
      setSelected(new Set());
      await loadTransactions();
    } catch {
      toast.error("Bulk action failed");
    } finally { setBulkActing(false); }
  }

  function exportCSV() {
    const rows = transactions.filter(t => selected.size === 0 || selected.has(t.id));
    const header = "Date,Description,Amount,Type,Category,Tax Category,Status,Recurring";
    const lines = rows.map(t =>
      `"${new Date(t.date).toLocaleDateString()}","${t.description.replace(/"/g, '""')}",${t.amount},${t.type},"${t.category ?? ""}","${t.taxCategory ?? ""}",${t.status},${t.isRecurring}`
    );
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} transactions`);
  }

  const pendingCount = transactions.filter(t => t.status === "PENDING").length;
  const allSelected = transactions.length > 0 && selected.size === transactions.length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-muted-foreground mt-1">Upload your bank CSV and let AI categorize everything</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={exportCSV} className="gap-2 text-xs">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button variant="outline" onClick={handleDetectRecurring} disabled={detectingRecurring} className="gap-2 text-xs">
            {detectingRecurring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Repeat2 className="h-3.5 w-3.5" />}
            Detect Recurring
          </Button>
          {pendingCount > 0 && (
            <Button variant="outline" onClick={handleCategorize} disabled={categorizing} className="gap-2">
              {categorizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Categorize ({pendingCount})
            </Button>
          )}
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
        </div>
      </div>

      <Card className="border-border bg-card/50">
        <CardContent className="py-3 px-4">
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">CSV format:</span> date, description, amount, type (DEBIT/CREDIT) — or any standard bank export. We auto-detect columns.
          </p>
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
          <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={() => bulkAction("approve")} disabled={bulkActing} className="gap-1.5 border-emerald-500/30 text-emerald-400 hover:text-emerald-300">
            {bulkActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />} Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkAction("reject")} disabled={bulkActing} className="gap-1.5 border-red-500/30 text-red-400 hover:text-red-300">
            <XCircle className="h-3 w-3" /> Reject
          </Button>
          <Button size="sm" variant="ghost" onClick={exportCSV} className="gap-1.5 text-xs">
            <Download className="h-3 w-3" /> Export Selected
          </Button>
        </div>
      )}

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">
            All Transactions
            <span className="ml-2 text-muted-foreground font-normal text-sm">({transactions.length})</span>
          </CardTitle>
          <CardDescription>
            {pendingCount > 0 ? `${pendingCount} transactions awaiting AI categorization` : "All transactions categorized"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Upload className="h-10 w-10 mx-auto mb-4 opacity-20" />
              <p className="font-medium">No transactions yet</p>
              <p className="text-sm mt-1">Upload a CSV from your bank to get started</p>
              <Button className="mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold" onClick={() => fileRef.current?.click()}>
                Upload CSV
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" className="rounded border-border" />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id} className={selected.has(tx.id) ? "bg-emerald-500/5" : ""}>
                      <TableCell>
                        <input type="checkbox" checked={selected.has(tx.id)} onChange={() => toggleSelect(tx.id)} aria-label="Select" className="rounded border-border" />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm">{tx.description}</p>
                          {tx.isRecurring && <Repeat2 className="h-3 w-3 text-blue-400 shrink-0" aria-label="Recurring" />}
                        </div>
                        {tx.subcategory && <p className="text-xs text-muted-foreground">{tx.subcategory}</p>}
                      </TableCell>
                      <TableCell>
                        {tx.category ? (
                          <Badge variant="outline" className="text-xs">{tx.category}</Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {tx.taxCategory ? (
                          <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">{tx.taxCategory}</Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {tx.confidence !== null ? (
                          <div className="flex items-center gap-1">
                            {tx.confidence >= 0.85
                              ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              : <AlertCircle className="h-3 w-3 text-yellow-400" />}
                            <span className="text-xs text-muted-foreground">{(tx.confidence * 100).toFixed(0)}%</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-medium text-sm ${tx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}>
                          {tx.type === "CREDIT" ? "+" : "-"}${tx.amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${
                          tx.status === "APPROVED" ? "border-emerald-500/30 text-emerald-400" :
                          tx.status === "EDITED" ? "border-blue-500/30 text-blue-400" :
                          "border-yellow-500/30 text-yellow-400"
                        }`}>
                          {tx.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
