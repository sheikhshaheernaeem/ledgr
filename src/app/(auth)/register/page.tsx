import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { MODE_COOKIE } from "@/components/providers/ModeProvider";
import { getTier, type Family } from "@/config/tiers";

// Legacy/neutral entry point — see (auth)/login/page.tsx for why bare
// /register has to keep existing. An explicit ?plan= wins over the cookie
// (e.g. from-bench's hardcoded /register?plan=growth should always land on
// the bookkeeping site, regardless of what the visitor last browsed).
export default async function RegisterRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const planParam = typeof params.plan === "string" ? params.plan : undefined;

  let mode: Family;
  if (planParam) {
    mode = getTier(planParam).family;
  } else {
    const cookieStore = await cookies();
    mode = cookieStore.get(MODE_COOKIE)?.value === "bookkeeping" ? "bookkeeping" : "ai";
  }

  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
  }
  const suffix = qs.toString();
  redirect(`/${mode}/register${suffix ? `?${suffix}` : ""}`);
}
