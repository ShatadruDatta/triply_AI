import { useMutation } from '@tanstack/react-query';

import { useApi } from '@/lib/api';

import type { AssistantReply, ChatRequest } from './schema';

export function useAssistantReply() {
  const api = useApi();
  return useMutation({
    mutationFn: async (body: ChatRequest) =>
      (await api<{ reply: AssistantReply }>('/api/assistant', { method: 'POST', body })).reply,
  });
}

// Sends a recorded voice clip to the server and gets the spoken text back.
export function useTranscribe() {
  const api = useApi();
  return useMutation({
    mutationFn: async (uri: string) => {
      const form = new FormData();
      // React Native's FormData accepts a { uri, name, type } descriptor for files.
      form.append('file', { uri, name: 'voice.m4a', type: 'audio/m4a' } as unknown as Blob);
      return (await api<{ text: string }>('/api/assistant/transcribe', { method: 'POST', body: form })).text;
    },
  });
}
