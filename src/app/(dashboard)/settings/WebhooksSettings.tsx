"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Zap, Loader2, ToggleLeft, ToggleRight } from "lucide-react";

const AVAILABLE_EVENTS = [
  "invoice.created", "invoice.paid", "invoice.overdue",
  "transaction.created", "transaction.updated",
  "expense.submitted", "expense.approved",
  "payment.received",
];

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  description: string | null;
  lastPingAt: string | null;
  failCount: number;
}

export default function WebhooksSettings({ initialWebhooks }: { initialWebhooks: Webhook[] }) {
  const [webhooks, setWebhooks] = useState(initialWebhooks);
  const [creating, setCreating] = useState(false);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["invoice.paid", "transaction.created"]);
  const [loading, setLoading] = useState(false);

  async function createWebhook() {
    if (!url.trim() || !selectedEvents.length) return;
    setLoading(true);
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events: selectedEvents, description: description || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setWebhooks(prev => [{ id: data.id, url: data.url, events: data.events, isActive: true, description: data.description, lastPingAt: null, failCount: 0 }, ...prev]);
      toast.success("Webhook created");
      if (data.secretRevealed) {
        toast.info(`Secret: ${data.secretRevealed}`, { duration: 10000, description: "Save this secret — it won't be shown again" });
      }
      setCreating(false); setUrl(""); setDescription("");
    } else {
      toast.error(data.error ?? "Failed to create webhook");
    }
  }

  async function deleteWebhook(id: string) {
    const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    if (res.ok) { setWebhooks(prev => prev.filter(w => w.id !== id)); toast.success("Webhook deleted"); }
    else toast.error("Failed to delete");
  }

  async function toggleWebhook(id: string, isActive: boolean) {
    const res = await fetch(`/api/webhooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      setWebhooks(prev => prev.map(w => w.id === id ? { ...w, isActive: !isActive } : w));
    }
  }

  async function testWebhook(id: string) {
    const res = await fetch(`/api/webhooks/${id}/test`, { method: "POST" });
    if (res.ok) toast.success("Test event sent");
    else toast.error("Failed to send test event");
  }

  function toggleEvent(event: string) {
    setSelectedEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]);
  }

  return (
    <div className="space-y-4">
      {webhooks.length === 0 && !creating && (
        <p className="text-sm text-muted-foreground">No webhooks configured.</p>
      )}

      {webhooks.map(wh => (
        <div key={wh.id} className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-mono truncate">{wh.url}</p>
              {wh.description && <p className="text-xs text-muted-foreground">{wh.description}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => toggleWebhook(wh.id, wh.isActive)}>
                {wh.isActive
                  ? <ToggleRight className="h-5 w-5 text-emerald-400" />
                  : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
              </button>
              <Button size="sm" variant="ghost" onClick={() => testWebhook(wh.id)} className="h-7 text-xs">Test</Button>
              <Button size="sm" variant="ghost" onClick={() => deleteWebhook(wh.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {wh.events.map(e => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}
          </div>
          {wh.failCount > 0 && (
            <p className="text-xs text-red-400">{wh.failCount} recent failures</p>
          )}
        </div>
      ))}

      {creating ? (
        <div className="border border-border rounded-lg p-4 space-y-4">
          <div className="space-y-2">
            <Label>Endpoint URL</Label>
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-app.com/webhooks/ledgr" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Production webhook" />
          </div>
          <div className="space-y-2">
            <Label>Events</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_EVENTS.map(event => (
                <button
                  key={event}
                  type="button"
                  onClick={() => toggleEvent(event)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedEvents.includes(event)
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={createWebhook} disabled={loading || !url.trim() || !selectedEvents.length} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Create Webhook
            </Button>
            <Button onClick={() => { setCreating(false); setUrl(""); setDescription(""); }} variant="outline">Cancel</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setCreating(true)} variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Add Webhook
        </Button>
      )}
    </div>
  );
}
