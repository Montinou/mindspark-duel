import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.warn("R2 environment variables are missing. Image upload will fail.");
}

const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
});

export async function uploadImage(imageBuffer: Buffer, fileName: string, contentType: string = "image/png"): Promise<string> {
  if (!R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    throw new Error("R2 configuration missing");
  }

  try {
    await S3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName,
        Body: imageBuffer,
        ContentType: contentType,
      })
    );

    return `${R2_PUBLIC_URL}/${fileName}`;
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw error;
  }
}
