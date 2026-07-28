import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserFamilies } from "@/lib/clientAccess";
import { LaneSwitcher } from "@/components/client/LaneSwitcher";
import { LiveSummary } from "@/components/client/LiveSummary";
import { DemoTriggerButton } from "@/components/client/DemoTriggerButton";

export default async function ClientHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") redirect("/dashboard");

  const families = await getUserFamilies(session.user.id as string);
  if (!families.includes("ai")) {
    redirect(families.includes("bookkeeping") ? "/client/bookkeeping" : "/register?plan=ai-starter&mode=ai");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LiveSummary />
      <DemoTriggerButton />
      <LaneSwitcher />
    </div>
  );
}
