# Guía de Generación de Cartas Temáticas - MindSpark Duel

## ✨ Sistema Implementado

### Características Principales

1. **Generación por Lotes Temáticos** (10 cartas por lote)
   - Estilo anime de alta calidad
   - Proporciones Magic the Gathering (2.5" x 3.5")
   - Coherencia visual y narrativa entre cartas

2. **Flavor Text Separado**
   - Texto narrativo temático (flavor text)
   - Descripción de efectos de juego (effect description)
   - Tags temáticos para categorización

3. **Generación Dinámica de Problemas**
   - Problemas generados en tiempo real con Gemini 2.5 Flash (baja latencia)
   - Contextualizados con el tema de la carta
   - No se almacenan en BD, siempre frescos

4. **Almacenamiento en R2**
   - Imágenes subidas automáticamente a Cloudflare R2
   - URLs públicas accesibles
   - Bucket: `mindspark-duel-cards`

---

## 🎨 Estilo Visual de las Cartas

### Prompt Optimizado para Anime

Las imágenes se generan con el siguiente estilo:
- **Calidad**: Studio anime (Ghibli, Makoto Shinkai)
- **Colores**: Vibrantes y saturados
- **Composición**: Vertical portrait, sujeto en los 75% superiores
- **Detalles**: Líneas definidas, iluminación dramática
- **Espacio**: 25% inferior reservado para texto

### Proporciones Magic the Gathering
- **Dimensiones**: 2.5" x 3.5" inches
- **Orientación**: Vertical portrait
- **Formato**: PNG optimizado para cards

---

## 📊 Estructura de Base de Datos

### Tabla `card_batches`
```sql
CREATE TABLE card_batches (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,                -- "Elemental Warriors"
  theme TEXT NOT NULL,               -- "Ancient Elemental Samurai"
  description TEXT,                  -- Descripción del set
  style_guidelines TEXT,             -- Guías de estilo para consistencia
  created_by_id UUID,
  created_at TIMESTAMP
);
```

### Tabla `cards` (Actualizada)
```sql
CREATE TABLE cards (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,         -- Backwards compatibility
  flavor_text TEXT,                  -- ✨ Texto narrativo temático
  effect_description TEXT,           -- ✨ Descripción de mecánicas
  cost INTEGER,
  power INTEGER,
  defense INTEGER,
  element ENUM,
  problem_category ENUM,
  image_url TEXT,                    -- URL en R2
  image_prompt TEXT,                 -- ✨ Para regeneración
  theme TEXT,                        -- ✨ Categoría temática
  tags JSON,                         -- ✨ Array de tags
  batch_id UUID,                     -- ✨ Link al lote
  batch_order INTEGER,               -- ✨ Posición (1-10)
  created_by_id UUID,
  created_at TIMESTAMP
);
```

---

## 🚀 Comandos Disponibles

### Desarrollo
```bash
npm run dev              # Iniciar servidor Next.js
npm run db:studio        # Abrir Drizzle Studio (ver BD)
```

### Base de Datos
```bash
npm run db:generate      # Generar migraciones
npm run db:push          # Aplicar cambios al schema
npm run db:test          # Probar conexión a BD
```

### Generación de Cartas
```bash
npm run generate:sets    # Generar 3 sets iniciales (30 cartas)
npm run r2:test          # Probar subida a R2
```

---

## 📦 API Endpoints

### Generar Lote de Cartas
```http
POST /api/cards/batch
Content-Type: application/json

{
  "batchName": "Dragon Lords",
  "theme": "Ancient Dragon Rulers",
  "themeDescription": "Powerful dragons who ruled the ancient world...",
  "count": 10,
  "difficulty": 6,
  "userId": "optional-user-id"
}
```

**Response:**
```json
{
  "message": "Batch generated successfully",
  "batch": {
    "id": "uuid",
    "name": "Dragon Lords",
    "theme": "Ancient Dragon Rulers",
    "createdAt": "2025-11-20T..."
  },
  "cards": [...],
  "count": 10
}
```

### Obtener Cartas de un Lote
```http
GET /api/cards/batch?batchId=<uuid>
```

**Response:**
```json
{
  "batch": {...},
  "cards": [...],
  "count": 10
}
```

### Generar Problema Dinámico
```http
POST /api/problems
Content-Type: application/json

{
  "cardId": "uuid-of-card"
}
```

**Response:**
```json
{
  "problem": {
    "question": "The dragon Flamecrest guards 48 gold coins...",
    "options": ["6", "8", "12", "18"],
    "correctAnswer": "8",
    "difficulty": 5,
    "themeContext": "Theme: Dragons. Flavor: Ancient guardian...",
    "cardId": "uuid"
  },
  "card": {
    "id": "uuid",
    "name": "Flamecrest",
    "theme": "Dragons"
  }
}
```

---

## 🎯 Sets Iniciales

### 1. Elemental Warriors (10 cartas)
**Tema**: Ancient Elemental Samurai
**Estilo**: Samurais japoneses con poderes elementales
**Dificultad**: 5/10
**Elementos**: Fire, Water, Earth, Air

