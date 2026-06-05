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
import { Separator } from "@/components/ui/separator";
import {
  Plus, Loader2, Clock, DollarSign, CheckCircle2, Pencil,
  Trash2, FileText, Receipt,
} from "lucide-react";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
}

interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  description: string;
  hourlyRate: number;
  amount: number;
  billable: boolean;
  invoiced: boolean;
  invoiceId: string | null;
  clientId: string | null;
  client: { id: string; name: string } | null;
}

type Tab = "All" | "Billable" | "Unbilled" | "Invoiced";
const TABS: Tab[] = ["All", "Billable", "Unbilled", "Invoiced"];

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtHours = (h: number) =>
  `${h.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}h`;

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Log time dialog
  const [showLog, setShowLog] = useState(false);
  const [logSaving, setLogSaving] = useState(false);
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().split("T")[0],
    clientId: "",
    description: "",
    hours: "",
    hourlyRate: "",
    billable: true,
  });

  // Edit dialog
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editForm, setEditForm] = useState({
    date: "", clientId: "", description: "", hours: "", hourlyRate: "", billable: true,
  });
  const [editSaving, setEditSaving] = useState(false);

  // Invoice dialog
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [invoiceClientId, setInvoiceClientId] = useState("");
  const [invoicing, setInvoicing] = useState(false);

  async function load() {
    setLoading(true);
    const [er, cr] = await Promise.all([fetch("/api/time-entries"), fetch("/api/clients")]);
    if (er.ok) setEntries(await er.json());
    if (cr.ok) setClients(await cr.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function filterEntries(e: TimeEntry) {
    if (tab === "Billable") return e.billable;
    if (tab === "Unbilled") return e.billable && !e.invoiced;
    if (tab === "Invoiced") return e.invoiced;
    return true;
  }

  const filtered = entries.filter(filterEntries);
  const grouped = filtered.reduce<Record<string, TimeEntry[]>>((acc, e) => {
    const key = e.client?.name ?? "No Client";
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const thisMonthUnbilled = entries.filter(
    e => e.billable && !e.invoiced &&
      new Date(e.date) >= monthStart && new Date(e.date) <= monthEnd
  );
  const unbilledHours = thisMonthUnbilled.reduce((s, e) => s + e.hours, 0);
  const unbilledAmount = thisMonthUnbilled.reduce((s, e) => s + e.amount, 0);
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedEntries = entries.filter(e => selected.has(e.id) && e.billable && !e.invoiced);

  async function handleLog() {
    if (!logForm.date || !logForm.hours || !logForm.description) {
      toast.error("Date, hours, and description are required");
      return;
    }
    setLogSaving(true);
    const res = await fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: logForm.date, clientId: logForm.clientId || null,
        description: logForm.description, hours: Number(logForm.hours),
        hourlyRate: Number(logForm.hourlyRate || 0), billable: logForm.billable,
      }),
    });
    setLogSaving(false);
    if (res.ok) {
      toast.success("Time entry logged");
      setShowLog(false);
      setLogForm({ date: new Date().toISOString().split("T")[0], clientId: "", description: "", hours: "", hourlyRate: "", billable: true });
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to log time");
    }
  }

  async function handleEdit() {
    if (!editEntry) return;
    setEditSaving(true);
    const res = await fetch(`/api/time-entries/${editEntry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editForm.date, clientId: editForm.clientId || null,
        description: editForm.description, hours: Number(editForm.hours),
        hourlyRate: Number(editForm.hourlyRate || 0), billable: editForm.billable,
      }),
    });
    setEditSaving(false);
    if (res.ok) {
      toast.success("Entry updated");
      setEditEntry(null);
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to update");
    }
  }

  async function handleDelete(entry: TimeEntry) {
    const res = await fetch(`/api/time-entries/${entry.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Entry deleted"); load(); }
    else { const d = await res.json(); toast.error(d.error || "Cannot delete invoiced entry"); }
  }

  async function handleCreateInvoice() {
    if (!invoiceDueDate) { toast.error("Due date is required"); return; }
    if (!invoiceClientId) { toast.error("Please select a client"); return; }
    setInvoicing(true);
    const res = await fetch("/api/time-entries/to-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timeEntryIds: selectedEntries.map(e => e.id),
        clientId: invoiceClientId,
        dueDate: invoiceDueDate,
      }),
    });
    setInvoicing(false);
    if (res.ok) {
      const { invoiceNumber } = await res.json();
      toast.success(
        <span>Invoice <strong>{invoiceNumber}</strong> created.{" "}
          <Link href="/invoices" className="underline text-emerald-400">View</Link>
        </span>
      );
      setShowInvoice(false);
      setSelected(new Set());
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to create invoice");
    }
  }

  function openCreateInvoice() {
    const clientIds = [...new Set(selectedEntries.map(e => e.clientId).filter(Boolean))] as string[];
    if (clientIds.length === 1) setInvoiceClientId(clientIds[0]);
    else setInvoiceClientId("");
    const due = new Date(now);
    due.setDate(due.getDate() + 30);
    setInvoiceDueDate(due.toISOString().split("T")[0]);
    setShowInvoice(true);
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Time Tracking</h1>
          <p className="text-muted-foreground text-sm mt-1">Log billable hours and convert to invoices</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedEntries.length > 0 && (
            <Button
              variant="outline"
              className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              onClick={openCreateInvoice}
            >
              <Receipt className="h-4 w-4" /> Create Invoice ({selectedEntries.length})
            </Button>
          )}
          <Button
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
            onClick={() => setShowLog(true)}
          >
            <Plus className="h-4 w-4" /> Log Time
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Unbilled Hours (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{fmtHours(unbilledHours)}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Unbilled Amount (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-400">{fmt(unbilledAmount)}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Total Hours Logged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{fmtHours(totalHours)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Entries Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Clock className="h-8 w-8 opacity-40" />
              <p>No time entries found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5"
                      onChange={() => {
                        const ids = filtered.filter(e => e.billable && !e.invoiced).map(e => e.id);
                        if (ids.every(id => selected.has(id))) {
                          setSelected(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
                        } else {
                          setSelected(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
                        }
                      }}
                      checked={
                        filtered.filter(e => e.billable && !e.invoiced).length > 0 &&
                        filtered.filter(e => e.billable && !e.invoiced).every(e => selected.has(e.id))
                      }
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Billable</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(grouped).map(([clientName, clientEntries]) => {
                  const subHours = clientEntries.reduce((s, e) => s + e.hours, 0);
                  const subAmount = clientEntries.reduce((s, e) => s + e.amount, 0);
                  return (
                    <>
                      <TableRow key={`grp-${clientName}`} className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={4}>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {clientName}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{fmtHours(subHours)}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{fmt(subAmount)}</TableCell>
                        <TableCell colSpan={3}></TableCell>
                      </TableRow>
                      {clientEntries.map(entry => (
                        <TableRow key={entry.id} className={selected.has(entry.id) ? "bg-emerald-500/5" : ""}>
                          <TableCell>
                            {entry.billable && !entry.invoiced ? (
                              <input
                                type="checkbox"
                                className="w-3.5 h-3.5"
                                checked={selected.has(entry.id)}
                                onChange={() => toggleSelect(entry.id)}
                              />
                            ) : <span className="w-3.5 h-3.5 block" />}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {entry.client?.name ?? <span className="text-zinc-600">—</span>}
                          </TableCell>
                          <TableCell className="text-sm text-white max-w-[220px] truncate">{entry.description}</TableCell>
                          <TableCell className="text-sm text-right">{fmtHours(entry.hours)}</TableCell>
                          <TableCell className="text-sm text-right text-muted-foreground">{fmt(entry.hourlyRate)}/hr</TableCell>
                          <TableCell className="text-sm text-right text-emerald-400 font-semibold">{fmt(entry.amount)}</TableCell>
                          <TableCell>
                            {entry.billable
                              ? <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">Billable</Badge>
                              : <Badge variant="outline" className="text-xs border-zinc-500/30 text-zinc-400">Non-billable</Badge>}
                          </TableCell>
                          <TableCell>
                            {entry.invoiced
                              ? <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">Invoiced</Badge>
                              : entry.billable
                                ? <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">Pending</Badge>
                                : <Badge variant="outline" className="text-xs border-zinc-500/30 text-zinc-400">—</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {!entry.invoiced && (
                                <>
                                  <Button
                                    variant="ghost" size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
                                    onClick={() => {
                                      setEditEntry(entry);
                                      setEditForm({
                                        date: entry.date.split("T")[0],
                                        clientId: entry.clientId ?? "",
                                        description: entry.description,
                                        hours: String(entry.hours),
                                        hourlyRate: String(entry.hourlyRate),
                                        billable: entry.billable,
                                      });
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                                    onClick={() => handleDelete(entry)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {entry.invoiced && (
                                <Link href="/invoices">
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300">
                                    <FileText className="h-3.5 w-3.5" />
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Log Time Dialog */}
      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date <span className="text-red-400">*</span></Label>
                <Input
                  type="date"
                  value={logForm.date}
                  onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Select value={logForm.clientId} onValueChange={v => setLogForm(f => ({ ...f, clientId: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Client</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-red-400">*</span></Label>
              <Textarea
                placeholder="What did you work on?"
                rows={2}
                value={logForm.description}
                onChange={e => setLogForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Hours <span className="text-red-400">*</span></Label>
                <Input
                  type="number" min="0.25" step="0.25" placeholder="e.g. 2.5"
                  value={logForm.hours}
                  onChange={e => setLogForm(f => ({ ...f, hours: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={logForm.hourlyRate}
                  onChange={e => setLogForm(f => ({ ...f, hourlyRate: e.target.value }))}
                />
              </div>
            </div>
            {logForm.hours && logForm.hourlyRate && (
              <div className="flex items-center justify-between p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-semibold text-emerald-400">
                  {fmt((Number(logForm.hours) || 0) * (Number(logForm.hourlyRate) || 0))}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="billable-log"
                checked={logForm.billable}
                onChange={e => setLogForm(f => ({ ...f, billable: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="billable-log" className="cursor-pointer">Billable</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLog(false)}>Cancel</Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
              onClick={handleLog}
              disabled={logSaving}
            >
              {logSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Log Time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editEntry} onOpenChange={o => !o && setEditEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Time Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Select value={editForm.clientId} onValueChange={v => setEditForm(f => ({ ...f, clientId: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Client</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Hours</Label>
                <Input
                  type="number" min="0.25" step="0.25"
                  value={editForm.hours}
                  onChange={e => setEditForm(f => ({ ...f, hours: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={editForm.hourlyRate}
                  onChange={e => setEditForm(f => ({ ...f, hourlyRate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="billable-edit"
                checked={editForm.billable}
                onChange={e => setEditForm(f => ({ ...f, billable: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="billable-edit" className="cursor-pointer">Billable</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntry(null)}>Cancel</Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
              onClick={handleEdit}
              disabled={editSaving}
            >
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={showInvoice} onOpenChange={o => !o && setShowInvoice(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Invoice from Time Entries</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-md bg-muted/20 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Selected entries:</p>
              {selectedEntries.map(e => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <span className="text-white truncate max-w-[240px]">{e.description}</span>
                  <span className="text-emerald-400 ml-2">{fmt(e.amount)}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-muted-foreground">Total</span>
                <span className="text-emerald-400">{fmt(selectedEntries.reduce((s, e) => s + e.amount, 0))}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Client <span className="text-red-400">*</span></Label>
              <Select value={invoiceClientId} onValueChange={v => setInvoiceClientId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date <span className="text-red-400">*</span></Label>
              <Input
                type="date"
                value={invoiceDueDate}
                onChange={e => setInvoiceDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoice(false)}>Cancel</Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
              onClick={handleCreateInvoice}
              disabled={invoicing}
            >
              {invoicing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
