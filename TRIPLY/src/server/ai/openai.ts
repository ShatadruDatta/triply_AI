import { aiSpan, recordAiContent } from '@/server/sentry';

import type { buildTripPrompt } from './prompt';
import { tripPlanJsonSchema } from './schema';

// Override with OPENAI_MODEL to try another model without a code change.
const DEFAULT_MODEL = 'gpt-4o-mini';

type Prompt = ReturnType<typeof buildTripPrompt>;

type StreamChunk = {
  id?: string;
  model?: string;
  choices?: { delta?: { content?: string | null }; finish_reason?: string | null }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
};

// Plain REST call so we don't need a second AI SDK. JSON mode plus the schema in the prompt;
// the caller validates the result with Zod.
//
// The response is streamed on purpose: Expo's API routes use `fetch-nodeshim`, which aborts any
// request whose response headers take longer than 30 s. A non-streamed trip takes 35-80 s to
// generate, but a stream sends its headers straight away.
export async function generateWithOpenAI(
  apiKey: string,
  prompt: Prompt,
  jsonSchema: Record<string, unknown> = tripPlanJsonSchema(),
  // Names the agent this model call belongs to, so it is grouped under it in Sentry.
  agentName?: string,
): Promise<string> {
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  // One `gen_ai.chat` span per model call. Attributes known up front are set at span start so
  // sampling can use them; the response model, usage and output are added when the stream ends.
  return aiSpan(
    'gen_ai.chat',
    `chat ${model}`,
    {
      'gen_ai.operation.name': 'chat',
      'gen_ai.provider.name': 'openai',
      'gen_ai.request.model': model,
      'gen_ai.response.streaming': true,
      ...(agentName ? { 'gen_ai.agent.name': agentName } : {}),
      ...(recordAiContent
        ? {
            'gen_ai.system_instructions': prompt.systemInstruction,
            'gen_ai.input.messages': JSON.stringify([
              { role: 'user', parts: [{ type: 'text', content: prompt.input }] },
            ]),
          }
        : {}),
    },
    async (chatSpan) => {
      const startedAt = Date.now();
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          stream: true,
          // Makes OpenAI send token counts in the last chunk of the stream.
          stream_options: { include_usage: true },
          messages: [
            {
              role: 'system',
              content: `${prompt.systemInstruction}\n\nRespond with a single JSON object that matches this JSON Schema exactly:\n${JSON.stringify(jsonSchema)}`,
            },
            { role: 'user', content: prompt.input },
          ],
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        chatSpan.setAttribute('error.type', `http_${response.status}`);
        throw new Error(`OpenAI request failed (${response.status}): ${detail.slice(0, 300)}`);
      }
      if (!response.body) throw new Error('OpenAI returned no response body.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      let text = '';
      let finishReason: string | null | undefined;
      let responseModel: string | undefined;
      let responseId: string | undefined;
      let usage: StreamChunk['usage'];
      let firstChunkMs: number | undefined;

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
          const chunk = JSON.parse(data) as StreamChunk;
          const choice = chunk.choices?.[0];
          const content = choice?.delta?.content ?? '';
          if (content && firstChunkMs === undefined) firstChunkMs = Date.now() - startedAt;
          text += content;
          finishReason = choice?.finish_reason ?? finishReason;
          responseModel = chunk.model ?? responseModel;
          responseId = chunk.id ?? responseId;
          usage = chunk.usage ?? usage;
        }
      }

      chatSpan.setAttributes({
        ...(responseModel ? { 'gen_ai.response.model': responseModel } : {}),
        ...(responseId ? { 'gen_ai.response.id': responseId } : {}),
        ...(finishReason ? { 'gen_ai.response.finish_reasons': JSON.stringify([finishReason]) } : {}),
        ...(firstChunkMs !== undefined ? { 'gen_ai.response.time_to_first_chunk': firstChunkMs / 1000 } : {}),
        ...(usage
          ? {
              'gen_ai.usage.input_tokens': usage.prompt_tokens,
              'gen_ai.usage.output_tokens': usage.completion_tokens,
              'gen_ai.usage.total_tokens': usage.total_tokens,
            }
          : {}),
        ...(recordAiContent
          ? {
              'gen_ai.output.messages': JSON.stringify([
                { role: 'assistant', parts: [{ type: 'text', content: text }] },
              ]),
            }
          : {}),
      });

      if (!text) throw new Error('OpenAI returned an empty response.');
      if (finishReason === 'length') {
        throw new Error('OpenAI cut the response off; the response is too long.');
      }
      return text;
    },
  );
}
