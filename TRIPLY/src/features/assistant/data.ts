import type { SFSymbol } from "expo-symbols";

import { strings } from "@/lib/strings";

import type { ReplyDestination } from "./schema";

export type Suggestion = {
  id: string;
  label: string;
  prompt: string;
  icon: SFSymbol;
  rotate?: string;
};

const { suggestions: labels, suggestionPrompts: prompts } = strings.assistant;
export const suggestions: Suggestion[] = [
  { id: "flights", label: labels.flights, prompt: prompts.flights, icon: "airplane", rotate: "-45deg" },
  { id: "hotels", label: labels.hotels, prompt: prompts.hotels, icon: "bed.double" },
  { id: "itinerary", label: labels.itinerary, prompt: prompts.itinerary, icon: "mappin" },
  { id: "budget", label: labels.budget, prompt: prompts.budget, icon: "cylinder.split.1x2" },
];

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  destinations?: ReplyDestination[];
  closing?: string | null;
  followUp?: string | null;
};

export function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// A random id for one chat, used only to group its turns in Sentry.
export function newConversationKey() {
  return `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

let nextId = 0;
export function newMessage(
  role: ChatMessage["role"],
  text: string,
  extra: Partial<ChatMessage> = {},
): ChatMessage {
  nextId += 1;
  return { id: `${Date.now()}-${nextId}`, role, text, time: formatTime(new Date()), ...extra };
}

export const greetingMessage = (): ChatMessage => newMessage("assistant", strings.assistant.greeting);

// The text sent to the AI for one message: the destinations it suggested count as context.
export function messageForHistory(message: ChatMessage) {
  return [message.text, message.destinations?.map((d) => d.name).join(", "), message.closing, message.followUp]
    .filter(Boolean)
    .join("\n");
}

export function transcript(messages: ChatMessage[]) {
  const { shareYou, shareAssistant, shareTitle } = strings.assistant;
  const lines = messages.map(
    (m) => `${m.role === "user" ? shareYou : shareAssistant}: ${messageForHistory(m)}`,
  );
  return [shareTitle, "", ...lines].join("\n\n");
}
