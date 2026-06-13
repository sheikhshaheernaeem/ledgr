import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FirmSidebar } from "@/components/layout/FirmSidebar";
import { LocaleProvider } from "@/components/providers/LocaleProvider";

// Layout for the (admin) route group — wraps /admin/* pages in the same
// FirmSidebar shell as /firm/*. Operators don't lose the sidebar when
// jumping from Queue → Admin → Settings.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if ((session.user as unknown as { requiresTwoFactor?: boolean }).requiresTwoFactor === true) {
    redirect("/login/2fa");
  }

  const role = (session.user as { role?: string }).role;
  if (role === "CLIENT") redirect("/client");
  if (role !== "ADMIN") redirect("/firm/queue");

  const userId = session.user.id as string;

  const [localeSettings, queueCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { country: true, currency: true, locale: true, timezone: true, taxName: true, defaultTaxRate: true },
    }),
    // Same badge count as the firm console — admins see everything
    (async () => {
      const clientIds = (await prisma.user.findMany({ where: { role: "CLIENT" }, select: { id: true } })).map((u) => u.id);
      if (clientIds.length === 0) return 0;
      const [draftReports, anomalies, unreadMessages, failedStatements] = await Promise.all([
        prisma.report.count({
          where: {
            userId: { in: clientIds },
            OR: [{ status: "DRAFT" }, { AND: [{ draftedAt: { not: null } }, { accountantApprovedAt: null }] }],
          },
        }),
        prisma.anomalyFlag.count({ where: { userId: { in: clientIds }, dismissed: false } }),
        prisma.message.count({ where: { userId: { in: clientIds }, role: "CLIENT", readAt: null } }),
        prisma.statement.count({ where: { userId: { in: clientIds }, status: "ERROR" } }),
      ]);
      return draftReports + anomalies + unreadMessages + failedStatements;
    })(),
  ]);

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <LocaleProvider settings={localeSettings ?? {}}>
      <FirmSidebar
        userEmail={session.user.email ?? ""}
        isAdmin={true}
        signOutAction={signOutAction}
        queueCount={queueCount}
      >
        {children}
      </FirmSidebar>
    </LocaleProvider>
  );
}
