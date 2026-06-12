"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  FolderOpen, Upload, FileText, Receipt, FileCheck, FileSignature,
  Trash2, Eye, Loader2, Search,
} from "lucide-react";

interface Doc {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  status: string;
  createdAt: string;
  notes: string | null;
}

const TYPES = [
  { value: "RECEIPT", label: "Receipt", icon: Receipt },
  { value: "INVOICE", label: "Invoice", icon: FileText },
  { value: "CONTRACT", label: "Contract", icon: FileSignature },
  { value: "TAX", label: "Tax form", icon: FileCheck },
  { value: "OTHER", label: "Other", icon: FolderOpen },
];

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const fmtSize = (mime: string) => {
  if (!mime) return "—";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("csv")) return "csv";
  if (mime.includes("excel") || mime.includes("spreadsheet")) return "sheet";
  if (mime.startsWith("text/")) return "txt";
  return mime.split("/")[1] ?? mime;
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [type, setType] = useState("RECEIPT");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("ALL");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error();
      setDocs(await res.json());
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function uploadFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Upload failed");
      }
      toast.success(`Uploaded ${file.name}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const f of Array.from(files)) uploadFile(f);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files) return;
    for (const f of Array.from(files)) uploadFile(f);
  }

  async function deleteDoc(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Deleted");
      load();
    } catch {
      toast.error("Failed to delete");
    }
  }

  const filtered = docs.filter((d) => {
    if (filter !== "ALL" && d.type !== filter) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const byType = docs.reduce<Record<string, number>>((acc, d) => {
    acc[d.type] = (acc[d.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <FolderOpen className="h-3 w-3" /> documents / vault
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Document vault</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload receipts, contracts, tax forms. Your accountant has access. Tax-season prep, organized.
        </p>
      </div>

      {/* Upload */}
      <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/60 bg-card/60 flex items-center justify-between gap-3 flex-wrap">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">upload</p>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">type:</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="text-xs border border-border bg-background rounded px-2 py-1 font-mono"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="p-8 text-center border-2 border-dashed border-border/60 m-3 rounded-md hover:border-foreground/30 transition-colors"
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Drag &amp; drop files</p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">or click to browse · max 5MB per file</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={onFileSelect}
            className="hidden"
            accept="image/*,application/pdf,.csv,.xlsx,.xls,.doc,.docx"
          />
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />uploading...</> : "Choose files"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full h-9 pl-9 pr-3 text-sm bg-background border border-border rounded-md"
          />
        </div>
        <div className="flex gap-1 font-mono text-xs flex-wrap">
          <FilterBtn label="all" active={filter === "ALL"} count={docs.length} onClick={() => setFilter("ALL")} />
          {TYPES.map((t) => (
            <FilterBtn
              key={t.value}
              label={t.label.toLowerCase()}
              count={byType[t.value] ?? 0}
              active={filter === t.value}
              onClick={() => setFilter(t.value)}
            />
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border/60 bg-card/40">
          <FolderOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">{docs.length === 0 ? "No documents yet" : "No matches"}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {docs.length === 0 ? "Drop a receipt or contract above to get started." : "Try a different filter or search."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((d) => {
            const typeInfo = TYPES.find((t) => t.value === d.type) ?? TYPES[TYPES.length - 1];
            const Icon = typeInfo.icon;
            return (
              <li key={d.id} className="rounded-lg border border-border/60 bg-card/40 p-3 flex items-center gap-3 hover:bg-card/60 transition-colors">
                <div className="w-9 h-9 rounded-md border border-border bg-background flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                  <div className="flex gap-3 mt-0.5 text-[11px] font-mono text-muted-foreground">
                    <span>{typeInfo.label.toLowerCase()}</span>
                    <span>·</span>
                    <span>{fmtSize(d.mimeType)}</span>
                    <span>·</span>
                    <span>{fmtDate(d.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`/api/documents/${d.id}/content`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-md border border-border bg-background hover:border-foreground/40 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    title="View"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => deleteDoc(d.id, d.name)}
                    className="w-8 h-8 rounded-md border border-border bg-background hover:border-rose-500/40 hover:text-rose-400 flex items-center justify-center text-muted-foreground"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterBtn({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-md border transition-colors ${
        active ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
      }`}
    >
      {label} <span className="opacity-60">({count})</span>
    </button>
  );
}
