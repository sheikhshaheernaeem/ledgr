"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  Settings,
  PiggyBank,
  GitMerge,
  TrendingUp,
  Receipt,
  Search,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/reconciliation", label: "Reconciliation", icon: GitMerge },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/forecast", label: "Forecast", icon: TrendingUp },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SearchTransaction {
  id: string;
  description: string;
  amount: number;
}

interface SearchInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
}

interface SearchResults {
  transactions: SearchTransaction[];
  invoices: SearchInvoice[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ transactions: [], invoices: [] });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Debounced search
  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults({ transactions: [], invoices: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data: SearchResults = await res.json();
        setResults(data);
      }
    } catch {
      // silently fail — search is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchResults]);

  const navigate = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery("");
    setResults({ transactions: [], invoices: [] });
  };

  const hasSearchResults =
    results.transactions.length > 0 || results.invoices.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 overflow-hidden max-w-lg">
        <Command
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
          shouldFilter={!hasSearchResults && !loading}
        >
          <div className="flex items-center border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground mr-2" />
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search transactions, invoices, pages..."
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus:ring-0"
            />
          </div>
          <CommandList className="max-h-80 overflow-y-auto overflow-x-hidden">
            <CommandEmpty>
              {loading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Searching…
                </p>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </p>
              )}
            </CommandEmpty>

            {/* Navigation shortcuts — always show when no search results */}
            {!hasSearchResults && (
              <CommandGroup heading="Navigation">
                {navItems.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={item.label}
                    onSelect={() => navigate(item.href)}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground rounded-md mx-1"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Dynamic search results */}
            {hasSearchResults && (
              <>
                {results.transactions.length > 0 && (
                  <CommandGroup heading="Transactions">
                    {results.transactions.map((tx) => (
                      <CommandItem
                        key={tx.id}
                        value={`tx-${tx.id}`}
                        onSelect={() => navigate(`/transactions?id=${tx.id}`)}
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground rounded-md mx-1"
                      >
                        <ArrowLeftRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{tx.description}</span>
                        <span className="ml-auto text-xs text-muted-foreground shrink-0">
                          ${Math.abs(tx.amount).toFixed(2)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {results.transactions.length > 0 && results.invoices.length > 0 && (
                  <CommandSeparator />
                )}

                {results.invoices.length > 0 && (
                  <CommandGroup heading="Invoices">
                    {results.invoices.map((inv) => (
                      <CommandItem
                        key={inv.id}
                        value={`inv-${inv.id}`}
                        onSelect={() => navigate(`/invoices/${inv.id}`)}
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground rounded-md mx-1"
                      >
                        <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {inv.invoiceNumber} — {inv.clientName}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
