"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Tx {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: string;
  category: string | null;
  subcategory: string | null;
}

export function ExportTransactionsButton({ transactions }: { transactions: Tx[] }) {
  function handleExport() {
    const header = "Date,Description,Category,Subcategory,Type,Amount";
    const rows = transactions.map((tx) => {
      const d = new Date(tx.date).toLocaleDateString("en-US");
      const desc = `"${tx.description.replace(/"/g, '""')}"`;
      const cat = `"${(tx.category ?? "").replace(/"/g, '""')}"`;
      const sub = `"${(tx.subcategory ?? "").replace(/"/g, '""')}"`;
      const type = tx.type === "CREDIT" ? "Income" : "Expense";
      const amt = tx.type === "CREDIT" ? tx.amount.toFixed(2) : (-tx.amount).toFixed(2);
      return `${d},${desc},${cat},${sub},${type},${amt}`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </Button>
  );
}
