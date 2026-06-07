"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, Plus, Trash2, Loader2 } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  type: string;
  status: string;
  amount: number | null;
  notes: string | null;
}

const typeStyle: Record<string, string> = {
  FILING: "border-blue-500/30 text-blue-400",
  PAYMENT: "border-red-500/30 text-red-400",
  ESTIMATED: "border-orange-500/30 text-orange-400",
  VAT: "border-purple-500/30 text-purple-400",
};

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function TaxCalendarClient({ events: initial }: { events: Event[] }) {
  const router = useRouter();
  const [events, setEvents] = useState(initial);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", dueDate: "", type: "FILING", amount: "", notes: "" });

  const now = new Date();
  const sorted = [...events].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const active = sorted.filter((e) => e.status !== "COMPLETED");
  const done = sorted.filter((e) => e.status === "COMPLETED");

  async function markComplete(id: string) {
    setLoading(id);
    const res = await fetch(`/api/tax-calendar/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    if (res.ok) {
      setEvents((p) => p.map((e) => e.id === id ? { ...e, status: "COMPLETED" } : e));
      toast.success("Marked as complete");
    } else toast.error("Failed");
    setLoading(null);
  }

  async function deleteEvent(id: string) {
    setLoading(id);
    const res = await fetch(`/api/tax-calendar/${id}`, { method: "DELETE" });
    if (res.ok) { setEvents((p) => p.filter((e) => e.id !== id)); toast.success("Deleted"); }
    else toast.error("Failed");
    setLoading(null);
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    setLoading("new");
    const res = await fetch("/api/tax-calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: form.amount ? parseFloat(form.amount) : null }),
    });
    if (res.ok) {
      const data = await res.json();
      setEvents((p) => [...p, { ...data, dueDate: data.dueDate, createdAt: data.createdAt, updatedAt: data.updatedAt }]);
      toast.success("Event added");
      setAddOpen(false);
      setForm({ title: "", dueDate: "", type: "FILING", amount: "", notes: "" });
    } else toast.error("Failed");
    setLoading(null);
  }

  const renderEvent = (event: Event) => {
    const due = new Date(event.dueDate);
    const isOverdue = due < now && event.status !== "COMPLETED";
    const daysUntil = Math.ceil((due.getTime() - now.getTime()) / 86400000);

    return (
      <div key={event.id} className={`flex items-start gap-4 p-4 rounded-lg border ${isOverdue ? "border-red-500/30 bg-red-500/5" : "border-border bg-card"}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">{event.title}</span>
            <Badge variant="outline" className={typeStyle[event.type] ?? ""}>{event.type}</Badge>
            {isOverdue && <Badge variant="outline" className="border-red-500/30 text-red-400">OVERDUE</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>Due: {due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            {!isOverdue && daysUntil > 0 && <span className="text-emerald-400">{daysUntil}d away</span>}
            {event.amount && <span className="text-foreground font-medium">{fmt(event.amount)}</span>}
          </div>
          {event.notes && <p className="text-xs text-muted-foreground mt-1">{event.notes}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {event.status !== "COMPLETED" && (
            <Button variant="ghost" size="sm" onClick={() => markComplete(event.id)} disabled={loading === event.id} className="text-emerald-400 hover:text-emerald-300 gap-1">
              {loading === event.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Done
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => deleteEvent(event.id)} disabled={loading === event.id}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
          <Plus className="h-4 w-4" /> Add Event
        </Button>
      </div>

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Upcoming & Overdue</p>
          {active.map(renderEvent)}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-2 opacity-60">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Completed</p>
          {done.map(renderEvent)}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Tax Calendar Event</DialogTitle></DialogHeader>
          <form onSubmit={addEvent} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Q2 Estimated Tax Payment" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FILING">Filing</SelectItem>
                    <SelectItem value="PAYMENT">Payment</SelectItem>
                    <SelectItem value="ESTIMATED">Estimated Tax</SelectItem>
                    <SelectItem value="VAT">VAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amount (optional)</Label>
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="$0.00" />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading === "new"} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                {loading === "new" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Add Event
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
