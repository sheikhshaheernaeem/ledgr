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
import { Loader2, Send, Copy, CheckCircle2, FileText } from "lucide-react";

interface Invite { id: string; vendorName: string; vendorEmail: string; token: string; status: string; expiresAt: string; createdAt: string }
interface Submission { id: string; vendorName: string; amount: number; currency: string; dueDate: string; description: string; status: string; createdAt: string }

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  ACCEPTED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  EXPIRED: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  SUBMITTED: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  CONVERTED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

export default function VendorPortalPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [form, setForm] = useState({ vendorName: "", vendorEmail: "" });
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const [invRes, subRes] = await Promise.all([
        fetch("/api/vendor-portal/invite"),
        fetch("/api/vendor-submissions"),
      ]);
      // invites from GET vendor-portal/invite is not defined, use a placeholder
      // actually no invite GET is defined, so let's store the created ones locally
      setSubmissions(await subRes.json());
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  async function sendInvite() {
    if (!form.vendorName || !form.vendorEmail) { toast.error("Name and email required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/vendor-portal/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNewInviteUrl(data.portalUrl);
      setInvites(prev => [data, ...prev]);
      toast.success("Invite created");
    } catch { toast.error("Failed to create invite"); }
    finally { setSaving(false); }
  }

  async function convertToBill(id: string) {
    setConverting(id);
    try {
      const res = await fetch(`/api/vendor-submissions/${id}/approve`, { method: "POST" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Converted to bill");
      fetchData();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setConverting(null); }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendor Portal</h1>
          <p className="text-muted-foreground">Invite vendors to submit bills directly into Ledgr</p>
        </div>
        <Button onClick={() => { setShowDialog(true); setNewInviteUrl(null); }} className="gap-2"><Send className="h-4 w-4" />Invite Vendor</Button>
      </div>

      {invites.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Invites</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Expires</TableHead><TableHead>Portal Link</TableHead></TableRow></TableHeader>
              <TableBody>
                {invites.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.vendorName}</TableCell>
                    <TableCell className="text-muted-foreground">{inv.vendorEmail}</TableCell>
                    <TableCell><Badge className={statusColors[inv.status] || ""}>{inv.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{new Date(inv.expiresAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/p/vendor/${inv.token}`); toast.success("Link copied"); }} className="gap-1"><Copy className="h-3.5 w-3.5" />Copy</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Submitted Bills</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No bill submissions yet. Invite vendors to submit their invoices.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {submissions.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.vendorName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{sub.description}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(sub.amount)}</TableCell>
                    <TableCell>{new Date(sub.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell><Badge className={statusColors[sub.status] || ""}>{sub.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {sub.status === "SUBMITTED" && (
                        <Button size="sm" onClick={() => convertToBill(sub.id)} disabled={converting === sub.id}>
                          {converting === sub.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}Convert to Bill
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite Vendor</DialogTitle></DialogHeader>
          {newInviteUrl ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-2">Vendor portal link created:</p>
                <p className="text-xs font-mono break-all text-emerald-700 dark:text-emerald-400">{newInviteUrl}</p>
              </div>
              <Button className="w-full gap-2" onClick={() => { navigator.clipboard.writeText(newInviteUrl); toast.success("Copied to clipboard"); }}>
                <Copy className="h-4 w-4" />Copy Link
              </Button>
              <p className="text-xs text-center text-muted-foreground">Share this link with your vendor. It expires in 30 days.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Vendor Name *</Label><Input value={form.vendorName} onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))} placeholder="Acme Supplies Inc." /></div>
                <div className="space-y-1"><Label>Vendor Email *</Label><Input type="email" value={form.vendorEmail} onChange={e => setForm(f => ({ ...f, vendorEmail: e.target.value }))} placeholder="billing@acme.com" /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button onClick={sendInvite} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Send Invite</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
