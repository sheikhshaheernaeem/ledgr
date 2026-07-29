import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserFamilies, canPreviewClientPortal } from "@/lib/clientAccess";

// Bare /client is a dispatcher, not a page — several out-of-scope layouts
// ((admin), (dashboard), firm/*) hardcode redirects here, so it has to keep
// existing. It just forwards on to the family-prefixed home.
export default async function ClientDispatcher() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "CLIENT" && !canPreviewClientPortal(session.user.email)) redirect("/dashboard");

  const families = await getUserFamilies(session.user.id as string);
  if (families.includes("ai")) redirect("/ai/client");
  if (families.includes("bookkeeping")) redirect("/bookkeeping/client");
  redirect("/");
}
