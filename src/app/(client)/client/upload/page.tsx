"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle2, ArrowLeft, Loader2, Info } from "lucide-react";

interface UploadResult {
  statementId: string;
  rowCount: number;
  status: string;
}

interface Statement {
  id: string;
  filename: string;
  rowCount: number;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}

const statusStyle: Record<string, string> = {
  PROCESSING: "border-yellow-500/30 text-yellow-400",
  CATEGORIZED: "border-emerald-500/30 text-emerald-400",
  REVIEWED: "border-blue-500/30 text-blue-400",
  ERROR: "border-red-500/30 text-red-400",
};

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function fetchHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/statements");
      if (res.ok) setStatements(await res.json());
    } catch { /* silent */ }
    finally { setLoadingHistory(false); }
  }

  useEffect(() => { fetchHistory(); }, []);

  async function upload(file: File) {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/statements", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setResult(data);
      toast.success(`Processed ${data.rowCount} transactions`);
      fetchHistory();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    upload(file);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/client">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Upload Bank Statement</h1>
          <p className="text-muted-foreground text-sm">We'll categorize every transaction automatically</p>
        </div>
      </div>

      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${dragging ? "border-emerald-500 bg-emerald-500/5" : "border-border hover:border-emerald-500/50"}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
      >
        <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
              <p className="font-semibold text-foreground">AI is categorizing your transactions…</p>
              <p className="text-sm text-muted-foreground">This takes about 5 seconds</p>
            </>
          ) : result ? (
            <>
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="font-semibold text-foreground">{result.rowCount} transactions categorized</p>
              <p className="text-sm text-muted-foreground">Your accountant will review and send your report shortly</p>
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setResult(null); }}>Upload another</Button>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground/50" />
              <div>
                <p className="font-semibold text-foreground">Drop your CSV here or click to browse</p>
                <p className="text-sm text-muted-foreground mt-1">Export from your bank as CSV · Date, Description, Amount columns</p>
              </div>
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                Select File
              </Button>
            </>
          )}
          <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">How to export from your bank</p>
              <p>Most banks: Accounts → Transactions → Download/Export → CSV format. Date range: full month works best. Any column order is fine — our AI handles it.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {statements.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Upload History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingHistory ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="divide-y divide-border">
                {statements.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.rowCount} transactions · {new Date(s.createdAt).toLocaleDateString()}
                        {s.periodStart && s.periodEnd && ` · ${new Date(s.periodStart).toLocaleDateString()} – ${new Date(s.periodEnd).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusStyle[s.status] ?? ""}>{s.status.toLowerCase()}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
