/**
 * MindSpark Duel - Deck Orchestrator Worker
 *
 * Handles the complete deck generation process without Vercel timeouts.
 * Generates 20 cards sequentially using Workers AI, uploads to R2, and saves to NeonDB.
 */

import { neon } from '@neondatabase/serverless';

// ============================================
// Types
// ============================================

export interface Env {
  AI: Ai;
  CARD_IMAGES: R2Bucket;
  DATABASE_URL: string;
  R2_PUBLIC_URL: string;
  ORCHESTRATOR_SECRET?: string;
}

interface DeckGenerationRequest {
  userId: string;
  theme: string;
  deckId: string;
}

interface BoosterRequest {
  userId: string;
  themes?: string[];  // Optional: specific themes, otherwise random
}

// Rarity tiers - defined first so it can be used in interfaces
// Must match database enum: 'common', 'uncommon', 'rare', 'epic', 'legendary'
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface BoosterCard {
  theme: string;
  element: string;
  cost: number;
  rarity: Rarity;
  problemCategory: string;
}

// Rarity config with stat multipliers and image quality

const RARITY_CONFIG: Record<Rarity, {
  statMultiplier: number;      // Multiplier for power/defense
  costBonus: number;           // Extra effective cost for stats
  imageQuality: string;        // Image prompt suffix for quality
  dropWeight: number;          // For random selection (higher = more common)
}> = {
  common: {
    statMultiplier: 1.0,
    costBonus: 0,
    imageQuality: 'high quality digital art',
    dropWeight: 100
  },
  uncommon: {
    statMultiplier: 1.15,
    costBonus: 1,
    imageQuality: 'highly detailed digital painting, professional quality',
    dropWeight: 50
  },
  rare: {
    statMultiplier: 1.3,
    costBonus: 2,
    imageQuality: 'masterwork illustration, museum quality, intricate details, perfect lighting',
    dropWeight: 15
  },
  epic: {
    statMultiplier: 1.4,
    costBonus: 2,
    imageQuality: 'epic masterpiece, dramatic lighting, ultra detailed, stunning composition',
    dropWeight: 8
  },
  legendary: {
    statMultiplier: 1.5,
    costBonus: 3,
    imageQuality: 'legendary masterpiece, divine lighting, ultra detailed, breathtaking composition, award winning art',
    dropWeight: 5
  }
};

// Booster pack configuration: 5 cards (2 common, 2 uncommon, 1 rare/epic/legendary)
const BOOSTER_CONFIG = {
  cards: 5,
  rarityDistribution: [
    { rarity: 'common' as Rarity, count: 2, costRange: [1, 3] },
    { rarity: 'uncommon' as Rarity, count: 2, costRange: [2, 4] },
    // Last slot: 70% rare, 20% epic, 10% legendary
    { rarity: 'rare_or_higher' as const, count: 1, costRange: [4, 7], rareChance: 0.70, epicChance: 0.20 }
  ]
};

// Starter deck configuration: 20 cards with 1 guaranteed legendary
const STARTER_DECK_RARITY_PATTERN = [
  // First 5: 2 common, 2 uncommon, 1 rare
  'common', 'common', 'uncommon', 'uncommon', 'rare',
  // Second 5: 2 common, 2 uncommon, 1 rare
  'common', 'common', 'uncommon', 'uncommon', 'rare',
  // Third 5: 2 common, 2 uncommon, 1 epic
  'common', 'common', 'uncommon', 'uncommon', 'epic',
  // Fourth 5: 1 common, 2 uncommon, 1 rare, 1 LEGENDARY (guaranteed)
  'common', 'uncommon', 'uncommon', 'rare', 'legendary'
] as Rarity[];

interface ProblemHints {
  keywords: string[];
  topics: string[];
  difficulty: number;
  subCategory: string;
  contextType: 'fantasy' | 'real_world' | 'abstract';
  suggestedTopics: string[];
}

interface CardData {
  name: string;
  description: string;
  flavorText?: string;
  cost: number;
  power: number;
  defense: number;
  element: 'Fire' | 'Water' | 'Earth' | 'Air';
  problemCategory: 'Math' | 'Logic' | 'Science';
  imagePrompt: string;
  tags: string[];
  problemHints: ProblemHints;
  rarity?: Rarity;
}

interface PendingCard {
  id: string;
  cost: number;
  element: string;
  problem_category: string;
}

// ============================================
// Creative Content Data
// ============================================

const IMAGE_STYLES = [
  'dark fantasy oil painting, dramatic chiaroscuro lighting, museum quality',
  'ethereal digital art, luminescent particles, mystical atmosphere, 8k detail',
  'detailed concept art, cinematic lighting, epic scale, artstation trending',
  'gothic art nouveau, ornate borders, symbolic elements, golden ratio',
  'realistic fantasy illustration, volumetric lighting, hyper detailed',
  'impressionist fantasy style, vibrant brushstrokes, emotional atmosphere',
  'dark gothic illustration, intricate details, dramatic shadows'
];

const PERSPECTIVES = [
  'dramatic low angle shot looking up, heroic presence',
  'portrait view, intense piercing gaze at viewer',
  'dynamic action pose mid-movement, energy trails',
  'majestic full body silhouette against dramatic sky',
  'close-up showing raw power emanating from hands',
  'environmental shot showing scale and grandeur',
  'three-quarter view with magical particles swirling'
];

const MOODS = [
  'powerful and commanding, radiating authority',
  'mysterious and ancient, keeper of secrets',
  'wild and untamed, primal fury',
  'ethereal and otherworldly, transcendent being',
  'fierce and battle-ready, unstoppable warrior',
  'serene yet deadly, calm before the storm',
  'dark and foreboding, harbinger of doom'
];

