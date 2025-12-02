# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MindSpark Duel is an educational trading card game (TCG) built with Next.js 16, where players battle using AI-generated cards and must solve math/logic/science problems to play them. The game combines TCG mechanics with educational problem-solving to create engaging learning experiences.

## Commands

### Development
```bash
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Production build
npm run lint         # Run ESLint
```

### Database (Drizzle + Neon)
```bash
npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Apply migrations to database
npm run db:push      # Push schema directly (dev only)
npm run db:studio    # Open Drizzle Studio GUI
npm run db:test      # Run database connection test
```

### Utility Scripts
```bash
npm run seed:achievements    # Seed achievement data
npm run generate:sets        # Generate starter card sets
npx tsx scripts/<name>.ts    # Run any script in /scripts
```

### Cloudflare Workers (AI Services)
```bash
cd workers/ai-text-generator && npx wrangler deploy
cd workers/ai-image-generator && npx wrangler deploy
cd workers/ai-problem-generator && npx wrangler deploy
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui
- **Database**: Neon (serverless Postgres) + Drizzle ORM (HTTP adapter)
- **Auth**: Stack Auth (@stackframe/stack)
- **AI Services**: Cloudflare Workers with Workers AI (Llama 3.3, Stable Diffusion)
- **Storage**: Cloudflare R2 for card images
- **Deployment**: Vercel

### Key Directories
```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints (game/, battle/, cards/, problems/)
│   ├── dashboard/         # Main game dashboard (collection, library, missions)
│   └── onboarding/        # New user flow with theme selection
├── components/
│   ├── game/              # Game UI (GamePage, ProblemModal, EnemyArea)
│   ├── battle/            # Battle system components (BattleSequence, DualProblemView)
│   └── ui/                # shadcn/ui components
├── db/
│   ├── schema.ts          # Drizzle schema (users, cards, problems, gameSessions, etc.)
│   ├── index.ts           # Database connection (neon HTTP adapter)
│   └── migrations/        # Generated SQL migrations
├── lib/
│   ├── game/              # Core game logic
│   │   ├── turn-manager.ts      # Turn/phase orchestration
│   │   ├── phase-controller.ts  # Phase progression rules
│   │   ├── deck-service.ts      # Deck operations, card drawing
│   │   └── abilities.ts         # Card ability system
│   ├── ai/                # AI systems
│   │   ├── ai-opponent.ts       # AI player decision making
│   │   ├── problem-generator.ts # Dynamic problem generation
│   │   └── card-generator.ts    # Card content generation
│   └── gamification/      # Achievements, mastery, missions
├── types/
│   ├── game.ts            # Core game types (Card, Player, GameState, TurnState)
│   └── battle.ts          # Battle-specific types
└── hooks/                 # React hooks (useAITurnTrigger)

workers/                   # Cloudflare Workers for AI
├── ai-text-generator/     # Card data generation (Llama 3.3 70B)
├── ai-image-generator/    # Card art generation (Stable Diffusion)
└── ai-problem-generator/  # Math/logic problem generation
```

### Game Flow
1. **Onboarding**: User selects theme → generates initial 10-card deck via Cloudflare Workers
2. **Game Start**: TurnManager creates ExtendedGameState with decks, hands (5 cards), boards
3. **Turn Structure**: Start Phase (draw + mana) → Main Phase (play cards) → Combat Phase (attacks) → End Phase
4. **Playing Cards**: Player must solve a problem (generated from card's `problemHints`) to play the card
5. **Combat**: Dual-problem system where both attacker and defender solve problems to determine damage

### Core Types
```typescript
// Card with problem generation hints
interface Card {
  id: string;
  name: string;
  cost: number;      // Mana cost (1-10)
  power: number;     // Attack stat
  defense: number;
  element: 'Fire' | 'Water' | 'Earth' | 'Air';
  problemCategory: 'Math' | 'Logic' | 'Science';
  problemHints: ProblemHints;  // Keywords, difficulty, topics for problem gen
}

// ExtendedGameState - full game state managed by TurnManager
interface ExtendedGameState extends TurnState {
  playerDeckState: DeckState;
  playerHand: Card[];
  playerBoard: Card[];
  playerHealth: number;
  // ... opponent equivalents
}
```

### Database Schema (Drizzle)
Key tables in `src/db/schema.ts`:
- `users` - Player profiles with Stack Auth ID, sparks (currency), preferences
- `cards` - Card definitions with AI-generated content and problemHints
- `problems` - Pre-generated problems linked to cards
- `userCards` - User card ownership (many-to-many)
- `gameSessions` - Active/completed games with persisted state
- `decks` - User deck configurations with generation status
- `achievements`, `missions`, `mastery` - Gamification systems

### Authentication
Uses Stack Auth with cookie-based tokens:
```typescript
import { stackServerApp } from '@/lib/stack';
const user = await stackServerApp.getUser();
```

### Environment Variables
Required in `.env.local`:
```
DATABASE_URL=postgresql://...@neon.tech/...
NEXT_PUBLIC_STACK_PROJECT_ID=
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=
STACK_SECRET_SERVER_KEY=
```

For Cloudflare Workers (card generation):
```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=mindspark-duel-cards
```

## Integration Notes

### Neon + Drizzle
Uses HTTP adapter for serverless (recommended for Next.js/Vercel):
```typescript
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
```

### Cloudflare Workers AI
Workers use `@cf/meta/llama-3.3-70b-instruct-fp8-fast` for text and problem generation. Each worker is deployed independently with `wrangler deploy`.

### Cursor Rules
Neon integration rules are in `.cursor/rules/`:
- `neon-drizzle.mdc` - Drizzle ORM patterns
- `neon-serverless.mdc` - Connection pooling
- `neon-auth.mdc` - Stack Auth integration
