"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, X } from "lucide-react";

export interface UpgradeOption {
  slug: string;
  displayName: string;
  price: number;
  documentLimit?: number;
}

export interface LimitReachedPayload {
  error: "limit_reached";
  message: string;
  tier: string;
  used: number;
  limit: number | null;
  upgrade_options: UpgradeOption[];
}

/**
 * Inline upgrade prompt rendered when /api/upload returns a 402
 * limit_reached error. Stays in DOM until dismissed or the user upgrades.
 */
export function UpgradeRequiredCard({
  data,
  onDismiss,
}: {
  data: LimitReachedPayload;
  onDismiss?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.06] p-5 relative">
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 w-6 h-6 rounded-md border border-border bg-background/60 flex items-center justify-center hover:bg-card"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">Plan limit reached</p>
          <p className="text-xs text-muted-foreground mt-0.5">{data.message}</p>
          {data.limit !== null && (
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              {data.tier} · {data.used.toLocaleString()} / {data.limit.toLocaleString()} documents this month
            </p>
          )}
        </div>
      </div>

      {data.upgrade_options.length > 0 ? (
        <>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">upgrade_to_continue</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.upgrade_options.map((opt) => (
              <Link
                key={opt.slug}
                href={`/client/settings?upgrade=${opt.slug}`}
                className="group rounded-xl border border-blue-500/30 bg-blue-500/[0.06] hover:bg-blue-500/[0.12] hover:border-blue-500/50 transition-all p-4 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm">{opt.displayName}</p>
                  <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                    ${opt.price.toLocaleString()}/mo
                    {opt.documentLimit !== undefined && opt.documentLimit !== Infinity && ` · ${opt.documentLimit.toLocaleString()} docs/mo`}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" />
              </Link>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          You&apos;re on our highest plan — please <Link href="/contact" className="text-blue-500 hover:text-blue-400">contact support</Link> for an override.
        </p>
      )}

      <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center justify-between gap-3">
        <p className="text-[10px] font-mono text-muted-foreground">limits_reset_first_of_next_month</p>
        <Link
          href="/#pricing"
          className="font-mono text-xs text-blue-500 dark:text-blue-400 hover:text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 px-3 py-1.5 rounded-md inline-flex items-center gap-1"
        >
          See all plans <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
