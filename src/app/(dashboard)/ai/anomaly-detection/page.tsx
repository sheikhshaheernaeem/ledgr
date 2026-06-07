"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Loader2, Scan, AlertTriangle, CheckCircle, Brain } from "lucide-react";

interface AnomalyFlag { id: string; entityType: string; entityId: string; reason: string; severity: string; riskScore: number; dismissed: boolean; createdAt: string }

const severityColors: Record<string, string> = {
  LOW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function AnomalyDetectionPage() {
  const [flags, setFlags] = useState<AnomalyFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);

  async function fetchFlags() {
    setLoading(true);
    try {
      const res = await fetch("/api/anomaly-flags");
      setFlags(await res.json());
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchFlags(); }, []);

  async function runScan() {
    setScanning(true);
    try {
      const res = await fetch("/api/ai/anomaly-detection", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLastScan(new Date().toLocaleString());
      toast.success(`Scan complete: ${data.flagged} new anomalies found`);
      fetchFlags();
    } catch { toast.error("Scan failed"); }
    finally { setScanning(false); }
  }

  async function dismiss(id: string) {
    setDismissing(id);
    try {
      const res = await fetch(`/api/anomaly-flags/${id}/dismiss`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Dismissed");
      fetchFlags();
    } catch { toast.error("Failed"); }
    finally { setDismissing(null); }
  }

  const activeFlags = flags.filter(f => !f.dismissed);
  const criticalCount = activeFlags.filter(f => f.severity === "CRITICAL" || f.severity === "HIGH").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Anomaly Detection</h1>
          <p className="text-muted-foreground">AI-powered analysis of your transactions for unusual patterns</p>
        </div>
        <Button onClick={runScan} disabled={scanning} className="gap-2">
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
          {scanning ? "Scanning..." : "Run AI Scan"}
        </Button>
      </div>

      {lastScan && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          Last scan: {lastScan}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={activeFlags.length > 0 ? "border-amber-200 dark:border-amber-800" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-amber-500" />Active Flags</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${activeFlags.length > 0 ? "text-amber-600" : ""}`}>{activeFlags.length}</p></CardContent>
        </Card>
        <Card className={criticalCount > 0 ? "border-red-200 dark:border-red-800" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">High/Critical</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${criticalCount > 0 ? "text-red-600" : ""}`}>{criticalCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Dismissed</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-muted-foreground">{flags.filter(f => f.dismissed).length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Risk Score</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeFlags.length > 0 ? (activeFlags.reduce((s, f) => s + f.riskScore, 0) / activeFlags.length * 100).toFixed(0) : 0}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-purple-500" />Flagged Transactions</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : activeFlags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No active anomalies. Run a scan to check your recent transactions.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeFlags.map(flag => (
                  <TableRow key={flag.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{flag.entityType}</p>
                      <p className="text-xs text-muted-foreground">{flag.entityId.slice(0, 12)}...</p>
                    </TableCell>
                    <TableCell className="text-sm max-w-xs">{flag.reason}</TableCell>
                    <TableCell><Badge className={severityColors[flag.severity] || ""}>{flag.severity}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={flag.riskScore * 100} className="h-1.5 w-16" />
                        <span className="text-xs text-muted-foreground">{(flag.riskScore * 100).toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(flag.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => dismiss(flag.id)} disabled={dismissing === flag.id}>
                        {dismissing === flag.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Dismiss"}
                      </Button>
                    </TableCell>
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