### 2. Cyber Samurai (10 cartas)
**Tema**: Neo-Tokyo Cyberpunk Samurai
**Estilo**: Fusión de tradición samurai + cyberpunk
**Dificultad**: 6/10
**Colores**: Neon (rosa, cyan, púrpura)

### 3. Mystic Scholars (10 cartas)
**Tema**: Arcane Academy Mages
**Estilo**: Magos jóvenes en academia mágica
**Dificultad**: 4/10
**Ambiente**: Bibliotecas encantadas, efectos mágicos

---

## 🛠️ Generación Manual

Para generar un set personalizado, ejecuta:

```bash
npm run generate:sets
```

O usa la API directamente:

```typescript
import { generateCardBatch } from '@/lib/ai/batch-card-generator';

const result = await generateCardBatch({
  batchName: "My Custom Set",
  theme: "Space Pirates",
  themeDescription: "Intergalactic pirates sailing through nebulas...",
  count: 10,
  difficulty: 5,
});

console.log(`Generated ${result.cards.length} cards!`);
console.log(`Batch ID: ${result.batch.id}`);
```

---

## 🎮 Uso en Gameplay

### Generar Problema Durante Combate

```typescript
// En el componente del juego
const generateProblem = async (cardId: string) => {
  const response = await fetch('/api/problems', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId }),
  });

  const { problem } = await response.json();

  // Mostrar problema al jugador
  setActiveProblem(problem);
};
```

### Verificar Respuesta

```typescript
const checkAnswer = (userAnswer: string, problem: Problem) => {
  if (userAnswer === problem.correctAnswer) {
    // ✅ Respuesta correcta - ejecutar efecto de carta
    console.log('Correct! Card effect activates');
  } else {
    // ❌ Respuesta incorrecta - turno perdido
    console.log('Wrong answer, turn lost');
  }
};
```

---

## 📸 Estructura de una Carta

```typescript
{
  "id": "uuid",
  "name": "Flamecrest, Dragon Lord",
  "flavorText": "Ancient guardian of the Crimson Mountains, keeper of eternal flame.",
  "effectDescription": "Deal 5 damage to target opponent. Draw 1 card if this defeats an enemy card.",
  "cost": 6,
  "power": 8,
  "defense": 6,
  "element": "Fire",
  "problemCategory": "Math",
  "imageUrl": "https://pub-xxx.r2.dev/cards/uuid.png",
  "theme": "Dragons",
  "tags": ["dragon", "fire", "legendary", "ancient"],
  "batchId": "uuid-of-batch",
  "batchOrder": 1
}
```

---

## 🔧 Configuración de R2

### Variables de Entorno (.env.local)
```bash
R2_ACCOUNT_ID="1154ac48d60dfeb452e573ed0be70bd6"
R2_ACCESS_KEY_ID="f4b5a1025db2362bd3cdca47313f8cb0"
R2_SECRET_ACCESS_KEY="e40268d51..."
R2_BUCKET_NAME="mindspark-duel-cards"
R2_PUBLIC_URL="https://pub-71e1e2623d9a4db38bd10a016a818b19.r2.dev"
```

### Verificar R2
```bash
npm run r2:test
```

---

## 📝 Próximos Pasos

1. **Generar Sets Iniciales**
   ```bash
   npm run generate:sets
   ```
   ⏱️ Tomará ~5-10 minutos (30 cartas + imágenes)

2. **Ver Cartas en BD**
   ```bash
   npm run db:studio
   ```

3. **Probar API**
   - GET batch: `http://localhost:3000/api/cards/batch?batchId=<uuid>`
   - POST problem: `http://localhost:3000/api/problems` con `{ "cardId": "uuid" }`

4. **Integrar en UI**
   - Actualizar componente Card para mostrar flavor text
   - Conectar generación de problemas en gameplay
   - Crear galería de sets

---

## 🎨 Ejemplos de Prompts de Imagen

Los prompts generados siguen este formato:

```
Anime-style trading card art, Magic the Gathering card proportions (vertical 2.5x3.5 portrait).
[Subject: Legendary fire dragon with crimson scales and golden horns, breathing flames, majestic pose]
High-quality anime art, vibrant colors, dramatic composition, detailed linework, studio lighting.
Leave bottom 25% empty for text overlay.
Theme: Ancient Dragon Rulers
```

---

## 📊 Estadísticas

- **Total Sets Iniciales**: 3
- **Total Cartas por Set**: 10
- **Total Cartas Generadas**: 30
- **Elementos**: 4 (Fire, Water, Earth, Air)
- **Categorías de Problemas**: 3 (Math, Logic, Science)
- **Rango de Dificultad**: 1-10

---

## 🐛 Troubleshooting

### Problema: Imágenes no se generan
**Solución**: Verificar credenciales R2 en `.env.local`
```bash
npm run r2:test
```

### Problema: Gemini API error
**Solución**: Verificar `GEMINIAI_API_KEY` en `.env.local`

### Problema: Base de datos error
**Solución**: Aplicar migraciones
```bash
npm run db:push -- --force
```

---

¡Todo listo para generar sets de cartas estilo anime con temáticas coherentes! 🎉
