import { db } from "@/db";
import { sql } from "drizzle-orm";

async function resetDb() {
  console.log("Dropping all tables...");
  
  await db.execute(sql`DROP TABLE IF EXISTS "user_missions" CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS "missions" CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS "mastery" CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS "game_sessions" CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS "decks" CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS "user_cards" CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS "problems" CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS "cards" CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS "card_batches" CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS "users" CASCADE`);

  console.log("All tables dropped.");
  process.exit(0);
}

resetDb().catch((err) => {
  console.error(err);
  process.exit(1);
});
