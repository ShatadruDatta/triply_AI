import { z } from 'zod';

// Shared by the app (before sending) and the API route (before calling the AI).
export const MAX_MESSAGE_CHARS = 1000;
export const MAX_HISTORY = 20;

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
});

export const chatRequestSchema = z
  .object({
    messages: z.array(chatMessageSchema).min(1).max(MAX_HISTORY),
    // Random id the app makes for each chat; lets Sentry group the turns of one conversation.
    conversationId: z.string().min(8).max(64).optional(),
  })
  .refine((body) => body.messages.at(-1)?.role === 'user', {
    message: 'The last message must come from the user.',
  });

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export type ReplyDestination = { name: string; blurb: string; imageUrl: string | null };

// What the API returns for one assistant turn.
export type AssistantReply = {
  text: string;
  destinations: ReplyDestination[];
  closing: string | null;
  followUp: string | null;
};
