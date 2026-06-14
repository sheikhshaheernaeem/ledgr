import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LaneSwitcher } from "@/components/client/LaneSwitcher";
import { LiveSummary } from "@/components/client/LiveSummary";
import { DemoTriggerButton } from "@/components/client/DemoTriggerButton";

export default async function ClientHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") redirect("/dashboard");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LiveSummary />
      <DemoTriggerButton />
      <LaneSwitcher />
    </div>
  );
}
