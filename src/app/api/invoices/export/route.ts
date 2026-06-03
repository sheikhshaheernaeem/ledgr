import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id },
    include: { lineItems: true },
    orderBy: { createdAt: "desc" },
  });

  const escape = (val: string | number | null | undefined): string => {
    if (val == null) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header =
    "Invoice Number,Client Name,Client Email,Issue Date,Due Date,Status,Subtotal,Tax Rate,Tax Amount,Total,Amount Paid,Notes";

  const rows = invoices.map((inv) =>
    [
      escape(inv.invoiceNumber),
      escape(inv.clientName),
      escape(inv.clientEmail),
      escape(inv.issueDate.toISOString().split("T")[0]),
      escape(inv.dueDate.toISOString().split("T")[0]),
      escape(inv.status),
      escape(inv.subtotal.toFixed(2)),
      escape(inv.taxRate.toFixed(2)),
      escape(inv.taxAmount.toFixed(2)),
      escape(inv.total.toFixed(2)),
      escape(inv.amountPaid.toFixed(2)),
      escape(inv.notes),
    ].join(",")
  );

  // UTF-8 BOM for Excel compatibility
  const bom = "﻿";
  const csv = bom + [header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="invoices.csv"',
    },
  });
}
