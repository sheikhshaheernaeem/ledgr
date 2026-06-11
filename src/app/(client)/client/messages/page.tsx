"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, User as UserIcon, MessageSquare, Clock } from "lucide-react";

interface Message {
  id: string;
  body: string;
  role: string;
  readAt: string | null;
  createdAt: string;
  reportId: string | null;
  transactionId: string | null;
  user: { id: string; name: string | null; email: string; role: string };
}

const fmtDate = (s: string) => {
  const d = new Date(s);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

export default function ClientMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/session");
      const meData = await meRes.json();
      const uid = meData?.user?.id;
      setSessionUserId(uid);

      if (!uid) return;

      const res = await fetch(`/api/messages?userId=${uid}`);
      if (!res.ok) throw new Error();
      setMessages(await res.json());
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), role: "CLIENT" }),
      });
      if (!res.ok) throw new Error();
      setBody("");
      load();
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3" /> messages
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Your accountant</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Notes from your bookkeeper. Reply with questions about transactions, reports, or anything else.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-card/30 overflow-hidden flex flex-col h-[600px]">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground font-mono">
            <Clock className="h-4 w-4 animate-spin mr-2" /> loading...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Your accountant will reach out when there&apos;s something to discuss — categorization questions, missing docs, or report explanations.
            </p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => {
              const isMe = m.user.id === sessionUserId || m.role === "CLIENT";
              return (
                <li key={m.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-1 ${
                    isMe ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400" : "bg-muted text-foreground"
                  }`}>
                    {isMe ? <UserIcon className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                  </div>
                  <div className={`max-w-[78%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                    <div className={`rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      isMe
                        ? "bg-emerald-500/10 border border-emerald-500/20 rounded-tr-sm"
                        : "bg-card border border-border rounded-tl-sm"
                    }`}>
                      {m.body}
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground mt-1 px-1">
                      {isMe ? "you" : "your accountant"} · {fmtDate(m.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
            <div ref={bottomRef} />
          </ul>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="border-t border-border/60 p-3 bg-card/40"
        >
          <div className="flex items-end gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask a question, share context, or reply…"
              rows={2}
              className="text-sm resize-none flex-1"
              disabled={sending}
            />
            <Button
              type="submit"
              size="sm"
              disabled={sending || !body.trim()}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold h-9 shrink-0"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {sending ? "..." : "send"}
            </Button>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground mt-2">enter to send · shift+enter for new line</p>
        </form>
      </div>
    </div>
  );
}
