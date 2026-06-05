"use client";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, CheckCircle2, Flag, Plus, Trash2, User, Calendar, FileText,
} from "lucide-react";

interface WorkpaperItem {
  id: string;
  description: string;
  reference: string | null;
  status: string;
  notes: string | null;
  tickedBy: string | null;
  tickedAt: string | null;
  createdAt: string;
}

interface Workpaper {
  id: string;
  name: string;
  description: string | null;
  status: string;
  assignedTo: string | null;
  dueDate: string | null;
  reportId: string | null;
  items: WorkpaperItem[];
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: { label: "In Progress", color: "border-yellow-500/30 text-yellow-400" },
  REVIEWED: { label: "Reviewed", color: "border-blue-500/30 text-blue-400" },
  SIGNED_OFF: { label: "Signed Off", color: "border-emerald-500/30 text-emerald-400" },
};

const ITEM_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "text-muted-foreground" },
  TICKED: { label: "Ticked", color: "text-emerald-400" },
  FLAGGED: { label: "Flagged", color: "text-red-400" },
  NA: { label: "N/A", color: "text-muted-foreground line-through" },
};

export default function WorkpaperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [workpaper, setWorkpaper] = useState<Workpaper | null>(null);
  const [loading, setLoading] = useState(true);

  const [newDesc, setNewDesc] = useState("");
  const [newRef, setNewRef] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  const [flagDialog, setFlagDialog] = useState<{ itemId: string; notes: string } | null>(null);

  useEffect(() => {
    fetchWorkpaper();
  }, [id]);

  async function fetchWorkpaper() {
    setLoading(true);
    try {
      const res = await fetch(`/api/workpapers/${id}`);
      if (!res.ok) throw new Error();
      setWorkpaper(await res.json());
    } catch {
      toast.error("Failed to load workpaper");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(status: string) {
    try {
      const res = await fetch(`/api/workpapers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
      fetchWorkpaper();
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleTickItem(itemId: string, currentStatus: string) {
    const newStatus = currentStatus === "TICKED" ? "PENDING" : "TICKED";
    try {
      const res = await fetch(`/api/workpapers/${id}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      fetchWorkpaper();
    } catch {
      toast.error("Failed to update item");
    }
  }

  async function handleFlagItem() {
    if (!flagDialog) return;
    try {
      const res = await fetch(`/api/workpapers/${id}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: flagDialog.itemId, status: "FLAGGED", notes: flagDialog.notes }),
      });
      if (!res.ok) throw new Error();
      toast.success("Item flagged");
      setFlagDialog(null);
      fetchWorkpaper();
    } catch {
      toast.error("Failed to flag item");
    }
  }

  async function handleMarkNA(itemId: string) {
    try {
      const res = await fetch(`/api/workpapers/${id}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: "NA" }),
      });
      if (!res.ok) throw new Error();
      fetchWorkpaper();
    } catch {
      toast.error("Failed to update item");
    }
  }

  async function handleAddItem() {
    if (!newDesc.trim()) {
      toast.error("Description is required");
      return;
    }
    setAddingItem(true);
    try {
      const res = await fetch(`/api/workpapers/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: newDesc, reference: newRef || undefined }),
      });
      if (!res.ok) throw new Error();
      setNewDesc("");
      setNewRef("");
      fetchWorkpaper();
    } catch {
      toast.error("Failed to add item");
    } finally {
      setAddingItem(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      const res = await fetch(`/api/workpapers/${id}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) throw new Error();
      fetchWorkpaper();
    } catch {
      toast.error("Failed to delete item");
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!workpaper) return <div className="p-8 text-muted-foreground">Workpaper not found.</div>;

  const cfg = STATUS_CONFIG[workpaper.status] ?? STATUS_CONFIG.IN_PROGRESS;
  const tickedItems = workpaper.items.filter((i) => i.status === "TICKED").length;
  const totalItems = workpaper.items.length;
  const progress = totalItems > 0 ? Math.round((tickedItems / totalItems) * 100) : 0;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link href="/workpapers" className="text-sm text-muted-foreground hover:text-white flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Workpapers
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{workpaper.name}</h1>
            <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
          </div>
          {workpaper.description && (
            <p className="text-muted-foreground text-sm">{workpaper.description}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {workpaper.status === "IN_PROGRESS" && (
            <Button
              variant="outline"
              size="sm"
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              onClick={() => handleStatusUpdate("REVIEWED")}
            >
              Mark Reviewed
            </Button>
          )}
          {workpaper.status === "REVIEWED" && (
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-1.5"
              onClick={() => handleStatusUpdate("SIGNED_OFF")}
            >
              <CheckCircle2 className="h-4 w-4" /> Sign Off
            </Button>
          )}
          {workpaper.status === "SIGNED_OFF" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusUpdate("IN_PROGRESS")}
            >
              Reopen
            </Button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {workpaper.assignedTo && (
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4" /> Assigned to {workpaper.assignedTo}
          </div>
        )}
        {workpaper.dueDate && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            Due {new Date(workpaper.dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        )}
        {workpaper.reportId && (
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" /> Linked to report
          </div>
        )}
      </div>

      {/* Progress */}
      <Card className="border-border bg-card">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-white font-medium">Progress</span>
            <span className="text-muted-foreground">{tickedItems}/{totalItems} items ticked ({progress}%)</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Checklist Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {workpaper.items.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              No items yet. Add items below.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-28">Reference</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead>Notes / Ticked By</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workpaper.items.map((item) => {
                  const sc = ITEM_STATUS_CONFIG[item.status] ?? ITEM_STATUS_CONFIG.PENDING;
                  return (
                    <TableRow key={item.id} className="border-border">
                      <TableCell>
                        <button
                          onClick={() => handleTickItem(item.id, item.status)}
                          className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                            item.status === "TICKED"
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-border hover:border-emerald-500"
                          }`}
                        >
                          {item.status === "TICKED" && <CheckCircle2 className="h-3 w-3 text-black" />}
                        </button>
                      </TableCell>
                      <TableCell className={`text-sm ${item.status === "NA" ? "line-through text-muted-foreground" : "text-white"}`}>
                        {item.description}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.reference ?? "—"}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${sc.color}`}>{sc.label}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.notes && <p className="text-yellow-400">{item.notes}</p>}
                        {item.tickedBy && (
                          <p>
                            {item.tickedBy}
                            {item.tickedAt && (
                              <> · {new Date(item.tickedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
                            )}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setFlagDialog({ itemId: item.id, notes: item.notes ?? "" })}
                            className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Flag item"
                          >
                            <Flag className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleMarkNA(item.id)}
                            className="p-1 text-muted-foreground hover:text-white transition-colors text-xs"
                            title="Mark N/A"
                          >
                            N/A
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Item Form */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Add Item</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="sr-only">Description</Label>
              <Input
                placeholder="Item description…"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddItem(); }}
                className="bg-background border-border"
              />
            </div>
            <div className="w-40">
              <Label className="sr-only">Reference</Label>
              <Input
                placeholder="Reference (optional)"
                value={newRef}
                onChange={(e) => setNewRef(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <Button
              onClick={handleAddItem}
              disabled={addingItem}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
            >
              <Plus className="h-4 w-4" />
              {addingItem ? "Adding…" : "Add"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Flag Dialog */}
      <Dialog open={!!flagDialog} onOpenChange={() => setFlagDialog(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Flag Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Notes (optional)</Label>
              <Textarea
                placeholder="Describe the issue or follow-up required…"
                value={flagDialog?.notes ?? ""}
                onChange={(e) => setFlagDialog((f) => f ? { ...f, notes: e.target.value } : null)}
                className="bg-background border-border resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFlagDialog(null)}>Cancel</Button>
            <Button
              onClick={handleFlagItem}
              className="bg-red-500 hover:bg-red-400 text-white font-semibold gap-1.5"
            >
              <Flag className="h-4 w-4" /> Flag Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
