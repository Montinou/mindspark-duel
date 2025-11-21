
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const ENDPOINTS = [
  'https://gateway.ai.vercel.dev/v1/chat/completions',
  'https://gateway.ai.vercel.dev/openai/v1/chat/completions',
];
const MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gpt-3.5-turbo'];

async function testConnection() {
  console.log('🔍 Diagnosing Vercel AI Gateway Connection...');
  console.log(`🔑 API Key present: ${!!AI_GATEWAY_API_KEY}`);
  
  if (!AI_GATEWAY_API_KEY) {
    console.error('❌ AI_GATEWAY_API_KEY is missing');
    return;
  }

  for (const url of ENDPOINTS) {
    console.log(`\nTesting Endpoint: ${url}`);
    for (const model of MODELS) {
      try {
        console.log(`  Testing Model: ${model}`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'user', content: 'Hello, are you working?' }
            ],
            max_tokens: 10
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`  ✅ Success! Status: ${response.status}`);
          console.log(`  Response: ${JSON.stringify(data)}`);
          return; // Stop after first success
        } else {
          console.log(`  ❌ Failed. Status: ${response.status} ${response.statusText}`);
          const text = await response.text();
          console.log(`  Error Body: ${text}`);
        }
      } catch (error: any) {
        console.log(`  ❌ Network/System Error: ${error.message}`);
        if (error.cause) console.log(`  Cause: ${error.cause}`);
      }
    }
  }
}

testConnection();
