import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

const statements = [
  `CREATE TABLE IF NOT EXISTS "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Client_userId_idx" ON "Client"("userId")`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paymentLink" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "customCategories" TEXT`,
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "clientId" TEXT`,
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "recurringInterval" TEXT`,
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "nextInvoiceDate" TIMESTAMP(3)`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_clientId_fkey') THEN ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,
];

for (const stmt of statements) {
  try {
    await sql.query(stmt);
    console.log("OK:", stmt.slice(0, 60));
  } catch (e) {
    console.error("ERR:", e.message);
  }
}
console.log("Migration v3 complete");
