"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  category: string | null;
  subcategory: string | null;
  confidence: number | null;
  status: "PENDING" | "APPROVED" | "EDITED";
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [uploading, setUploading] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadTransactions() {
    const res = await fetch("/api/transactions");
    if (res.ok) {
      const data = await res.json();
      setTransactions(data);
      setLoaded(true);
    }
  }

  if (!loaded) {
    loadTransactions();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/transactions/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Uploaded ${data.count} transactions`);
      await loadTransactions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleCategorize() {
    setCategorizing(true);
    try {
      const res = await fetch("/api/transactions/categorize", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Categorized ${data.count} transactions with AI`);
      await loadTransactions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Categorization failed");
    } finally {
      setCategorizing(false);
    }
  }

  const pendingCount = transactions.filter((t) => t.status === "PENDING").length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            Upload your bank CSV and let AI categorize everything
          </p>
        </div>
        <div className="flex gap-3">
          {pendingCount > 0 && (
            <Button
              variant="outline"
              onClick={handleCategorize}
              disabled={categorizing}
              className="gap-2"
            >
              {categorizing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Run AI Categorization ({pendingCount})
            </Button>
          )}
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload CSV
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* CSV format hint */}
      <Card className="border-border bg-card/50">
        <CardContent className="py-3 px-4">
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">CSV format:</span>{" "}
            date, description, amount, type (DEBIT/CREDIT) — or any standard
            bank export. We auto-detect columns.
          </p>
        </CardContent>
      </Card>

      {/* Transactions table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">
            All Transactions
            <span className="ml-2 text-muted-foreground font-normal text-sm">
              ({transactions.length})
            </span>
          </CardTitle>
          <CardDescription>
            {pendingCount > 0
              ? `${pendingCount} transactions awaiting AI categorization`
              : "All transactions categorized"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Upload className="h-10 w-10 mx-auto mb-4 opacity-20" />
              <p className="font-medium">No transactions yet</p>
              <p className="text-sm mt-1">
                Upload a CSV from your bank to get started
              </p>
              <Button
                className="mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
                onClick={() => fileRef.current?.click()}
              >
                Upload CSV
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate text-sm">{tx.description}</p>
                        {tx.subcategory && (
                          <p className="text-xs text-muted-foreground">
                            {tx.subcategory}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {tx.category ? (
                          <Badge variant="outline" className="text-xs">
                            {tx.category}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tx.confidence !== null ? (
                          <div className="flex items-center gap-1">
                            {tx.confidence >= 0.85 ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-yellow-400" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {(tx.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-medium text-sm ${tx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {tx.type === "CREDIT" ? "+" : "-"}${tx.amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            tx.status === "APPROVED"
                              ? "border-emerald-500/30 text-emerald-400"
                              : tx.status === "EDITED"
                                ? "border-blue-500/30 text-blue-400"
                                : "border-yellow-500/30 text-yellow-400"
                          }`}
                        >
                          {tx.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
