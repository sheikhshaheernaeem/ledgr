"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Users, ArrowLeftRight, FileText, AlertTriangle, Loader2 } from "lucide-react";

interface SearchResult {
  kind: "client" | "transaction" | "report" | "anomaly";
  href: string;
  title: string;
  detail: string;
  clientName?: string;
}

const ICONS = {
  client: Users,
  transaction: ArrowLeftRight,
  report: FileText,
  anomaly: AlertTriangle,
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveIdx(0);
    }
  }, [open]);

  // debounced search
  useEffect(() => {
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/firm/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
          setActiveIdx(0);
        }
      } catch {
        // swallow
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const navigate = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router]);

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[activeIdx];
      if (target) navigate(target.href);
    }
  }

  return (
    <>
      {/* Inline trigger — used inside sidebar */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 rounded-md border border-border bg-background hover:border-foreground/30 px-2.5 py-1.5 text-xs text-muted-foreground font-mono"
        title="Search (⌘K)"
      >
        <Search className="h-3 w-3 shrink-0" />
        <span className="truncate flex-1 text-left">search…</span>
        <kbd className="text-[9px] border border-border bg-card px-1 rounded">⌘K</kbd>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/60">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search clients, transactions, reports, anomalies..."
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60"
              />
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {!query.trim() ? (
                <div className="px-4 py-8 text-center text-xs font-mono text-muted-foreground">
                  type_to_search · ⌘K_anywhere · esc_to_close
                </div>
              ) : results.length === 0 && !loading ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No matches for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <ul className="py-1">
                  {results.map((r, i) => {
                    const Icon = ICONS[r.kind];
                    const active = i === activeIdx;
                    return (
                      <li key={`${r.kind}-${i}`}>
                        <button
                          onClick={() => navigate(r.href)}
                          onMouseEnter={() => setActiveIdx(i)}
                          className={`w-full text-left flex items-center gap-3 px-3 py-2 ${
                            active ? "bg-emerald-500/10" : "hover:bg-card/80"
                          }`}
                        >
                          <div className="w-7 h-7 rounded-md border border-border bg-background flex items-center justify-center shrink-0">
                            <Icon className={`h-3.5 w-3.5 ${active ? "text-emerald-400" : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${active ? "text-foreground font-medium" : "text-foreground/90"}`}>
                              {r.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono truncate">
                              {r.clientName ? `${r.clientName} · ` : ""}{r.detail}
                            </p>
                          </div>
                          <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-border bg-card/60 text-muted-foreground shrink-0">
                            {r.kind}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="px-3 py-2 border-t border-border/60 bg-card/60 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>↑↓ navigate · ↵ open</span>
              <span>{results.length} result{results.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
