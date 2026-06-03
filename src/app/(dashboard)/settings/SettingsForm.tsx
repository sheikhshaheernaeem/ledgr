"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save } from "lucide-react";

export default function SettingsForm({ initialName, email }: { initialName: string; email: string }) {
  const [name, setName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    setSaving(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) toast.success("Profile updated");
    else toast.error("Failed to update profile");
    setSaving(false);
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
        <Button onClick={saveProfile} disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Profile
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