const ELEMENT_CONFIG: Record<string, {
  keywords: string[];
  topics: string[];
  subCategories: string[];
  visualEffects: string;
  colorPalette: string;
}> = {
  Fire: {
    keywords: ['volcán', 'llamas', 'temperatura', 'combustión', 'energía', 'ceniza', 'magma'],
    topics: ['heat transfer', 'temperature', 'energy', 'expansion', 'combustion'],
    subCategories: ['thermodynamics', 'percentages', 'rates', 'exponential'],
    visualEffects: 'flames, embers, heat distortion, volcanic glow',
    colorPalette: 'deep reds, oranges, amber, volcanic blacks, ember glows'
  },
  Water: {
    keywords: ['océano', 'corriente', 'presión', 'flujo', 'profundidad', 'marea', 'ola'],
    topics: ['volume', 'flow rate', 'pressure', 'density', 'waves'],
    subCategories: ['fractions', 'ratios', 'measurement', 'proportions'],
    visualEffects: 'water droplets, mist, bioluminescence, underwater caustics',
    colorPalette: 'deep blues, teals, aquamarines, bioluminescent accents'
  },
  Earth: {
    keywords: ['montaña', 'mineral', 'peso', 'estructura', 'estabilidad', 'cristal', 'piedra'],
    topics: ['mass', 'weight', 'layers', 'stability', 'structure'],
    subCategories: ['geometry', 'multiplication', 'proportions', 'area'],
    visualEffects: 'floating rocks, crystal formations, earth cracks, moss glow',
    colorPalette: 'forest greens, rich browns, gold accents, stone grays, emerald'
  },
  Air: {
    keywords: ['viento', 'velocidad', 'distancia', 'atmósfera', 'vuelo', 'tormenta', 'rayo'],
    topics: ['speed', 'distance', 'atmosphere', 'movement', 'patterns'],
    subCategories: ['algebra', 'time-distance', 'patterns', 'sequences'],
    visualEffects: 'wind trails, lightning, cloud wisps, feathers floating',
    colorPalette: 'sky blues, silver whites, lavender mists, lightning purples'
  }
};

const THEME_CONFIG: Record<string, {
  keywords: string[];
  contextType: 'fantasy' | 'real_world' | 'abstract';
  subCategories: string[];
  defaultElement: string;
  nameExamples: string[];
}> = {
  // === CORE THEMES (Starter Decks) ===
  technomancer: {
    keywords: ['circuito', 'energía', 'código', 'datos', 'mecánico', 'digital', 'binario'],
    contextType: 'abstract',
    subCategories: ['binary', 'sequences', 'algebra', 'algorithms'],
    defaultElement: 'Fire',
    nameExamples: ['Kira, Tejedora de Circuitos', 'El Coloso de Cromo', 'Vigía del Servidor Perdido']
  },
  nature: {
    keywords: ['bosque', 'criatura', 'vida', 'crecimiento', 'ecosistema', 'salvaje', 'natural'],
    contextType: 'real_world',
    subCategories: ['biology', 'ecology', 'growth', 'cycles'],
    defaultElement: 'Earth',
    nameExamples: ['Yggdra, Madre de Raíces', 'El Susurro del Bosque', 'Guardián del Claro Olvidado']
  },
  arcane: {
    keywords: ['hechizo', 'magia', 'poder', 'ritual', 'místico', 'arcano', 'runa'],
    contextType: 'fantasy',
    subCategories: ['patterns', 'sequences', 'logic', 'puzzles'],
    defaultElement: 'Water',
    nameExamples: ['Malakai el Tejedor', 'Oráculo del Vacío', 'La Llama que Recuerda']
  },
  // === BOOSTER THEMES (Dynamic) ===
  celestial: {
    keywords: ['estrella', 'constelación', 'cosmos', 'luz', 'celestial', 'astro', 'divino'],
    contextType: 'fantasy',
    subCategories: ['astronomy', 'geometry', 'patterns', 'cycles'],
    defaultElement: 'Air',
    nameExamples: ['Astraea, Danzarina de Estrellas', 'El Portador del Eclipse', 'Vigía de la Última Constelación']
  },
  abyssal: {
    keywords: ['abismo', 'profundidad', 'oscuridad', 'presión', 'criatura marina', 'tentáculo', 'fosa'],
    contextType: 'fantasy',
    subCategories: ['pressure', 'depth', 'ratios', 'exponential'],
    defaultElement: 'Water',
    nameExamples: ['Kraken del Vacío Eterno', 'La Sirena Sin Nombre', 'Devorador de Naufragios']
  },
  volcanic: {
    keywords: ['volcán', 'lava', 'erupción', 'ceniza', 'magma', 'fuego', 'destrucción'],
    contextType: 'real_world',
    subCategories: ['temperature', 'volume', 'rates', 'percentages'],
    defaultElement: 'Fire',
    nameExamples: ['Pyrrhus, Señor de la Caldera', 'La Furia Fundida', 'Caminante del Magma']
  },
  steampunk: {
    keywords: ['engranaje', 'vapor', 'latón', 'reloj', 'máquina', 'victoriano', 'invento'],
    contextType: 'abstract',
    subCategories: ['mechanics', 'ratios', 'sequences', 'time'],
    defaultElement: 'Fire',
    nameExamples: ['Baronesa del Engranaje Roto', 'El Autómata de Medianoche', 'Inventor del Tiempo Perdido']
  },
  crystalline: {
    keywords: ['cristal', 'gema', 'prisma', 'refracción', 'mineral', 'faceta', 'brillo'],
    contextType: 'abstract',
    subCategories: ['geometry', 'angles', 'multiplication', 'symmetry'],
    defaultElement: 'Earth',
    nameExamples: ['Prisma, el Fragmentado', 'Guardiana de la Geoda Eterna', 'El Susurro del Cuarzo']
  },
  necromantic: {
    keywords: ['muerte', 'espíritu', 'tumba', 'hueso', 'alma', 'fantasma', 'resurreción'],
    contextType: 'fantasy',
    subCategories: ['decay', 'cycles', 'subtraction', 'negative'],
    defaultElement: 'Water',
    nameExamples: ['Morthyx, Pastor de Almas', 'La Dama del Cementerio Blanco', 'Eco del Último Suspiro']
  },
  storm: {
    keywords: ['tormenta', 'rayo', 'trueno', 'huracán', 'viento', 'relámpago', 'ciclón'],
    contextType: 'real_world',
    subCategories: ['speed', 'distance', 'energy', 'patterns'],
    defaultElement: 'Air',
    nameExamples: ['Tempestrix, Hija del Trueno', 'El Ojo del Huracán Eterno', 'Danzante del Relámpago']
  },
  fungal: {
    keywords: ['hongo', 'espora', 'micelio', 'descomposición', 'simbiosis', 'colonia', 'toxina'],
    contextType: 'real_world',
    subCategories: ['growth', 'multiplication', 'networks', 'decay'],
    defaultElement: 'Earth',
    nameExamples: ['El Primordial Espora', 'Madre de la Red Micelial', 'Susurrador de Hongos']
  },
  temporal: {
    keywords: ['tiempo', 'reloj', 'paradoja', 'eternidad', 'instante', 'cronología', 'bucle'],
    contextType: 'abstract',
    subCategories: ['sequences', 'patterns', 'time', 'logic'],
    defaultElement: 'Air',
    nameExamples: ['Kronox, Devorador de Eras', 'La Paradoja Viviente', 'Guardián del Último Segundo']
  },
  draconic: {
    keywords: ['dragón', 'escama', 'tesoro', 'fuego', 'ala', 'garra', 'ancestral'],
    contextType: 'fantasy',
    subCategories: ['multiplication', 'exponential', 'geometry', 'treasure'],
    defaultElement: 'Fire',
    nameExamples: ['Ignatius, el Primogénito', 'Sombra de la Montaña Ardiente', 'Último Dragón de Aethyr']
  },
  frost: {
    keywords: ['hielo', 'nieve', 'glaciar', 'frío', 'escarcha', 'congelación', 'ártico'],
    contextType: 'real_world',
    subCategories: ['temperature', 'states', 'fractions', 'negative'],
    defaultElement: 'Water',
    nameExamples: ['Glaciera, Reina del Permafrost', 'El Susurro del Ventisca', 'Centinela del Hielo Eterno']
  },
  mechanical: {
    keywords: ['robot', 'androide', 'metal', 'constructor', 'fábrica', 'protocolo', 'sistema'],
    contextType: 'abstract',
    subCategories: ['binary', 'logic', 'sequences', 'algorithms'],
    defaultElement: 'Earth',
    nameExamples: ['AXIOM-7, el Despertado', 'La Forja que Piensa', 'Centinela del Código Antiguo']
  },
  verdant: {
    keywords: ['selva', 'liana', 'flor', 'polen', 'raíz', 'fotosíntesis', 'floración'],
    contextType: 'real_world',
    subCategories: ['growth', 'cycles', 'ratios', 'ecology'],
    defaultElement: 'Earth',
    nameExamples: ['Florix, la Eterna Primavera', 'El Despertar de la Selva', 'Guardiana del Jardín Secreto']
  },
  shadow: {
    keywords: ['sombra', 'oscuridad', 'sigilo', 'noche', 'eclipse', 'penumbra', 'secreto'],
    contextType: 'fantasy',
    subCategories: ['subtraction', 'negative', 'patterns', 'logic'],
    defaultElement: 'Water',
    nameExamples: ['Nyx, Tejedor de Sombras', 'El Susurro Sin Forma', 'Acechador del Crepúsculo']
  },
  solar: {
    keywords: ['sol', 'aurora', 'amanecer', 'calor', 'radiación', 'fulgor', 'resplandor'],
    contextType: 'real_world',
    subCategories: ['energy', 'temperature', 'distance', 'cycles'],
    defaultElement: 'Fire',
    nameExamples: ['Solarius, Heraldo del Alba', 'La Corona Ardiente', 'Danzante del Primer Rayo']
  },
  insectoid: {
    keywords: ['insecto', 'enjambre', 'colmena', 'exoesqueleto', 'metamorfosis', 'antena', 'larva'],
    contextType: 'real_world',
    subCategories: ['multiplication', 'patterns', 'cycles', 'geometry'],
    defaultElement: 'Earth',
    nameExamples: ['Mantrix, Reina del Enjambre', 'El Último de la Colmena', 'Susurrador de Insectos']
  },
  alchemical: {
    keywords: ['alquimia', 'poción', 'transmutación', 'elixir', 'ingrediente', 'fórmula', 'destilación'],
    contextType: 'abstract',
    subCategories: ['ratios', 'measurement', 'fractions', 'conversion'],
    defaultElement: 'Water',
    nameExamples: ['Paracelsus, el Transmutor', 'Guardiana del Elixir Prohibido', 'El Alquimista Sin Sombra']
  }
};

