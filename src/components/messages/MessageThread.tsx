"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";

interface Message {
  id: string;
  body: string;
  role: string;
  createdAt: string;
  user?: { name?: string; email?: string };
}

interface MessageThreadProps {
  transactionId?: string;
  reportId?: string;
}

export function MessageThread({ transactionId, reportId }: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchMessages() {
    try {
      const params = new URLSearchParams();
      if (transactionId) params.set("transactionId", transactionId);
      if (reportId) params.set("reportId", reportId);
      const res = await fetch(`/api/messages?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId, reportId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), transactionId, reportId }),
      });
      setBody("");
      await fetchMessages();
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col border border-border rounded-lg overflow-hidden bg-card">
      <div className="px-4 py-2 border-b border-border">
        <p className="text-sm font-medium text-foreground">Messages</p>
      </div>

      {/* Message list */}
      <div className="max-h-64 overflow-y-auto p-4 space-y-3 flex flex-col">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No messages yet
          </p>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.role === "ADMIN";
            return (
              <div
                key={msg.id}
                className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    isAdmin
                      ? "bg-muted text-muted-foreground"
                      : "bg-emerald-500/20 text-emerald-100 border border-emerald-500/30"
                  }`}
                >
                  {isAdmin && (
                    <p className="text-xs font-medium mb-1 text-emerald-400">
                      Ledgr Team
                    </p>
                  )}
                  <p className="leading-relaxed">{msg.body}</p>
                  <p className="text-xs opacity-50 mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Ctrl+Enter to send)"
          rows={2}
          className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <Button
          onClick={handleSend}
          disabled={sending || !body.trim()}
          size="sm"
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold self-end"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
