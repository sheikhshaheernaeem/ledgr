"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, FileText, Calendar, User, ChevronRight, Trash2, CheckCircle2,
} from "lucide-react";

interface Workpaper {
  id: string;
  name: string;
  description: string | null;
  status: string;
  assignedTo: string | null;
  dueDate: string | null;
  reportId: string | null;
  createdAt: string;
  totalItems: number;
  tickedItems: number;
}

interface Report {
  id: string;
  month: number;
  year: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: { label: "In Progress", color: "border-yellow-500/30 text-yellow-400" },
  REVIEWED: { label: "Reviewed", color: "border-blue-500/30 text-blue-400" },
  SIGNED_OFF: { label: "Signed Off", color: "border-emerald-500/30 text-emerald-400" },
};

export default function WorkpapersPage() {
  const [workpapers, setWorkpapers] = useState<Workpaper[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    reportId: "",
    dueDate: "",
    assignedTo: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWorkpapers();
    fetchReports();
  }, []);

  async function fetchWorkpapers() {
    setLoading(true);
    try {
      const res = await fetch("/api/workpapers");
      if (!res.ok) throw new Error("Failed to load");
      setWorkpapers(await res.json());
    } catch {
      toast.error("Failed to load workpapers");
    } finally {
      setLoading(false);
    }
  }

  async function fetchReports() {
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) return;
      setReports(await res.json());
    } catch {}
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/workpapers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          reportId: form.reportId || undefined,
          dueDate: form.dueDate || undefined,
          assignedTo: form.assignedTo || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      toast.success("Workpaper created");
      setDialogOpen(false);
      setForm({ name: "", description: "", reportId: "", dueDate: "", assignedTo: "" });
      fetchWorkpapers();
    } catch {
      toast.error("Failed to create workpaper");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusUpdate(id: string, status: string) {
    try {
      const res = await fetch(`/api/workpapers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
      fetchWorkpapers();
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/workpapers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Workpaper deleted");
      setDeleteId(null);
      fetchWorkpapers();
    } catch {
      toast.error("Failed to delete workpaper");
    }
  }

  const filtered = tab === "ALL"
    ? workpapers
    : workpapers.filter((w) => w.status === tab);

  const monthName = (r: Report) =>
    new Date(r.year, r.month - 1).toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workpapers</h1>
          <p className="text-muted-foreground mt-1">Audit-ready checklists for period-end close</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
        >
          <Plus className="h-4 w-4" /> New Workpaper
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="IN_PROGRESS">In Progress</TabsTrigger>
          <TabsTrigger value="REVIEWED">Reviewed</TabsTrigger>
          <TabsTrigger value="SIGNED_OFF">Signed Off</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No workpapers yet</p>
            <p className="text-sm mt-1">Create a workpaper to track period-end tasks</p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
            >
              <Plus className="h-4 w-4" /> New Workpaper
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((wp) => {
            const cfg = STATUS_CONFIG[wp.status] ?? STATUS_CONFIG.IN_PROGRESS;
            const progress = wp.totalItems > 0 ? Math.round((wp.tickedItems / wp.totalItems) * 100) : 0;
            return (
              <Card key={wp.id} className="border-border bg-card hover:border-emerald-500/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{wp.name}</CardTitle>
                    <Badge variant="outline" className={`text-xs shrink-0 ${cfg.color}`}>
                      {cfg.label}
                    </Badge>
                  </div>
                  {wp.description && (
                    <CardDescription className="line-clamp-2">{wp.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Progress */}
                  {wp.totalItems > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{wp.tickedItems}/{wp.totalItems} items ticked</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {wp.assignedTo && (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3" /> {wp.assignedTo}
                      </div>
                    )}
                    {wp.dueDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        Due {new Date(wp.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link href={`/workpapers/${wp.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1 text-xs">
                        Open <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                    {wp.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        onClick={() => handleStatusUpdate(wp.id, "REVIEWED")}
                      >
                        Mark Reviewed
                      </Button>
                    )}
                    {wp.status === "REVIEWED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => handleStatusUpdate(wp.id, "SIGNED_OFF")}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Sign Off
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-red-400 px-2"
                      onClick={() => setDeleteId(wp.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">New Workpaper</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Name *</Label>
              <Input
                placeholder="e.g. December 2025 Month-End Close"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Description</Label>
              <Textarea
                placeholder="Optional description or scope notes"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="bg-background border-border resize-none"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Link to Report (optional)</Label>
              <Select value={form.reportId} onValueChange={(v) => setForm((f) => ({ ...f, reportId: v ?? "" }))}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select a report…" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="">— None —</SelectItem>
                  {reports.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{monthName(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Assigned To</Label>
                <Input
                  placeholder="Name or email"
                  value={form.assignedTo}
                  onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
            >
              {saving ? "Creating…" : "Create Workpaper"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Workpaper?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the workpaper and all its items. This cannot be undone.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
