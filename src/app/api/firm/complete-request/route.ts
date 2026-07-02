import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN" && role !== "QA") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = session.user.id as string;

  const form = await req.formData();
  const requestId = form.get("requestId") as string;
  const note = (form.get("note") as string) || null;
  const deliverableType = (form.get("deliverableType") as string) || "report";
  const file = form.get("file") as File | null;

  if (!requestId) return NextResponse.json({ error: "requestId required" }, { status: 400 });

  const request = await prisma.clientServiceRequest.findUnique({ where: { id: requestId } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.assignedToId !== userId && role !== "ADMIN") {
    return NextResponse.json({ error: "Not your allocation" }, { status: 403 });
  }

  let deliverableUrl: string | null = null;

  if (file) {
    if (file.size > MAX) {
      return NextResponse.json({ error: `File too large (max ${MAX / 1024 / 1024}MB)` }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const content = `data:${file.type || "application/octet-stream"};base64,${buf.toString("base64")}`;

    // Save the deliverable as a Document attached to the CLIENT (so they can see/download it)
    const doc = await prisma.document.create({
      data: {
        userId: request.clientId,
        name: file.name,
        type: deliverableType.toUpperCase(),
        mimeType: file.type || "application/octet-stream",
        content,
        notes: `Deliverable for service request: ${request.title}`,
        status: "ACTIVE",
      },
    });
    deliverableUrl = `/api/documents/${doc.id}/content`;
  }

  const updated = await prisma.clientServiceRequest.update({
    where: { id: requestId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      deliverableUrl,
      deliverableNote: note,
      deliverableType,
    },
  });

  // Send a message to the client thread so they're notified
  await prisma.message.create({
    data: {
      userId: request.clientId,
      role: "ACCOUNTANT",
      body: `✓ Completed: ${request.title}${note ? "\n\n" + note : ""}${deliverableUrl ? "\n\nDeliverable attached." : ""}`,
    },
  }).catch(() => {});

  return NextResponse.json(updated);
}
