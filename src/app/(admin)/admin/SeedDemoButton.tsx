"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";

export function SeedDemoButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState<{
    created: Record<string, number>;
    credentials: { password: string; accountants: string[]; clients: string[] };
  } | null>(null);

  async function seed() {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/seed-demo", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult(data);
      toast.success("Demo data created");
      router.refresh();
    } catch {
      toast.error("Failed to seed demo data");
    } finally { setSeeding(false); }
  }

  function close() {
    setOpen(false);
    setResult(null);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10">
        <Sparkles className="h-4 w-4" />
        Seed demo data
      </Button>

      <Dialog open={open} onOpenChange={(o) => (!o ? close() : setOpen(true))}>
        <DialogContent className="max-w-lg">
          {!result ? (
            <>
              <DialogHeader>
                <DialogTitle>Generate sample data</DialogTitle>
                <DialogDescription>
                  Populates the system with realistic demo content so you can see the 3-portal workflow.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 space-y-3 text-sm">
                <p className="text-muted-foreground">Creates:</p>
                <ul className="space-y-1.5 text-xs font-mono text-muted-foreground border border-border bg-card/40 rounded-md p-3">
                  <li>· 2 demo accountants (Sarah Kim, Marcus Taylor)</li>
                  <li>· 4 demo clients (Acme Tech, Bright Retail, Maven Agency, Green Eats)</li>
                  <li>· 8 service requests at every status (OPEN, ALLOCATED, IN_PROGRESS, COMPLETED)</li>
                  <li>· ManagedClient assignments between accountants and clients</li>
                  <li>· Monthly P&amp;L reports awaiting client approval</li>
                  <li>· 2 unread messages from accountant to client</li>
                  <li>· 1 document request with mixed-status items</li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  Idempotent — running multiple times won&apos;t create duplicates.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={close} disabled={seeding}>Cancel</Button>
                <Button onClick={seed} disabled={seeding} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                  {seeding ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />seeding…</> : <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Generate</>}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Demo data created
                </DialogTitle>
                <DialogDescription>
                  You can now sign in as any of these demo accounts to test the flow.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="rounded-md border border-border bg-card/40 p-3 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  {Object.entries(result.created).map(([k, v]) => (
                    <div key={k}>
                      <p className="text-muted-foreground">{k}</p>
                      <p className="text-lg font-bold text-foreground">{v}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 mb-2">login_credentials · password: demo1234</p>
                  <div className="space-y-1.5 text-xs">
                    <p className="font-semibold text-foreground">Accountants:</p>
                    {result.credentials.accountants.map((e) => (
                      <code key={e} className="block text-muted-foreground">{e}</code>
                    ))}
                    <p className="font-semibold text-foreground mt-2">Clients:</p>
                    {result.credentials.clients.map((e) => (
                      <code key={e} className="block text-muted-foreground">{e}</code>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Try the flow: log out → sign in as <span className="font-mono text-foreground">founder@acmetech.demo</span> to see the client side, then back to admin to see the dispatch queue populated.
                </p>
              </div>

              <DialogFooter>
                <Button onClick={close} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
