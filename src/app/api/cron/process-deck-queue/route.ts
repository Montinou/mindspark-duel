import { db } from "@/db";
import { decks, cards, userCards } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

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
    .limit(5); // Process 5 at a time to avoid timeout

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
    try {
      // Generate card text (name, description, flavor) using AI
      let cardName = card.name;
      let cardDescription = card.description;
      let flavorText = "";
      let imagePrompt = card.imagePrompt;

      if (card.name === "Pending Card..." && GEMINI_API_KEY) {
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

        try {
          const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          });

          if (response.ok) {
            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const cardData = JSON.parse(jsonString);

            cardName = cardData.name;
            cardDescription = cardData.description;
            flavorText = cardData.flavorText || "";
            imagePrompt = cardData.imagePrompt;
          }
        } catch (aiError) {
          console.error(`Failed to generate card text for ${card.id}:`, aiError);
          cardName = `${card.element} Warrior`;
          cardDescription = `A powerful ${deck.theme} unit.`;
        }
      }

      // Generate Image using Gemini
      let imageUrl = card.imageUrl;
      if (imagePrompt) {
        try {
           imageUrl = await generateImageWithGemini(imagePrompt);
        } catch (imgError) {
           console.error(`Failed to generate image for ${card.id}:`, imgError);
           // Keep existing placeholder or fallback
        }
      }

      // Update card with all generated data
      await db.update(cards).set({
        name: cardName,
        description: cardDescription,
        flavorText: flavorText,
        imageUrl: imageUrl,
        imagePrompt: imagePrompt,
      }).where(eq(cards.id, card.id));

    } catch (error) {
      console.error(`Failed to process card ${card.id}:`, error);
      // Optional: Mark as failed or retry count
    }
  }

  return NextResponse.json({ 
    message: "Processed batch", 
    processedCount: pendingCards.length,
    remaining: "Check again" 
  });
}
