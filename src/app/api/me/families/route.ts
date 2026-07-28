import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserFamilies } from "@/lib/clientAccess";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const families = await getUserFamilies(session.user.id as string);
  return NextResponse.json({ families });
}
