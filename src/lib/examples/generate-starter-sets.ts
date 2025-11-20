/**
 * Script to generate 3 initial thematic card sets
 *
 * To run:
 * npm run generate:sets
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { generateCardBatch } from '../ai/batch-card-generator';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const STARTER_SETS = [
  {
    batchName: "Elemental Warriors",
    theme: "Ancient Elemental Samurai",
    themeDescription: `
      A set of legendary samurai warriors who have mastered the four elements.
      Each warrior is bound to an elemental spirit (Fire, Water, Earth, Air) and channels its power in battle.
      Set in feudal Japan with mystical anime aesthetics.
      Visual style: Vibrant elemental auras, traditional samurai armor fused with elemental motifs, dynamic battle poses.
    `,
    difficulty: 5,
  },
  {
    batchName: "Cyber Samurai",
    theme: "Neo-Tokyo Cyberpunk Samurai",
    themeDescription: `
      Warriors from a futuristic Neo-Tokyo where ancient samurai traditions merge with advanced cybernetics.
      Neon-lit cityscapes, holographic katanas, neural implants, and honor codes preserved in a digital age.
      Visual style: Neon colors (pink, cyan, purple), tech-infused armor, glowing energy weapons, rain-soaked streets.
    `,
    difficulty: 6,
  },
  {
    batchName: "Mystic Scholars",
    theme: "Arcane Academy Mages",
    themeDescription: `
      Young mages studying at an elite magical academy, each specializing in different schools of magic.
      Inspired by prestigious wizard academies with anime character designs.
      Robes, spellbooks, floating tomes, magical creatures as familiars.
      Visual style: Magical particle effects, enchanted libraries, celestial backgrounds, colorful spell auras.
    `,
    difficulty: 4,
  },
];

async function generateStarterSets() {
  console.log('🚀 Starting generation of 3 starter sets...\n');
  console.log('⏱️  This will take several minutes (generating 30 cards + images)\n');

  try {
    for (let i = 0; i < STARTER_SETS.length; i++) {
      const set = STARTER_SETS[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 Set ${i + 1}/3: ${set.batchName}`);
      console.log(`${'='.repeat(60)}\n`);

      const result = await generateCardBatch({
        ...set,
        count: 10,
      });

      console.log(`\n✅ "${set.batchName}" complete!`);
      console.log(`   Batch ID: ${result.batch.id}`);
      console.log(`   Cards generated: ${result.cards.length}`);
      console.log(`   Sample cards:`);
      result.cards.slice(0, 3).forEach((card, idx) => {
        console.log(`     ${idx + 1}. ${card.name} (${card.element}, ${card.cost}⚡ ${card.power}⚔️ ${card.defense}🛡️)`);
      });

      // Wait 5 seconds between sets to avoid rate limiting
      if (i < STARTER_SETS.length - 1) {
        console.log(`\n⏳ Waiting 5 seconds before next set...\n`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 All 3 starter sets generated successfully!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Total cards: 30`);
    console.log(`   Total batches: 3`);
    console.log(`\n💡 Next steps:`);
    console.log(`   - View cards in Drizzle Studio: npm run db:studio`);
    console.log(`   - Test batch API: GET /api/cards/batch?batchId=<id>`);
    console.log(`   - Test problem generation: POST /api/problems with { "cardId": "<id>" }`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error during generation:', error);
    process.exit(1);
  }
}

// Run the generator
generateStarterSets();
