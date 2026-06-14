import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AiAccountant } from "@/components/client/AiAccountant";

export default async function ClientHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") redirect("/dashboard");

  return (
    <div className="max-w-5xl mx-auto">
      <AiAccountant />
    </div>
  );
}
