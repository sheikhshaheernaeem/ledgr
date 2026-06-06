"use client";

import { useChat } from "ai/react";
import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, Sparkles, TrendingUp, FileText, Clock, Receipt, BookOpen, Calculator } from "lucide-react";

const SUGGESTIONS = [
  { icon: TrendingUp, text: "What's my current cash position?", label: "Cash Flow" },
  { icon: Receipt, text: "Do I have any overdue invoices or bills?", label: "Invoices" },
  { icon: FileText, text: "Summarize my financial performance this month", label: "Summary" },
  { icon: Clock, text: "How many uninvoiced hours do I have?", label: "Time" },
  { icon: BookOpen, text: "How do I record a depreciation journal entry?", label: "Accounting" },
  { icon: Calculator, text: "What expenses might be tax deductible?", label: "Tax" },
];

function MessageBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? "bg-emerald-500/15 text-foreground rounded-tr-sm" : "bg-card border border-border text-foreground rounded-tl-sm"}`}>
        {content}
      </div>
    </div>
  );
}

export default function AIAssistantPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat({
    api: "/api/ai/chat",
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function useSuggestion(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-emerald-500/30 border border-blue-500/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              Ledgr AI
              <Badge className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30 font-medium">BETA</Badge>
            </h1>
            <p className="text-xs text-muted-foreground">Powered by Claude · Has access to your live financial data</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-blue-500/20 flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Hi, I&apos;m Ledgr AI</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-8">
              I can answer accounting questions, analyze your finances, and help you work smarter — all with access to your live books.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
              {SUGGESTIONS.map((s) => (
                <Card
                  key={s.text}
                  onClick={() => useSuggestion(s.text)}
                  className="border-border bg-card hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-colors cursor-pointer"
                >
                  <CardContent className="p-3 flex items-start gap-2.5">
                    <s.icon className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">{s.label}</p>
                      <p className="text-xs text-foreground leading-snug">{s.text}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-blue-400" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto">
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Ask anything about your finances, accounting, or taxes…"
            disabled={isLoading}
            className="flex-1 bg-card border-border"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); } }}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="text-center text-[11px] text-muted-foreground mt-2">
          AI can make mistakes. Verify important financial decisions with a qualified accountant.
        </p>
      </div>
    </div>
  );
}
