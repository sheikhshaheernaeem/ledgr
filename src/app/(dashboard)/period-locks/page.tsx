"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Lock, LockOpen, Loader2, AlertTriangle } from "lucide-react";

interface LockedPeriod {
  id: string;
  year: number;
  month: number;
  lockedAt: string;
  lockedBy: string;
  notes: string | null;
}

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

export default function PeriodLocksPage() {
  const [locks, setLocks] = useState<LockedPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [confirm, setConfirm] = useState<{
    action: "lock" | "unlock";
    year: number;
    month: number;
  } | null>(null);
  const [confirmNotes, setConfirmNotes] = useState("");

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1];

  async function load() {
    const res = await fetch("/api/period-locks");
    if (res.ok) setLocks(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function isLocked(year: number, month: number) {
    return locks.some(l => l.year === year && l.month === month);
  }

  function getLock(year: number, month: number) {
    return locks.find(l => l.year === year && l.month === month);
  }

  async function handleLock(year: number, month: number, notes?: string) {
    setActing(true);
    const res = await fetch("/api/period-locks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, notes }),
    });
    if (res.ok) {
      toast.success(`${MONTHS[month - 1]} ${year} locked`);
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to lock period");
    }
    setActing(false);
    setConfirm(null);
    setConfirmNotes("");
  }

  async function handleUnlock(year: number, month: number) {
    setActing(true);
    const res = await fetch("/api/period-locks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month }),
    });
    if (res.ok) {
      toast.success(`${MONTHS[month - 1]} ${year} unlocked`);
      load();
    } else {
      toast.error("Failed to unlock period");
    }
    setActing(false);
    setConfirm(null);
  }

  function openConfirm(action: "lock" | "unlock", year: number, month: number) {
    setConfirmNotes("");
    setConfirm({ action, year, month });
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Period Locks</h1>
        <p className="text-muted-foreground mt-1">
          Lock closed months to prevent retroactive edits
        </p>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
        <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
        <p className="text-sm text-yellow-300">
          Locked periods cannot be edited. Unlock with caution — only for corrections.
        </p>
      </div>

      {/* Calendar grids */}
      {years.map(year => (
        <Card key={year} className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">{year}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {MONTHS.map((monthName, idx) => {
                  const month = idx + 1;
                  const locked = isLocked(year, month);
                  const lock = getLock(year, month);
                  return (
                    <div
                      key={month}
                      className={`relative rounded-lg border p-3 text-sm transition-colors ${
                        locked
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-border bg-background"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-xs">{monthName}</span>
                        {locked && (
                          <Lock className="h-3 w-3 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      {locked ? (
                        <>
                          <Badge
                            variant="outline"
                            className="text-xs border-emerald-500/30 text-emerald-400 mb-2"
                          >
                            Locked
                          </Badge>
                          {lock && (
                            <p className="text-xs text-muted-foreground mb-2">
                              {new Date(lock.lockedAt).toLocaleDateString()}
                            </p>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-7 gap-1 border-red-500/30 text-red-400 hover:text-red-300"
                            onClick={() => openConfirm("unlock", year, month)}
                          >
                            <LockOpen className="h-3 w-3" />
                            Unlock
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs h-7 gap-1"
                          onClick={() => openConfirm("lock", year, month)}
                        >
                          <Lock className="h-3 w-3" />
                          Lock
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Locked periods table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">All Locked Periods</CardTitle>
          <CardDescription>History of all period locks</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : locks.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              No periods are currently locked
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Locked At</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locks.map(lock => (
                  <TableRow key={lock.id}>
                    <TableCell className="font-medium">
                      {MONTHS[lock.month - 1]} {lock.year}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(lock.lockedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lock.notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1 border-red-500/30 text-red-400 hover:text-red-300"
                        onClick={() => openConfirm("unlock", lock.year, lock.month)}
                      >
                        <LockOpen className="h-3 w-3" />
                        Unlock
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={!!confirm} onOpenChange={() => setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.action === "lock" ? "Lock" : "Unlock"}{" "}
              {confirm ? `${MONTHS[confirm.month - 1]} ${confirm.year}` : ""}?
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {confirm?.action === "lock" ? (
              <>
                <p className="text-sm text-muted-foreground">
                  This will prevent any changes to transactions in this period. You can unlock it later if needed.
                </p>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <textarea
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    rows={2}
                    placeholder="Reason for locking..."
                    value={confirmNotes}
                    onChange={e => setConfirmNotes(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2 p-3 rounded-md border border-yellow-500/30 bg-yellow-500/5">
                <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-sm text-yellow-300">
                  Unlocking this period will allow retroactive edits. Only unlock for corrections.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              disabled={acting}
              onClick={() => {
                if (!confirm) return;
                if (confirm.action === "lock") {
                  handleLock(confirm.year, confirm.month, confirmNotes || undefined);
                } else {
                  handleUnlock(confirm.year, confirm.month);
                }
              }}
              className={
                confirm?.action === "lock"
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
                  : "bg-red-500 hover:bg-red-400 text-foreground font-semibold"
              }
            >
              {acting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : confirm?.action === "lock" ? (
                "Lock Period"
              ) : (
                "Unlock Period"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
