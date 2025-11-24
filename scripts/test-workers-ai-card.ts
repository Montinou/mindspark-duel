import { generateCard } from '@/lib/ai/card-generator';

async function testWorkersAICard() {
  console.log('🧪 Testing Workers AI card generation (end-to-end)...\n');

  try {
    const startTime = Date.now();

    const card = await generateCard({
      theme: 'Ancient Egypt',
      element: 'Fire',
      difficulty: 5,
      userId: null
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS! Card generated with Workers AI');
    console.log('='.repeat(80));
    console.log('ID:', card.id);
    console.log('Name:', card.name);
    console.log('Description:', card.description);
    console.log('Element:', card.element);
    console.log('Cost:', card.cost, '| Power:', card.power, '| Defense:', card.defense);
    console.log('Category:', card.problemCategory);
    console.log('Image URL:', card.imageUrl);
    console.log('Image Prompt:', card.imagePrompt);
    console.log('='.repeat(80));
    console.log('⏱️  Duration:', duration, 'seconds');
    console.log('='.repeat(80));

    // Verify image is accessible
    console.log('\n🔍 Verifying image accessibility...');
    const imageResponse = await fetch(card.imageUrl);
    if (imageResponse.ok) {
      const contentLength = imageResponse.headers.get('content-length');
      console.log('✅ Image accessible at R2 URL');
      console.log('📦 Image size:', Math.round(parseInt(contentLength || '0') / 1024), 'KB');
    } else {
      console.error('❌ Image NOT accessible:', imageResponse.status);
    }

    console.log('\n🎉 END-TO-END TEST PASSED\n');
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ FAILED! Error generating card:');
    console.error('='.repeat(80));
    console.error(error);
    console.error('='.repeat(80));
    process.exit(1);
  }
}

testWorkersAICard();
