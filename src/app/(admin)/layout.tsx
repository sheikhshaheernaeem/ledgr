import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

// Layout for the (admin) route group — wraps /admin/* pages in the focused
// AdminSidebar (no accountant clutter). Only ADMIN users can access.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if ((session.user as unknown as { requiresTwoFactor?: boolean }).requiresTwoFactor === true) {
    redirect("/login/2fa");
  }

  const role = (session.user as { role?: string }).role;
  if (role === "CLIENT") redirect("/client");
  if (role !== "ADMIN") redirect("/login");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <AdminSidebar
      userEmail={session.user.email ?? ""}
      signOutAction={signOutAction}
    >
      {children}
    </AdminSidebar>
  );
}
