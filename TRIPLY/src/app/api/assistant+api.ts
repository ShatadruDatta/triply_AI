import { chatRequestSchema, type AssistantReply } from '@/features/assistant/schema';
import { generateAssistantReply } from '@/server/ai/assistant';
import { requireSession } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import { searchPhoto, trackDownload } from '@/server/images';
import { log } from '@/server/sentry';

export const POST = route(async (request: Request) => {
  // Session check only: the chat is not stored, so this route never touches the database.
  const userId = await requireSession(request);

  const parsed = chatRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new HttpError(400, 'invalid_input', parsed.error.issues[0]?.message);
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new HttpError(503, 'ai_not_configured', 'OPENAI_API_KEY is not set on the server.');

  const startedAt = Date.now();
  const reply = await generateAssistantReply(apiKey, parsed.data.messages, parsed.data.conversationId);

  // Small thumbnails for the suggested places; a missing photo is fine.
  const photos = await Promise.all(reply.destinations.map((d) => searchPhoto(`${d.search_query} travel`)));
  await Promise.all(photos.flatMap((photo) => (photo ? [trackDownload(photo)] : [])));

  const body: AssistantReply = {
    text: reply.text,
    destinations: reply.destinations.map((d, i) => ({
      name: d.name,
      blurb: d.blurb,
      imageUrl: photos[i]?.url.replace('w=900', 'w=320') ?? null,
    })),
    closing: reply.closing,
    followUp: reply.follow_up,
  };

  // One wide event per reply.
  log.info('Assistant replied', {
    user_id: userId,
    history_length: parsed.data.messages.length,
    destination_count: body.destinations.length,
    reply_chars: body.text.length,
    duration_ms: Date.now() - startedAt,
  });
  return json({ reply: body });
});
