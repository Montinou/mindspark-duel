import { db } from "@/db";
import { decks, cards, userCards } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

// Helper function to add delay between API calls
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// This route would ideally be called by a Cron job or a background worker
// For MVP, we can call it manually or let it run on demand
export async function POST(req: Request) {
  // 1. Find a deck that is 'generating'
  const generatingDecks = await db.select().from(decks).where(eq(decks.status, 'generating')).limit(1);
  
  if (generatingDecks.length === 0) {
    return NextResponse.json({ message: "No decks to process" });
  }

  const deck = generatingDecks[0];

  // 2. Find cards for this user that are "Pending Card..."
  // In a real app, we'd link cards to decks explicitly, but here we use userId and name convention
  const pendingCards = await db.select().from(cards)
    .innerJoin(userCards, eq(cards.id, userCards.cardId))
    .where(and(
      eq(userCards.userId, deck.userId),
      eq(cards.name, "Pending Card...")
    ))
    .limit(2); // Process 2 at a time to avoid rate limits

  if (pendingCards.length === 0) {
    // If no pending cards, mark deck as completed
    await db.update(decks).set({ status: 'completed' }).where(eq(decks.id, deck.id));
    return NextResponse.json({ message: "Deck completed", deckId: deck.id });
  }

  // 3. Generate card text and images using AI
  const { generateImageWithGemini } = await import("@/lib/ai/card-generator");
  // const { uploadImage } = await import("@/lib/storage"); // No longer needed here as generateImageWithGemini handles it

  // Import Gemini API for text generation
  const GEMINI_API_KEY = process.env.GEMINIAI_API_KEY;
  // Use gemini-2.0-flash-exp for consistency
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

  for (const { cards: card } of pendingCards) {
    console.log(`\n🎴 Processing card ${card.id} (${card.element})...`);

    // Generate card text (name, description, flavor) using AI
    if (card.name !== "Pending Card..." || !GEMINI_API_KEY) {
      throw new Error(`Card ${card.id} is not pending or GEMINI_API_KEY is missing`);
    }

    const prompt = `
      Create a unique, creative trading card for a game called "MindSpark Duel".
      The card should be based on the theme: "${deck.theme}".
      The card MUST belong to the element: "${card.element}".
      The card has cost: ${card.cost}, power: ${card.power}, defense: ${card.defense}.

      Return ONLY a valid JSON object with this structure:
      {
        "name": "Card Name",
        "description": "Brief card effect description",
        "flavorText": "Thematic flavor text",
        "imagePrompt": "OPTIMIZED FULL ART PROMPT - [Detailed subject description matching card name]. Vertical portrait orientation, full-bleed borderless composition extending to all edges. Magic the Gathering full art card style. High-resolution digital painting with dramatic cinematic lighting, vibrant saturated colors, intricate details, sharp focus. The subject fills the frame dramatically with immersive environment surrounding it. Professional TCG artwork quality, masterpiece, highly detailed, rich textures. NO text, NO watermarks, NO borders, NO frames. Theme: ${deck.theme}"
      }

      IMPORTANT: Generate all text in SPANISH.
    `;

    console.log('📝 Generating card text with Gemini...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini text generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const cardData = JSON.parse(jsonString);

    console.log(`✅ Text generated for: ${cardData.name}`);

    // Generate Image using Imagen 3 - NO FALLBACK
    console.log('🖼️  Generating image...');
    const imageUrl = await generateImageWithGemini(cardData.imagePrompt);

    // Update card with all generated data
    console.log('💾 Updating card in database...');
    await db.update(cards).set({
      name: cardData.name,
      description: cardData.description,
      flavorText: cardData.flavorText || "",
      imageUrl: imageUrl,
      imagePrompt: cardData.imagePrompt,
    }).where(eq(cards.id, card.id));

    console.log(`✅ Card ${card.id} processed successfully!`);

    // Add delay between cards to respect rate limits (10 seconds)
    console.log('⏱️  Waiting 10 seconds before next card...');
    await sleep(10000);
  }

  // 4. Check if there are more pending cards for this deck
  const remainingCards = await db.select().from(cards)
    .innerJoin(userCards, eq(cards.id, userCards.cardId))
    .where(and(
      eq(userCards.userId, deck.userId),
      eq(cards.name, "Pending Card...")
    ))
    .limit(1);

  if (remainingCards.length > 0) {
    console.log('🔄 More cards pending, waiting 15 seconds before triggering next batch...');
    // Add delay before triggering next batch to avoid rate limits
    await sleep(15000);

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      // Fire and forget - don't await
      fetch(`${appUrl}/api/cron/process-deck-queue`, { method: 'POST' }).catch(err => {
        console.error('Failed to trigger next batch:', err);
      });
    } catch (error) {
      console.error('Failed to trigger next batch:', error);
    }
    
    return NextResponse.json({ 
      message: "Processed batch, triggering next", 
      processedCount: pendingCards.length,
      remaining: true 
    });
  } else {
    // All done!
    console.log('✨ Deck generation complete!');
    await db.update(decks).set({ status: 'completed' }).where(eq(decks.id, deck.id));
    return NextResponse.json({ 
      message: "Deck completed", 
      processedCount: pendingCards.length,
      remaining: false,
      deckId: deck.id 
    });
  }
}
