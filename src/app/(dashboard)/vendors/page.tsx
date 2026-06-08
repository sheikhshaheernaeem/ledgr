"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Pencil, Trash2, Mail, Phone, Loader2, Receipt, Hash } from "lucide-react";
import { toast } from "sonner";

interface Vendor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  taxId: string | null;
  vatNumber: string | null;
  notes: string | null;
  _count: { bills: number };
}

const emptyForm = { name: "", email: "", phone: "", company: "", address: "", taxId: "", vatNumber: "", notes: "" };

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/vendors");
    if (res.ok) setVendors(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditVendor(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(v: Vendor) {
    setEditVendor(v);
    setForm({ name: v.name, email: v.email ?? "", phone: v.phone ?? "", company: v.company ?? "", address: v.address ?? "", taxId: v.taxId ?? "", vatNumber: v.vatNumber ?? "", notes: v.notes ?? "" });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const url = editVendor ? `/api/vendors/${editVendor.id}` : "/api/vendors";
    const method = editVendor ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      toast.success(editVendor ? "Vendor updated" : "Vendor created");
      setDialogOpen(false);
      load();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Failed to save vendor");
    }
    setSaving(false);
  }

  async function deleteVendor() {
    if (!deleteId) return;
    const res = await fetch(`/api/vendors/${deleteId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Vendor deleted"); load(); }
    else toast.error("Failed to delete vendor");
    setDeleteId(null);
  }

  const filtered = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.email?.toLowerCase().includes(search.toLowerCase()) ||
    v.company?.toLowerCase().includes(search.toLowerCase()) ||
    v.taxId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
          <p className="text-muted-foreground mt-1">{vendors.length} vendor{vendors.length !== 1 ? "s" : ""} — manage your accounts payable contacts</p>
        </div>
        <Button onClick={openNew} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
          <Plus className="h-4 w-4" /> New Vendor
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Vendors <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span></CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No vendors found</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openNew}>Add your first vendor</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Tax ID / VAT</TableHead>
                  <TableHead>Bills</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{v.name}</p>
                        {v.company && <p className="text-xs text-muted-foreground">{v.company}</p>}
                        {v.address && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{v.address}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {v.email && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{v.email}</div>}
                      {v.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{v.phone}</div>}
                    </TableCell>
                    <TableCell>
                      {v.taxId && <div className="flex items-center gap-1 text-xs"><Hash className="h-3 w-3 text-muted-foreground" /><span className="font-mono">{v.taxId}</span></div>}
                      {v.vatNumber && <div className="text-xs text-muted-foreground">VAT: {v.vatNumber}</div>}
                      {!v.taxId && !v.vatNumber && <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs border-border">
                        <Receipt className="h-3 w-3 mr-1" />{v._count.bills}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(v)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(v.id)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editVendor ? "Edit Vendor" : "New Vendor"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Vendor or company name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="vendor@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 8900" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tax ID / NTN</Label>
                <Input value={form.taxId} onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} placeholder="e.g. 1234567-8" />
              </div>
              <div className="space-y-1.5">
                <Label>VAT / GST Number</Label>
                <Input value={form.vatNumber} onChange={e => setForm(f => ({ ...f, vatNumber: e.target.value }))} placeholder="e.g. GB123456789" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City, Country" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editVendor ? "Save Changes" : "Create Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Vendor?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will remove the vendor record. Existing bills will be unlinked.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteVendor}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
