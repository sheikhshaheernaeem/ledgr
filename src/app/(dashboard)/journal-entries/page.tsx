"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import React from "react";
import { Plus, Loader2, BookOpen, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";

interface JournalLine {
  id: string;
  accountId: string;
  description: string | null;
  debit: number;
  credit: number;
  account: {
    code: string;
    name: string;
  };
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  reference: string | null;
  type: string;
  status: string;
  memo: string | null;
  lines: JournalLine[];
}

const STATUS_BADGE: Record<string, string> = {
  POSTED: "border-emerald-500/30 text-emerald-400",
  DRAFT: "border-yellow-500/30 text-yellow-400",
  REVERSED: "border-zinc-500/30 text-zinc-500",
};

const TYPE_FILTERS = ["ALL", "MANUAL", "AUTO", "DEPRECIATION"] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TypeFilter>("ALL");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [reversing, setReversing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = filter !== "ALL" ? `?type=${filter}` : "";
    const res = await fetch(`/api/journal-entries${params}`);
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function reverseEntry(id: string) {
    if (!confirm("Create a reversal entry for this journal entry?")) return;
    setReversing(id);
    const res = await fetch(`/api/journal-entries/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Reversal entry ${data.reversalEntry?.entryNumber} created`);
      load();
    } else {
      toast.error(data.error ?? "Reversal failed");
    }
    setReversing(null);
  }

  const filtered = filter === "ALL" ? entries : entries.filter((e) => e.type === filter);

  const totalPosted = filtered.filter((e) => e.status === "POSTED").length;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Journal Entries</h1>
          <p className="text-muted-foreground mt-1">
            {totalPosted} posted — {filtered.length} total
          </p>
        </div>
        <Link href="/journal-entries/new">
          <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
            <Plus className="h-4 w-4" /> New Entry
          </Button>
        </Link>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === f
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">
            Entries{" "}
            <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No journal entries found.</p>
              <Link href="/journal-entries/new">
                <Button variant="outline" size="sm" className="mt-3">Create first entry</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Total DR</TableHead>
                  <TableHead className="text-right">Total CR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => {
                  const totalDR = entry.lines.reduce((s, l) => s + l.debit, 0);
                  const totalCR = entry.lines.reduce((s, l) => s + l.credit, 0);
                  const isExpanded = expanded.has(entry.id);
                  return (
                    <React.Fragment key={entry.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => toggleExpand(entry.id)}
                      >
                        <TableCell>
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          }
                        </TableCell>
                        <TableCell className="font-mono text-sm text-emerald-400 font-medium">
                          {entry.entryNumber}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{entry.description}</p>
                            {entry.reference && (
                              <p className="text-xs text-muted-foreground">Ref: {entry.reference}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs border-zinc-500/30 text-zinc-400">
                            {entry.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-red-400">
                          {totalDR.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-emerald-400">
                          {totalCR.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Badge variant="outline" className={`text-xs ${STATUS_BADGE[entry.status] ?? ""}`}>
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {entry.status === "POSTED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Reverse entry"
                              disabled={reversing === entry.id}
                              onClick={() => reverseEntry(entry.id)}
                            >
                              {reversing === entry.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <RotateCcw className="h-3.5 w-3.5 text-orange-400" />
                              }
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-muted/10">
                          <TableCell colSpan={9} className="p-0">
                            <div className="px-8 py-3 border-t border-border/50">
                              {entry.memo && (
                                <p className="text-xs text-muted-foreground mb-3 italic">Memo: {entry.memo}</p>
                              )}
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-muted-foreground border-b border-border/50">
                                    <th className="text-left py-1 font-medium">Account</th>
                                    <th className="text-left py-1 font-medium">Description</th>
                                    <th className="text-right py-1 font-medium">Debit</th>
                                    <th className="text-right py-1 font-medium">Credit</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {entry.lines.map((line) => (
                                    <tr key={line.id} className="border-b border-border/20 last:border-0">
                                      <td className="py-1 font-mono text-muted-foreground">
                                        {line.account.code} — {line.account.name}
                                      </td>
                                      <td className="py-1 text-muted-foreground">{line.description ?? ""}</td>
                                      <td className="py-1 text-right text-red-400 font-mono">
                                        {line.debit > 0 ? line.debit.toLocaleString("en-US", { minimumFractionDigits: 2 }) : ""}
                                      </td>
                                      <td className="py-1 text-right text-emerald-400 font-mono">
                                        {line.credit > 0 ? line.credit.toLocaleString("en-US", { minimumFractionDigits: 2 }) : ""}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
