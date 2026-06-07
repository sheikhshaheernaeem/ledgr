"use client";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, Play, Calendar } from "lucide-react";
import Link from "next/link";

interface Obligation { id: string; name: string; allocatedValue: number; status: string; satisfiedAt: string | null }
interface Schedule { id: string; period: string; scheduledAmount: number; recognizedAmount: number; deferredAmount: number; posted: boolean }
interface Contract { id: string; name: string; contractNumber: string; totalValue: number; currency: string; startDate: string; endDate: string | null; status: string; recognitionMethod: string; client: { name: string } | null; obligations: Obligation[]; schedules: Schedule[] }

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recognizing, setRecognizing] = useState(false);

  async function fetchContract() {
    setLoading(true);
    try {
      const res = await fetch(`/api/revenue-contracts/${id}`);
      setContract(await res.json());
    } catch { toast.error("Failed to load contract"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchContract(); }, [id]);

  async function generateSchedule() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/revenue-contracts/${id}/schedule`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Schedule generated");
      fetchContract();
    } catch { toast.error("Failed to generate schedule"); }
    finally { setGenerating(false); }
  }

  async function runRecognition() {
    setRecognizing(true);
    try {
      const period = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
      const res = await fetch(`/api/revenue-contracts/${id}/recognize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Revenue recognized for current period");
      fetchContract();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setRecognizing(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!contract) return <div className="p-6 text-muted-foreground">Contract not found</div>;

  const totalRecognized = contract.schedules.reduce((s, sch) => s + sch.recognizedAmount, 0);
  const progress = contract.totalValue > 0 ? (totalRecognized / contract.totalValue) * 100 : 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/revenue-recognition"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{contract.name}</h1>
            <p className="text-muted-foreground">{contract.contractNumber} · {contract.recognitionMethod.replace("_", " ")} · {contract.client?.name || "No client"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {contract.schedules.length === 0 && (
            <Button variant="outline" onClick={generateSchedule} disabled={generating}>{generating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}<Calendar className="h-4 w-4 mr-2" />Generate Schedule</Button>
          )}
          <Button onClick={runRecognition} disabled={recognizing}>{recognizing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}<Play className="h-4 w-4 mr-2" />Run Recognition</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(contract.totalValue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Recognized</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{fmt(totalRecognized)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Deferred</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-600">{fmt(contract.totalValue - totalRecognized)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Recognition Progress</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{progress.toFixed(1)}%</p>
            <Progress value={progress} className="mt-1 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {contract.obligations.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Performance Obligations</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Obligation</TableHead><TableHead className="text-right">Allocated Value</TableHead><TableHead>Status</TableHead><TableHead>Satisfied At</TableHead></TableRow></TableHeader>
              <TableBody>
                {contract.obligations.map(ob => (
                  <TableRow key={ob.id}>
                    <TableCell className="font-medium">{ob.name}</TableCell>
                    <TableCell className="text-right">{fmt(ob.allocatedValue)}</TableCell>
                    <TableCell><Badge variant={ob.status === "SATISFIED" ? "default" : "secondary"}>{ob.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{ob.satisfiedAt ? new Date(ob.satisfiedAt).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Recognition Schedule</CardTitle></CardHeader>
        <CardContent>
          {contract.schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No schedule generated yet. Click "Generate Schedule" to create one.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Period</TableHead><TableHead className="text-right">Scheduled</TableHead><TableHead className="text-right">Recognized</TableHead><TableHead className="text-right">Deferred</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {contract.schedules.map(sch => (
                  <TableRow key={sch.id}>
                    <TableCell>{new Date(sch.period).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</TableCell>
                    <TableCell className="text-right">{fmt(sch.scheduledAmount)}</TableCell>
                    <TableCell className="text-right text-emerald-600">{fmt(sch.recognizedAmount)}</TableCell>
                    <TableCell className="text-right text-amber-600">{fmt(sch.deferredAmount)}</TableCell>
                    <TableCell><Badge variant={sch.posted ? "default" : "secondary"}>{sch.posted ? "Posted" : "Pending"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
