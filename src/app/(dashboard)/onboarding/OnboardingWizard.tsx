"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Upload, CheckCircle2, ArrowRight, Loader2, FileText, Sparkles, Clock } from "lucide-react";

const steps = [
  { id: "company", title: "Your Business", icon: Building2 },
  { id: "upload", title: "Upload Statement", icon: Upload },
  { id: "done", title: "You're all set!", icon: CheckCircle2 },
];

export default function OnboardingWizard({ initialCompanyName }: { initialCompanyName: string; hasAccounts: boolean; hasChartOfAccounts: boolean; hasTransactions: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(initialCompanyName ? 1 : 0);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [txCount, setTxCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function saveCompany() {
    if (!companyName.trim()) { toast.error("Please enter your business name"); return; }
    setSaving(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: companyName.trim() }),
    });
    setSaving(false);
    if (res.ok) setStep(1);
    else toast.error("Failed to save — please try again");
  }

  async function uploadFile(file: File) {
    if (!file.name.endsWith(".csv")) { toast.error("Please upload a CSV file"); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/statements", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setTxCount(data.rowCount);
      setUploaded(true);
      setStep(2);
      toast.success(`${data.rowCount} transactions processed`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 mb-3">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">Ledgr</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome aboard</h1>
          <p className="text-muted-foreground mt-2">Two quick steps and we'll handle your books from here.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`h-2 flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-emerald-500" : "bg-muted"}`} />
            </div>
          ))}
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="text-center pb-4">
            <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${step === 2 ? "bg-emerald-500/20" : "bg-emerald-500/10"}`}>
              <Icon className={`h-7 w-7 ${step === 2 ? "text-emerald-500" : "text-emerald-400"}`} />
            </div>
            <CardTitle className="text-xl">{currentStep.title}</CardTitle>
            {step === 0 && <CardDescription>We'll put this on your monthly reports.</CardDescription>}
            {step === 1 && <CardDescription>Export a CSV from your bank and upload it here. We'll categorize every transaction automatically.</CardDescription>}
            {step === 2 && <CardDescription>Your first P&L report is being prepared.</CardDescription>}
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Step 0 — Company name */}
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label>Business / Company Name</Label>
                  <Input
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Acme Store"
                    autoFocus
                    onKeyDown={e => e.key === "Enter" && saveCompany()}
                  />
                </div>
                <Button
                  onClick={saveCompany}
                  disabled={!companyName.trim() || saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}

            {/* Step 1 — CSV upload */}
            {step === 1 && (
              <>
                <div
                  className="border-2 border-dashed border-border hover:border-emerald-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors"
                  onClick={() => inputRef.current?.click()}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                      <p className="text-sm font-medium">AI is categorizing your transactions…</p>
                      <p className="text-xs text-muted-foreground">Takes about 5 seconds</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="h-8 w-8 text-muted-foreground/50" />
                      <div>
                        <p className="text-sm font-medium">Click to select your CSV</p>
                        <p className="text-xs text-muted-foreground mt-1">Export from your bank · any format works</p>
                      </div>
                    </div>
                  )}
                  <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
                </div>

                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">How to export from your bank:</p>
                  <p>Accounts → Transactions → Download/Export → CSV. Any date range works — full month is ideal.</p>
                </div>

                <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => router.push("/dashboard")}>
                  Skip — I'll upload later
                </Button>
              </>
            )}

            {/* Step 2 — Done */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  {[
                    { label: `${txCount} transactions categorized`, done: true },
                    { label: "Human review in progress", done: false, pending: true },
                    { label: "P&L delivered to your inbox by the 5th", done: false, pending: true },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3 text-sm">
                      {item.done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={item.done ? "text-foreground font-medium" : "text-muted-foreground"}>{item.label}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-4 text-sm text-center space-y-1">
                  <p className="font-semibold text-foreground">That's it — you're done.</p>
                  <p className="text-muted-foreground text-xs">We'll email you a clean P&L by the 5th. Reply to that email with any questions.</p>
                </div>

                <Button
                  onClick={() => router.push("/client")}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Go to my dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {step < 2 && (
          <p className="text-center text-xs text-muted-foreground">
            <button onClick={() => router.push("/dashboard")} className="hover:text-foreground underline">
              Skip setup
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
