"use client";

import { useChat } from "ai/react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Bot, Send, X, User, Loader2, Sparkles, Minimize2 } from "lucide-react";
import Link from "next/link";

const QUICK_PROMPTS = [
  "What's my cash position?",
  "Any overdue invoices?",
  "Top expenses this month?",
  "Uninvoiced hours?",
];

function Bubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isUser ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>
        {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
      </div>
      <div className={`max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${isUser ? "bg-emerald-500/15 text-white rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
        {content}
      </div>
    </div>
  );
}

export function AIChatBubble() {
  const [open, setOpen] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat({
    api: "/api/ai/chat",
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function sendQuick(text: string) {
    setInput(text);
    setTimeout(() => {
      const form = document.getElementById("bubble-form") as HTMLFormElement | null;
      form?.requestSubmit();
    }, 50);
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-emerald-500 shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
          aria-label="Open AI assistant"
        >
          <Sparkles className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Chat panel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[380px] p-0 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/30 to-emerald-500/30 border border-blue-500/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Ledgr AI</p>
                <p className="text-[10px] text-muted-foreground">Knows your books</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/ai-assistant">
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Open full view">
                  <Minimize2 className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-3 py-3">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground text-center py-2">
                  Ask me anything about your finances
                </p>
                <div className="space-y-2">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendQuick(p)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border bg-card hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m) => (
                  <Bubble key={m.id} role={m.role} content={m.content} />
                ))}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Bot className="h-3 w-3 text-blue-400" />
                    </div>
                    <div className="bg-muted rounded-xl rounded-tl-sm px-3 py-2">
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="px-3 py-3 border-t border-border shrink-0">
            <form
              id="bubble-form"
              onSubmit={handleSubmit}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask a question…"
                disabled={isLoading}
                className="flex-1 h-9 text-xs bg-card border-border"
              />
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 bg-emerald-500 hover:bg-emerald-400 text-black shrink-0"
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
