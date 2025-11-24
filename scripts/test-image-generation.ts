import { generateImageWithGemini } from "@/lib/ai/card-generator";

async function testImageGeneration() {
  console.log('🧪 Testing Gemini 2.0 Flash image generation...\n');

  const testPrompt = "A mystical water elemental creature, glowing blue aura, fantasy trading card art style, dramatic lighting, full-bleed vertical portrait composition";

  try {
    console.log('📝 Prompt:', testPrompt);
    console.log('\n⏳ Generating image (this may take 10-20 seconds)...\n');

    const imageUrl = await generateImageWithGemini(testPrompt);

    console.log('\n✅ SUCCESS!');
    console.log('🔗 Image URL:', imageUrl);
    console.log('\n✨ Image generation with Gemini 2.0 Flash is working!');
  } catch (error) {
    console.error('\n❌ ERROR:', error);

    if (error instanceof Error && error.message.includes('429')) {
      console.log('\n⚠️  Rate limit reached. Wait time recommendations:');
      console.log('   - Free tier resets at midnight PST');
      console.log('   - Current limit: 15 RPM, 200 RPD');
    }
  }
}

testImageGeneration();
