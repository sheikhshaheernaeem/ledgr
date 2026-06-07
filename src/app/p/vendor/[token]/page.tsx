"use client";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface PortalInfo { vendorName: string; vendorEmail: string; status: string; company: { name: string | null; logo: string | null }; expiresAt: string }

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function VendorPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [portalInfo, setPortalInfo] = useState<PortalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ amount: "", currency: "USD", dueDate: "", description: "", attachmentData: "" });

  useEffect(() => {
    fetch(`/api/vendor-portal/${token}`)
      .then(res => {
        if (!res.ok) return res.json().then(d => Promise.reject(d.error));
        return res.json();
      })
      .then(data => setPortalInfo(data))
      .catch(err => setError(typeof err === "string" ? err : "Invalid or expired link"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit() {
    if (!form.amount || !form.dueDate || !form.description) { toast.error("Please fill in all required fields"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vendor-portal/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setSubmitted(true);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to submit"); }
    finally { setSubmitting(false); }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-red-200 dark:border-red-800">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-lg font-bold mb-2">Invalid Link</h1>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-emerald-200 dark:border-emerald-800">
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-lg font-bold mb-2">Bill Submitted Successfully</h1>
          <p className="text-muted-foreground">Your bill has been submitted to {portalInfo?.company.name || "the company"} for review. You will be contacted regarding payment.</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          {portalInfo?.company.logo && <img src={portalInfo.company.logo} alt="Company logo" className="h-10 mx-auto mb-3" />}
          <h1 className="text-xl font-bold">{portalInfo?.company.name || "Vendor Bill Submission"}</h1>
          <p className="text-muted-foreground">Welcome, {portalInfo?.vendorName}. Please submit your bill below.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Submit Bill</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Description *</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Invoice for services rendered in January 2024" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="1500.00" />
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  {["USD", "EUR", "GBP", "CAD", "AUD"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Payment Due Date *</Label>
              <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground">This link expires on {portalInfo ? new Date(portalInfo.expiresAt).toLocaleDateString() : "—"}.</p>
            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Bill
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">Powered by Ledgr · Secure bill submission portal</p>
      </div>
    </div>
  );
}
