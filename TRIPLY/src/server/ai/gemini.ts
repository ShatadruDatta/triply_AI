import { GoogleGenAI } from '@google/genai';

import type { buildTripPrompt } from './prompt';
import { tripPlanJsonSchema } from './schema';

// Override with GEMINI_MODEL to try another model without a code change.
const DEFAULT_MODEL = 'gemini-4-hydrogen';

type Prompt = ReturnType<typeof buildTripPrompt>;

// Gemini refuses schemas with many bounds ("too many states"). Drop them from the copy we send;
// Zod still enforces them when we validate the response.
const BOUND_KEYS = new Set([
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum',
  'minItems', 'maxItems', 'minLength', 'maxLength', 'pattern', 'format',
]);

function stripBounds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripBounds);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !BOUND_KEYS.has(key))
        .map(([key, v]) => [key, stripBounds(v)]),
    );
  }
  return value;
}

export async function generateWithGemini(
  apiKey: string,
  prompt: Prompt,
  jsonSchema: Record<string, unknown> = tripPlanJsonSchema(),
): Promise<string> {
  const client = new GoogleGenAI({ apiKey, httpOptions: { timeout: 45_000 } });
  const interaction = await client.interactions.create({
    model: process.env.GEMINI_MODEL ?? DEFAULT_MODEL,
    system_instruction: prompt.systemInstruction,
    input: prompt.input,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: stripBounds(jsonSchema) as Record<string, unknown>,
    },
  });
  if (!interaction.output_text) throw new Error('Gemini returned an empty response.');
  return interaction.output_text;
}
