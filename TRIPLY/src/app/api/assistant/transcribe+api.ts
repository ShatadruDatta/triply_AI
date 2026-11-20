import { requireSession } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import { transcribeAudio } from '@/server/ai/transcribe';
import { log } from '@/server/sentry';

const MAX_BYTES = 10 * 1024 * 1024;
// React Native does not always send the content type we set, so accept any audio-ish type (or an
// untyped upload) and let OpenAI decide whether the bytes are a usable recording.
const isAudioType = (type: string) => /^(audio\/|video\/mp4$|application\/octet-stream$)/.test(type);

// React Native's global FormData type has no `get`; on the server request.formData() does.
type UploadedFile = { type: string; size: number; name?: string; arrayBuffer(): Promise<ArrayBuffer> };
type ServerFormData = { get(name: string): UploadedFile | string | null };

// Turns a short voice recording into text for the assistant's input field. The audio is sent to
// OpenAI and discarded; nothing is stored.
export const POST = route(async (request: Request) => {
  // Session check only, so this route never touches the database.
  const userId = await requireSession(request);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new HttpError(503, 'ai_not_configured', 'OPENAI_API_KEY is not set on the server.');

  const form = (await request.formData().catch(() => null)) as ServerFormData | null;
  const file = form?.get('file');
  if (!file || typeof file === 'string') throw new HttpError(400, 'invalid_input', 'Record some audio first.');
  if (!isAudioType(file.type)) {
    log.warn('Voice upload rejected', { mime_type: file.type, size_bytes: file.size });
    throw new HttpError(400, 'invalid_audio', 'Unsupported audio format.');
  }
  if (file.size === 0) throw new HttpError(400, 'invalid_audio', 'The recording was empty.');
  if (file.size > MAX_BYTES) throw new HttpError(400, 'audio_too_large', 'That recording is too long.');

  const text = await transcribeAudio(apiKey, {
    bytes: new Uint8Array(await file.arrayBuffer()),
    mimeType: file.type,
    fileName: file.name,
    userId,
  });
  return json({ text });
});
