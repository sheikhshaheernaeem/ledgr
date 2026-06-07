"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calculator } from "lucide-react";

const BRACKETS_2024_SINGLE = [
  { min: 0, max: 11600, rate: 0.10 },
  { min: 11600, max: 47150, rate: 0.12 },
  { min: 47150, max: 100525, rate: 0.22 },
  { min: 100525, max: 191950, rate: 0.24 },
  { min: 191950, max: 243725, rate: 0.32 },
  { min: 243725, max: 609350, rate: 0.35 },
  { min: 609350, max: Infinity, rate: 0.37 },
];

function calcFederalTax(taxableIncome: number): number {
  let tax = 0;
  for (const b of BRACKETS_2024_SINGLE) {
    if (taxableIncome <= b.min) break;
    const taxable = Math.min(taxableIncome, b.max) - b.min;
    tax += taxable * b.rate;
  }
  return tax;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export default function TaxCalculatorPage() {
  const [grossIncome, setGrossIncome] = useState("");
  const [deductions, setDeductions] = useState("14600"); // standard deduction 2024
  const [selfEmployed, setSelfEmployed] = useState(true);
  const [q1Paid, setQ1Paid] = useState("");
  const [q2Paid, setQ2Paid] = useState("");
  const [q3Paid, setQ3Paid] = useState("");
  const [q4Paid, setQ4Paid] = useState("");

  const gross = parseFloat(grossIncome) || 0;
  const deductionAmt = parseFloat(deductions) || 0;
  const seDeduction = selfEmployed ? gross * 0.9235 * 0.153 * 0.5 : 0;
  const seTax = selfEmployed ? gross * 0.9235 * 0.153 : 0;
  const taxableIncome = Math.max(0, gross - deductionAmt - seDeduction);
  const federalTax = calcFederalTax(taxableIncome);
  const totalTax = federalTax + seTax;
  const effectiveRate = gross > 0 ? (totalTax / gross) * 100 : 0;

  const quarterlyDue = totalTax / 4;
  const paidTotal = [q1Paid, q2Paid, q3Paid, q4Paid].reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const remaining = Math.max(0, totalTax - paidTotal);

  const quarters = [
    { label: "Q1 (Jan–Mar)", due: "Apr 15", paid: q1Paid, set: setQ1Paid },
    { label: "Q2 (Apr–May)", due: "Jun 15", paid: q2Paid, set: setQ2Paid },
    { label: "Q3 (Jun–Aug)", due: "Sep 15", paid: q3Paid, set: setQ3Paid },
    { label: "Q4 (Sep–Dec)", due: "Jan 15", paid: q4Paid, set: setQ4Paid },
  ];

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Calculator className="h-6 w-6 text-emerald-400" /> Quarterly Tax Calculator
        </h1>
        <p className="text-muted-foreground mt-1">Estimate your 2024 federal income tax and quarterly payments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Income & Deductions</CardTitle>
            <CardDescription>Enter your expected annual figures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Gross Annual Income (USD)</Label>
              <Input type="number" min="0" placeholder="0" value={grossIncome} onChange={e => setGrossIncome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Deductions (USD)</Label>
              <Input type="number" min="0" value={deductions} onChange={e => setDeductions(e.target.value)} />
              <p className="text-xs text-muted-foreground">Standard deduction 2024: $14,600 (single) · $29,200 (married)</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="se"
                checked={selfEmployed}
                onChange={e => setSelfEmployed(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="se" className="cursor-pointer">Self-employed (adds 15.3% SE tax)</Label>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Tax Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Income</span>
              <span className="font-mono">{fmt(gross)}</span>
            </div>
            {selfEmployed && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">SE Tax Deduction (½ of SE)</span>
                <span className="font-mono text-emerald-400">-{fmt(seDeduction)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Standard/Itemized Deduction</span>
              <span className="font-mono text-emerald-400">-{fmt(deductionAmt)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Taxable Income</span>
              <span className="font-mono">{fmt(taxableIncome)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Federal Income Tax</span>
              <span className="font-mono">{fmt(federalTax)}</span>
            </div>
            {selfEmployed && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Self-Employment Tax</span>
                <span className="font-mono">{fmt(seTax)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Total Estimated Tax</span>
              <span className="font-mono text-red-400">{fmt(totalTax)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Effective Rate</span>
              <span>{effectiveRate.toFixed(1)}%</span>
            </div>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
              <p className="text-xs text-muted-foreground">Quarterly Payment Due</p>
              <p className="text-2xl font-bold text-emerald-400">{fmt(quarterlyDue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Quarterly Payment Tracker</CardTitle>
          <CardDescription>Track what you&apos;ve already paid to the IRS</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quarters.map((q) => {
              const paid = parseFloat(q.paid) || 0;
              const diff = paid - quarterlyDue;
              return (
                <div key={q.label} className="space-y-2">
                  <Label className="text-xs">{q.label}</Label>
                  <p className="text-xs text-muted-foreground">Due: {q.due}</p>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={q.paid}
                    onChange={e => q.set(e.target.value)}
                  />
                  {q.paid && (
                    <p className={`text-xs ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {diff >= 0 ? `+${fmt(diff)} overpaid` : `${fmt(Math.abs(diff))} short`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Paid</span>
            <span className="font-mono">{fmt(paidTotal)}</span>
          </div>
          <div className="flex justify-between text-sm mt-2 font-semibold">
            <span>Remaining Balance</span>
            <span className={`font-mono ${remaining > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {remaining > 0 ? fmt(remaining) : "Fully paid"}
            </span>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Estimates only. Consult a tax professional for accurate filing. Based on 2024 federal tax brackets (single filer).
      </p>
    </div>
  );
}