// Lista de temas disponibles para boosters (excluye los de starter deck)
const BOOSTER_THEMES = [
  'celestial', 'abyssal', 'volcanic', 'steampunk', 'crystalline',
  'necromantic', 'storm', 'fungal', 'temporal', 'draconic',
  'frost', 'mechanical', 'verdant', 'shadow', 'solar',
  'insectoid', 'alchemical'
];

// Todos los temas disponibles
const ALL_THEMES = Object.keys(THEME_CONFIG);

// ============================================
// Dynamic Theme Generation
// ============================================

interface DynamicThemeConfig {
  id: string;
  displayName: string;
  keywords: string[];
  contextType: 'fantasy' | 'real_world' | 'abstract';
  subCategories: string[];
  defaultElement: 'Fire' | 'Water' | 'Earth' | 'Air';
  nameExamples: string[];
}

function validateDynamicTheme(parsed: unknown): DynamicThemeConfig | null {
  if (!parsed || typeof parsed !== 'object') {
    console.log('🎨 Validation failed: not an object');
    return null;
  }

  const theme = parsed as Record<string, unknown>;
  console.log('🎨 Validating theme:', JSON.stringify(theme).slice(0, 500));

  // Try to get id from various possible field names
  let id = theme.id || theme.theme_id || theme.themeId || theme.name;
  if (typeof id !== 'string' || id.length < 2) {
    console.log('🎨 Validation failed: invalid id');
    return null;
  }

  // Try to get displayName from various fields
  let displayName = theme.displayName || theme.display_name || theme.nombre || theme.name || theme.title || id;
  if (typeof displayName !== 'string') displayName = String(id);

  // Get keywords - more permissive
  const rawKeywords = theme.keywords || theme.palabras || theme.palabras_clave;
  const keywords: string[] = Array.isArray(rawKeywords) ? rawKeywords : [];
  if (keywords.length < 2) {
    console.log('🎨 Validation failed: not enough keywords');
    return null;
  }

  // Get subCategories - more permissive
  const rawSubCats = theme.subCategories || theme.sub_categories || theme.subcategorias || theme.categories;
  const subCategories: string[] = Array.isArray(rawSubCats) ? rawSubCats : ['patterns', 'geometry'];

  // Get nameExamples - more permissive
  const rawNameExamples = theme.nameExamples || theme.name_examples || theme.ejemplos || theme.nombres;
  let nameExamples: string[] = Array.isArray(rawNameExamples) ? rawNameExamples : [];
  if (nameExamples.length < 1) {
    nameExamples = [`Guardian de ${displayName}`];
  }

  // Validate contextType (map Spanish values)
  let contextType = theme.contextType || theme.context_type || theme.contexto || 'fantasy';
  const contextMap: Record<string, string> = {
    'fantasy': 'fantasy', 'fantasía': 'fantasy', 'fantasia': 'fantasy',
    'real_world': 'real_world', 'mundo_real': 'real_world', 'ciencia': 'real_world', 'science': 'real_world',
    'abstract': 'abstract', 'abstracto': 'abstract'
  };
  contextType = contextMap[String(contextType).toLowerCase()] || 'fantasy';

  // Validate element (map Spanish values)
  let defaultElement = theme.defaultElement || theme.default_element || theme.elemento || theme.element;
  const elementMap: Record<string, string> = {
    'fire': 'Fire', 'fuego': 'Fire',
    'water': 'Water', 'agua': 'Water',
    'earth': 'Earth', 'tierra': 'Earth',
    'air': 'Air', 'aire': 'Air', 'viento': 'Air'
  };
  defaultElement = elementMap[String(defaultElement).toLowerCase()] || ['Fire', 'Water', 'Earth', 'Air'][Math.floor(Math.random() * 4)];

  const result = {
    id: String(id).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 30),
    displayName: String(displayName).slice(0, 50),
    keywords: (keywords as string[]).slice(0, 7).map(k => String(k).slice(0, 30)),
    contextType: contextType as DynamicThemeConfig['contextType'],
    subCategories: (subCategories as string[]).slice(0, 4).map(s => String(s).slice(0, 30)),
    defaultElement: defaultElement as DynamicThemeConfig['defaultElement'],
    nameExamples: (nameExamples as string[]).slice(0, 3).map(n => String(n).slice(0, 60)),
  };

  console.log('🎨 Validation passed:', result.displayName);
  return result;
}

