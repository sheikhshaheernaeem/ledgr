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
import { Plus, Loader2, Building2, GitBranch, Pencil, Trash2 } from "lucide-react";

interface Entity {
  id: string;
  name: string;
  code: string;
  type: string;
  currency: string;
  taxId: string | null;
  address: string | null;
  isActive: boolean;
  parentId: string | null;
  parent: { name: string } | null;
  children: Entity[];
  createdAt: string;
}

const typeColors: Record<string, string> = {
  PARENT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  SUBSIDIARY: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  DIVISION: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editEntity, setEditEntity] = useState<Entity | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", type: "SUBSIDIARY", currency: "USD", taxId: "", address: "", parentId: "" });

  async function fetchEntities() {
    setLoading(true);
    try {
      const res = await fetch("/api/entities");
      const data = await res.json();
      setEntities(Array.isArray(data) ? data : []);
    } catch { toast.error("Failed to load entities"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchEntities(); }, []);

  function openNew() {
    setEditEntity(null);
    setForm({ name: "", code: "", type: "SUBSIDIARY", currency: "USD", taxId: "", address: "", parentId: "" });
    setShowDialog(true);
  }

  function openEdit(e: Entity) {
    setEditEntity(e);
    setForm({ name: e.name, code: e.code, type: e.type, currency: e.currency, taxId: e.taxId || "", address: e.address || "", parentId: e.parentId || "" });
    setShowDialog(true);
  }

  async function handleSave() {
    if (!form.name || !form.code) { toast.error("Name and code are required"); return; }
    setSaving(true);
    try {
      const url = editEntity ? `/api/entities/${editEntity.id}` : "/api/entities";
      const method = editEntity ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, parentId: form.parentId || null }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(editEntity ? "Entity updated" : "Entity created");
      setShowDialog(false);
      fetchEntities();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this entity?")) return;
    try {
      const res = await fetch(`/api/entities/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Entity deleted");
      fetchEntities();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  const parents = entities.filter(e => e.type === "PARENT" || e.type === "SUBSIDIARY");

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Entities & Subsidiaries</h1>
          <p className="text-muted-foreground">Manage your multi-entity structure and hierarchy</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />New Entity</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Entity Hierarchy</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : entities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No entities yet. Add your first entity to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Tax ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.map(entity => (
                  <TableRow key={entity.id}>
                    <TableCell className="font-medium">{entity.name}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{entity.code}</code></TableCell>
                    <TableCell><Badge className={typeColors[entity.type] || ""}>{entity.type}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{entity.parent?.name || "—"}</TableCell>
                    <TableCell>{entity.currency}</TableCell>
                    <TableCell className="text-muted-foreground">{entity.taxId || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={entity.isActive ? "default" : "secondary"}>{entity.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(entity)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(entity.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editEntity ? "Edit Entity" : "New Entity"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Corp" />
              </div>
              <div className="space-y-1">
                <Label>Code *</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="ACME" maxLength={10} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v: string | null) => setForm(f => ({ ...f, type: v ?? '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PARENT">Parent</SelectItem>
                    <SelectItem value="SUBSIDIARY">Subsidiary</SelectItem>
                    <SelectItem value="DIVISION">Division</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v: string | null) => setForm(f => ({ ...f, currency: v ?? '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {parents.length > 0 && (
              <div className="space-y-1">
                <Label>Parent Entity</Label>
                <Select value={form.parentId} onValueChange={(v: string | null) => setForm(f => ({ ...f, parentId: v ?? '' }))}>
                  <SelectTrigger><SelectValue placeholder="No parent (top level)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No parent</SelectItem>
                    {parents.filter(p => p.id !== editEntity?.id).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Tax ID / EIN</Label>
              <Input value={form.taxId} onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} placeholder="12-3456789" />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St, City, State" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editEntity ? "Save Changes" : "Create Entity"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
