import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env" });

const sql = neon(process.env.DATABASE_URL);

// Backfill for dual-subscription support: Subscription now has a `family`
// column ("ai" | "bookkeeping") and a per-family unique constraint instead
// of one row per user. This fixes the family on any pre-existing rows
// (they got the schema default "bookkeeping" from `prisma db push`) and
// creates a Subscription row for every user whose subscriptionStatus was
// only ever tracked on User (registration never wrote to Subscription).

const statements = [
  // Fix family on rows that already existed before this migration, based
  // on the user's current tier (AI_* tiers -> "ai", everything else -> "bookkeeping").
  `UPDATE "Subscription" s
   SET "family" = CASE WHEN u."subscriptionStatus" ILIKE 'AI\\_%' ESCAPE '\\' THEN 'ai' ELSE 'bookkeeping' END
   FROM "User" u
   WHERE u.id = s."userId"`,

  // Create the missing row for every user who has a subscriptionStatus but
  // no matching Subscription row yet (the common case today).
  `INSERT INTO "Subscription" (id, "userId", plan, status, family, "startedAt")
   SELECT gen_random_uuid()::text, u.id, u."subscriptionStatus", 'ACTIVE',
     CASE WHEN u."subscriptionStatus" ILIKE 'AI\\_%' ESCAPE '\\' THEN 'ai' ELSE 'bookkeeping' END,
     now()
   FROM "User" u
   WHERE u."subscriptionStatus" IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM "Subscription" s
       WHERE s."userId" = u.id
         AND s.family = CASE WHEN u."subscriptionStatus" ILIKE 'AI\\_%' ESCAPE '\\' THEN 'ai' ELSE 'bookkeeping' END
     )`,
];

for (const stmt of statements) {
  try {
    const result = await sql.query(stmt);
    console.log("OK:", stmt.trim().slice(0, 70).replace(/\s+/g, " "), "-> rows:", result.length ?? result.count ?? "n/a");
  } catch (e) {
    console.error("ERR:", e.message);
  }
}
console.log("Migration v6 complete");
