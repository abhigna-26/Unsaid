import Groq from 'groq-sdk';
import { config } from '../config/env';
import { GroqEnrichmentOutput, GroqResponseResult } from '../types/enrichment.types';
import { GroqOutputSchema } from '../validation/enrichment.schema';
import { validateInput } from '../middleware/validation.middleware';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { estimateGroqCostUsd } from '../utils/constants';

function getGroqClient(): Groq {
  const key = process.env.GROQ_API_KEY || config.groqApiKey;
  if (!key && !config.isEmulator) {
    logger.error('GROQ_API_KEY environment variable is not configured');
    throw new AppError('AI_SERVICE_ERROR', 'AI enrichment service is not properly configured.');
  }
  return new Groq({
    apiKey: key || 'dummy_key_for_testing',
  });
}

const SYSTEM_PROMPT = `You are the Thought Catcher AI Enrichment Engine.
Your task is to analyze raw thoughts, voice transcripts, or brain dumps and produce a structured, high-clarity output in JSON format.

You MUST respond ONLY with a single valid JSON object containing exactly these fields:
{
  "title": "A concise, impactful title (3 to 6 words)",
  "type": "Must be one of: actionable_task | idea | journal | meeting_note | question | reference",
  "summary": "A clean, crystal-clear 1 to 2 sentence summary of the thought.",
  "tags": ["3 to 6 lowercase descriptive tags"]
}

Guidelines:
- "actionable_task": The thought implies an action item, todo, or something that needs execution.
- "idea": A creative concept, feature idea, startup thought, or brainstorm.
- "journal": Personal reflections, feelings, stream-of-consciousness, or daily logs.
- "meeting_note": Summaries of conversations, meetings, or discussions with people.
- "question": A problem, dilemma, or question requiring investigation.
- "reference": Facts, bookmarks, recipes, quotes, configurations, or reference material.
- Never output markdown formatting like \`\`\`json or explanation text. Only the raw JSON object.`;

export async function enrichThoughtWithGroq(
  text: string,
  model: string = config.groqModel
): Promise<GroqResponseResult> {
  const startTime = Date.now();
  const groq = getGroqClient();

  const apiKey = process.env.GROQ_API_KEY || config.groqApiKey;
  const isMockKey = !apiKey || apiKey === 'gsk_test_key' || apiKey === 'mock-groq-key' || apiKey === 'dummy_key_for_testing';

  if (config.isEmulator && isMockKey) {
    const duration = Date.now() - startTime;
    return {
      data: {
        title: text.length > 30 ? text.slice(0, 30) + '...' : text,
        type: 'idea',
        summary: `Mock AI summary for: ${text.slice(0, 60)}`,
        tags: ['mock', 'thought-catcher', 'testing'],
      },
      model: 'mock-groq-model',
      durationMs: duration || 5,
      promptTokens: 50,
      completionTokens: 30,
      totalTokens: 80,
      estimatedCostUsd: 0.00005,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.groqTimeoutMs);

    const completion = await groq.chat.completions.create(
      {
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Please enrich this thought:\n\n"${text}"` },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      },
      { signal: controller.signal }
    ).finally(() => clearTimeout(timeoutId));

    const durationMs = Date.now() - startTime;
    const rawContent = completion.choices[0]?.message?.content?.trim();

    if (!rawContent) {
      throw new AppError('AI_SERVICE_ERROR', 'AI service returned an empty response.');
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      logger.error('Failed to parse Groq response as JSON', { rawContentLength: rawContent.length });
      throw new AppError('AI_SERVICE_ERROR', 'Failed to parse AI enrichment output.');
    }

    const validatedData: GroqEnrichmentOutput = validateInput(GroqOutputSchema, parsedJson);

    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;
    const totalTokens = completion.usage?.total_tokens || promptTokens + completionTokens;
    const estimatedCostUsd = estimateGroqCostUsd(model, promptTokens, completionTokens);

    return {
      data: validatedData,
      model,
      durationMs,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;

    const errorMsg = err instanceof Error ? err.message : String(err);

    if (errorMsg.includes('abort') || errorMsg.includes('timeout')) {
      logger.error('Groq AI API call timed out', { timeoutMs: config.groqTimeoutMs });
      throw new AppError('AI_SERVICE_ERROR', 'AI enrichment timed out. Please try again.');
    }

    logger.error('Groq AI API error', {
      error: errorMsg,
      model,
    });

    throw new AppError('AI_SERVICE_ERROR', 'AI enrichment service temporarily unavailable.');
  }
}
