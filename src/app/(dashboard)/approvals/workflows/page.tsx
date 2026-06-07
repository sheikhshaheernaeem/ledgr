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
import { Plus, Loader2, Settings2, Trash2, ChevronDown, ChevronRight } from "lucide-react";

interface Step { stepOrder: number; approverRole: string; approverEmail: string; minAmount: string; maxAmount: string }
interface Workflow { id: string; name: string; entityType: string; isActive: boolean; steps: Step[]; _count: { requests: number } }

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", entityType: "INVOICE", steps: [{ stepOrder: 1, approverRole: "ADMIN", approverEmail: "", minAmount: "", maxAmount: "" }] });

  async function fetchWorkflows() {
    setLoading(true);
    try {
      const res = await fetch("/api/approval-workflows");
      setWorkflows(await res.json());
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchWorkflows(); }, []);

  function addStep() {
    setForm(f => ({ ...f, steps: [...f.steps, { stepOrder: f.steps.length + 1, approverRole: "ADMIN", approverEmail: "", minAmount: "", maxAmount: "" }] }));
  }

  function removeStep(idx: number) {
    setForm(f => ({ ...f, steps: f.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepOrder: i + 1 })) }));
  }

  async function handleCreate() {
    if (!form.name) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/approval-workflows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success("Workflow created");
      setShowDialog(false);
      fetchWorkflows();
    } catch { toast.error("Failed to create"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this workflow?")) return;
    try {
      await fetch(`/api/approval-workflows/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      fetchWorkflows();
    } catch { toast.error("Failed"); }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approval Workflows</h1>
          <p className="text-muted-foreground">Configure multi-step approval workflows for transactions</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="h-4 w-4" />New Workflow</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" />Workflows</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No workflows yet. Create your first approval workflow.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {workflows.map(wf => (
                <div key={wf.id} className="border rounded-lg">
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50" onClick={() => setExpanded(expanded === wf.id ? null : wf.id)}>
                    <div className="flex items-center gap-3">
                      {expanded === wf.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <div>
                        <p className="font-medium">{wf.name}</p>
                        <p className="text-xs text-muted-foreground">{wf.entityType} · {wf.steps.length} step{wf.steps.length !== 1 ? "s" : ""} · {wf._count.requests} requests</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={wf.isActive ? "default" : "secondary"}>{wf.isActive ? "Active" : "Inactive"}</Badge>
                      <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); handleDelete(wf.id); }} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {expanded === wf.id && (
                    <div className="border-t p-4 bg-muted/20">
                      <Table>
                        <TableHeader><TableRow><TableHead>Step</TableHead><TableHead>Role</TableHead><TableHead>Email</TableHead><TableHead>Min Amount</TableHead><TableHead>Max Amount</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {wf.steps.map((s, i) => (
                            <TableRow key={i}>
                              <TableCell>{s.stepOrder}</TableCell>
                              <TableCell><Badge variant="outline">{s.approverRole}</Badge></TableCell>
                              <TableCell className="text-muted-foreground">{s.approverEmail || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{s.minAmount ? `$${s.minAmount}` : "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{s.maxAmount ? `$${s.maxAmount}` : "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>New Approval Workflow</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Workflow Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Invoice Approval" /></div>
              <div className="space-y-1"><Label>Entity Type</Label><Select value={form.entityType} onValueChange={v => setForm(f => ({ ...f, entityType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INVOICE">Invoice</SelectItem><SelectItem value="BILL">Bill</SelectItem><SelectItem value="JOURNAL_ENTRY">Journal Entry</SelectItem><SelectItem value="EXPENSE_CLAIM">Expense Claim</SelectItem><SelectItem value="PAYROLL">Payroll</SelectItem></SelectContent></Select></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><Label>Approval Steps</Label><Button size="sm" variant="outline" onClick={addStep}><Plus className="h-3.5 w-3.5 mr-1" />Add Step</Button></div>
              <div className="space-y-2">
                {form.steps.map((step, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between"><p className="text-sm font-medium">Step {step.stepOrder}</p>{form.steps.length > 1 && <Button size="icon" variant="ghost" onClick={() => removeStep(idx)} className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button>}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={step.approverRole} onValueChange={v => setForm(f => ({ ...f, steps: f.steps.map((s, i) => i === idx ? { ...s, approverRole: v } : s) }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="OWNER">Owner</SelectItem><SelectItem value="ADMIN">Admin</SelectItem><SelectItem value="CFO">CFO</SelectItem><SelectItem value="CONTROLLER">Controller</SelectItem><SelectItem value="MANAGER">Manager</SelectItem></SelectContent></Select>
                      <Input value={step.approverEmail} onChange={e => setForm(f => ({ ...f, steps: f.steps.map((s, i) => i === idx ? { ...s, approverEmail: e.target.value } : s) }))} placeholder="approver@company.com" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Workflow</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
