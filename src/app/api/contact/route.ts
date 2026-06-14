import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Schema = z.object({
  name: z.string().max(120).optional().default(""),
  email: z.string().email(),
  topic: z.enum(["general", "sales", "support", "switching", "partnership"]).default("general"),
  message: z.string().min(3).max(5000),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { name, email, topic, message } = parsed.data;

  try {
    await prisma.contactSubmission.create({
      data: { name: name || null, email, topic, message },
    });
  } catch (err) {
    console.error("Failed to save contact submission", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
