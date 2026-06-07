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
import { Plus, Loader2, ShieldCheck, AlertTriangle, Trash2 } from "lucide-react";

interface SodRule { id: string; name: string; description: string | null; action1: string; action2: string; isActive: boolean; createdAt: string }
interface SodViolation { id: string; ruleId: string; actorId: string; action: string; entityId: string; resolved: boolean; detectedAt: string }

const ACTIONS = ["CREATE_INVOICE", "APPROVE_INVOICE", "CREATE_BILL", "APPROVE_BILL", "CREATE_JOURNAL", "POST_JOURNAL", "CREATE_PAYMENT", "APPROVE_PAYMENT", "CREATE_PAYROLL", "APPROVE_PAYROLL", "ACCESS_BANK", "RECONCILE_BANK"];

export default function SodPage() {
  const [rules, setRules] = useState<SodRule[]>([]);
  const [violations, setViolations] = useState<SodViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", action1: "CREATE_INVOICE", action2: "APPROVE_INVOICE" });

  async function fetchData() {
    setLoading(true);
    try {
      const [rulesRes, violationsRes] = await Promise.all([
        fetch("/api/sod-rules"),
        fetch("/api/sod-violations"),
      ]);
      setRules(await rulesRes.json());
      setViolations(await violationsRes.json());
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleCreate() {
    if (!form.name) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/sod-rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success("Rule created");
      setShowDialog(false);
      fetchData();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this rule?")) return;
    try {
      await fetch(`/api/sod-rules/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      fetchData();
    } catch { toast.error("Failed"); }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Segregation of Duties</h1>
          <p className="text-muted-foreground">Define and monitor SoD rules to prevent fraud and errors</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="h-4 w-4" />New Rule</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Rules</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{rules.filter(r => r.isActive).length}</p></CardContent>
        </Card>
        <Card className={violations.filter(v => !v.resolved).length > 0 ? "border-red-200 dark:border-red-800" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">{violations.filter(v => !v.resolved).length > 0 && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}Open Violations</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${violations.filter(v => !v.resolved).length > 0 ? "text-red-600" : ""}`}>{violations.filter(v => !v.resolved).length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Resolved Violations</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{violations.filter(v => v.resolved).length}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />SoD Rules</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No SoD rules defined. Create your first rule to prevent conflicts of interest.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Rule Name</TableHead><TableHead>Action 1</TableHead><TableHead>Action 2</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {rules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <p className="font-medium">{rule.name}</p>
                      {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                    </TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{rule.action1}</code></TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{rule.action2}</code></TableCell>
                    <TableCell><Badge variant={rule.isActive ? "default" : "secondary"}>{rule.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(rule.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {violations.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />Violations Log</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Detected</TableHead><TableHead>Actor</TableHead><TableHead>Conflicting Actions</TableHead><TableHead>Entity</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {violations.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="text-muted-foreground">{new Date(v.detectedAt).toLocaleString()}</TableCell>
                    <TableCell><code className="text-xs">{v.actorId.slice(0, 8)}...</code></TableCell>
                    <TableCell className="text-sm">{v.action}</TableCell>
                    <TableCell><code className="text-xs">{v.entityId.slice(0, 8)}...</code></TableCell>
                    <TableCell><Badge variant={v.resolved ? "secondary" : "destructive"}>{v.resolved ? "Resolved" : "Open"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New SoD Rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Rule Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="No invoice create and approve" /></div>
            <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="A user should not be able to create and approve invoices" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Action 1 (Conflicting)</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.action1} onChange={e => setForm(f => ({ ...f, action1: e.target.value }))}>
                  {ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Action 2 (Conflicting)</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.action2} onChange={e => setForm(f => ({ ...f, action2: e.target.value }))}>
                  {ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">This rule will flag any user who performs both of these actions on the same entity.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
