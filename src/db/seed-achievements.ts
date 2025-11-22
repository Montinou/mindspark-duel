import { db } from "@/db";
import { achievements } from "@/db/schema";

const INITIAL_ACHIEVEMENTS = [
  // Combat
  {
    title: "First Blood",
    description: "Win your first duel",
    category: "Combat",
    tier: "Bronze",
    requirementType: "win_game",
    requirementCount: 1,
    icon: "sword",
    rewardSparks: 50
  },
  {
    title: "Duelist",
    description: "Win 10 duels",
    category: "Combat",
    tier: "Silver",
    requirementType: "win_game",
    requirementCount: 10,
    icon: "swords",
    rewardSparks: 150
  },
  {
    title: "Champion",
    description: "Win 50 duels",
    category: "Combat",
    tier: "Gold",
    requirementType: "win_game",
    requirementCount: 50,
    icon: "trophy",
    rewardSparks: 500
  },
  
  // Collection
  {
    title: "Collector",
    description: "Play 10 cards",
    category: "Collection",
    tier: "Bronze",
    requirementType: "play_cards",
    requirementCount: 10,
    icon: "cards",
    rewardSparks: 50
  },
  {
    title: "Deck Master",
    description: "Play 100 cards",
    category: "Collection",
    tier: "Silver",
    requirementType: "play_cards",
    requirementCount: 100,
    icon: "deck",
    rewardSparks: 200
  },

  // Mastery
  {
    title: "Problem Solver",
    description: "Solve 5 problems correctly",
    category: "Mastery",
    tier: "Bronze",
    requirementType: "solve_problems",
    requirementCount: 5,
    icon: "brain",
    rewardSparks: 75
  },
  {
    title: "Genius",
    description: "Solve 50 problems correctly",
    category: "Mastery",
    tier: "Gold",
    requirementType: "solve_problems",
    requirementCount: 50,
    icon: "lightbulb",
    rewardSparks: 400
  },

  // Social (Placeholder for now as we don't have social features fully)
  {
    title: "Social Butterfly",
    description: "Play 5 games (Win or Lose)",
    category: "Social",
    tier: "Bronze",
    requirementType: "play_games",
    requirementCount: 5,
    icon: "users",
    rewardSparks: 50
  }
] as const;

async function seedAchievements() {
  console.log("🌱 Seeding achievements...");

  for (const achievement of INITIAL_ACHIEVEMENTS) {
    // Check if exists by title to avoid duplicates
    // In a real migration we might want a unique constraint on title or a stable ID
    // For now, we'll just upsert or skip if exists
    
    // Simple check:
    const existing = await db.query.achievements.findFirst({
      where: (achievements, { eq }) => eq(achievements.title, achievement.title)
    });

    if (!existing) {
      await db.insert(achievements).values({
        ...achievement,
        category: achievement.category as any,
        tier: achievement.tier as any,
      });
      console.log(`Created achievement: ${achievement.title}`);
    } else {
      console.log(`Skipped existing: ${achievement.title}`);
    }
  }

  console.log("✅ Achievements seeding complete!");
}

seedAchievements().catch((err) => {
  console.error("Error seeding achievements:", err);
  process.exit(1);
});
