
import fs from 'fs';
import path from 'path';

// Load env vars
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
}

async function main() {
  const { stackServerApp } = await import("../src/lib/stack");

  console.log("Keys of stackServerApp:", Object.keys(stackServerApp));
  console.log("Prototype keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(stackServerApp)));

  // Check for specific likely names
  const likelyNames = ["handler", "handleRequest", "api", "router", "middleware", "next"];
  likelyNames.forEach(name => {
    // @ts-ignore
    console.log(`Has ${name}:`, !!stackServerApp[name]);
  });
  // @ts-ignore
  console.log("stackServerApp.urls:", stackServerApp.urls);
  console.log("DATABASE_URL set:", !!process.env.DATABASE_URL);
}

main();
