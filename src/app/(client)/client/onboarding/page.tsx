"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2, Upload, CheckCircle2, ArrowRight, Loader2,
  Sparkles, UserCheck, FileText, ArrowLeft, Hash,
} from "lucide-react";

type Step = 1 | 2 | 3;

interface MeData {
  id: string;
  email: string;
  name: string | null;
  companyName: string | null;
  country: string | null;
  currency: string | null;
  hasStatement: boolean;
  accountant: { name: string | null; email: string; companyName: string | null } | null;
}

const COUNTRIES = [
  ["US", "United States", "USD"], ["GB", "United Kingdom", "GBP"], ["CA", "Canada", "CAD"],
  ["AU", "Australia", "AUD"], ["DE", "Germany", "EUR"], ["FR", "France", "EUR"],
  ["IN", "India", "INR"], ["PK", "Pakistan", "PKR"], ["AE", "UAE", "AED"],
  ["SG", "Singapore", "SGD"], ["JP", "Japan", "JPY"], ["NL", "Netherlands", "EUR"],
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);

  // Step 1 state
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("US");
  const [currency, setCurrency] = useState("USD");
  const [savingProfile, setSavingProfile] = useState(false);

  // Step 2 state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ rowCount: number; categorized: number } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const loadMe = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/me");
      if (!res.ok) throw new Error();
      const data: MeData = await res.json();
      setMe(data);
      setCompanyName(data.companyName ?? "");
      setCountry(data.country ?? "US");
      setCurrency(data.currency ?? "USD");

      // Skip ahead if user already has a statement
      if (data.hasStatement) setStep(3);
    } catch {
      toast.error("Could not load your profile");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadMe(); }, [loadMe]);

  async function saveProfile() {
    if (!companyName.trim()) {
      toast.error("Please enter your business name");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim(), country, currency }),
      });
      if (!res.ok) throw new Error();
      toast.success("Profile saved");
      setStep(2);
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadStatement() {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/statements", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Upload failed");
      }
      const data = await res.json();
      setUploadResult({
        rowCount: data.statement?.rowCount ?? data.rowCount ?? 0,
        categorized: data.statement?.rowCount ?? data.transactionsCreated ?? 0,
      });
      toast.success("Statement processed");
      setTimeout(() => setStep(3), 1200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.toLowerCase().endsWith(".csv") || f.type === "text/csv")) {
      setFile(f);
    } else {
      toast.error("Please drop a .csv file");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" /> onboarding · step {step}_of_3
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Welcome to Ledgr</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Three minutes. Then we&apos;re doing your books — not just hosting them.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded-full transition-colors ${
              s <= step ? "bg-emerald-500" : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Business info */}
      {step === 1 && (
        <div className="rounded-xl border border-border/60 bg-card/60 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg border border-border bg-background flex items-center justify-center">
              <Building2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Tell us about your business</h2>
              <p className="text-xs text-muted-foreground font-mono">step_1_of_3 · ~30_seconds</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="company">Business name</Label>
              <Input
                id="company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Inc."
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="country">Country</Label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => {
                    const c = COUNTRIES.find((x) => x[0] === e.target.value);
                    setCountry(e.target.value);
                    if (c) setCurrency(c[2]);
                  }}
                  className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm"
                >
                  {COUNTRIES.map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1.5" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-border/60">
            <Button onClick={saveProfile} disabled={savingProfile || !companyName.trim()} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
              {savingProfile ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />saving…</> : <>Continue <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></>}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Upload first statement */}
      {step === 2 && (
        <div className="rounded-xl border border-border/60 bg-card/60 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg border border-border bg-background flex items-center justify-center">
              <Upload className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground">Upload your first bank statement</h2>
              <p className="text-xs text-muted-foreground font-mono">step_2_of_3 · ~2_minutes</p>
            </div>
            <button onClick={() => setStep(1)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono">
              <ArrowLeft className="h-3 w-3" /> back
            </button>
          </div>

          <div
            ref={dropRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className={`rounded-lg border-2 border-dashed transition-colors p-8 text-center ${
              file ? "border-emerald-500/50 bg-emerald-500/5" : "border-border hover:border-foreground/30"
            }`}
          >
            {!file ? (
              <>
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Drag &amp; drop a .csv file</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">or click to browse · we support Chase, BofA, Wells Fargo, HSBC, Monzo, Revolut, +20 more</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  style={{ pointerEvents: "none" }}
                />
                <label className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-emerald-500 hover:text-emerald-400 cursor-pointer">
                  Choose file
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </>
            ) : uploadResult ? (
              <>
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-400" />
                <p className="text-sm font-medium text-foreground">Parsed and categorized</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {uploadResult.rowCount} transactions · {uploadResult.categorized} categorized by AI
                </p>
              </>
            ) : (
              <>
                <Hash className="h-8 w-8 mx-auto mb-3 text-emerald-400" />
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                <button
                  onClick={() => setFile(null)}
                  className="text-xs text-muted-foreground hover:text-foreground mt-2 font-mono"
                >
                  remove
                </button>
              </>
            )}
          </div>

          <div className="rounded-lg bg-background border border-border/60 p-3 space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">what_happens_next</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>1. We parse your CSV (RFC 4180, 30+ format variants supported)</li>
              <li>2. AI categorizes every transaction in batches of 50</li>
              <li>3. Your accountant reviews and approves before month-end close</li>
            </ul>
          </div>

          <div className="flex justify-between pt-2 border-t border-border/60">
            <button onClick={() => setStep(3)} className="text-xs text-muted-foreground hover:text-foreground font-mono">
              skip for now →
            </button>
            <Button
              onClick={uploadStatement}
              disabled={!file || uploading || !!uploadResult}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
            >
              {uploading ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />processing…</>
              ) : uploadResult ? (
                <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />done</>
              ) : (
                <>Upload &amp; categorize <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Meet your accountant */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-400" />
            <h2 className="text-lg font-semibold">You&apos;re all set, {me?.name?.split(" ")[0] ?? "founder"}.</h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              {me?.hasStatement
                ? "Your books are being categorized now. Your first report arrives by the 5th of next month."
                : "Upload a bank statement whenever you're ready. We'll have your first P&L by the 5th of next month."}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/60 p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg border border-border bg-background flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">your_accountant</p>
                {me?.accountant ? (
                  <>
                    <p className="font-semibold text-foreground">{me.accountant.companyName ?? me.accountant.name ?? "Your accountant"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{me.accountant.email}</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-foreground">Being assigned</p>
                    <p className="text-xs text-muted-foreground">You&apos;ll be matched with an accountant within 24 hours.</p>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm border-t border-border/60 pt-4">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-muted-foreground">
                  <span className="text-foreground font-medium">Monthly reports.</span> P&amp;L, balance sheet, cash flow — delivered by the 5th, reviewed by your accountant.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-muted-foreground">
                  <span className="text-foreground font-medium">AI accountant.</span> Ask anything in <button onClick={() => router.push("/client/messages")} className="text-emerald-500 hover:text-emerald-400 underline">Messages</button>. Live access to your numbers.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-muted-foreground">
                  <span className="text-foreground font-medium">Tax-ready.</span> Books organized year-round so tax season isn&apos;t a panic.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <Button onClick={() => router.push("/client")} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
              Go to dashboard <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
