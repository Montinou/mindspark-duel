import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// For scripts running outside Next.js, load .env.local
if (typeof window === 'undefined' && !process.env.R2_ACCOUNT_ID) {
  try {
    const dotenv = require('dotenv');
    const path = require('path');
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  } catch (e) {
    // Silently fail if dotenv not available (Next.js will handle env vars)
  }
}

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const S3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
});

export async function uploadImage(buffer: Buffer, key: string, contentType: string = 'image/png'): Promise<string> {
  if (!R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    throw new Error('R2 configuration missing');
  }

  try {
    await S3.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));

    return `${R2_PUBLIC_URL}/${key}`;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw error;
  }
}
