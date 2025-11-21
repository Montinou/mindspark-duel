/**
 * Script de ejemplo para probar la base de datos y las operaciones CRUD
 *
 * Para ejecutar este script:
 * 1. Asegúrate de que el .env.local esté configurado con DATABASE_URL
 * 2. Ejecuta: npm run db:test
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/db';
import { users, cards, userCards } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function testDatabase() {
  console.log('🚀 Iniciando pruebas de base de datos...\n');

  try {
    // 1. Crear un usuario de prueba
    console.log('1️⃣ Creando usuario de prueba...');
    const [newUser] = await db
      .insert(users)
      .values({
        id: `test-user-${Date.now()}`,
        name: 'Test Player',
        email: `test-${Date.now()}@example.com`,
      })
      .returning();

    console.log('✅ Usuario creado:', newUser);
    console.log('   ID:', newUser.id);
    console.log('   Email:', newUser.email, '\n');

    // 2. Crear una carta de prueba
    console.log('2️⃣ Creando carta de prueba...');
    const [newCard] = await db
      .insert(cards)
      .values({
        name: 'Fire Dragon',
        description: 'A powerful dragon that breathes fire',
        cost: 5,
        power: 8,
        defense: 6,
        element: 'Fire',
        problemCategory: 'Math',
        imageUrl: 'https://placeholder.com/dragon.png',
        createdById: newUser.id,
      })
      .returning();

    console.log('✅ Carta creada:', newCard);
    console.log('   ID:', newCard.id);
    console.log('   Name:', newCard.name);
    console.log('   Stats:', `${newCard.power}/${newCard.defense}, Cost: ${newCard.cost}`, '\n');

    // 3. Asignar la carta al usuario
    console.log('3️⃣ Asignando carta al usuario...');
    const [assignment] = await db
      .insert(userCards)
      .values({
        userId: newUser.id,
        cardId: newCard.id,
      })
      .returning();

    console.log('✅ Carta asignada:', assignment);
    console.log('   User ID:', assignment.userId);
    console.log('   Card ID:', assignment.cardId, '\n');

    // 4. Obtener todas las cartas del usuario
    console.log('4️⃣ Obteniendo cartas del usuario...');
    const userCardsData = await db
      .select({
        cardId: cards.id,
        cardName: cards.name,
        power: cards.power,
        defense: cards.defense,
        element: cards.element,
        acquiredAt: userCards.acquiredAt,
      })
      .from(cards)
      .innerJoin(userCards, eq(cards.id, userCards.cardId))
      .where(eq(userCards.userId, newUser.id));

    console.log('✅ Cartas del usuario:', userCardsData);
    console.log(`   Total: ${userCardsData.length} carta(s)\n`);

    // 5. Limpiar datos de prueba
    console.log('5️⃣ Limpiando datos de prueba...');
    await db.delete(userCards).where(eq(userCards.userId, newUser.id));
    await db.delete(cards).where(eq(cards.id, newCard.id));
    await db.delete(users).where(eq(users.id, newUser.id));
    console.log('✅ Datos de prueba eliminados\n');

    console.log('🎉 ¡Todas las pruebas completadas exitosamente!');
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar las pruebas
testDatabase();
