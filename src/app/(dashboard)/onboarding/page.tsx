import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import OnboardingWizard from "./OnboardingWizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { companyName: true, companyAddress: true, companyLogo: true },
  });

  const accountCount = await prisma.account.count({ where: { userId: session.user.id as string } });
  const chartCount = await prisma.chartOfAccount.count({ where: { userId: session.user.id as string } });
  const txCount = await prisma.transaction.count({ where: { userId: session.user.id as string } });

  return (
    <OnboardingWizard
      initialCompanyName={user?.companyName ?? ""}
      hasAccounts={accountCount > 0}
      hasChartOfAccounts={chartCount > 0}
      hasTransactions={txCount > 0}
    />
  );
}
