"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Loader2, Receipt, CheckCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";

interface Bill {
  id: string;
  billNumber: string;
  vendorName: string;
  vendorEmail: string | null;
  issueDate: string;
  dueDate: string;
  status: string;
  total: number;
  amountPaid: number;
  currency: string;
}

const statusStyle: Record<string, string> = {
  DRAFT: "border-yellow-500/30 text-yellow-400",
  PENDING: "border-cyan-500/30 text-cyan-400",
  PAID: "border-emerald-500/30 text-emerald-400",
  OVERDUE: "border-red-500/30 text-red-400",
  VOID: "border-zinc-500/30 text-zinc-400",
};


const FILTERS = ["All", "Pending", "Paid", "Overdue"] as const;
type Filter = (typeof FILTERS)[number];

export default function BillsPage() {
  const { fmt, fmtDate } = useLocale();
  const [bills, setBills] = useState<Bill[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/bills");
    if (res.ok) setBills(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/bills/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Marked as ${status.toLowerCase()}`);
      load();
    } else {
      toast.error("Update failed");
    }
  }

  async function deleteBill(id: string) {
    const res = await fetch(`/api/bills/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Bill deleted");
      load();
    } else {
      toast.error("Cannot delete — only DRAFT bills can be deleted");
    }
  }

  const filtered = bills.filter(b => {
    if (filter === "Pending") return b.status === "PENDING";
    if (filter === "Paid") return b.status === "PAID";
    if (filter === "Overdue") return b.status === "OVERDUE";
    return true;
  });

  const outstanding = bills
    .filter(b => ["PENDING", "OVERDUE"].includes(b.status))
    .reduce((s, b) => s + (b.total - b.amountPaid), 0);

  const outstandingCount = bills.filter(b => ["PENDING", "OVERDUE"].includes(b.status)).length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bills</h1>
          <p className="text-muted-foreground mt-1">
            {outstandingCount} outstanding — {fmt(outstanding)} due
          </p>
        </div>
        <Link href="/bills/new">
          <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
            <Plus className="h-4 w-4" /> New Bill
          </Button>
        </Link>
      </div>

      <div className="flex gap-2">
        {FILTERS.map(f => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? "bg-emerald-500 hover:bg-emerald-400 text-black" : ""}
          >
            {f}
          </Button>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">
            Bills{" "}
            <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No bills found</p>
              <Link href="/bills/new">
                <Button variant="outline" size="sm" className="mt-3">
                  Create your first bill
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(bill => (
                  <TableRow key={bill.id}>
                    <TableCell>
                      <Link
                        href={`/bills/${bill.id}`}
                        className="text-emerald-400 hover:underline font-medium"
                      >
                        {bill.billNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{bill.vendorName}</p>
                      {bill.vendorEmail && (
                        <p className="text-xs text-muted-foreground">{bill.vendorEmail}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(bill.issueDate)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(bill.dueDate)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmt(bill.total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusStyle[bill.status] ?? ""}`}
                      >
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => (window.location.href = `/bills/${bill.id}`)}
                          >
                            View
                          </DropdownMenuItem>
                          {(bill.status === "PENDING" || bill.status === "OVERDUE") && (
                            <DropdownMenuItem
                              onClick={() => updateStatus(bill.id, "PAID")}
                              className="text-emerald-400"
                            >
                              <CheckCheck className="h-3.5 w-3.5 mr-2" />
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          {bill.status === "DRAFT" && (
                            <DropdownMenuItem
                              onClick={() => deleteBill(bill.id)}
                              className="text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
