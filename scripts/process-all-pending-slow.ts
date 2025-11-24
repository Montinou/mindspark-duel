import { db } from "@/db";
import { decks, cards, userCards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateCard } from "@/lib/ai/card-generator";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function processAllPendingCardsSlowly() {
  console.log('🚀 Starting card processing with Cloudflare Workers AI...\n');
  console.log('⚡ Using Llama 3.1 8B + Flux 1 Schnell (10,000 free Neurons/day)\n');

  let totalProcessed = 0;
  let consecutiveErrors = 0;

  while (true) {
    // Get one pending card
    const pendingCards = await db
      .select({ card: cards })
      .from(cards)
      .where(eq(cards.name, 'Pending Card...'))
      .limit(1);

    if (pendingCards.length === 0) {
      console.log('\n✅ All cards processed!');

      // Mark all decks as completed
      await db.update(decks).set({ status: 'completed' }).where(eq(decks.status, 'generating'));
      console.log('✅ All decks marked as completed!');
      break;
    }

    const card = pendingCards[0].card;

    try {
      console.log(`\n🎴 [${totalProcessed + 1}] Processing card ${card.id.substring(0, 8)}... (${card.element})`);

      // Get deck info for theme
      const userCard = await db
        .select({ userId: userCards.userId })
        .from(userCards)
        .where(eq(userCards.cardId, card.id))
        .limit(1);

      if (!userCard[0]) {
        console.error('❌ No user found for card, skipping...');
        await db.update(cards).set({ name: 'ERROR: No user' }).where(eq(cards.id, card.id));
        continue;
      }

      const deck = await db
        .select()
        .from(decks)
        .where(eq(decks.userId, userCard[0].userId))
        .limit(1);

      const theme = deck[0]?.theme || 'arcane';

      console.log(`🎴 Generating complete card with Workers AI (${theme}, ${card.element})...`);

      // Generate complete card using Workers AI
      const generatedCard = await generateCard({
        theme,
        element: card.element as "Fire" | "Water" | "Earth" | "Air",
        difficulty: 5,
        userId: userCard[0].userId
      });

      console.log(`✅ Card generated: "${generatedCard.name}"`);

      // Update the existing pending card with generated data
      await db.update(cards).set({
        name: generatedCard.name,
        description: generatedCard.description,
        imageUrl: generatedCard.imageUrl,
        imagePrompt: generatedCard.imagePrompt,
        problemCategory: generatedCard.problemCategory,
        // Keep original cost, power, defense from pending card
      }).where(eq(cards.id, card.id));

      // Delete the duplicate card created by generateCard()
      // since we're updating the existing pending card
      if (generatedCard.id !== card.id) {
        await db.delete(cards).where(eq(cards.id, generatedCard.id));
      }

      totalProcessed++;
      consecutiveErrors = 0; // Reset error counter
      console.log(`✅ Card processed! (${totalProcessed} total)`);

      // Get remaining count
      const remaining = await db.select().from(cards).where(eq(cards.name, 'Pending Card...'));
      console.log(`📊 Remaining: ${remaining.length} cards`);

      // No delay needed - Workers AI can handle rapid requests

    } catch (error) {
      console.error('❌ Error processing card:', error);
      consecutiveErrors++;

      if (consecutiveErrors > 10) {
        console.error('❌ Too many consecutive errors, stopping...');
        break;
      }

      // Brief delay after error to let Workers recover
      console.log('⏱️  Waiting 2 seconds after error...');
      await sleep(2000);
    }
  }

  console.log(`\n✨ Processing complete! Total cards processed: ${totalProcessed}`);
}

processAllPendingCardsSlowly().catch(console.error);
