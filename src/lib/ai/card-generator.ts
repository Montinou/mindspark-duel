import { Card } from '@/types/game';

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function generateCard(topic: string, difficulty: number): Promise<Card> {
  if (!GEMINI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }

  const prompt = `
    Create a unique, creative trading card for a game called "MindSpark Duel".
    The card should be based on the topic: "${topic}".
    The difficulty level for the educational problem is: ${difficulty} (1-10).
    
    Return ONLY a valid JSON object with this structure:
    {
      "name": "Card Name",
      "description": "Flavor text or effect description",
      "cost": integer (1-10),
      "power": integer (1-10),
      "defense": integer (1-10),
      "element": "Fire" | "Water" | "Earth" | "Air",
      "problemCategory": "Math" | "Logic" | "Science",
      "imageUrl": "placeholder"
    }
    
    Make the stats balanced for the cost.
    The name should be fantasy-themed but related to the topic.
  `;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    
    // Clean up markdown code blocks if present
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const cardData = JSON.parse(jsonString);
    
    return {
      ...cardData,
      id: crypto.randomUUID(), // Generate a unique ID
    };

  } catch (error) {
    console.error("Failed to generate card:", error);
    // Fallback card for error handling
    return {
      id: crypto.randomUUID(),
      name: "Glitch in the Matrix",
      description: "The spell fizzled due to magical interference (API Error).",
      cost: 1,
      power: 1,
      defense: 1,
      element: "Earth",
      problemCategory: "Logic",
      imageUrl: "/placeholder.png"
    };
  }
}
