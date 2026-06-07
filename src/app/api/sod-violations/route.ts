import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const violations = await prisma.sodViolation.findMany({
    where: { userId: session.user.id },
    orderBy: { detectedAt: "desc" },
  });

  return NextResponse.json(violations);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { action, entityId, actorId } = body;

  if (!action || !entityId || !actorId) {
    return NextResponse.json({ error: "action, entityId, and actorId are required" }, { status: 400 });
  }

  // Check all active SoD rules
  const rules = await prisma.sodRule.findMany({
    where: { userId: session.user.id, isActive: true },
  });

  const violationsCreated = [];

  for (const rule of rules) {
    if (rule.action1 === action || rule.action2 === action) {
      // Check if this actor has performed the conflicting action on the same entity
      const conflictingAction = rule.action1 === action ? rule.action2 : rule.action1;

      const existingViolation = await prisma.sodViolation.findFirst({
        where: {
          userId: session.user.id,
          ruleId: rule.id,
          actorId,
          entityId,
          resolved: false,
        },
      });

      if (!existingViolation) {
        const violation = await prisma.sodViolation.create({
          data: {
            userId: session.user.id,
            ruleId: rule.id,
            actorId,
            action: `${action} and ${conflictingAction}`,
            entityId,
          },
        });
        violationsCreated.push(violation);
      }
    }
  }

  return NextResponse.json({ checked: true, violationsFound: violationsCreated.length, violations: violationsCreated });
}
