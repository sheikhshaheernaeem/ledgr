"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Download, BookOpen } from "lucide-react";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  isActive: boolean;
}

interface LedgerRow {
  id: string;
  date: string;
  description: string;
  entryNumber: string;
  debit: number;
  credit: number;
  balance: number;
}

interface LedgerData {
  account: Account;
  openingBalance: number;
  closingBalance: number;
  rows: LedgerRow[];
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

export default function GeneralLedgerPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
  });

  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadAccounts() {
      const res = await fetch("/api/chart-of-accounts");
      if (res.ok) {
        const data: Account[] = await res.json();
        setAccounts(data.filter((a) => a.isActive));
      }
      setLoadingAccounts(false);
    }
    loadAccounts();
  }, []);

  const fetchLedger = useCallback(async () => {
    if (!selectedAccountId) return;
    setLoading(true);
    const params = new URLSearchParams({ accountId: selectedAccountId, startDate, endDate });
    const res = await fetch(`/api/general-ledger?${params}`);
    if (res.ok) {
      setLedger(await res.json());
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to load ledger");
    }
    setLoading(false);
  }, [selectedAccountId, startDate, endDate]);

  useEffect(() => {
    if (selectedAccountId) fetchLedger();
  }, [fetchLedger, selectedAccountId]);

  function exportCSV() {
    if (!ledger) return;
    const rows = [
      ["Date", "Entry #", "Description", "Debit", "Credit", "Balance"],
      ["", "", "Opening Balance", "", "", fmt(ledger.openingBalance)],
      ...ledger.rows.map((r) => [
        new Date(r.date).toLocaleDateString(),
        r.entryNumber,
        r.description,
        r.debit > 0 ? fmt(r.debit) : "",
        r.credit > 0 ? fmt(r.credit) : "",
        fmt(r.balance),
      ]),
      ["", "", "Closing Balance", "", "", fmt(ledger.closingBalance)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `general-ledger-${ledger.account.code}-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const account = ledger?.account;
  const isDebitNormal = account?.normalBalance === "DEBIT";

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">General Ledger</h1>
          <p className="text-muted-foreground mt-1">Running balance for a single account over a period</p>
        </div>
        {ledger && (
          <Button variant="outline" className="gap-2 text-xs" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label>Account</Label>
              {loadingAccounts ? (
                <div className="h-9 flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select value={selectedAccountId} onValueChange={v => setSelectedAccountId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ledger table */}
      {!selectedAccountId ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p>Select an account to view its general ledger</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : ledger ? (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">
              {ledger.account.code} — {ledger.account.name}
              <span className="ml-2 text-muted-foreground font-normal text-sm">
                ({ledger.account.type} · {ledger.account.normalBalance} normal)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Opening balance row */}
                <TableRow className="bg-muted/10 italic">
                  <TableCell className="text-muted-foreground text-sm">{startDate}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-muted-foreground text-sm">Opening Balance</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    <span className={ledger.openingBalance >= 0 ? (isDebitNormal ? "text-foreground" : "text-emerald-400") : "text-red-400"}>
                      {fmt(ledger.openingBalance)}
                    </span>
                  </TableCell>
                </TableRow>

                {ledger.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                      No transactions in this period
                    </TableCell>
                  </TableRow>
                ) : (
                  ledger.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(row.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-emerald-400">
                        {row.entryNumber}
                      </TableCell>
                      <TableCell className="text-sm">{row.description}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.debit > 0 ? (
                          <span className="text-red-400">{fmt(row.debit)}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.credit > 0 ? (
                          <span className="text-emerald-400">{fmt(row.credit)}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        <span className={row.balance >= 0 ? "text-foreground" : "text-red-400"}>
                          {fmt(row.balance)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}

                {/* Closing balance row */}
                <TableRow className="bg-muted/10 italic border-t-2 border-border">
                  <TableCell className="text-muted-foreground text-sm">{endDate}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-muted-foreground text-sm font-semibold">Closing Balance</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    <span className={ledger.closingBalance >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {fmt(ledger.closingBalance)}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
