"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Loader2, ChevronDown, ChevronRight, Building2, CalendarClock,
  MoreHorizontal, Pencil, Trash2, TrendingDown, ListTree,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DepreciationEntry {
  id: string;
  month: number;
  year: number;
  amount: number;
  bookValue: number;
  posted: boolean;
}

interface FixedAsset {
  id: string;
  name: string;
  assetNumber: string | null;
  description: string | null;
  purchaseDate: string;
  purchaseCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationMethod: string;
  status: string;
  depreciationEntries: DepreciationEntry[];
}

const statusStyle: Record<string, string> = {
  ACTIVE: "border-emerald-500/30 text-emerald-400",
  DISPOSED: "border-zinc-500/30 text-zinc-400",
  FULLY_DEPRECIATED: "border-yellow-500/30 text-yellow-400",
};

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function calcBookValue(asset: FixedAsset) {
  const accum = asset.depreciationEntries.reduce((s, e) => s + e.amount, 0);
  return asset.purchaseCost - accum;
}

function calcAccumDepreciation(asset: FixedAsset) {
  return asset.depreciationEntries.reduce((s, e) => s + e.amount, 0);
}

const CURRENT_YEAR = new Date().getFullYear();

export default function FixedAssetsPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Add dialog
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", assetNumber: "", description: "",
    purchaseDate: "", purchaseCost: "", salvageValue: "0",
    usefulLifeMonths: "", depreciationMethod: "STRAIGHT_LINE",
  });

  // Depreciation dialog
  const [deprAsset, setDeprAsset] = useState<FixedAsset | null>(null);
  const [deprMonth, setDeprMonth] = useState(String(new Date().getMonth() + 1));
  const [deprYear, setDeprYear] = useState(String(CURRENT_YEAR));
  const [deprLoading, setDeprLoading] = useState(false);

  // Edit dialog
  const [editAsset, setEditAsset] = useState<FixedAsset | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", assetNumber: "" });
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/fixed-assets");
    if (res.ok) setAssets(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggleRow(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.purchaseDate || !form.purchaseCost || !form.usefulLifeMonths) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/fixed-assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        assetNumber: form.assetNumber || null,
        description: form.description || null,
        purchaseDate: form.purchaseDate,
        purchaseCost: Number(form.purchaseCost),
        salvageValue: Number(form.salvageValue || 0),
        usefulLifeMonths: Number(form.usefulLifeMonths),
        depreciationMethod: form.depreciationMethod,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Asset added");
      setShowAdd(false);
      setForm({ name: "", assetNumber: "", description: "", purchaseDate: "", purchaseCost: "", salvageValue: "0", usefulLifeMonths: "", depreciationMethod: "STRAIGHT_LINE" });
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to add asset");
    }
  }

  async function handleRecordDepreciation() {
    if (!deprAsset) return;
    setDeprLoading(true);
    const res = await fetch(`/api/fixed-assets/${deprAsset.id}/depreciation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: Number(deprYear), month: Number(deprMonth) }),
    });
    setDeprLoading(false);
    if (res.ok) {
      toast.success(`Depreciation recorded for ${MONTHS[Number(deprMonth) - 1]} ${deprYear}`);
      setDeprAsset(null);
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to record depreciation");
    }
  }

  async function handleEdit() {
    if (!editAsset) return;
    setEditSaving(true);
    const res = await fetch(`/api/fixed-assets/${editAsset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditSaving(false);
    if (res.ok) {
      toast.success("Asset updated");
      setEditAsset(null);
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to update asset");
    }
  }

  async function handleDispose(asset: FixedAsset) {
    const res = await fetch(`/api/fixed-assets/${asset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DISPOSED" }),
    });
    if (res.ok) { toast.success("Asset marked as disposed"); load(); }
    else { const d = await res.json(); toast.error(d.error || "Failed"); }
  }

  async function handleDelete(asset: FixedAsset) {
    const res = await fetch(`/api/fixed-assets/${asset.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Asset deleted"); load(); }
    else { const d = await res.json(); toast.error(d.error || "Cannot delete asset"); }
  }

  const totalBookValue = assets.reduce((s, a) => s + calcBookValue(a), 0);
  const totalAssets = assets.length;
  const fullyDeprCount = assets.filter(a => a.status === "FULLY_DEPRECIATED").length;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fixed Asset Register</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and depreciate your fixed assets</p>
        </div>
        <Button
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="h-4 w-4" /> Add Asset
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{totalAssets}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Total Book Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-400">{fmt(totalBookValue)}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Fully Depreciated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-400">{fullyDeprCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Assets Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Building2 className="h-8 w-8 opacity-40" />
              <p>No fixed assets yet. Add your first asset.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Asset Name</TableHead>
                  <TableHead>Asset #</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Accum. Depr.</TableHead>
                  <TableHead className="text-right">Book Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => {
                  const accumDepr = calcAccumDepreciation(asset);
                  const bookValue = asset.purchaseCost - accumDepr;
                  const isExpanded = expandedRows.has(asset.id);
                  return (
                    <>
                      <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/30">
                        <TableCell>
                          <button
                            onClick={() => toggleRow(asset.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{asset.name}</p>
                            {asset.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{asset.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{asset.assetNumber ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(asset.purchaseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </TableCell>
                        <TableCell className="text-right text-foreground">{fmt(asset.purchaseCost)}</TableCell>
                        <TableCell className="text-right text-red-400">{fmt(accumDepr)}</TableCell>
                        <TableCell className="text-right text-emerald-400 font-semibold">{fmt(bookValue)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${statusStyle[asset.status] ?? "border-zinc-500/30 text-zinc-400"}`}>
                            {asset.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {asset.status === "ACTIVE" && (
                                <DropdownMenuItem onClick={() => {
                                  setDeprAsset(asset);
                                  setDeprMonth(String(new Date().getMonth() + 1));
                                  setDeprYear(String(CURRENT_YEAR));
                                }}>
                                  <CalendarClock className="h-4 w-4 mr-2" /> Record Depreciation
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => toggleRow(asset.id)}>
                                <ListTree className="h-4 w-4 mr-2" /> View Schedule
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setEditAsset(asset);
                                setEditForm({ name: asset.name, description: asset.description ?? "", assetNumber: asset.assetNumber ?? "" });
                              }}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              {asset.status === "ACTIVE" && (
                                <DropdownMenuItem className="text-yellow-400" onClick={() => handleDispose(asset)}>
                                  <CalendarClock className="h-4 w-4 mr-2" /> Dispose
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-red-400" onClick={() => handleDelete(asset)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>

                      {/* Expanded depreciation schedule */}
                      {isExpanded && (
                        <TableRow key={`${asset.id}-expanded`}>
                          <TableCell colSpan={9} className="p-0 bg-muted/10">
                            <div className="px-8 py-4">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                Depreciation Schedule — {asset.depreciationMethod.replace("_", " ")} · {asset.usefulLifeMonths} months useful life · Salvage value {fmt(asset.salvageValue)}
                              </p>
                              {asset.depreciationEntries.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No depreciation entries recorded yet.</p>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs">Period</TableHead>
                                      <TableHead className="text-xs text-right">Depreciation</TableHead>
                                      <TableHead className="text-xs text-right">Book Value</TableHead>
                                      <TableHead className="text-xs">Posted</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {[...asset.depreciationEntries]
                                      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
                                      .map((entry) => (
                                        <TableRow key={entry.id}>
                                          <TableCell className="text-sm">{MONTHS[entry.month - 1]} {entry.year}</TableCell>
                                          <TableCell className="text-sm text-right text-red-400">{fmt(entry.amount)}</TableCell>
                                          <TableCell className="text-sm text-right text-emerald-400">{fmt(entry.bookValue)}</TableCell>
                                          <TableCell>
                                            <Badge variant="outline" className={`text-xs ${entry.posted ? "border-emerald-500/30 text-emerald-400" : "border-zinc-500/30 text-zinc-400"}`}>
                                              {entry.posted ? "Posted" : "Draft"}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Asset Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Fixed Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name <span className="text-red-400">*</span></Label>
                <Input
                  placeholder="e.g. MacBook Pro 16"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Asset Number</Label>
                <Input
                  placeholder="e.g. FA-001"
                  value={form.assetNumber}
                  onChange={e => setForm(f => ({ ...f, assetNumber: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description..."
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Purchase Date <span className="text-red-400">*</span></Label>
                <Input
                  type="date"
                  value={form.purchaseDate}
                  onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Purchase Cost <span className="text-red-400">*</span></Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.purchaseCost}
                  onChange={e => setForm(f => ({ ...f, purchaseCost: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Salvage Value</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.salvageValue}
                  onChange={e => setForm(f => ({ ...f, salvageValue: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Useful Life (months) <span className="text-red-400">*</span></Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 60"
                  value={form.usefulLifeMonths}
                  onChange={e => setForm(f => ({ ...f, usefulLifeMonths: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Depreciation Method</Label>
              <Select
                value={form.depreciationMethod}
                onValueChange={v => setForm(f => ({ ...f, depreciationMethod: v ?? "STRAIGHT_LINE" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRAIGHT_LINE">Straight Line</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
              onClick={handleAdd}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Depreciation Dialog */}
      <Dialog open={!!deprAsset} onOpenChange={o => !o && setDeprAsset(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Depreciation</DialogTitle>
          </DialogHeader>
          {deprAsset && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Asset: <span className="text-foreground font-medium">{deprAsset.name}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Monthly amount: <span className="text-red-400 font-semibold">
                  {fmt((deprAsset.purchaseCost - deprAsset.salvageValue) / deprAsset.usefulLifeMonths)}
                </span>
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Month</Label>
                  <Select value={deprMonth} onValueChange={v => setDeprMonth(v ?? deprMonth)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Year</Label>
                  <Select value={deprYear} onValueChange={v => setDeprYear(v ?? deprYear)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - 5 + i).map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeprAsset(null)}>Cancel</Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
              onClick={handleRecordDepreciation}
              disabled={deprLoading}
            >
              {deprLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Asset Dialog */}
      <Dialog open={!!editAsset} onOpenChange={o => !o && setEditAsset(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Asset Number</Label>
              <Input
                value={editForm.assetNumber}
                onChange={e => setEditForm(f => ({ ...f, assetNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAsset(null)}>Cancel</Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
              onClick={handleEdit}
              disabled={editSaving}
            >
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
