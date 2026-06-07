"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Download, Car } from "lucide-react";

interface MileageEntry {
  id: string;
  date: string;
  description: string;
  fromAddress: string | null;
  toAddress: string | null;
  miles: number;
  ratePerMile: number;
  amount: number;
  purpose: string;
}

const purposeStyle: Record<string, string> = {
  BUSINESS: "border-emerald-500/30 text-emerald-400",
  MEDICAL: "border-blue-500/30 text-blue-400",
  CHARITY: "border-purple-500/30 text-purple-400",
};

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function MileagePage() {
  const [entries, setEntries] = useState<MileageEntry[]>([]);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/mileage?year=${year}`);
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/mileage/${id}`, { method: "DELETE" });
    if (res.ok) { setEntries((p) => p.filter((e) => e.id !== id)); toast.success("Entry deleted"); }
    else toast.error("Failed to delete");
  }

  const totalMiles = entries.reduce((s, e) => s + e.miles, 0);
  const totalAmount = entries.reduce((s, e) => s + e.amount, 0);
  const businessMiles = entries.filter((e) => e.purpose === "BUSINESS").reduce((s, e) => s + e.miles, 0);

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Car className="h-6 w-6 text-emerald-400" /> Mileage Tracker
          </h1>
          <p className="text-muted-foreground mt-1">Log business trips for tax deductions</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={(v) => v && setYear(v)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <a href={`/api/mileage/export?year=${year}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" /> CSV
            </Button>
          </a>
          <Link href="/mileage/new">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2">
              <Plus className="h-4 w-4" /> Log Trip
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Total Miles</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalMiles.toFixed(1)}</p></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Business Miles</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-400">{businessMiles.toFixed(1)}</p></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Total Deduction</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-400">{fmt(totalAmount)}</p></CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        {loading ? (
          <CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent>
        ) : entries.length === 0 ? (
          <CardContent className="py-12 text-center text-muted-foreground">
            <Car className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>No trips logged for {year}.</p>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead className="text-right">Miles</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id} className="border-border">
                    <TableCell className="text-sm">{new Date(e.date).toLocaleDateString()}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {e.fromAddress && e.toAddress ? `${e.fromAddress} → ${e.toAddress}` : e.fromAddress ?? e.toAddress ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">{e.miles.toFixed(1)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">${e.ratePerMile.toFixed(3)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(e.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={purposeStyle[e.purpose] ?? ""}>{e.purpose}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => handleDelete(e.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-border bg-muted/30 font-semibold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right">{totalMiles.toFixed(1)}</TableCell>
                  <TableCell />
                  <TableCell className="text-right text-emerald-400">{fmt(totalAmount)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
