"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

export function NavItem({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link href={href}>
      <Button
        variant="ghost"
        className={`w-full justify-start gap-3 transition-colors ${
          isActive
            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </Button>
    </Link>
  );
}
