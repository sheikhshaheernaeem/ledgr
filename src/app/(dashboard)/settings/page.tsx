import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { paymentLink: true, customCategories: true },
  });

  const customCategories = user?.customCategories ? JSON.parse(user.customCategories) as string[] : [];

  return (
    <div className="p-8 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Update your display name, payment link, and password</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            initialName={session.user.name ?? ""}
            email={session.user.email ?? ""}
            initialPaymentLink={user?.paymentLink ?? ""}
            initialCustomCategories={customCategories}
          />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Account Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground font-mono text-xs">{session.user.email}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account ID</span>
            <span className="text-foreground font-mono text-xs">{session.user.id}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="text-foreground">{(session.user as { role?: string }).role ?? "USER"}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Data & Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Your financial data is encrypted at rest and in transit. We never sell your data to third parties.</p>
          <p>All AI processing uses your transaction descriptions only — no account numbers or personal identifiers are sent to AI models.</p>
        </CardContent>
      </Card>
    </div>
  );
}
