"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";

const IRS_RATE = 0.67;

const purposeInfo: Record<string, string> = {
  BUSINESS: "Fully deductible for business purposes",
  MEDICAL: "Deductible if it exceeds 7.5% of AGI",
  CHARITY: "Deductible at reduced rate ($0.14/mile)",
};

export default function NewMileagePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    fromAddress: "",
    toAddress: "",
    miles: "",
    ratePerMile: String(IRS_RATE),
    purpose: "BUSINESS",
  });

  const amount = (parseFloat(form.miles) || 0) * (parseFloat(form.ratePerMile) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.miles || parseFloat(form.miles) <= 0) return toast.error("Enter valid miles");
    setSaving(true);
    try {
      const res = await fetch("/api/mileage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, miles: parseFloat(form.miles), ratePerMile: parseFloat(form.ratePerMile) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Trip logged");
      router.push("/mileage");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/mileage" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Log Trip</h1>
      </div>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Trip Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Select value={form.purpose} onValueChange={(v) => v && setForm({ ...form, purpose: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUSINESS">Business</SelectItem>
                    <SelectItem value="MEDICAL">Medical</SelectItem>
                    <SelectItem value="CHARITY">Charity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">{purposeInfo[form.purpose]}</p>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Client visit, site inspection..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Address</Label>
                <Input placeholder="Starting location" value={form.fromAddress} onChange={(e) => setForm({ ...form, fromAddress: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>To Address</Label>
                <Input placeholder="Destination" value={form.toAddress} onChange={(e) => setForm({ ...form, toAddress: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Miles Driven</Label>
                <Input type="number" step="0.1" min="0" placeholder="0.0" value={form.miles} onChange={(e) => setForm({ ...form, miles: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Rate per Mile ($)</Label>
                <Input type="number" step="0.001" min="0" value={form.ratePerMile} onChange={(e) => setForm({ ...form, ratePerMile: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">IRS standard rate for {new Date().getFullYear()}: ${IRS_RATE}/mile</p>

            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-sm font-medium text-emerald-400">Deduction Amount</span>
              <span className="text-lg font-bold text-emerald-400">${amount.toFixed(2)}</span>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Trip
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
