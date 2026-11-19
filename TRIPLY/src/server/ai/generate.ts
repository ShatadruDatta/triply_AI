import { NonRetriableError } from 'inngest';

import type { TripInput } from '@/features/trips/schema';

import { generateWithGemini } from './gemini';
import { generateWithOpenAI } from './openai';
import { buildTripPrompt } from './prompt';
import { tripPlanSchema, type TripPlan } from './schema';

// OpenAI first; if it is missing or fails, fall back to Gemini when that key is set.
async function requestPlanText(prompt: ReturnType<typeof buildTripPrompt>): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!openaiKey && !geminiKey) {
    throw new NonRetriableError('OPENAI_API_KEY or GEMINI_API_KEY is not set on the server.');
  }

  if (openaiKey) {
    try {
      return await generateWithOpenAI(openaiKey, prompt);
    } catch (error) {
      console.error('OpenAI failed:', error instanceof Error ? error.message : error);
      if (!geminiKey) throw error;
    }
  }
  return generateWithGemini(geminiKey!, prompt);
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
    return parsePlan(await requestPlanText(prompt), input);
  } catch (error) {
    if (error instanceof NonRetriableError) throw error;
    // Models occasionally return a plan that breaks a rule; one fresh try usually fixes it.
    console.warn('AI plan rejected, retrying once:', error instanceof Error ? error.message.slice(0, 200) : error);
    return parsePlan(await requestPlanText(prompt), input);
  }
}
