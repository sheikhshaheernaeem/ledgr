"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Copy, Loader2, Key } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeysSettings({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createKey() {
    if (!newKeyName.trim()) return;
    setLoading(true);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName, scopes: ["read", "write"] }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setKeys(prev => [{ id: data.id, name: data.name, prefix: data.prefix, scopes: ["read", "write"], lastUsedAt: null, createdAt: new Date().toISOString() }, ...prev]);
      setNewKeySecret(data.key);
      setNewKeyName("");
      setCreating(false);
    } else {
      toast.error(data.error ?? "Failed to create key");
    }
  }

  async function deleteKey(id: string) {
    const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      setKeys(prev => prev.filter(k => k.id !== id));
      toast.success("API key deleted");
    } else {
      toast.error("Failed to delete key");
    }
  }

  return (
    <div className="space-y-4">
      {newKeySecret && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
          <p className="text-sm font-medium text-emerald-400">API key created — copy it now, it won&apos;t be shown again</p>
          <div className="flex gap-2">
            <code className="flex-1 text-xs font-mono bg-background rounded px-3 py-2 border border-border break-all">{newKeySecret}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { navigator.clipboard.writeText(newKeySecret); toast.success("Copied!"); }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setNewKeySecret(null)} className="text-muted-foreground">Dismiss</Button>
        </div>
      )}

      {keys.length === 0 && !creating && (
        <p className="text-sm text-muted-foreground">No API keys yet.</p>
      )}

      {keys.map(key => (
        <div key={key.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
          <div className="flex items-center gap-2 min-w-0">
            <Key className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{key.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{key.prefix}••••••••</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {key.scopes.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
            <span className="text-xs text-muted-foreground">
              {key.lastUsedAt ? `Used ${new Date(key.lastUsedAt).toLocaleDateString()}` : "Never used"}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteKey(key.id)}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      {creating ? (
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Key Name</Label>
            <Input
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createKey()}
              placeholder="e.g. My Integration"
              autoFocus
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={createKey} disabled={loading || !newKeyName.trim()} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
            <Button onClick={() => { setCreating(false); setNewKeyName(""); }} variant="outline">Cancel</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setCreating(true)} variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Create API Key
        </Button>
      )}
    </div>
  );
}
