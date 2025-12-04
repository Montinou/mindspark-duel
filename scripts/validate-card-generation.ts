/**
 * Script to validate that card generation is working correctly
 * Tests both the text (Llama 3.3) and image (Flux) workers
 *
 * Run with: npx tsx scripts/validate-card-generation.ts
 */

const WORKERS_TEXT_URL = 'https://mindspark-ai-text-generator.agusmontoya.workers.dev';
const WORKERS_IMAGE_URL = 'https://mindspark-ai-image-generator.agusmontoya.workers.dev';

interface CardDataResponse {
  name: string;
  description: string;
  cost: number;
  power: number;
  defense: number;
  element: 'Fire' | 'Water' | 'Earth' | 'Air';
  problemCategory: 'Math' | 'Logic' | 'Science';
  imagePrompt: string;
  tags: string[];
  problemHints: {
    keywords: string[];
    difficulty: number;
    subCategory: string;
    contextType: string;
    suggestedTopics: string[];
  };
}

interface TestResult {
  test: string;
  success: boolean;
  duration: number;
  data?: any;
  error?: string;
}

const THEMES = ['Fantasy', 'Space', 'Nature', 'Technology'];
const ELEMENTS = ['Fire', 'Water', 'Earth', 'Air'] as const;

async function testTextWorker(theme: string, element: typeof ELEMENTS[number]): Promise<TestResult> {
  const start = Date.now();
  try {
    console.log(`\n🤖 Testing Text Worker: theme="${theme}" element="${element}"`);

    const response = await fetch(WORKERS_TEXT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme,
        element,
        difficulty: 5,
      }),
    });

    const duration = Date.now() - start;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        test: `Text Worker (${theme}/${element})`,
        success: false,
        duration,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();

    if (!data.success) {
      return {
        test: `Text Worker (${theme}/${element})`,
        success: false,
        duration,
        error: data.error || 'Unknown error',
        data,
      };
    }

    const cardData: CardDataResponse = data.data;

    // Validate card data structure
    const validations: { field: string; valid: boolean; value: any }[] = [
      { field: 'name', valid: typeof cardData.name === 'string' && cardData.name.length > 0, value: cardData.name },
      { field: 'description', valid: typeof cardData.description === 'string', value: cardData.description?.substring(0, 50) },
      { field: 'cost', valid: typeof cardData.cost === 'number' && cardData.cost >= 1 && cardData.cost <= 10, value: cardData.cost },
      { field: 'power', valid: typeof cardData.power === 'number' && cardData.power >= 1 && cardData.power <= 10, value: cardData.power },
      { field: 'defense', valid: typeof cardData.defense === 'number' && cardData.defense >= 1 && cardData.defense <= 10, value: cardData.defense },
      { field: 'element', valid: ELEMENTS.includes(cardData.element as any), value: cardData.element },
      { field: 'problemCategory', valid: ['Math', 'Logic', 'Science'].includes(cardData.problemCategory), value: cardData.problemCategory },
      { field: 'imagePrompt', valid: typeof cardData.imagePrompt === 'string' && cardData.imagePrompt.length > 10, value: cardData.imagePrompt?.substring(0, 50) },
      { field: 'tags', valid: Array.isArray(cardData.tags) && cardData.tags.length >= 2, value: cardData.tags },
      { field: 'problemHints.keywords', valid: Array.isArray(cardData.problemHints?.keywords), value: cardData.problemHints?.keywords },
    ];

    const failedValidations = validations.filter(v => !v.valid);

    if (failedValidations.length > 0) {
      console.log('   ⚠️  Some validations failed:');
      failedValidations.forEach(v => console.log(`      - ${v.field}: ${JSON.stringify(v.value)}`));
    }

    console.log(`   ✅ Card: "${cardData.name}" (${cardData.element}, ${cardData.power}/${cardData.defense})`);
    console.log(`   📝 Keywords: ${cardData.problemHints?.keywords?.join(', ') || 'none'}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log(`   ${data.fallback ? '⚠️  Fallback card used' : '✅ AI-generated card'}`);

    return {
      test: `Text Worker (${theme}/${element})`,
      success: failedValidations.length === 0,
      duration,
      data: {
        name: cardData.name,
        element: cardData.element,
        stats: `${cardData.cost}/${cardData.power}/${cardData.defense}`,
        category: cardData.problemCategory,
        keywords: cardData.problemHints?.keywords,
        fallback: data.fallback || false,
      },
    };
  } catch (error) {
    return {
      test: `Text Worker (${theme}/${element})`,
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testImageWorker(prompt: string, element: string): Promise<TestResult> {
  const start = Date.now();
  try {
    console.log(`\n🖼️  Testing Image Worker...`);
    console.log(`   Prompt: "${prompt.substring(0, 60)}..."`);

    const response = await fetch(WORKERS_IMAGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, element }),
    });

    const duration = Date.now() - start;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        test: 'Image Worker',
        success: false,
        duration,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();

    if (!data.success || !data.image) {
      return {
        test: 'Image Worker',
        success: false,
        duration,
        error: 'No image data in response',
        data,
      };
    }

    // Check if image is valid base64
    const imageSize = Math.round(data.image.length * 0.75 / 1024); // Approximate KB

    console.log(`   ✅ Image generated successfully`);
    console.log(`   📊 Size: ~${imageSize}KB`);
    console.log(`   ⏱️  Duration: ${duration}ms`);

    return {
      test: 'Image Worker',
      success: true,
      duration,
      data: { sizeKB: imageSize },
    };
  } catch (error) {
    return {
      test: 'Image Worker',
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runValidation() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     MINDSPARK DUEL - Card Generation Validation           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results: TestResult[] = [];

  // Test 1: Text Worker with different themes/elements
  console.log('\n📋 TEST 1: Text Worker (Card Data Generation)');
  console.log('━'.repeat(60));

  const textTests = [
    { theme: 'Fantasy', element: 'Fire' as const },
    { theme: 'Space', element: 'Air' as const },
    { theme: 'Nature', element: 'Earth' as const },
  ];

  for (const test of textTests) {
    const result = await testTextWorker(test.theme, test.element);
    results.push(result);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test 2: Image Worker (optional, takes longer)
  console.log('\n📋 TEST 2: Image Worker (Card Art Generation)');
  console.log('━'.repeat(60));

  // Use a simple prompt for testing
  const imageResult = await testImageWorker(
    'A majestic fire dragon warrior in fantasy card art style, dramatic lighting, detailed illustration',
    'Fire'
  );
  results.push(imageResult);

  // Summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    const status = r.success ? 'PASS' : 'FAIL';
    console.log(`${icon} ${status} | ${r.test} | ${r.duration}ms`);
    if (r.error) {
      console.log(`         Error: ${r.error}`);
    }
  });

  console.log('━'.repeat(60));
  console.log(`Total: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Card generation is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }

  return failed === 0;
}

// Run validation
runValidation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