async function generateDynamicTheme(
  ai: Ai,
  excludeThemes: string[] = []
): Promise<DynamicThemeConfig> {
  const systemPrompt = `Genera un tema ÚNICO para un TCG educativo. Responde SOLO con JSON válido.

{
  "id": "kebab-case-id",
  "displayName": "Nombre del Tema",
  "keywords": ["palabra1", "palabra2", "palabra3", "palabra4", "palabra5"],
  "contextType": "fantasy",
  "subCategories": ["geometry", "patterns", "ratios"],
  "defaultElement": "Fire",
  "nameExamples": ["Nombre Épico 1", "Nombre Épico 2"]
}

Sé creativo. Evita clichés. Usa español.`;

  const userPrompt = `Genera un tema único y creativo.${excludeThemes.length > 0 ? ` Evita: ${excludeThemes.join(', ')}.` : ''} Solo JSON:`;

  const attempts = [
    { temperature: 0.95, top_p: 0.95 },  // Máxima creatividad
    { temperature: 0.85, top_p: 0.9 },   // Moderada
    { temperature: 0.7, top_p: 0.85 },   // Conservadora
  ];

  for (const config of attempts) {
    try {
      console.log(`🎨 Generating dynamic theme (temp=${config.temperature})...`);

      const response = await ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 600,
        temperature: config.temperature,
        top_p: config.top_p,
      });

      // Handle different response formats from Workers AI
      if (!response) {
        console.warn('🎨 Empty response from AI');
        continue;
      }

      let parsed: unknown = null;
      const resp = response as Record<string, unknown>;

      // Case 1: response.response is already an object (parsed JSON)
      if (resp.response && typeof resp.response === 'object') {
        console.log('🎨 Response is already parsed object');
        parsed = resp.response;
      }
      // Case 2: response.response is a string (needs parsing)
      else if (typeof resp.response === 'string') {
        console.log('🎨 Response is string, parsing...');
        const jsonMatch = resp.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      }
      // Case 3: response itself might be the theme object
      else if (resp.id && resp.keywords) {
        console.log('🎨 Response is the theme object directly');
        parsed = resp;
      }

      if (!parsed) {
        console.warn('🎨 Could not extract theme from response:', JSON.stringify(resp).slice(0, 200));
        continue;
      }

      console.log('🎨 Parsed theme:', JSON.stringify(parsed).slice(0, 300));

      const validated = validateDynamicTheme(parsed);

      if (validated) {
        console.log(`🎨 ✅ Dynamic theme generated: ${validated.displayName} (${validated.id})`);
        return validated;
      } else {
        console.warn('🎨 Theme validation failed, parsed:', JSON.stringify(parsed).slice(0, 200));
      }
    } catch (error) {
      console.warn(`🎨 Attempt with temp=${config.temperature} failed:`, error);
    }
  }

  // Fallback: pick random from BOOSTER_THEMES
  console.log(`🎨 ⚠️ Falling back to predefined theme`);
  const fallbackTheme = BOOSTER_THEMES[Math.floor(Math.random() * BOOSTER_THEMES.length)];
  const fallbackConfig = THEME_CONFIG[fallbackTheme];

  return {
    id: fallbackTheme,
    displayName: fallbackTheme.charAt(0).toUpperCase() + fallbackTheme.slice(1),
    keywords: fallbackConfig.keywords,
    contextType: fallbackConfig.contextType,
    subCategories: fallbackConfig.subCategories,
    defaultElement: fallbackConfig.defaultElement as DynamicThemeConfig['defaultElement'],
    nameExamples: fallbackConfig.nameExamples,
  };
}

// ============================================
// Utility Functions
// ============================================

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ============================================
// Card Generation Logic
// ============================================

function generateCardStats(cost: number, rarity: Rarity = 'common'): { power: number; defense: number } {
  const rarityConfig = RARITY_CONFIG[rarity];

  // Effective cost includes rarity bonus
  const effectiveCost = cost + rarityConfig.costBonus;
  const budget = (effectiveCost * 2) + 1;
  const variance = Math.floor(Math.random() * 3) - 1;
  const finalBudget = Math.max(3, budget + variance);

  let power = Math.floor(finalBudget / 2);
  let defense = finalBudget - power;

  // Random shift
  if (finalBudget > 2) {
    const shift = Math.floor(Math.random() * 2);
    if (Math.random() > 0.5) {
      power += shift;
      defense -= shift;
    } else {
      power -= shift;
      defense += shift;
    }
  }

  // Apply rarity multiplier
  power = Math.round(power * rarityConfig.statMultiplier);
  defense = Math.round(defense * rarityConfig.statMultiplier);

  // Max cap is higher for rarer cards
  const maxStat = rarity === 'legendary' ? 15 : rarity === 'epic' ? 14 : rarity === 'rare' ? 13 : rarity === 'uncommon' ? 11 : 10;

  return {
    power: clamp(power, 1, maxStat),
    defense: clamp(defense, 1, maxStat)
  };
}

