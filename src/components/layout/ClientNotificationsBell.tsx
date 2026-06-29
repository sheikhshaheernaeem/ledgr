"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, MessageSquare, FileText, FileCheck } from "lucide-react";

interface Notifs {
  unreadMessages: number;
  pendingReports: number;
  pendingDocRequests: number;
  pendingDocItems: number;
  total: number;
}

export function ClientNotificationsBell() {
  const [data, setData] = useState<Notifs | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/client/notifications");
        if (res.ok) {
          const d = await res.json();
           
          setData(d);
        }
      } catch {}
    }
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const total = data?.total ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-md border border-border bg-card/60 hover:bg-card flex items-center justify-center relative"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-black text-[10px] font-bold flex items-center justify-center">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-2.5 border-b border-border/60 bg-card/60">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">notifications</p>
          </div>
          {total === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">All caught up.</p>
            </div>
          ) : (
            <ul className="py-1">
              {data && data.unreadMessages > 0 && (
                <NotifItem
                  href="/client/messages"
                  icon={MessageSquare}
                  label={`${data.unreadMessages} new message${data.unreadMessages > 1 ? "s" : ""}`}
                  sub="from your accountant"
                />
              )}
              {data && data.pendingReports > 0 && (
                <NotifItem
                  href="/client/requests"
                  icon={FileText}
                  label={`${data.pendingReports} report${data.pendingReports > 1 ? "s" : ""} to approve`}
                  sub="review and sign off"
                />
              )}
              {data && data.pendingDocItems > 0 && (
                <NotifItem
                  href="/client/requests"
                  icon={FileCheck}
                  label={`${data.pendingDocItems} document${data.pendingDocItems > 1 ? "s" : ""} requested`}
                  sub={`across ${data.pendingDocRequests} request${data.pendingDocRequests > 1 ? "s" : ""}`}
                />
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NotifItem({ href, icon: Icon, label, sub }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; sub: string }) {
  return (
    <li>
      <Link href={href} className="flex items-start gap-3 px-3 py-2.5 hover:bg-card/60 transition-colors">
        <div className="w-7 h-7 rounded-md border border-border bg-background flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{sub}</p>
        </div>
      </Link>
    </li>
  );
}
