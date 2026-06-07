"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, BookOpen, Wallet, ArrowRight, CheckCircle2, Loader2, Link2 } from "lucide-react";

const steps = [
  { id: "company", title: "Company Profile", description: "Set up your business identity", icon: Building2 },
  { id: "accounts", title: "Bank Accounts", description: "Connect or add your bank accounts", icon: Wallet },
  { id: "coa", title: "Chart of Accounts", description: "Set up your accounting structure", icon: BookOpen },
  { id: "done", title: "You're all set!", description: "Start managing your finances", icon: CheckCircle2 },
];

export default function OnboardingWizard({
  initialCompanyName,
  hasAccounts,
  hasChartOfAccounts,
  hasTransactions,
}: {
  initialCompanyName: string;
  hasAccounts: boolean;
  hasChartOfAccounts: boolean;
  hasTransactions: boolean;
}) {
  const router = useRouter();
  const initialStep = initialCompanyName ? (hasAccounts ? (hasChartOfAccounts ? 3 : 2) : 1) : 0;
  const [step, setStep] = useState(initialStep);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [companyAddress, setCompanyAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [settingUpCoa, setSettingUpCoa] = useState(false);

  async function saveCompany() {
    setSaving(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, companyAddress: companyAddress || null }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Company profile saved"); setStep(1); }
    else toast.error("Failed to save");
  }

  async function setupDefaultCoa() {
    setSettingUpCoa(true);
    const res = await fetch("/api/chart-of-accounts/seed", { method: "POST" });
    setSettingUpCoa(false);
    if (res.ok) { toast.success("Default chart of accounts created"); setStep(3); }
    else { toast.error("Failed to set up CoA"); setStep(3); }
  }

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Welcome to Ledgr</h1>
          <p className="text-muted-foreground mt-2">Let&apos;s get your books set up in a few quick steps</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1 flex-1">
              <div className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? "bg-emerald-500" : "bg-muted"}`} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">Step {step + 1} of {steps.length}</p>

        <Card className="border-border bg-card">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
              <Icon className="h-7 w-7 text-emerald-400" />
            </div>
            <CardTitle className="text-xl">{currentStep.title}</CardTitle>
            <CardDescription>{currentStep.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label>Business / Company Name</Label>
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Inc." autoFocus />
                </div>
                <div className="space-y-2">
                  <Label>Business Address <span className="text-muted-foreground">(optional)</span></Label>
                  <Input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="123 Main St, City, State" />
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

            {step === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Add your bank accounts so Ledgr can track balances and reconcile transactions.
                </p>
                {hasAccounts ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-400 py-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Bank accounts already set up
                  </div>
                ) : null}
                <Button
                  onClick={() => router.push("/accounts?onboarding=1")}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Link2 className="h-4 w-4" /> Set Up Bank Accounts
                </Button>
                <Button onClick={() => setStep(2)} variant="ghost" className="w-full text-muted-foreground">
                  Skip for now
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Your chart of accounts is the foundation of double-entry bookkeeping.
                </p>
                {hasChartOfAccounts ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-400 py-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Chart of accounts already set up
                  </div>
                ) : null}
                <Button
                  onClick={setupDefaultCoa}
                  disabled={settingUpCoa}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  {settingUpCoa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Set Up Default Chart of Accounts
                </Button>
                <Button onClick={() => router.push("/chart-of-accounts?onboarding=1")} variant="outline" className="w-full">
                  Customize Manually
                </Button>
                <Button onClick={() => setStep(3)} variant="ghost" className="w-full text-muted-foreground">
                  Skip for now
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {[
                    { label: "Company Profile", done: !!initialCompanyName || !!companyName },
                    { label: "Bank Accounts", done: hasAccounts },
                    { label: "Chart of Accounts", done: hasChartOfAccounts },
                    { label: "First Transaction", done: hasTransactions },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${item.done ? "text-emerald-400" : "text-muted-foreground"}`} />
                      <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {step < 3 && (
          <p className="text-center text-xs text-muted-foreground">
            <button onClick={() => router.push("/dashboard")} className="hover:text-foreground underline">
              Skip setup and go to dashboard
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
