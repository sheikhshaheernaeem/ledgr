"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, Loader2, RefreshCw, CheckCircle2, AlertCircle, Download, Repeat2, CheckCheck, XCircle, Search, Filter, Pencil, ChevronLeft, ChevronRight, Camera, ExternalLink } from "lucide-react";

const CATEGORIES = [
  "Revenue","Cost of Goods Sold","Payroll & Benefits","Rent & Utilities",
  "Software & Subscriptions","Marketing & Advertising","Professional Services",
  "Office Supplies","Travel & Entertainment","Banking & Fees","Taxes",
  "Insurance","Other Expense","Other Income",
];

const TAX_CATEGORIES = ["", "Operating Expense", "Capital Expense", "Cost of Goods", "Payroll Tax", "Income Tax", "Non-Deductible"];

interface Transaction {
  id: string; date: string; description: string; amount: number;
  type: "DEBIT" | "CREDIT"; category: string | null; subcategory: string | null;
  confidence: number | null; status: "PENDING" | "APPROVED" | "EDITED";
  taxCategory: string | null; isRecurring: boolean; receiptData: string | null;
}

interface OcrData { vendor: string; date: string; amount: string; description: string; }

interface EditForm { category: string; subcategory: string; taxCategory: string; status: string; }

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [detectingRecurring, setDetectingRecurring] = useState(false);
  const [bulkActing, setBulkActing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ category: "", subcategory: "", taxCategory: "", status: "" });
  const [saving, setSaving] = useState(false);

  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptOcr, setReceiptOcr] = useState<OcrData | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedBulkCategory, setSelectedBulkCategory] = useState("");
  const [bulkCategoryActing, setBulkCategoryActing] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const receiptFileRef = useRef<HTMLInputElement>(null);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set("page", String(page)); p.set("pageSize", String(pageSize));
    if (search) p.set("search", search);
    if (filterCategory) p.set("category", filterCategory);
    if (filterStatus) p.set("status", filterStatus);
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    return p.toString();
  }, [page, search, filterCategory, filterStatus, startDate, endDate]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/transactions?${buildParams()}`);
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions ?? data);
      setTotal(data.total ?? data.length ?? 0);
    }
    setLoading(false);
  }, [buildParams]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, filterCategory, filterStatus, startDate, endDate]);

  function toggleSelect(id: string) { setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleAll() { setSelected(prev => prev.size === transactions.length ? new Set() : new Set(transactions.map(t => t.id))); }

  function openEdit(tx: Transaction) {
    setEditTx(tx);
    setEditForm({ category: tx.category ?? "", subcategory: tx.subcategory ?? "", taxCategory: tx.taxCategory ?? "", status: tx.status });
    setReceiptOcr(null);
  }

  async function handleReceiptUpload(file: File) {
    if (!editTx) return;
    setReceiptUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/transactions/${editTx.id}/receipt`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setReceiptOcr(data.ocrData ?? null);
      setEditTx(prev => prev ? { ...prev, receiptData: data.receiptUrl ?? "attached" } : prev);
      toast.success("Receipt uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Receipt upload failed");
    } finally {
      setReceiptUploading(false);
      if (receiptFileRef.current) receiptFileRef.current.value = "";
    }
  }

  async function saveEdit() {
    if (!editTx) return;
    setSaving(true);
    const res = await fetch(`/api/transactions/${editTx.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: editForm.category || null, subcategory: editForm.subcategory || null, taxCategory: editForm.taxCategory || null, status: editForm.status }),
    });
    if (res.ok) { toast.success("Transaction updated"); setEditTx(null); loadTransactions(); }
    else toast.error("Failed to update");
    setSaving(false);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    const formData = new FormData(); formData.append("file", file);
    try {
      const res = await fetch("/api/transactions/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Uploaded ${data.count} transactions`); loadTransactions();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    await uploadFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    // Only clear if leaving the wrapper entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      uploadFile(file);
    } else if (file) {
      toast.error("Please drop a CSV file");
    }
  }

  async function bulkChangeCategory() {
    if (selected.size === 0 || !selectedBulkCategory) return;
    setBulkCategoryActing(true);
    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), updates: { category: selectedBulkCategory } }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Category set to "${selectedBulkCategory}" for ${selected.size} transactions`);
      setSelected(new Set());
      setSelectedBulkCategory("");
      loadTransactions();
    } catch { toast.error("Bulk category update failed"); }
    finally { setBulkCategoryActing(false); }
  }

  async function handleCategorize() {
    setCategorizing(true);
    try {
      const res = await fetch("/api/transactions/categorize", { method: "POST" });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      toast.success(`Categorized ${data.count} transactions`); loadTransactions();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Categorization failed"); }
    finally { setCategorizing(false); }
  }

  async function handleDetectRecurring() {
    setDetectingRecurring(true);
    try {
      const res = await fetch("/api/transactions/detect-recurring", { method: "POST" });
      const data = await res.json();
      toast.success(`Detected ${data.count ?? 0} recurring transactions`); loadTransactions();
    } catch { toast.error("Failed to detect recurring"); }
    finally { setDetectingRecurring(false); }
  }

  async function bulkAction(action: "approve" | "reject") {
    if (selected.size === 0) return;
    setBulkActing(true);
    try {
      const res = await fetch("/api/transactions/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selected), action }) });
      if (!res.ok) throw new Error();
      toast.success(`${action === "approve" ? "Approved" : "Rejected"} ${selected.size} transactions`);
      setSelected(new Set()); loadTransactions();
    } catch { toast.error("Bulk action failed"); }
    finally { setBulkActing(false); }
  }

  function exportCSV() {
    const rows = transactions.filter(t => selected.size === 0 || selected.has(t.id));
    const header = "Date,Description,Amount,Type,Category,Tax Category,Status,Recurring";
    const lines = rows.map(t => `"${new Date(t.date).toLocaleDateString()}","${t.description.replace(/"/g, '""')}",${t.amount},${t.type},"${t.category ?? ""}","${t.taxCategory ?? ""}",${t.status},${t.isRecurring}`);
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} transactions`);
  }

  const pendingCount = transactions.filter(t => t.status === "PENDING").length;
  const allSelected = transactions.length > 0 && selected.size === transactions.length;
  const hasActiveFilters = search || filterCategory || filterStatus || startDate || endDate;

  return (
    <div
      className="p-8 space-y-5 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Full-screen drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-emerald-400 pointer-events-none">
          <div className="text-center">
            <Upload className="h-14 w-14 mx-auto mb-4 text-emerald-400" />
            <p className="text-xl font-semibold text-emerald-400">Drop your CSV here</p>
            <p className="text-sm text-muted-foreground mt-1">Release to upload your bank statement</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-muted-foreground mt-1">Upload your bank CSV and let AI categorize everything</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={exportCSV} className="gap-2 text-xs"><Download className="h-3.5 w-3.5" /> Export CSV</Button>
          <Button variant="outline" onClick={handleDetectRecurring} disabled={detectingRecurring} className="gap-2 text-xs">
            {detectingRecurring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Repeat2 className="h-3.5 w-3.5" />} Detect Recurring
          </Button>
          {pendingCount > 0 && (
            <Button variant="outline" onClick={handleCategorize} disabled={categorizing} className="gap-2">
              {categorizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Categorize ({pendingCount})
            </Button>
          )}
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search transactions…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant={showFilters ? "secondary" : "outline"} onClick={() => setShowFilters(v => !v)} className="gap-2">
          <Filter className="h-4 w-4" /> Filters {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
        </Button>
        {hasActiveFilters && <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => { setSearch(""); setFilterCategory(""); setFilterStatus(""); setStartDate(""); setEndDate(""); }}>Clear</Button>}
      </div>

      {showFilters && (
        <Card className="border-border bg-card">
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="">All categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="EDITED">Edited</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-card">
          <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          <div className="flex-1" />
          {/* Bulk category change */}
          <div className="flex items-center gap-1.5">
            <select
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              value={selectedBulkCategory}
              onChange={e => setSelectedBulkCategory(e.target.value)}
            >
              <option value="">Pick category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={!selectedBulkCategory || bulkCategoryActing}
              onClick={bulkChangeCategory}
              className="h-8 text-xs gap-1"
            >
              {bulkCategoryActing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Apply Category
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={() => bulkAction("approve")} disabled={bulkActing} className="gap-1.5 border-emerald-500/30 text-emerald-400 hover:text-emerald-300">
            {bulkActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />} Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkAction("reject")} disabled={bulkActing} className="gap-1.5 border-red-500/30 text-red-400 hover:text-red-300">
            <XCircle className="h-3 w-3" /> Reject
          </Button>
          <Button size="sm" variant="ghost" onClick={exportCSV} className="gap-1.5 text-xs"><Download className="h-3 w-3" /> Export</Button>
        </div>
      )}

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">All Transactions <span className="ml-2 text-muted-foreground font-normal text-sm">({total})</span></CardTitle>
              <CardDescription>{pendingCount > 0 ? `${pendingCount} pending AI categorization` : "All transactions categorized"}</CardDescription>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 && !loading ? (
            <div className="text-center py-16 text-muted-foreground">
              <Upload className="h-10 w-10 mx-auto mb-4 opacity-20" />
              <p className="font-medium">{hasActiveFilters ? "No transactions match your filters" : "No transactions yet"}</p>
              <p className="text-sm mt-1">{hasActiveFilters ? "Try adjusting your search or filters" : "Upload a CSV from your bank to get started"}</p>
              {!hasActiveFilters && <Button className="mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold" onClick={() => fileRef.current?.click()}>Upload CSV</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-border" /></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(tx => (
                    <TableRow key={tx.id} className={selected.has(tx.id) ? "bg-emerald-500/5" : ""}>
                      <TableCell><input type="checkbox" checked={selected.has(tx.id)} onChange={() => toggleSelect(tx.id)} className="rounded border-border" /></TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{new Date(tx.date).toLocaleDateString()}</TableCell>
                      <TableCell className="max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm">{tx.description}</p>
                          {tx.isRecurring && <Repeat2 className="h-3 w-3 text-blue-400 shrink-0" aria-label="Recurring" />}
                        </div>
                        {tx.subcategory && <p className="text-xs text-muted-foreground">{tx.subcategory}</p>}
                      </TableCell>
                      <TableCell>
                        {tx.category ? <Badge variant="outline" className="text-xs">{tx.category}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {tx.taxCategory ? <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">{tx.taxCategory}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {tx.confidence !== null ? (
                          <div className="flex items-center gap-1">
                            {tx.confidence >= 0.85 ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <AlertCircle className="h-3 w-3 text-yellow-400" />}
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
                        <Badge variant="outline" className={`text-xs ${tx.status === "APPROVED" ? "border-emerald-500/30 text-emerald-400" : tx.status === "EDITED" ? "border-blue-500/30 text-blue-400" : "border-yellow-500/30 text-yellow-400"}`}>
                          {tx.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(tx)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground px-1">Page {page} of {totalPages}</span>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog — kept outside drag wrapper */}
      <Dialog open={!!editTx} onOpenChange={open => { if (!open) setEditTx(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          {editTx && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/30 text-sm">
                <p className="font-medium truncate">{editTx.description}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{new Date(editTx.date).toLocaleDateString()} · <span className={editTx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}>{editTx.type === "CREDIT" ? "+" : "-"}${editTx.amount.toFixed(2)}</span></p>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="">Uncategorized</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Subcategory <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input value={editForm.subcategory} onChange={e => setEditForm(p => ({ ...p, subcategory: e.target.value }))} placeholder="e.g. AWS EC2, Google Workspace" />
              </div>

              <div className="space-y-2">
                <Label>Tax Category</Label>
                <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={editForm.taxCategory} onChange={e => setEditForm(p => ({ ...p, taxCategory: e.target.value }))}>
                  {TAX_CATEGORIES.map(c => <option key={c} value={c}>{c || "None"}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="EDITED">Edited</option>
                </select>
              </div>

              {/* Receipt section */}
              <div className="space-y-2">
                <Label>Receipt</Label>
                {editTx?.receiptData ? (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400">Receipt attached</span>
                    {editTx.receiptData.startsWith("http") && (
                      <a href={editTx.receiptData} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-1">
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={receiptUploading}
                      onClick={() => receiptFileRef.current?.click()}
                    >
                      {receiptUploading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Camera className="h-3.5 w-3.5" />}
                      {receiptUploading ? "Uploading…" : "Upload Receipt"}
                    </Button>
                    <input
                      ref={receiptFileRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }}
                    />
                  </div>
                )}

                {/* OCR extracted data */}
                {receiptOcr && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1 mt-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">OCR Extracted</p>
                    {receiptOcr.vendor && <p className="text-xs"><span className="text-muted-foreground">Vendor:</span> <span className="text-foreground">{receiptOcr.vendor}</span></p>}
                    {receiptOcr.date && <p className="text-xs"><span className="text-muted-foreground">Date:</span> <span className="text-foreground">{receiptOcr.date}</span></p>}
                    {receiptOcr.amount && <p className="text-xs"><span className="text-muted-foreground">Amount:</span> <span className="text-foreground">{receiptOcr.amount}</span></p>}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTx(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
