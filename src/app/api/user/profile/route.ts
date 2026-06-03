import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { name, currentPassword, newPassword } = await req.json();

  if (newPassword) {
    if (!currentPassword) return NextResponse.json({ error: "Current password required" }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.password) return NextResponse.json({ error: "Cannot change password for OAuth accounts" }, { status: 400 });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { name: name ?? undefined, password: hashed } });
  } else {
    await prisma.user.update({ where: { id: userId }, data: { name: name ?? undefined } });
  }

  return NextResponse.json({ success: true });
}
