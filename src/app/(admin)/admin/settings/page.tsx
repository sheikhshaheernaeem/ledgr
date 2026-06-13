import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FirmSettingsForm } from "./FirmSettingsForm";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "ADMIN") redirect("/dashboard");

  return <FirmSettingsForm />;
}
