import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mailer";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const bills = await prisma.bill.findMany({
    where: {
      status: { in: ["PENDING", "PARTIAL"] },
      dueDate: { lte: threeDaysFromNow },
    },
    include: { user: true },
  });

  let sent = 0;

  for (const bill of bills) {
    if (!bill.user?.email) continue;
    try {
      const isOverdue = bill.dueDate < now;
      const dueDateStr = bill.dueDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const subject = isOverdue
        ? `Bill ${bill.billNumber} from ${bill.vendorName} is overdue`
        : `Bill ${bill.billNumber} from ${bill.vendorName} is due soon`;

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; padding: 0 20px; }
    .card { background: #111; border: 1px solid #222; border-radius: 14px; padding: 40px 36px; }
    .logo { font-size: 22px; font-weight: 700; color: #10b981; letter-spacing: -0.5px; margin-bottom: 28px; }
    h1 { font-size: 20px; font-weight: 600; color: #fff; margin: 0 0 16px; }
    p { color: #aaa; font-size: 15px; line-height: 1.6; margin: 0 0 20px; }
    table { width: 100%; border-collapse: collapse; margin: 0 0 24px; }
    th { text-align: left; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 0; border-bottom: 1px solid #222; }
    td { padding: 10px 0; color: #ccc; font-size: 14px; border-bottom: 1px solid #1a1a1a; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .overdue { background: #3b0d0d; color: #ef4444; }
    .due-soon { background: #2d2200; color: #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">Ledgr</div>
      <h1>${isOverdue ? "Bill Overdue" : "Bill Due Soon"}</h1>
      <p>
        ${isOverdue
          ? `Bill <strong>${bill.billNumber}</strong> from <strong>${bill.vendorName}</strong> was due on ${dueDateStr} and is now overdue.`
          : `Bill <strong>${bill.billNumber}</strong> from <strong>${bill.vendorName}</strong> is due on ${dueDateStr}.`
        }
      </p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Bill Number</td><td>${bill.billNumber}</td></tr>
          <tr><td>Vendor</td><td>${bill.vendorName}</td></tr>
          <tr><td>Due Date</td><td>${dueDateStr}</td></tr>
          <tr><td>Total</td><td>$${bill.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${bill.currency}</td></tr>
          <tr><td>Amount Paid</td><td>$${bill.amountPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${bill.currency}</td></tr>
          <tr><td>Balance Due</td><td>$${(bill.total - bill.amountPaid).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${bill.currency}</td></tr>
          <tr><td>Status</td><td><span class="badge ${isOverdue ? "overdue" : "due-soon"}">${isOverdue ? "OVERDUE" : "DUE SOON"}</span></td></tr>
        </tbody>
      </table>
      <p style="font-size:13px;color:#555;">Log in to Ledgr to record a payment or view bill details.</p>
    </div>
  </div>
</body>
</html>`;

      await sendEmail({
        to: bill.user.email,
        subject,
        html,
      });
      sent++;
    } catch {
      // Continue for other bills
    }
  }

  return NextResponse.json({ sent });
}
