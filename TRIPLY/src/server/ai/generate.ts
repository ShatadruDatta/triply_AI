import { NonRetriableError } from 'inngest';

import type { TripInput } from '@/features/trips/schema';
import { log, span } from '@/server/sentry';

import { generateWithGemini } from './gemini';
import { generateWithOpenAI } from './openai';
import { buildTripPrompt } from './prompt';
import { tripPlanJsonSchema, tripPlanSchema, type TripPlan } from './schema';

// OpenAI first; if it is missing or fails, fall back to Gemini when that key is set.
// `jsonSchema` describes the JSON to return.
async function requestStructuredText(
  prompt: ReturnType<typeof buildTripPrompt>,
  jsonSchema: Record<string, unknown>,
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!openaiKey && !geminiKey) {
    throw new NonRetriableError('OPENAI_API_KEY or GEMINI_API_KEY is not set on the server.');
  }

  if (openaiKey) {
    try {
      return await span('OpenAI structured generation', 'ai.run', { provider: 'openai' }, () =>
        generateWithOpenAI(openaiKey, prompt, jsonSchema),
      );
    } catch (error) {
      log.error('OpenAI failed', {
        error: error instanceof Error ? error.message : String(error),
        fallback_to_gemini: !!geminiKey,
      });
      if (!geminiKey) throw error;
    }
  }
  return span('Gemini structured generation', 'ai.run', { provider: 'gemini' }, () =>
    generateWithGemini(geminiKey!, prompt, jsonSchema),
  );
}

function parsePlan(text: string, input: TripInput): TripPlan {
  const plan = tripPlanSchema.parse(JSON.parse(text));
  const expectedDays = Math.round(
    (Date.parse(input.endDate) - Date.parse(input.startDate)) / 86_400_000 + 1,
  );
  if (plan.days.length !== expectedDays) {
    throw new Error(`The AI returned ${plan.days.length} days, expected ${expectedDays}.`);
  }
  return plan;
}

export async function generateTripPlan(input: TripInput, lat: number | null): Promise<TripPlan> {
  const prompt = buildTripPrompt(input, lat);
  try {
    return parsePlan(await requestStructuredText(prompt, tripPlanJsonSchema()), input);
  } catch (error) {
    if (error instanceof NonRetriableError) throw error;
    // Models occasionally return a plan that breaks a rule; one fresh try usually fixes it.
    log.warn('AI plan rejected, retrying once', {
      error: error instanceof Error ? error.message.slice(0, 200) : String(error),
    });
    return parsePlan(await requestStructuredText(prompt, tripPlanJsonSchema()), input);
  }
}
