"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "ai/react";
import { Sparkles, X, Send, Loader2, MessageCircle, ChevronDown } from "lucide-react";

const QUICK_PROMPTS = [
  "What's my runway at current burn?",
  "Which expenses are tax-deductible?",
  "Any overdue invoices?",
  "Summarise this month's P&L",
];

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat({
    api: "/api/ai/chat",
  });

  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, minimized]);

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function quickPrompt(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setMinimized(false); }}
          className="fixed bottom-5 right-5 z-40 group flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-3 rounded-full shadow-2xl shadow-emerald-500/40 transition-transform hover:scale-105"
          aria-label="Open AI assistant"
        >
          <div className="relative">
            <Sparkles className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </div>
          <span className="text-sm hidden sm:inline">Ask Ledgr AI</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className={`
          fixed z-40 transition-all duration-200
          ${minimized
            ? "bottom-4 right-4 w-72 h-12"
            : "bottom-4 right-4 w-[min(380px,calc(100vw-2rem))] h-[min(580px,calc(100vh-2rem))]"
          }
          bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden
        `}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60 bg-card/80 shrink-0">
            <button
              onClick={() => setMinimized((v) => !v)}
              className="flex items-center gap-2 flex-1 text-left"
            >
              <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-background" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground leading-tight">Ledgr AI</p>
                <p className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  live on your books
                </p>
              </div>
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized((v) => !v)}
                className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
                title={minimized ? "Expand" : "Minimize"}
              >
                {minimized ? <MessageCircle className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4 py-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Your AI accountant</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mb-4">
                      Llama 3.3 70B with live access to your books. Ask anything.
                    </p>
                    <div className="flex flex-col gap-1.5 w-full">
                      {QUICK_PROMPTS.map((p) => (
                        <button
                          key={p}
                          onClick={() => quickPrompt(p)}
                          className="text-left text-xs px-3 py-2 rounded-md border border-border bg-background hover:border-emerald-500/40 hover:bg-emerald-500/[0.05] transition-colors text-muted-foreground hover:text-foreground"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((m) => (
                      <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                        {m.role !== "user" && (
                          <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="h-3 w-3 text-background" />
                          </div>
                        )}
                        <div className={`
                          max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words
                          ${m.role === "user"
                            ? "bg-emerald-500/15 border border-emerald-500/20 text-foreground rounded-tr-sm"
                            : "bg-background border border-border text-foreground rounded-tl-sm"
                          }
                        `}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="h-3 w-3 text-background" />
                        </div>
                        <div className="bg-background border border-border rounded-lg rounded-tl-sm px-3 py-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="border-t border-border/60 p-2 shrink-0">
                <div className="flex items-end gap-1.5">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Ask about your finances..."
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e as unknown as React.FormEvent);
                      }
                    }}
                    className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/40 placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="h-9 w-9 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-black font-semibold flex items-center justify-center shrink-0"
                  >
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[9px] font-mono text-muted-foreground/60 mt-1.5 text-center">
                  llama_3.3_70b · live_on_your_books
                </p>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