async function generateCardWithAI(
  ai: Ai,
  theme: string,
  element: string,
  cost: number,
  category: string,
  cardIndex: number,
  totalCards: number,
  rarity: Rarity = 'common',
  existingNames: string[] = []  // Nombres a evitar
): Promise<CardData> {
  const stats = generateCardStats(cost, rarity);
  const elementConfig = ELEMENT_CONFIG[element] || ELEMENT_CONFIG.Fire;
  const themeConfig = THEME_CONFIG[theme] || THEME_CONFIG.arcane;
  const rarityConfig = RARITY_CONFIG[rarity];

  // Random creative elements for image generation
  const artStyle = pickRandom(IMAGE_STYLES);
  const perspective = pickRandom(PERSPECTIVES);
  const mood = pickRandom(MOODS);

  // Problem hints configuration
  const subCategory = pickRandom([...elementConfig.subCategories, ...themeConfig.subCategories]);
  const topics = shuffleArray(elementConfig.topics).slice(0, 3);
  const keywords = shuffleArray([...elementConfig.keywords, ...themeConfig.keywords]).slice(0, 5);

  // Rarity indicator for name generation
  const rarityHint = rarity === 'legendary' ? 'LEGENDARIA y ÉPICA' :
                     rarity === 'epic' ? 'ÉPICA y PODEROSA' :
                     rarity === 'rare' ? 'RARA y MEMORABLE' :
                     rarity === 'uncommon' ? 'NOTABLE' : 'COMÚN';

  const systemPrompt = `Genera JSON para una carta de juego TCG. Solo devuelve JSON válido, sin explicaciones.`;

  // Use theme-specific name examples
  const nameExamples = themeConfig.nameExamples.join('", "');

  // Build avoid names instruction if there are existing names
  const avoidNamesInstruction = existingNames.length > 0
    ? `\n\n⚠️ NOMBRES PROHIBIDOS (ya existen, NO los uses): ${existingNames.slice(0, 20).join(', ')}`
    : '';

  const userPrompt = `Crea una carta ${rarityHint} para tema "${theme}", elemento ${element}, costo ${cost}.

Ejemplos de buenos nombres para ${theme}: "${nameExamples}"

Inspírate en estos estilos pero crea nombres ÚNICOS y ORIGINALES. NO copies los ejemplos.
${rarity === 'legendary' || rarity === 'epic' || rarity === 'rare' ? 'Esta es una carta ' + rarity.toUpperCase() + ', el nombre debe ser ÉPICO y memorable.' : ''}${avoidNamesInstruction}

Devuelve SOLO este JSON:
{
  "name": "nombre creativo en español (NO uses formato Adjetivo+Sustantivo)",
  "description": "1-2 oraciones poéticas en español describiendo la criatura",
  "flavorText": "cita en itálica estilo TCG: puede ser una frase enigmática, cita de un personaje del lore (con —Nombre), profecía, o fragmento poético. Ejemplos: 'Las cenizas de los caídos son suelo fértil para héroes.' / 'No temo a la muerte. Temo no haber vivido. —Koth' / 'El silencio antes de la tormenta es mentira.'",
  "cost": ${cost},
  "power": ${stats.power},
  "defense": ${stats.defense},
  "element": "${element}",
  "problemCategory": "${category}",
  "imagePrompt": "${theme} ${element.toLowerCase()} creature, ${artStyle}, ${perspective}, ${mood}, ${elementConfig.visualEffects}, ${elementConfig.colorPalette}, ${rarityConfig.imageQuality}",
  "tags": ["${theme}", "${element.toLowerCase()}", "${rarity}", "creature"],
  "problemHints": {
    "keywords": ${JSON.stringify(keywords)},
    "topics": ${JSON.stringify(topics)},
    "difficulty": ${clamp(cost + 2, 1, 10)},
    "subCategory": "${subCategory}",
    "contextType": "${themeConfig.contextType}",
    "suggestedTopics": ${JSON.stringify(topics.slice(0, 2))}
  }
}`;

  // Try with retries - 3 attempts with varying temperature
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Vary temperature: 0.85 -> 0.7 -> 0.5 for more deterministic on retries
      const temperature = attempt === 1 ? 0.85 : attempt === 2 ? 0.7 : 0.5;

      const response = await ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        top_p: 0.9,
        max_tokens: 900
      });

      // Handle different response formats from Workers AI
      let responseText = '';
      try {
        if (!response) {
          throw new Error('Empty response from AI');
        }

        if (typeof response === 'string') {
          responseText = response;
        } else if (typeof response === 'object') {
          // Try common response formats
          const resp = response as Record<string, unknown>;
          if (typeof resp.response === 'string') {
            responseText = resp.response;
          } else if (typeof resp.generated_text === 'string') {
            responseText = resp.generated_text;
          } else if (typeof resp.text === 'string') {
            responseText = resp.text;
          } else if (typeof resp.content === 'string') {
            responseText = resp.content;
          } else if (Array.isArray(resp.choices) && resp.choices[0]) {
            const choice = resp.choices[0] as Record<string, unknown>;
            if (typeof choice.text === 'string') {
              responseText = choice.text;
            } else if (choice.message && typeof (choice.message as Record<string, unknown>).content === 'string') {
              responseText = (choice.message as Record<string, unknown>).content as string;
            }
          }

          // Last resort: stringify
          if (!responseText && response) {
            responseText = JSON.stringify(response);
          }
        }

        if (!responseText) {
          throw new Error('Could not extract text from AI response');
        }
      } catch (parseErr) {
        console.error('Failed to parse AI response:', parseErr);
        throw parseErr;
      }

      console.log('AI response length:', responseText.length);

      const parsed = safeParseJSON(responseText);

      if (parsed && parsed.name && parsed.name !== 'Pending Card...') {
        return validateCardData(parsed, {
          element,
          category,
          cost,
          stats,
          theme,
          subCategory,
          topics,
          keywords,
          contextType: themeConfig.contextType,
          artStyle,
          perspective,
          mood,
          elementConfig
        });
      }

      console.warn(`Attempt ${attempt} produced invalid response, retrying...`);
    } catch (error) {
      console.warn(`AI attempt ${attempt} failed:`, error);
      if (attempt === 3) {
        throw new Error(`All AI attempts failed: ${error}`);
      }
    }
  }

  // No fallback - throw error to retry later
  throw new Error('Failed to generate valid card data after all attempts');
}

