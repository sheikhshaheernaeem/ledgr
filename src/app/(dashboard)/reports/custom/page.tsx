"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, BarChart2, Play, Pencil, Trash2 } from "lucide-react";

interface CustomReport { id: string; name: string; description: string | null; reportType: string; isPublic: boolean; lastRunAt: string | null; createdAt: string }

export default function CustomReportsPage() {
  const [reports, setReports] = useState<CustomReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [runResult, setRunResult] = useState<{ name: string; count: number; data: unknown[] } | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", reportType: "TABLE", dataSource: "transactions", limit: "100" });

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/custom");
      setReports(await res.json());
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchReports(); }, []);

  async function handleCreate() {
    if (!form.name) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/reports/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, description: form.description, reportType: form.reportType, configJson: { dataSource: form.dataSource, limit: parseInt(form.limit) } }),
      });
      if (!res.ok) throw new Error();
      toast.success("Report saved");
      setShowDialog(false);
      fetchReports();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  }

  async function runReport(id: string, name: string) {
    setRunning(id);
    try {
      const res = await fetch(`/api/reports/custom/${id}/run`, { method: "POST" });
      const data = await res.json();
      setRunResult({ name, count: data.count, data: data.data });
    } catch { toast.error("Failed to run report"); }
    finally { setRunning(null); }
  }

  async function deleteReport(id: string) {
    if (!confirm("Delete this report?")) return;
    try {
      await fetch(`/api/reports/custom/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      fetchReports();
      if (runResult) setRunResult(null);
    } catch { toast.error("Failed"); }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Reports</h1>
          <p className="text-muted-foreground">Build and run custom data reports</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="h-4 w-4" />New Report</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" />Saved Reports</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No custom reports yet. Create your first report.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Last Run</TableHead><TableHead>Visibility</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {reports.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium">{r.name}</p>
                      {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.reportType}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{r.lastRunAt ? new Date(r.lastRunAt).toLocaleString() : "Never"}</TableCell>
                    <TableCell><Badge variant={r.isPublic ? "default" : "secondary"}>{r.isPublic ? "Public" : "Private"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" onClick={() => runReport(r.id, r.name)} disabled={running === r.id} className="gap-1">
                          {running === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}Run
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteReport(r.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {runResult && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{runResult.name} — {runResult.count} rows</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setRunResult(null)}>Close</Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <pre className="text-xs font-mono bg-muted p-4 rounded-lg">{JSON.stringify(runResult.data.slice(0, 10), null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Custom Report</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Report Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Monthly Revenue Report" /></div>
            <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data Source</Label>
                <Select value={form.dataSource} onValueChange={(v: string | null) => setForm(f => ({ ...f, dataSource: v ?? '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transactions">Transactions</SelectItem>
                    <SelectItem value="invoices">Invoices</SelectItem>
                    <SelectItem value="bills">Bills</SelectItem>
                    <SelectItem value="journal_entries">Journal Entries</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Report Type</Label>
                <Select value={form.reportType} onValueChange={(v: string | null) => setForm(f => ({ ...f, reportType: v ?? '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TABLE">Table</SelectItem>
                    <SelectItem value="CHART">Chart</SelectItem>
                    <SelectItem value="PIVOT">Pivot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Max Rows</Label><Input type="number" value={form.limit} onChange={e => setForm(f => ({ ...f, limit: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
