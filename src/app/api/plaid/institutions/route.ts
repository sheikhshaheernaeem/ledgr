import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const institutions = [
    { id: "ins_chase", name: "Chase", color: "#117ACA" },
    { id: "ins_bofa", name: "Bank of America", color: "#E31837" },
    { id: "ins_wells", name: "Wells Fargo", color: "#D71E28" },
    { id: "ins_citi", name: "Citibank", color: "#003B70" },
  ];

  return NextResponse.json(institutions);
}