function safeParseJSON(text: unknown): CardData | null {
  // Ensure we have a string
  if (typeof text !== 'string') {
    console.warn('safeParseJSON received non-string:', typeof text);
    return null;
  }

  if (!text || text.length === 0) {
    console.warn('safeParseJSON received empty text');
    return null;
  }

  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    // Try basic repairs
    let repaired = jsonMatch[0]
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/'/g, '"')
      .replace(/[\x00-\x1F\x7F]/g, ' ');
    try {
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

function validateCardData(parsed: Partial<CardData>, defaults: {
  element: string;
  category: string;
  cost: number;
  stats: { power: number; defense: number };
  theme: string;
  subCategory: string;
  topics: string[];
  keywords: string[];
  contextType: 'fantasy' | 'real_world' | 'abstract';
  artStyle: string;
  perspective: string;
  mood: string;
  elementConfig: typeof ELEMENT_CONFIG.Fire;
}): CardData {
  return {
    name: String(parsed.name || `${defaults.theme} Guardian`).slice(0, 50),
    description: String(parsed.description || 'Un ser ancestral despierta de su letargo eterno.').slice(0, 200),
    flavorText: parsed.flavorText ? String(parsed.flavorText).slice(0, 100) : 'El poder fluye donde la voluntad lo guía.',
    cost: defaults.cost,
    power: defaults.stats.power,
    defense: defaults.stats.defense,
    element: defaults.element as CardData['element'],
    problemCategory: defaults.category as CardData['problemCategory'],
    imagePrompt: String(parsed.imagePrompt ||
      `${defaults.theme} ${defaults.element.toLowerCase()} creature, ${defaults.artStyle}, ${defaults.perspective}, ${defaults.mood}, ${defaults.elementConfig.visualEffects}, ${defaults.elementConfig.colorPalette}, full art trading card, no text, no borders`
    ),
    tags: Array.isArray(parsed.tags) && parsed.tags.length >= 2
      ? parsed.tags.slice(0, 5).map(String)
      : [defaults.theme, defaults.element.toLowerCase(), 'guardian', 'epic'],
    problemHints: {
      keywords: Array.isArray(parsed.problemHints?.keywords) && parsed.problemHints.keywords.length >= 3
        ? parsed.problemHints.keywords.slice(0, 5).map(String)
        : defaults.keywords,
      topics: Array.isArray(parsed.problemHints?.topics) && parsed.problemHints.topics.length >= 2
        ? parsed.problemHints.topics.slice(0, 3).map(String)
        : defaults.topics,
      difficulty: clamp(Number(parsed.problemHints?.difficulty) || defaults.cost + 2, 1, 10),
      subCategory: String(parsed.problemHints?.subCategory || defaults.subCategory),
      contextType: ['fantasy', 'real_world', 'abstract'].includes(parsed.problemHints?.contextType || '')
        ? parsed.problemHints!.contextType as 'fantasy' | 'real_world' | 'abstract'
        : defaults.contextType,
      suggestedTopics: Array.isArray(parsed.problemHints?.suggestedTopics) && parsed.problemHints.suggestedTopics.length >= 1
        ? parsed.problemHints.suggestedTopics.slice(0, 3).map(String)
        : defaults.topics.slice(0, 2)
    }
  };
}

// ============================================
// Image Generation
// ============================================

async function generateAndUploadImage(
  ai: Ai,
  r2Bucket: R2Bucket,
  publicUrl: string,
  prompt: string,
  element: string
): Promise<string> {
  const elementConfig = ELEMENT_CONFIG[element] || ELEMENT_CONFIG.Fire;

  const enhancedPrompt = `${prompt}, collectible card game illustration, masterpiece, award winning, highly detailed, no text, no watermarks, no borders, full bleed artwork`;

  console.log('Generating image with Flux Schnell...');

  const response = await ai.run('@cf/black-forest-labs/flux-1-schnell', {
    prompt: enhancedPrompt,
    num_steps: 4
  });

  if (!response || !(response as { image?: string }).image) {
    throw new Error('No image generated from AI');
  }

  // Convert base64 to Uint8Array
  const base64Image = (response as { image: string }).image;
  const binaryString = atob(base64Image);
  const imageBuffer = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    imageBuffer[i] = binaryString.charCodeAt(i);
  }

  // Generate unique filename
  const fileName = `cards/${crypto.randomUUID()}.png`;

  // Upload directly to R2 using binding
  await r2Bucket.put(fileName, imageBuffer, {
    httpMetadata: {
      contentType: 'image/png'
    }
  });

  console.log('Image uploaded to R2:', fileName);

  return `${publicUrl}/${fileName}`;
}

// ============================================
// Database Operations
// ============================================

async function getPendingCards(sql: ReturnType<typeof neon>, deckId: string): Promise<PendingCard[]> {
  // Query cards by deck_id through deck_cards junction table, filtering by generation_status
  const result = await sql`
    SELECT c.id, c.cost, c.element, c.problem_category
    FROM cards c
    INNER JOIN deck_cards dc ON c.id = dc.card_id
    WHERE dc.deck_id = ${deckId}::uuid
      AND c.generation_status = 'pending'
    ORDER BY c.cost ASC
  `;
  return result as PendingCard[];
}

async function updateCard(
  sql: ReturnType<typeof neon>,
  cardId: string,
  data: {
    name: string;
    description: string;
    flavorText?: string;
    imageUrl: string;
    imagePrompt: string;
    problemCategory: string;
    problemHints: ProblemHints;
    tags: string[];
    rarity?: Rarity;
    power?: number;
    defense?: number;
  }
) {
  await sql`
    UPDATE cards
    SET name = ${data.name},
        description = ${data.description},
        flavor_text = ${data.flavorText || null},
        image_url = ${data.imageUrl},
        image_prompt = ${data.imagePrompt},
        problem_category = ${data.problemCategory}::problem_category,
        problem_hints = ${JSON.stringify(data.problemHints)}::jsonb,
        tags = ${JSON.stringify(data.tags)}::jsonb,
        rarity = ${data.rarity || 'common'},
        power = COALESCE(${data.power}, power),
        defense = COALESCE(${data.defense}, defense),
        generation_status = 'completed',
        generation_error = NULL
    WHERE id = ${cardId}::uuid
  `;
}

async function markCardFailed(sql: ReturnType<typeof neon>, cardId: string, error: string) {
  await sql`
    UPDATE cards
    SET generation_status = 'failed',
        generation_error = ${error.substring(0, 500)}
    WHERE id = ${cardId}::uuid
  `;
}

async function finalizeDeck(
  sql: ReturnType<typeof neon>,
  deckId: string,
  userId: string,
  errorCount: number
) {
  const status = errorCount > 0 ? 'completed_with_errors' : 'completed';

  await sql`
    UPDATE decks
    SET status = ${status},
        error_count = ${errorCount},
        completed_at = NOW()
    WHERE id = ${deckId}::uuid
  `;

  // Mark onboarding complete
  await sql`
    UPDATE users
    SET has_completed_onboarding = true
    WHERE id = ${userId}
  `;

  console.log(`Deck ${deckId} finalized with status: ${status}`);
}

// ============================================
// Main Orchestration Logic
// ============================================

// Max cards to process per invocation
// Set to 20 to process all cards in one call (self-chaining doesn't work due to CF Workers limitation)
const CARDS_PER_BATCH = 20;

async function generateDeck(
  env: Env,
  ctx: ExecutionContext,
  userId: string,
  theme: string,
  deckId: string,
  workerUrl: string,
  authSecret?: string
): Promise<{ success: number; failed: number; remaining: number }> {
  const sql = neon(env.DATABASE_URL);

  console.log(`Starting deck generation: ${deckId} for user ${userId} with theme ${theme}`);

  // Get pending cards by deckId (more reliable than by userId)
  const pendingCards = await getPendingCards(sql, deckId);

  if (pendingCards.length === 0) {
    console.log('No pending cards found - deck complete');
    // Ensure deck is finalized
    await finalizeDeck(sql, deckId, userId, 0);
    return { success: 0, failed: 0, remaining: 0 };
  }

  console.log(`Found ${pendingCards.length} pending cards to generate`);

  // Calculate how many cards have already been completed (for rarity assignment)
  const completedCount = 20 - pendingCards.length; // Assuming 20 card deck

  let successCount = 0;
  let errorCount = 0;

  // Process only CARDS_PER_BATCH cards to stay within CPU limits
  const cardsToProcess = pendingCards.slice(0, CARDS_PER_BATCH);
  const remainingAfter = pendingCards.length - cardsToProcess.length;

  for (let i = 0; i < cardsToProcess.length; i++) {
    const card = cardsToProcess[i];
    const progress = `[${i + 1}/${pendingCards.length}]`;

    // Determine rarity based on card position in deck
    const cardIndex = completedCount + i;
    const rarity = STARTER_DECK_RARITY_PATTERN[cardIndex % STARTER_DECK_RARITY_PATTERN.length];

    console.log(`${progress} Generating ${rarity} card ID: ${card.id.substring(0, 8)}...`);

    try {
      // 1. Generate card data with AI and rarity
      const cardData = await generateCardWithAI(
        env.AI,
        theme,
        card.element,
        card.cost,
        card.problem_category,
        i,
        pendingCards.length,
        rarity
      );

      console.log(`${progress} Card data: ${cardData.name}`);

      // 2. Generate and upload image
      const imageUrl = await generateAndUploadImage(
        env.AI,
        env.CARD_IMAGES,
        env.R2_PUBLIC_URL,
        cardData.imagePrompt,
        cardData.element
      );

      console.log(`${progress} Image: ${imageUrl.substring(0, 50)}...`);

      // 3. Update card in database with rarity and scaled stats
      await updateCard(sql, card.id, {
        name: cardData.name,
        description: cardData.description,
        flavorText: cardData.flavorText,
        imageUrl,
        imagePrompt: cardData.imagePrompt,
        problemCategory: cardData.problemCategory,
        problemHints: cardData.problemHints,
        tags: cardData.tags,
        rarity,
        power: cardData.power,
        defense: cardData.defense
      });

      successCount++;
      console.log(`${progress} SUCCESS: ${cardData.name}`);

      // Small delay between cards
      if (i < cardsToProcess.length - 1) {
        await sleep(500);
      }

    } catch (error) {
      errorCount++;
      console.error(`${progress} FAILED:`, error);

      await markCardFailed(sql, card.id, String(error));
    }
  }

  console.log(`Batch complete: ${successCount} success, ${errorCount} failed, ${remainingAfter} remaining`);

  // If there are more cards, trigger self-chain using ctx.waitUntil
  if (remainingAfter > 0) {
    console.log(`Triggering self-chain for ${remainingAfter} remaining cards...`);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authSecret) {
      headers['Authorization'] = `Bearer ${authSecret}`;
    }

    // Use ctx.waitUntil to ensure the fetch completes
    // Add a small delay to avoid rate limiting
    ctx.waitUntil(
      sleep(500).then(() =>
        fetch(workerUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ userId, theme, deckId })
        })
          .then(res => {
            console.log(`Self-chain response: ${res.status}`);
            return res.json();
          })
          .then(data => console.log('Self-chain data:', JSON.stringify(data)))
          .catch(err => console.error('Self-chain fetch failed:', err))
      )
    );
  } else {
    // All cards processed, finalize deck
    console.log('All cards processed, finalizing deck...');
    await finalizeDeck(sql, deckId, userId, errorCount);
  }

  return { success: successCount, failed: errorCount, remaining: remainingAfter };
}

