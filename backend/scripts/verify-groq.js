/**
 * Thought Catcher - Groq AI Real Connectivity Verification Script (Node.js)
 * Validates real AI enrichment connectivity using Groq SDK and the backend's prompt/model logic.
 * NEVER prints or logs API keys.
 */
const fs = require('fs');
const path = require('path');

const functionsDir = path.resolve(__dirname, '../functions');
const secretLocalPath = path.join(functionsDir, '.secret.local');

// Load .secret.local if present
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
    console.log('1. Open backend/functions/.secret.local (or copy from .secret.local.example)');
    console.log('2. Add your Groq API key: GROQ_API_KEY=gsk_...');
    console.log('3. Run: npm run verify:groq\n');
    console.log('Note: .secret.local is gitignored and will never be committed or printed.\n');
    process.exit(0);
  }

  console.log('🔑 Groq API key detected (Key is masked for security: [CONFIGURED]).');
  console.log('📡 Sending test enrichment request to Groq API...');

  try {
    const { Groq } = require(path.join(functionsDir, 'node_modules/groq-sdk'));

    const groq = new Groq({ apiKey });
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

    const SYSTEM_PROMPT = `You are the Thought Catcher AI Enrichment Engine.
Your task is to analyze raw thoughts, voice transcripts, or brain dumps and produce a structured, high-clarity output in JSON format.

You MUST respond ONLY with a single valid JSON object containing exactly these fields:
{
  "title": "A concise, impactful title (3 to 6 words)",
  "type": "Must be one of: actionable_task | idea | journal | meeting_note | question | reference",
  "summary": "A clean, crystal-clear 1 to 2 sentence summary of the thought.",
  "tags": ["3 to 6 lowercase descriptive tags"]
}`;

    const sampleThought =
      'Discussed with the design team: we need to finalize the dark mode palette by Friday, update the button states, and test on OLED screens.';

    const startTime = Date.now();
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Please enrich this thought:\n\n"${sampleThought}"` },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const duration = Date.now() - startTime;
    const rawContent = completion.choices[0]?.message?.content?.trim();
    const parsed = JSON.parse(rawContent);

    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;
    const totalTokens = completion.usage?.total_tokens || promptTokens + completionTokens;

    console.log('\n✅ REAL GROQ ENRICHMENT SUCCEEDED!');
    console.log('--------------------------------------------------');
    console.log(`⏱️ Duration:        ${duration}ms`);
    console.log(`🤖 Model:           ${model}`);
    console.log(`📊 Tokens:          ${totalTokens} (Prompt: ${promptTokens}, Completion: ${completionTokens})`);
    console.log('--------------------------------------------------');
    console.log('Structured AI Output:');
    console.log(`  Title:   "${parsed.title}"`);
    console.log(`  Type:    "${parsed.type}"`);
    console.log(`  Summary: "${parsed.summary}"`);
    console.log(`  Tags:    [${Array.isArray(parsed.tags) ? parsed.tags.join(', ') : ''}]`);
    console.log('--------------------------------------------------\n');
    console.log('🎉 Groq API connectivity is fully verified and operational.\n');
  } catch (err) {
    console.error('\n❌ Groq connectivity test failed:');
    console.error(`Error: ${err.message || String(err)}`);
    console.error('Please verify your Groq API key and network connection.\n');
    process.exit(1);
  }
}

runGroqVerification();
