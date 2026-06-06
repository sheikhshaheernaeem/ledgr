"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Loader2, FileCheck, Trash2, CheckCheck, TrendingUp,
} from "lucide-react";

interface VatReturn {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalSales: number;
  vatOnSales: number;
  totalPurchases: number;
  vatOnPurchases: number;
  vatPayable: number;
  status: string;
  filedAt: string | null;
  notes: string | null;
  createdAt: string;
}

const statusStyle: Record<string, string> = {
  DRAFT: "border-yellow-500/30 text-yellow-400",
  FILED: "border-blue-500/30 text-blue-400",
  PAID: "border-emerald-500/30 text-emerald-400",
};

export default function VatReturnsPage() {
  const [returns, setReturns] = useState<VatReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    periodStart: "",
    periodEnd: "",
    notes: "",
  });

  async function load() {
    const res = await fetch("/api/vat-returns");
    if (res.ok) setReturns(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.periodStart || !form.periodEnd) {
      return toast.error("Period start and end are required");
    }
    setCreating(true);
    try {
      const res = await fetch("/api/vat-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: form.periodStart,
          periodEnd: form.periodEnd,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed");
      }
      toast.success("VAT return created");
      setDialogOpen(false);
      setForm({ periodStart: "", periodEnd: "", notes: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create VAT return");
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/vat-returns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Marked as ${status.toLowerCase()}`);
      load();
    } else {
      toast.error("Update failed");
    }
  }

  async function deleteReturn(id: string) {
    const res = await fetch(`/api/vat-returns/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("VAT return deleted");
      load();
    } else {
      toast.error("Cannot delete — only DRAFT returns can be deleted");
    }
  }

  // Most recent DRAFT return for summary card
  const latestDraft = returns.find(r => r.status === "DRAFT");

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">VAT / GST Returns</h1>
          <p className="text-muted-foreground mt-1">
            Track and file your VAT/GST obligations
          </p>
        </div>
        <Button
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4" /> New Return
        </Button>
      </div>

      {/* Summary card for latest DRAFT */}
      {latestDraft && (
        <Card className="border-border bg-card">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm font-medium text-muted-foreground">
                    VAT Payable — Current Draft
                  </p>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  ${latestDraft.vatPayable.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Period: {new Date(latestDraft.periodStart).toLocaleDateString()} —{" "}
                  {new Date(latestDraft.periodEnd).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right space-y-1 text-sm">
                <div className="text-muted-foreground">
                  Sales: <span className="text-foreground font-medium">
                    ${latestDraft.totalSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  VAT on Sales: <span className="text-emerald-400 font-medium">
                    ${latestDraft.vatOnSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Purchases: <span className="text-foreground font-medium">
                    ${latestDraft.totalPurchases.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  VAT on Purchases: <span className="text-red-400 font-medium">
                    ${latestDraft.vatOnPurchases.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">
            Returns{" "}
            <span className="text-muted-foreground font-normal text-sm">({returns.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : returns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileCheck className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No VAT returns yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setDialogOpen(true)}
              >
                Create your first return
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">VAT on Sales</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">VAT on Purchases</TableHead>
                  <TableHead className="text-right">VAT Payable</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      <p className="font-medium">
                        {new Date(r.periodStart).toLocaleDateString()} —{" "}
                        {new Date(r.periodEnd).toLocaleDateString()}
                      </p>
                      {r.filedAt && (
                        <p className="text-xs text-muted-foreground">
                          Filed {new Date(r.filedAt).toLocaleDateString()}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      ${r.totalSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-sm text-emerald-400">
                      ${r.vatOnSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      ${r.totalPurchases.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-sm text-red-400">
                      ${r.vatOnPurchases.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      <span className={r.vatPayable >= 0 ? "text-foreground" : "text-emerald-400"}>
                        ${r.vatPayable.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusStyle[r.status] ?? ""}`}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {r.status === "DRAFT" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1 border-blue-500/30 text-blue-400 hover:text-blue-300 h-7"
                            onClick={() => updateStatus(r.id, "FILED")}
                          >
                            <FileCheck className="h-3 w-3" />
                            File
                          </Button>
                        )}
                        {r.status === "FILED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1 border-emerald-500/30 text-emerald-400 hover:text-emerald-300 h-7"
                            onClick={() => updateStatus(r.id, "PAID")}
                          >
                            <CheckCheck className="h-3 w-3" />
                            Mark Paid
                          </Button>
                        )}
                        {r.status === "DRAFT" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs gap-1 text-red-400 hover:text-red-300 h-7"
                            onClick={() => deleteReturn(r.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Return Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New VAT / GST Return</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Sales and purchase totals will be auto-calculated from your invoices and bills in the selected period.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Period Start *</Label>
                  <Input
                    type="date"
                    value={form.periodStart}
                    onChange={e => setForm(p => ({ ...p, periodStart: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Period End *</Label>
                  <Input
                    type="date"
                    value={form.periodEnd}
                    onChange={e => setForm(p => ({ ...p, periodEnd: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <textarea
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  rows={2}
                  placeholder="Any notes about this filing period..."
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Return"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