// ============================================
// Booster Generation Logic
// ============================================

function generateBoosterCards(themes?: string[]): BoosterCard[] {
  const cards: BoosterCard[] = [];
  const elements: ('Fire' | 'Water' | 'Earth' | 'Air')[] = ['Fire', 'Water', 'Earth', 'Air'];
  const categories: ('Math' | 'Logic' | 'Science')[] = ['Math', 'Logic', 'Science'];

  // Select themes for this booster (prefer passed themes, otherwise random from BOOSTER_THEMES)
  const availableThemes = themes && themes.length > 0
    ? themes.filter(t => THEME_CONFIG[t])
    : BOOSTER_THEMES;

  // Shuffle themes to get variety
  const shuffledThemes = shuffleArray(availableThemes);

  for (const slot of BOOSTER_CONFIG.rarityDistribution) {
    for (let i = 0; i < slot.count; i++) {
      // Cycle through themes for variety
      const themeIndex = cards.length % shuffledThemes.length;
      const theme = shuffledThemes[themeIndex];

      // Random cost within range
      const cost = Math.floor(Math.random() * (slot.costRange[1] - slot.costRange[0] + 1)) + slot.costRange[0];

      // Random element and category
      const element = pickRandom(elements);
      const category = pickRandom(categories);

      // Determine rarity (handle rare_or_higher slot)
      let rarity: Rarity;
      if (slot.rarity === 'rare_or_higher') {
        // 70% rare, 20% epic, 10% legendary
        const roll = Math.random();
        const rareChance = (slot as { rareChance?: number }).rareChance ?? 0.70;
        const epicChance = (slot as { epicChance?: number }).epicChance ?? 0.20;
        if (roll < rareChance) {
          rarity = 'rare';
        } else if (roll < rareChance + epicChance) {
          rarity = 'epic';
        } else {
          rarity = 'legendary';
        }
      } else {
        rarity = slot.rarity as Rarity;
      }

      cards.push({
        theme,
        element,
        cost,
        rarity,
        problemCategory: category
      });
    }
  }

  return shuffleArray(cards); // Shuffle final order
}

