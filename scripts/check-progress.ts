import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function check() {
  const deckId = '62b7ed57-0f66-456c-b56e-7050590e3559';

  const completed = await sql`
    SELECT COUNT(*) as c FROM cards c
    INNER JOIN deck_cards dc ON c.id = dc.card_id
    WHERE dc.deck_id = ${deckId}::uuid
    AND c.generation_status = 'completed'
  `;

  const pending = await sql`
    SELECT COUNT(*) as c FROM cards c
    INNER JOIN deck_cards dc ON c.id = dc.card_id
    WHERE dc.deck_id = ${deckId}::uuid
    AND c.generation_status = 'pending'
  `;

  const deck = await sql`SELECT status FROM decks WHERE id = ${deckId}::uuid`;

  console.log(`[${new Date().toLocaleTimeString()}] Completed: ${completed[0].c} | Pending: ${pending[0].c} | Status: ${deck[0].status}`);
}

check().catch(console.error);
