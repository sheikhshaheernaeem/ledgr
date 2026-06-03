import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

const statements = [
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyName" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyAddress" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyLogo" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "revenueGoal" FLOAT8`,
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'INVOICE'`,
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD'`,
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "lateFeePct" FLOAT8 NOT NULL DEFAULT 0`,
  `ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "notes" TEXT`,
];

for (const stmt of statements) {
  try {
    await sql.query(stmt);
    console.log("OK:", stmt.slice(0, 60));
  } catch (e) {
    console.error("ERR:", e.message);
  }
}
console.log("Migration v5 complete");
