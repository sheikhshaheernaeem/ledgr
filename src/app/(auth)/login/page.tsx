import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { MODE_COOKIE } from "@/components/providers/ModeProvider";
import type { Family } from "@/config/tiers";

// Legacy/neutral entry point — NextAuth's pages.signIn and several session-
// expiry guards elsewhere in the app still target bare /login, so it has to
// keep existing. It just forwards to the family-prefixed login, preserving
// query params (?email=, ?verified=1, ?justLinked=1) and the visitor's last
// chosen family (ledgr-mode cookie, default "ai").
export default async function LoginRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const mode: Family = cookieStore.get(MODE_COOKIE)?.value === "bookkeeping" ? "bookkeeping" : "ai";

  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
  }
  const suffix = qs.toString();
  redirect(`/${mode}/login${suffix ? `?${suffix}` : ""}`);
}
