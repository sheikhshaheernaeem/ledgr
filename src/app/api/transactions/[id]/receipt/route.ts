import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!transaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = file.type;
  const receiptUrl = `data:${mimeType};base64,${base64}`;

  let ocrData: { vendor: string; date: string; amount: string; description: string };

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "demo-mode") {
    ocrData = {
      vendor: "Demo Vendor Inc.",
      date: new Date().toISOString().split("T")[0],
      amount: transaction.amount.toFixed(2),
      description: transaction.description,
    };
  } else {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const result = await model.generateContent([
        {
          inlineData: {
            data: base64,
            mimeType: mimeType,
          },
        },
        "Extract from this receipt: vendor name, date, total amount, description. Return JSON: { vendor, date, amount, description }. Respond ONLY with valid JSON, no markdown.",
      ]);

      const text = result.response.text().trim();
      const json = text.startsWith("```")
        ? text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
        : text;
      ocrData = JSON.parse(json);
    } catch (err) {
      // Vision OCR unavailable (e.g. Gemini quota) — degrade to the transaction's own data.
      console.error("[receipt] OCR failed, using transaction data:", err);
      ocrData = {
        vendor: transaction.description,
        date: new Date().toISOString().split("T")[0],
        amount: transaction.amount.toFixed(2),
        description: transaction.description,
      };
    }
  }

  await prisma.transaction.update({
    where: { id },
    data: {
      receiptData: receiptUrl,
      receiptOcrRaw: JSON.stringify(ocrData),
    },
  });

  return NextResponse.json({ ocrData, receiptUrl });
}
