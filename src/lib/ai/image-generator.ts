export async function generateCardImage(prompt: string): Promise<Buffer> {
  // Use Pollinations.ai for free, fast, no-auth image generation
  // It's perfect for MVP and prototyping
  // URL format: https://image.pollinations.ai/prompt/{encodedPrompt}
  
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=1120&model=flux&seed=${Math.floor(Math.random() * 1000000)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Pollinations API error: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Failed to generate image:", error);
    throw error;
  }
}
