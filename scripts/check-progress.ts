import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
const deckId = '62b7ed57-0f66-456c-b56e-7050590e3559';

async function check() {
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

async function showCards() {
  const cards = await sql`
    SELECT c.name, c.rarity, c.cost, c.power, c.defense, c.element, c.generation_status
    FROM cards c
    INNER JOIN deck_cards dc ON c.id = dc.card_id
    WHERE dc.deck_id = ${deckId}::uuid
    ORDER BY c.cost, c.name
  `;

  console.log('\n=== DECK CARDS ===\n');
  cards.forEach((c: any, i: number) => {
    const status = c.generation_status === 'failed' ? ' [FAILED]' : '';
    console.log(`${i+1}. ${c.name} (${c.rarity}) - Cost:${c.cost} P:${c.power} D:${c.defense} [${c.element}]${status}`);
  });
  console.log(`\nTotal: ${cards.length} cards`);
}

const arg = process.argv[2];
if (arg === 'cards') {
  showCards().catch(console.error);
} else {
  check().catch(console.error);
}
