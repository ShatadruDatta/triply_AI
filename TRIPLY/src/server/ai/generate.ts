import { NonRetriableError } from 'inngest';

import type { TripInput } from '@/features/trips/schema';
import { log, span } from '@/server/sentry';

import { generateWithGemini } from './gemini';
import { generateWithOpenAI } from './openai';
import { buildTripPrompt } from './prompt';
import { tripPlanJsonSchema, tripPlanSchema, type TripPlan } from './schema';

export type AiProvider = 'openai' | 'gemini';

// Tries the preferred provider first (OpenAI unless an experiment says otherwise); if it is
// missing or fails, falls back to the other one when its key is set.
// `jsonSchema` describes the JSON to return.
async function requestStructuredText(
  prompt: ReturnType<typeof buildTripPrompt>,
  jsonSchema: Record<string, unknown>,
  preferred: AiProvider,
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!openaiKey && !geminiKey) {
    throw new NonRetriableError('OPENAI_API_KEY or GEMINI_API_KEY is not set on the server.');
  }

  const providers: { name: AiProvider; run: () => Promise<string> }[] = [];
  if (openaiKey) {
    providers.push({
      name: 'openai',
      run: () =>
        span('OpenAI structured generation', 'ai.run', { provider: 'openai' }, () =>
          generateWithOpenAI(openaiKey, prompt, jsonSchema),
        ),
    });
  }
  if (geminiKey) {
    providers.push({
      name: 'gemini',
      run: () =>
        span('Gemini structured generation', 'ai.run', { provider: 'gemini' }, () =>
          generateWithGemini(geminiKey, prompt, jsonSchema),
        ),
    });
  }
  providers.sort((a, b) => Number(b.name === preferred) - Number(a.name === preferred));

  for (const [index, provider] of providers.entries()) {
    try {
      return await provider.run();
    } catch (error) {
      const isLast = index === providers.length - 1;
      log.error(`${provider.name} failed`, {
        error: error instanceof Error ? error.message : String(error),
        fallback: !isLast,
      });
      if (isLast) throw error;
    }
  }
  throw new Error('No AI provider is available.');
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

export async function generateTripPlan(
  input: TripInput,
  lat: number | null,
  preferred: AiProvider = 'openai',
): Promise<TripPlan> {
  const prompt = buildTripPrompt(input, lat);
  try {
    return parsePlan(await requestStructuredText(prompt, tripPlanJsonSchema(), preferred), input);
  } catch (error) {
    if (error instanceof NonRetriableError) throw error;
    // Models occasionally return a plan that breaks a rule; one fresh try usually fixes it.
    log.warn('AI plan rejected, retrying once', {
      error: error instanceof Error ? error.message.slice(0, 200) : String(error),
    });
    return parsePlan(await requestStructuredText(prompt, tripPlanJsonSchema(), preferred), input);
  }
}
