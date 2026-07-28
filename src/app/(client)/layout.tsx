import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { getUserFamilies } from "@/lib/clientAccess";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT") redirect("/dashboard");

  const userEmail = session.user.email ?? "user";
  const families = await getUserFamilies(session.user.id as string);

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <ClientSidebar userEmail={userEmail} families={families} signOutAction={signOutAction}>
      {children}
    </ClientSidebar>
  );
}
