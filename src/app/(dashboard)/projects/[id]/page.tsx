"use client";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, CheckSquare, DollarSign, TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Task { id: string; name: string; status: string; assignedTo: string | null; estimatedHours: number | null; dueDate: string | null }
interface Cost { id: string; date: string; description: string; category: string; amount: number; billable: boolean }
interface Profitability { project: { name: string; code: string; budget: number; status: string; billingType: string }; profitability: { totalCosts: number; billableCosts: number; budget: number; budgetUtilization: number; grossProfit: number; grossMargin: number; costsByCategory: Record<string, number> } }

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const taskColors: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  DONE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [profitability, setProfitability] = useState<Profitability | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taskForm, setTaskForm] = useState({ name: "", status: "TODO", assignedTo: "", estimatedHours: "", dueDate: "" });
  const [costForm, setCostForm] = useState({ date: new Date().toISOString().split("T")[0], description: "", category: "LABOR", amount: "", billable: true });

  async function fetchAll() {
    setLoading(true);
    try {
      const [profRes, taskRes, costRes] = await Promise.all([
        fetch(`/api/projects/${id}/profitability`),
        fetch(`/api/projects/${id}/tasks`),
        fetch(`/api/projects/${id}/costs`),
      ]);
      setProfitability(await profRes.json());
      setTasks(await taskRes.json());
      setCosts(await costRes.json());
    } catch { toast.error("Failed to load project"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAll(); }, [id]);

  async function addTask() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(taskForm) });
      if (!res.ok) throw new Error();
      toast.success("Task added");
      setShowTaskDialog(false);
      fetchAll();
    } catch { toast.error("Failed to add task"); }
    finally { setSaving(false); }
  }

  async function addCost() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}/costs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(costForm) });
      if (!res.ok) throw new Error();
      toast.success("Cost added");
      setShowCostDialog(false);
      fetchAll();
    } catch { toast.error("Failed to add cost"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const p = profitability?.profitability;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/projects"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{profitability?.project.name || "Project"}</h1>
          <p className="text-muted-foreground">{profitability?.project.code} · {profitability?.project.billingType}</p>
        </div>
      </div>

      {p && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Budget</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fmt(p.budget)}</p>
              <Progress value={Math.min(100, p.budgetUtilization)} className="mt-2 h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">{p.budgetUtilization.toFixed(1)}% used</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Costs</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-red-600">{fmt(p.totalCosts)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Gross Profit</CardTitle></CardHeader>
            <CardContent><p className={`text-2xl font-bold ${p.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(p.grossProfit)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Gross Margin</CardTitle></CardHeader>
            <CardContent><p className={`text-2xl font-bold ${p.grossMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>{p.grossMargin.toFixed(1)}%</p></CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2"><CheckSquare className="h-5 w-5" />Tasks</CardTitle>
            <Button size="sm" onClick={() => setShowTaskDialog(true)} className="gap-1"><Plus className="h-3.5 w-3.5" />Add Task</Button>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? <p className="text-center text-muted-foreground py-4">No tasks yet</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Status</TableHead><TableHead>Assigned</TableHead><TableHead className="text-right">Est. Hours</TableHead></TableRow></TableHeader>
                <TableBody>
                  {tasks.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell><Badge className={taskColors[t.status] || ""}>{t.status.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{t.assignedTo || "—"}</TableCell>
                      <TableCell className="text-right">{t.estimatedHours || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Costs</CardTitle>
            <Button size="sm" onClick={() => setShowCostDialog(true)} className="gap-1"><Plus className="h-3.5 w-3.5" />Add Cost</Button>
          </CardHeader>
          <CardContent>
            {costs.length === 0 ? <p className="text-center text-muted-foreground py-4">No costs yet</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead>Billable</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {costs.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.description}</TableCell>
                      <TableCell className="text-muted-foreground">{c.category}</TableCell>
                      <TableCell>{c.billable ? <Badge variant="default">Billable</Badge> : <Badge variant="secondary">Internal</Badge>}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(c.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Task Name *</Label><Input value={taskForm.name} onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))} placeholder="Design mockups" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Status</Label><Select value={taskForm.status} onValueChange={v => setTaskForm(f => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TODO">To Do</SelectItem><SelectItem value="IN_PROGRESS">In Progress</SelectItem><SelectItem value="DONE">Done</SelectItem></SelectContent></Select></div>
              <div className="space-y-1"><Label>Assigned To</Label><Input value={taskForm.assignedTo} onChange={e => setTaskForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="John Smith" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Estimated Hours</Label><Input type="number" value={taskForm.estimatedHours} onChange={e => setTaskForm(f => ({ ...f, estimatedHours: e.target.value }))} placeholder="8" /></div>
              <div className="space-y-1"><Label>Due Date</Label><Input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>Cancel</Button>
            <Button onClick={addTask} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCostDialog} onOpenChange={setShowCostDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Cost</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Description *</Label><Input value={costForm.description} onChange={e => setCostForm(f => ({ ...f, description: e.target.value }))} placeholder="Developer hours - John" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Category</Label><Select value={costForm.category} onValueChange={v => setCostForm(f => ({ ...f, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="LABOR">Labor</SelectItem><SelectItem value="MATERIALS">Materials</SelectItem><SelectItem value="OVERHEAD">Overhead</SelectItem><SelectItem value="SUBCONTRACT">Subcontract</SelectItem></SelectContent></Select></div>
              <div className="space-y-1"><Label>Amount *</Label><Input type="number" value={costForm.amount} onChange={e => setCostForm(f => ({ ...f, amount: e.target.value }))} placeholder="1500" /></div>
            </div>
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={costForm.date} onChange={e => setCostForm(f => ({ ...f, date: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCostDialog(false)}>Cancel</Button>
            <Button onClick={addCost} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Add Cost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
