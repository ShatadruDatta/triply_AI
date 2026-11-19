import type { buildTripPrompt } from './prompt';
import { tripPlanJsonSchema } from './schema';

// Override with OPENAI_MODEL to try another model without a code change.
const DEFAULT_MODEL = 'gpt-4o-mini';

type Prompt = ReturnType<typeof buildTripPrompt>;

type StreamChunk = { choices?: { delta?: { content?: string | null }; finish_reason?: string | null }[] };

// Plain REST call so we don't need a second AI SDK. JSON mode plus the schema in the prompt;
// the caller validates the result with Zod.
//
// The response is streamed on purpose: Expo's API routes use `fetch-nodeshim`, which aborts any
// request whose response headers take longer than 30 s. A non-streamed trip takes 35-80 s to
// generate, but a stream sends its headers straight away.
export async function generateWithOpenAI(apiKey: string, prompt: Prompt): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
      response_format: { type: 'json_object' },
      stream: true,
      messages: [
        {
          role: 'system',
          content: `${prompt.systemInstruction}\n\nRespond with a single JSON object that matches this JSON Schema exactly:\n${JSON.stringify(tripPlanJsonSchema())}`,
        },
        { role: 'user', content: prompt.input },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenAI request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  if (!response.body) throw new Error('OpenAI returned no response body.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let text = '';
  let finishReason: string | null | undefined;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      const choice = (JSON.parse(data) as StreamChunk).choices?.[0];
      text += choice?.delta?.content ?? '';
      finishReason = choice?.finish_reason ?? finishReason;
    }
  }

  if (!text) throw new Error('OpenAI returned an empty response.');
  if (finishReason === 'length') throw new Error('OpenAI cut the response off; the trip is too long.');
  return text;
}
