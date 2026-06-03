import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

const statements = [
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "publicToken" TEXT UNIQUE`,
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "amountPaid" FLOAT8 NOT NULL DEFAULT 0`,
];

for (const stmt of statements) {
  try {
    await sql.query(stmt);
    console.log("OK:", stmt.slice(0, 60));
  } catch (e) {
    console.error("ERR:", e.message);
  }
}
console.log("Migration v4 complete");
