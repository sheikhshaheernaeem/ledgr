"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Plus, X, Link } from "lucide-react";

export default function SettingsForm({
  initialName,
  email,
  initialPaymentLink,
  initialCustomCategories,
}: {
  initialName: string;
  email: string;
  initialPaymentLink: string;
  initialCustomCategories: string[];
}) {
  const [name, setName] = useState(initialName);
  const [paymentLink, setPaymentLink] = useState(initialPaymentLink);
  const [customCategories, setCustomCategories] = useState<string[]>(initialCustomCategories);
  const [newCategory, setNewCategory] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    setSaving(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, paymentLink: paymentLink || null }),
    });
    if (res.ok) toast.success("Profile updated");
    else toast.error("Failed to update profile");
    setSaving(false);
  }

  async function saveCategories() {
    setSaving(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customCategories }),
    });
    if (res.ok) toast.success("Categories saved");
    else toast.error("Failed to save categories");
    setSaving(false);
  }

  function addCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed || customCategories.includes(trimmed)) return;
    setCustomCategories(prev => [...prev, trimmed]);
    setNewCategory("");
  }

  function removeCategory(cat: string) {
    setCustomCategories(prev => prev.filter(c => c !== cat));
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSaving(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) {
      toast.success("Password changed");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Failed to change password");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Display Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} disabled className="opacity-60" />
          <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><Link className="h-3.5 w-3.5" /> Payment Link</Label>
          <Input value={paymentLink} onChange={e => setPaymentLink(e.target.value)} placeholder="https://buymeacoffee.com/yourname" />
          <p className="text-xs text-muted-foreground">Shown on invoices so clients can pay you directly (Buy Me a Coffee, PayPal, etc.)</p>
        </div>
        <Button onClick={saveProfile} disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Profile
        </Button>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Custom Categories</h3>
          <p className="text-xs text-muted-foreground mt-1">Add custom transaction categories beyond the defaults</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {customCategories.map(cat => (
            <Badge key={cat} variant="outline" className="gap-1 pr-1 text-xs">
              {cat}
              <button onClick={() => removeCategory(cat)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          {customCategories.length === 0 && <p className="text-xs text-muted-foreground">No custom categories yet</p>}
        </div>
        <div className="flex gap-2">
          <Input
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCategory()}
            placeholder="New category name"
            className="max-w-xs"
          />
          <Button onClick={addCategory} variant="outline" size="icon"><Plus className="h-4 w-4" /></Button>
        </div>
        <Button onClick={saveCategories} disabled={saving} variant="outline" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Categories
        </Button>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
          </div>
        </div>
        <Button onClick={changePassword} disabled={saving || !currentPassword || !newPassword} variant="outline" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Update Password
        </Button>
      </div>
    </div>
  );
}
