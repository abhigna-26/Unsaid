/**
 * Thought Catcher - Groq AI Real Connectivity Verification Script
 * Validates real AI enrichment connectivity through the backend Groq service.
 * NEVER prints or logs API keys.
 */
import * as fs from 'fs';
import * as path from 'path';

// Load local secret if exists
const functionsDir = path.resolve(__dirname, '../functions');
const secretLocalPath = path.join(functionsDir, '.secret.local');

if (fs.existsSync(secretLocalPath)) {
  const secretContent = fs.readFileSync(secretLocalPath, 'utf-8');
  for (const line of secretContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      const val = v.join('=').trim();
      if (k.trim() === 'GROQ_API_KEY' && val) {
        process.env.GROQ_API_KEY = val;
      }
    }
  }
}

async function runGroqVerification() {
  console.log('==================================================');
  console.log('⚡ GROQ AI CONNECTIVITY VERIFICATION');
  console.log('==================================================\n');

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey === 'mock-groq-key' || apiKey === 'dummy_key_for_testing') {
    console.log('⚠️ No real Groq API key found in functions/.secret.local or environment.');
    console.log('To test with a real Groq API key:');
    console.log('1. Open backend/functions/.secret.local (or create it from .secret.local.example)');
    console.log('2. Add: GROQ_API_KEY=your_actual_groq_api_key_here');
    console.log('3. Re-run: npm run verify:groq\n');
    console.log('Note: .secret.local is gitignored and will never be committed or printed.\n');
    process.exit(0);
  }

  console.log('🔑 Groq API key detected (Key is masked for security: [CONFIGURED]).');
  console.log('📡 Sending test enrichment request to Groq API...');

  try {
    // Import backend Groq service
    const { enrichThoughtWithGroq } = await import('../functions/src/services/groq.service');

    const sampleThought =
      'Discussed with the design team: we need to finalize the dark mode palette by Friday, update the button states, and test on OLED screens.';

    const startTime = Date.now();
    const result = await enrichThoughtWithGroq(sampleThought);
    const duration = Date.now() - startTime;

    console.log('\n✅ REAL GROQ ENRICHMENT SUCCEEDED!');
    console.log('--------------------------------------------------');
    console.log(`⏱️ Duration:        ${duration}ms`);
    console.log(`🤖 Model:           ${result.model}`);
    console.log(`📊 Tokens:          ${result.totalTokens} (Prompt: ${result.promptTokens}, Completion: ${result.completionTokens})`);
    console.log(`💵 Estimated Cost:  $${result.estimatedCostUsd.toFixed(6)} USD`);
    console.log('--------------------------------------------------');
    console.log('Structured Output:');
    console.log(`  Title:   "${result.data.title}"`);
    console.log(`  Type:    "${result.data.type}"`);
    console.log(`  Summary: "${result.data.summary}"`);
    console.log(`  Tags:    [${result.data.tags.join(', ')}]`);
    console.log('--------------------------------------------------\n');
    console.log('🎉 Groq service is fully operational and ready for production enrichment.\n');
  } catch (err: any) {
    console.error('\n❌ Groq connectivity test failed:');
    console.error(`Error: ${err.message || String(err)}`);
    console.error('Please verify your Groq API key, account limits, and network connection.\n');
    process.exit(1);
  }
}

runGroqVerification();
