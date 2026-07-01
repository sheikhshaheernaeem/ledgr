"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !message) return;
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, topic, message }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
      toast.success("Message sent");
    } catch {
      toast.error("Failed to send — try email instead");
    } finally { setSending(false); }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.06] p-8 text-center">
        <CheckCircle2 className="h-8 w-8 mx-auto text-cyan-500 dark:text-cyan-400 mb-3" />
        <h3 className="font-semibold text-foreground text-lg">Got it.</h3>
        <p className="text-sm text-muted-foreground mt-2">
          We&apos;ll reply to <span className="font-mono text-foreground">{email}</span> within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-border/60 bg-card p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="c-name">Name</Label>
          <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" placeholder="Your name" />
        </div>
        <div>
          <Label htmlFor="c-email">Email *</Label>
          <Input id="c-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" placeholder="you@company.com" />
        </div>
      </div>
      <div>
        <Label htmlFor="c-topic">What&apos;s this about?</Label>
        <select
          id="c-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full mt-1.5 h-10 border border-input bg-background rounded-md px-3 text-sm"
        >
          <option value="general">General question</option>
          <option value="sales">Sales / demo</option>
          <option value="support">Customer support</option>
          <option value="switching">Switching from another firm</option>
          <option value="partnership">Partnership</option>
        </select>
      </div>
      <div>
        <Label htmlFor="c-message">Message *</Label>
        <Textarea id="c-message" required value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1.5" rows={5} placeholder="Tell us about your business and what you're looking for." />
      </div>
      <Button type="submit" disabled={sending} className="w-full h-11 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
        {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> sending…</> : <><Send className="h-4 w-4 mr-2" /> Send message</>}
      </Button>
    </form>
  );
}
