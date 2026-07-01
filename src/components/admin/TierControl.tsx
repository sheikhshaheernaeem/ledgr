"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, PowerOff, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIERS, type TierKey, type Tier } from "@/config/tiers";

export function TierControl({ userId, currentTier }: { userId: string; currentTier: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<TierKey | "SUSPENDED">(
    currentTier === "SUSPENDED" ? "SUSPENDED" : (currentTier?.toUpperCase().replace(/-/g, "_") as TierKey ?? "AI_STARTER"),
  );

  const isSuspended = currentTier === "SUSPENDED";

  async function apply(tier: TierKey | "SUSPENDED") {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/tier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(tier === "SUSPENDED" ? "Subscription suspended" : `Set to ${tier}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value as TierKey | "SUSPENDED")}
        disabled={busy}
        className="h-8 border border-input bg-background rounded-md px-2 text-xs font-mono"
      >
        <optgroup label="AI Accountant">
          {(Object.values(TIERS) as Tier[])
            .filter((t) => t.family === "ai")
            .map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.displayName} (${t.price})
              </option>
            ))}
        </optgroup>
        <optgroup label="Book keeping">
          {(Object.values(TIERS) as Tier[])
            .filter((t) => t.family === "bookkeeping")
            .map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.displayName} (${t.price})
              </option>
            ))}
        </optgroup>
        <option value="SUSPENDED">— Suspended —</option>
      </select>
      <Button
        onClick={() => apply(selected)}
        disabled={busy}
        size="sm"
        className="h-8 bg-cyan-500 hover:bg-cyan-400 text-black text-xs"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
      </Button>
      {isSuspended ? (
        <Button
          onClick={() => apply("AI_STARTER")}
          disabled={busy}
          size="sm"
          variant="outline"
          className="h-8 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 text-xs"
        >
          <Power className="h-3 w-3 mr-1" /> Activate
        </Button>
      ) : (
        <Button
          onClick={() => apply("SUSPENDED")}
          disabled={busy}
          size="sm"
          variant="outline"
          className="h-8 border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs"
        >
          <PowerOff className="h-3 w-3 mr-1" /> Suspend
        </Button>
      )}
    </div>
  );
}
