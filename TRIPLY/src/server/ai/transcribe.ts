import { z } from 'zod';

import { log, span } from '@/server/sentry';

// Override with OPENAI_TRANSCRIBE_MODEL to try another model without a code change.
const DEFAULT_MODEL = 'gpt-transcribe';

const responseSchema = z.object({ text: z.string() });

const EXTENSIONS: Record<string, string> = {
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
  'audio/3gpp': 'mp4',
  'audio/aac': 'm4a',
};

// Sends one recording to OpenAI's transcription endpoint and returns the text.
export async function transcribeAudio(
  apiKey: string,
  audio: { bytes: Uint8Array<ArrayBuffer>; mimeType: string; fileName?: string; userId: string },
): Promise<string> {
  const startedAt = Date.now();
  const form = new FormData();
  form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL ?? DEFAULT_MODEL);
  // OpenAI picks the decoder from the file extension, so derive it from the upload's own name
  // first, then its type, and fall back to m4a (what the app records).
  const nameExtension = audio.fileName?.match(/\.([a-z0-9]{2,4})$/i)?.[1]?.toLowerCase();
  const extension = nameExtension ?? EXTENSIONS[audio.mimeType] ?? 'm4a';
  const mimeType = audio.mimeType.startsWith('audio/') ? audio.mimeType : 'audio/m4a';
  form.append('file', new Blob([audio.bytes], { type: mimeType }), `voice.${extension}`);

  const response = await span('OpenAI transcription', 'ai.run', { provider: 'openai' }, () =>
    fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    }),
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenAI transcription failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const { text } = responseSchema.parse(await response.json());
  log.info('Voice transcribed', {
    user_id: audio.userId,
    audio_bytes: audio.bytes.byteLength,
    transcript_chars: text.length,
    duration_ms: Date.now() - startedAt,
  });
  return text.trim();
}
