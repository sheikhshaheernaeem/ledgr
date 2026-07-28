import { signOut } from "@/lib/auth";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { requireClientFamily } from "@/lib/clientAccess";

export default async function BookkeepingClientLayout({ children }: { children: React.ReactNode }) {
  const { userEmail, families } = await requireClientFamily("bookkeeping");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <ClientSidebar userEmail={userEmail} families={families} signOutAction={signOutAction} activeFamily="bookkeeping">
      {children}
    </ClientSidebar>
  );
}
