"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const ROLES = ["CLIENT", "ACCOUNTANT", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

export function AdminRoleButton({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function changeRole(newRole: Role) {
    if (newRole === currentRole) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to change role");
      }
      toast.success(`Role changed to ${newRole}`);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 transition-colors"
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Change Role
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs">Set role to…</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ROLES.map((role) => (
            <DropdownMenuItem
              key={role}
              onClick={() => changeRole(role)}
              className={`text-xs cursor-pointer ${role === currentRole ? "text-muted-foreground" : ""}`}
            >
              {role === currentRole ? `✓ ${role}` : role}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
