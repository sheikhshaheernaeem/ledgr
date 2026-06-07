import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { email, role } = await req.json() as { email: string; role?: string };
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const inviterName = session.user.name ?? session.user.email ?? "Someone";
  const target = await prisma.user.findUnique({ where: { email } });

  if (target) {
    if (target.id === session.user.id) return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });
    const existing = await prisma.teamMember.findFirst({ where: { ownerId: session.user.id, memberId: target.id } });
    if (existing) return NextResponse.json({ error: "Already a team member" }, { status: 400 });
    await prisma.teamMember.create({ data: { ownerId: session.user.id, memberId: target.id, role: role ?? "VIEWER" } });
    await sendEmail({
      to: email,
      subject: `${inviterName} added you to their Ledgr team`,
      html: `<p>Hi! ${inviterName} has added you as a <strong>${role ?? "VIEWER"}</strong> on their Ledgr account. <a href="${process.env.NEXTAUTH_URL}/dashboard">Sign in to Ledgr</a> to collaborate.</p>`,
    });
    return NextResponse.json({ invited: true, existing: true });
  }

  // User doesn't exist — send invitation to register
  await sendEmail({
    to: email,
    subject: `${inviterName} invited you to Ledgr`,
    html: `<p>Hi! ${inviterName} has invited you to collaborate on Ledgr — AI-native bookkeeping.<br><a href="${process.env.NEXTAUTH_URL}/register">Create your free account</a> and ask ${inviterName} to add you to their team.</p>`,
  });
  return NextResponse.json({ invited: true, existing: false });
}
