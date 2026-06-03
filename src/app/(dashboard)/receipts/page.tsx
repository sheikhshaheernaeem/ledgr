import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { FileText, ScanLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface OcrData {
  vendor?: string;
  amount?: string;
  date?: string;
  description?: string;
}

function parseReceiptData(raw: string): { type: "image"; src: string } | { type: "ocr"; data: OcrData } | { type: "text"; raw: string } {
  // base64 image (data URI) or a URL starting with http
  if (raw.startsWith("data:image") || raw.startsWith("http")) {
    return { type: "image", src: raw };
  }
  // try JSON
  try {
    const parsed = JSON.parse(raw) as OcrData;
    if (typeof parsed === "object" && parsed !== null) {
      return { type: "ocr", data: parsed };
    }
  } catch {
    // not JSON
  }
  return { type: "text", raw };
}

export default async function ReceiptsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      receiptData: { not: null },
    },
    orderBy: { date: "desc" },
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-emerald-400" />
          Receipts
        </h1>
        <p className="text-muted-foreground mt-1">
          {transactions.length} receipt{transactions.length !== 1 ? "s" : ""} attached to transactions
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <ScanLine className="h-12 w-12 mb-4 opacity-20" />
          <p className="font-medium">No receipts yet</p>
          <p className="text-sm mt-1">Upload receipts from the Transactions page to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {transactions.map((tx) => {
            const parsed = parseReceiptData(tx.receiptData!);
            return (
              <Card key={tx.id} className="border-border bg-card overflow-hidden hover:border-emerald-500/40 transition-colors">
                {parsed.type === "image" ? (
                  <div className="aspect-[3/4] overflow-hidden bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={parsed.src}
                      alt={`Receipt for ${tx.description}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] flex flex-col items-center justify-center bg-muted/20 p-4 gap-2">
                    <FileText className="h-10 w-10 text-muted-foreground opacity-40" />
                    {parsed.type === "ocr" && (
                      <div className="text-center space-y-1">
                        {parsed.data.vendor && (
                          <p className="text-xs font-medium text-foreground truncate max-w-full">{parsed.data.vendor}</p>
                        )}
                        {parsed.data.amount && (
                          <p className="text-xs text-emerald-400">{parsed.data.amount}</p>
                        )}
                      </div>
                    )}
                    {parsed.type === "text" && (
                      <p className="text-xs text-muted-foreground text-center line-clamp-3">{parsed.raw}</p>
                    )}
                  </div>
                )}
                <CardContent className="p-3 space-y-0.5">
                  <p className="text-xs font-medium truncate">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.date).toLocaleDateString()}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${tx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}>
                      {tx.type === "CREDIT" ? "+" : "-"}${tx.amount.toFixed(2)}
                    </span>
                    {tx.category && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[90px] text-right">{tx.category}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