async function generateBooster(
  env: Env,
  userId: string,
  requestedThemes?: string[]
): Promise<{ cards: CardData[]; themes: string[]; dynamicTheme?: DynamicThemeConfig }> {
  const sql = neon(env.DATABASE_URL);

  console.log(`🎁 Generating booster pack for user ${userId}`);

  let dynamicTheme: DynamicThemeConfig | undefined;
  let themesToUse: string[] | undefined = requestedThemes;

  // If no specific themes requested, generate a dynamic theme with AI
  if (!requestedThemes || requestedThemes.length === 0) {
    console.log(`🎨 No themes specified, generating dynamic theme with AI...`);
    dynamicTheme = await generateDynamicTheme(env.AI);

    // Add dynamic theme to THEME_CONFIG temporarily
    THEME_CONFIG[dynamicTheme.id] = {
      keywords: dynamicTheme.keywords,
      contextType: dynamicTheme.contextType,
      subCategories: dynamicTheme.subCategories,
      defaultElement: dynamicTheme.defaultElement,
      nameExamples: dynamicTheme.nameExamples,
    };

    themesToUse = [dynamicTheme.id];
    console.log(`🎨 Using dynamic theme: "${dynamicTheme.displayName}" (${dynamicTheme.id})`);
  }

  // Generate booster card specifications
  const boosterSpecs = generateBoosterCards(themesToUse);
  const themesUsed = [...new Set(boosterSpecs.map(c => c.theme))];

  console.log(`📦 Booster themes: ${themesUsed.join(', ')}`);

  const generatedCards: CardData[] = [];

  for (let i = 0; i < boosterSpecs.length; i++) {
    const spec = boosterSpecs[i];
    console.log(`[${i + 1}/${boosterSpecs.length}] Generating ${spec.rarity} ${spec.theme} card...`);

    try {
      // Generate card data with rarity
      const cardData = await generateCardWithAI(
        env.AI,
        spec.theme,
        spec.element,
        spec.cost,
        spec.problemCategory,
        i,
        boosterSpecs.length,
        spec.rarity
      );

      // Generate and upload image
      const imageUrl = await generateAndUploadImage(
        env.AI,
        env.CARD_IMAGES,
        env.R2_PUBLIC_URL,
        cardData.imagePrompt,
        cardData.element
      );

      // Create card in database
      const cardResult = await sql`
        INSERT INTO cards (
          name, description, flavor_text, cost, power, defense,
          element, problem_category, image_url, image_prompt, rarity,
          theme, generation_status, tags, problem_hints, created_by_id
        ) VALUES (
          ${cardData.name},
          ${cardData.description},
          ${cardData.flavorText || ''},
          ${cardData.cost},
          ${cardData.power},
          ${cardData.defense},
          ${cardData.element},
          ${cardData.problemCategory},
          ${imageUrl},
          ${cardData.imagePrompt},
          ${spec.rarity},
          ${spec.theme},
          'completed',
          ${JSON.stringify(cardData.tags)},
          ${JSON.stringify(cardData.problemHints)},
          ${userId}
        )
        RETURNING id
      `;

      // Assign card to user
      await sql`
        INSERT INTO user_cards (user_id, card_id)
        VALUES (${userId}, ${cardResult[0].id})
      `;

      // Add rarity to cardData before pushing
      cardData.rarity = spec.rarity;
      generatedCards.push(cardData);
      console.log(`[${i + 1}/${boosterSpecs.length}] ✅ ${cardData.name} (${spec.rarity})`);

      // Small delay between cards
      if (i < boosterSpecs.length - 1) {
        await sleep(300);
      }

    } catch (error) {
      console.error(`[${i + 1}/${boosterSpecs.length}] ❌ Failed:`, error);
      // Continue with next card on failure
    }
  }

  console.log(`🎁 Booster complete: ${generatedCards.length}/${boosterSpecs.length} cards generated`);

  return {
    cards: generatedCards,
    themes: themesUsed,
    dynamicTheme
  };
}

// ============================================
// Worker Entry Point
// ============================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Handle GET requests for listing themes
    if (request.method === 'GET') {
      const url = new URL(request.url);

      if (url.pathname === '/themes') {
        return new Response(
          JSON.stringify({
            starterThemes: ['technomancer', 'nature', 'arcane'],
            boosterThemes: BOOSTER_THEMES,
            allThemes: ALL_THEMES
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // Validate authorization
    if (env.ORCHESTRATOR_SECRET) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${env.ORCHESTRATOR_SECRET}`) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }
    }

    // Parse URL for routing
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ========================
      // BOOSTER ENDPOINT: /booster
      // ========================
      if (path === '/booster') {
        const body = await request.json() as BoosterRequest;
        const { userId, themes } = body;

        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'Missing required field: userId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`🎁 Booster request for user ${userId}, themes: ${themes?.join(', ') || 'AI-generated'}`);

        // Generate booster synchronously (5 cards is fast enough)
        const result = await generateBooster(env, userId, themes);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Booster pack generated',
            cardsGenerated: result.cards.length,
            themes: result.themes,
            // Include dynamic theme info if AI-generated
            dynamicTheme: result.dynamicTheme ? {
              id: result.dynamicTheme.id,
              displayName: result.dynamicTheme.displayName,
              keywords: result.dynamicTheme.keywords,
              element: result.dynamicTheme.defaultElement
            } : undefined,
            cards: result.cards.map(c => ({
              name: c.name,
              element: c.element,
              cost: c.cost,
              power: c.power,
              defense: c.defense,
              rarity: c.rarity
            }))
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ========================
      // DECK ENDPOINT: / (root)
      // ========================
      const body = await request.json() as DeckGenerationRequest;
      const { userId, theme, deckId } = body;

      if (!userId || !theme || !deckId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: userId, theme, deckId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use hardcoded worker URL for self-chaining (url.origin can fail in CF Workers)
      const workerUrl = 'https://mindspark-deck-orchestrator.agusmontoya.workers.dev';

      // Use waitUntil to process in background
      ctx.waitUntil(
        generateDeck(env, ctx, userId, theme, deckId, workerUrl, env.ORCHESTRATOR_SECRET)
          .then(result => {
            console.log(`Batch complete: ${result.success} success, ${result.failed} failed, ${result.remaining} remaining`);
          })
          .catch(error => {
            console.error('Deck generation failed:', error);
          })
      );

      // Return immediately
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Deck generation started',
          deckId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error', details: String(error) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};
