/**
 * Script de ejemplo para probar la subida de imágenes a R2
 *
 * Para ejecutar este script:
 * 1. Asegúrate de que el .env.local esté configurado con credenciales R2
 * 2. Ejecuta: npm run r2:test
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { uploadImage } from '../storage';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function testR2Upload() {
  console.log('🚀 Iniciando prueba de subida a R2...\n');

  try {
    // 1. Verificar configuración
    console.log('1️⃣ Verificando configuración de R2...');
    const config = {
      accountId: process.env.R2_ACCOUNT_ID,
      bucketName: process.env.R2_BUCKET_NAME,
      publicUrl: process.env.R2_PUBLIC_URL,
      hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
    };

    console.log('✅ Configuración encontrada:');
    console.log('   Account ID:', config.accountId);
    console.log('   Bucket:', config.bucketName);
    console.log('   Public URL:', config.publicUrl);
    console.log('   Access Key configurado:', config.hasAccessKey);
    console.log('   Secret Key configurado:', config.hasSecretKey);
    console.log('');

    if (!config.hasAccessKey || !config.hasSecretKey) {
      throw new Error('❌ Credenciales R2 no configuradas correctamente');
    }

    // 2. Descargar una imagen de prueba
    console.log('2️⃣ Descargando imagen de prueba...');
    const testImageUrl = 'https://image.pollinations.ai/prompt/A%20majestic%20fire%20dragon%20card%20art?width=512&height=512';
    const response = await fetch(testImageUrl);

    if (!response.ok) {
      throw new Error(`Failed to download test image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('✅ Imagen descargada:', buffer.length, 'bytes\n');

    // 3. Subir imagen a R2
    console.log('3️⃣ Subiendo imagen a R2...');
    const key = `test/${Date.now()}-test-card.png`;
    const imageUrl = await uploadImage(buffer, key, 'image/png');

    console.log('✅ Imagen subida exitosamente!');
    console.log('   Key:', key);
    console.log('   URL:', imageUrl);
    console.log('');

    // 4. Verificar que la URL es accesible
    console.log('4️⃣ Verificando acceso a la imagen...');
    const verifyResponse = await fetch(imageUrl);

    if (verifyResponse.ok) {
      console.log('✅ Imagen accesible públicamente');
      console.log('   Status:', verifyResponse.status);
      console.log('   Content-Type:', verifyResponse.headers.get('content-type'));
    } else {
      console.log('⚠️  Imagen subida pero no accesible públicamente');
      console.log('   Status:', verifyResponse.status);
      console.log('   Puede que necesites configurar acceso público en el bucket');
    }
    console.log('');

    console.log('🎉 ¡Prueba de R2 completada exitosamente!');
    console.log('📝 URL de la imagen de prueba:', imageUrl);
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    process.exit(1);
  }
}

// Ejecutar la prueba
testR2Upload();
