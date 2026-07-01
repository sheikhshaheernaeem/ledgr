"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen, Plus, Trash2, FileText, FileSignature, Pencil, Loader2, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
  company: string | null;
}

interface Document {
  id: string;
  name: string;
  type: string;
  content: string | null;
  mimeType: string;
  status: string;
  clientId: string | null;
  client: { id: string; name: string; company: string | null } | null;
  notes: string | null;
  sentAt: string | null;
  signedAt: string | null;
  createdAt: string;
}

const DOC_TYPES = [
  { value: "ENGAGEMENT_LETTER", label: "Engagement Letter" },
  { value: "CONTRACT", label: "Contract" },
  { value: "REPORT", label: "Report" },
  { value: "OTHER", label: "Other" },
];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "border-yellow-500/30 text-yellow-400",
  SENT: "border-cyan-500/30 text-cyan-400",
  SIGNED: "border-emerald-500/30 text-emerald-400",
};

const ENGAGEMENT_LETTER_TEMPLATE = `BOOKKEEPING ENGAGEMENT LETTER

Date: [DATE]

Dear [CLIENT NAME],

This letter confirms the terms of our bookkeeping engagement.

SCOPE OF SERVICES
We will provide the following bookkeeping services on your behalf:
• Monthly transaction categorization and reconciliation
• Monthly Profit & Loss statements
• Quarterly financial reviews
• Year-end financial summaries

FEES
Monthly fee: $[AMOUNT] per month, billed on the 1st of each month.

CLIENT RESPONSIBILITIES
You agree to:
• Provide timely access to bank statements and financial records
• Review and approve monthly P&L reports within 5 business days
• Notify us of any unusual transactions or business changes

CONFIDENTIALITY
All financial information shared with us is kept strictly confidential and will not be disclosed to third parties without your consent.

TERM
This engagement begins [START DATE] and continues on a month-to-month basis. Either party may terminate with 30 days written notice.

By approving this letter, you agree to the terms above.

Best regards,

[YOUR NAME / COMPANY]
[EMAIL]
[DATE]`;

const emptyForm = { name: "", type: "ENGAGEMENT_LETTER", content: "", notes: "", clientId: "" };

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [docsRes, clientsRes] = await Promise.all([fetch("/api/documents"), fetch("/api/clients")]);
    if (docsRes.ok) setDocuments(await docsRes.json());
    if (clientsRes.ok) setClients(await clientsRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditDoc(null);
    setForm({ ...emptyForm, content: ENGAGEMENT_LETTER_TEMPLATE });
    setDialogOpen(true);
  }

  function openEdit(d: Document) {
    setEditDoc(d);
    setForm({ name: d.name, type: d.type, content: d.content ?? "", notes: d.notes ?? "", clientId: d.clientId ?? "" });
    setDialogOpen(true);
  }

  function handleTypeChange(type: string) {
    const template = type === "ENGAGEMENT_LETTER" ? ENGAGEMENT_LETTER_TEMPLATE : "";
    setForm(f => ({ ...f, type, content: f.content || template }));
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const url = editDoc ? `/api/documents/${editDoc.id}` : "/api/documents";
    const method = editDoc ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, clientId: form.clientId || null }),
    });
    if (res.ok) {
      toast.success(editDoc ? "Document updated" : "Document created");
      setDialogOpen(false);
      load();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Failed to save");
    }
    setSaving(false);
  }

  async function markSent(doc: Document) {
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SENT" }),
    });
    if (res.ok) { toast.success("Marked as sent"); load(); }
    else toast.error("Failed to update");
  }

  async function markSigned(doc: Document) {
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SIGNED", signedAt: new Date().toISOString() }),
    });
    if (res.ok) { toast.success("Marked as signed"); load(); }
    else toast.error("Failed to update");
  }

  async function deleteDoc() {
    if (!deleteId) return;
    const res = await fetch(`/api/documents/${deleteId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Document deleted"); load(); }
    else toast.error("Failed to delete");
    setDeleteId(null);
  }

  const filtered = documents.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.client?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "ALL" || d.type === typeFilter;
    return matchSearch && matchType;
  });

  const typeIcon = (type: string) => type === "ENGAGEMENT_LETTER" || type === "CONTRACT" ? FileSignature : FileText;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground mt-1">Engagement letters, contracts, and signed documents</p>
        </div>
        <Button onClick={openNew} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
          <Plus className="h-4 w-4" /> New Document
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "ALL")}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-20 text-center">
            <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">{search || typeFilter !== "ALL" ? "No documents match your filters" : "No documents yet"}</p>
            {!search && typeFilter === "ALL" && (
              <Button onClick={openNew} variant="outline" size="sm" className="mt-3 gap-2">
                <Plus className="h-4 w-4" /> Create your first document
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => {
            const Icon = typeIcon(doc.type);
            return (
              <Card key={doc.id} className="border-border bg-card hover:border-emerald-500/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground truncate">{doc.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {DOC_TYPES.find(t => t.value === doc.type)?.label ?? doc.type}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${STATUS_STYLES[doc.status] ?? "border-border text-muted-foreground"}`}>
                          {doc.status.toLowerCase()}
                        </Badge>
                        {doc.status === "SIGNED" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {doc.client && <span>{doc.client.name}{doc.client.company ? ` · ${doc.client.company}` : ""}</span>}
                        <span>{new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        {doc.signedAt && <span className="text-emerald-400">Signed {new Date(doc.signedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setViewDoc(doc)}>View</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(doc)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {doc.status === "DRAFT" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1 text-cyan-400 hover:text-cyan-300" onClick={() => markSent(doc)}>
                          <Send className="h-3 w-3" /> Sent
                        </Button>
                      )}
                      {doc.status === "SENT" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1 text-emerald-400 hover:text-emerald-300" onClick={() => markSigned(doc)}>
                          <CheckCircle2 className="h-3 w-3" /> Signed
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(doc.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editDoc ? "Edit Document" : "New Document"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Document Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Engagement Letter — Acme Corp Q1 2026" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => handleTypeChange(v ?? "OTHER")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={form.clientId || "none"} onValueChange={v => setForm(f => ({ ...f, clientId: v == null || v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Content</Label>
                <Textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Document content..."
                  rows={16}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Internal Notes</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes (not shown to client)..." />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editDoc ? "Save Changes" : "Create Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={open => !open && setViewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewDoc?.name}
              {viewDoc && <Badge variant="outline" className={`text-xs ${STATUS_STYLES[viewDoc.status] ?? ""}`}>{viewDoc.status.toLowerCase()}</Badge>}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {viewDoc?.client && (
              <p className="text-xs text-muted-foreground mb-3">Client: {viewDoc.client.name}{viewDoc.client.company ? ` · ${viewDoc.client.company}` : ""}</p>
            )}
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed bg-muted/20 p-4 rounded-lg border border-border">
              {viewDoc?.content ?? <span className="text-muted-foreground italic">No content</span>}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDoc(null)}>Close</Button>
            {viewDoc && viewDoc.status === "DRAFT" && (
              <Button className="bg-cyan-500 hover:bg-cyan-400 text-foreground gap-2" onClick={() => { markSent(viewDoc); setViewDoc(null); }}>
                <Send className="h-4 w-4" /> Mark as Sent
              </Button>
            )}
            {viewDoc && viewDoc.status === "SENT" && (
              <Button className="bg-emerald-500 hover:bg-emerald-400 text-black gap-2" onClick={() => { markSigned(viewDoc); setViewDoc(null); }}>
                <CheckCircle2 className="h-4 w-4" /> Mark as Signed
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete document?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteDoc}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
