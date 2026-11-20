import { StatusBar } from "expo-status-bar";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { strings } from "@/lib/strings";
import { colors } from "@/lib/theme";

import { ApiError } from "@/lib/api";
import { reportClientError } from "@/lib/report-error";

import {
  greetingMessage,
  messageForHistory,
  newConversationKey,
  newMessage,
  suggestions,
  transcript,
  type ChatMessage,
  type Suggestion,
} from "./data";
import { BotAvatar, Message, TypingIndicator } from "./messages";
import { useAssistantReply } from "./queries";
import { useVoiceInput, type VoiceState } from "./use-voice-input";
import { MAX_HISTORY, MAX_MESSAGE_CHARS } from "./schema";

const chipShadow = { boxShadow: "0 3px 10px rgba(15, 23, 42, 0.07)" } as const;

function Icon({ name, size, tint, rotate }: { name: SFSymbol; size: number; tint: string; rotate?: string }) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={tint}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size, transform: rotate ? [{ rotate }] : undefined }}
    />
  );
}

function RoundButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: SFSymbol;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      className={`h-[36px] w-[36px] items-center justify-center rounded-full bg-[#F1EEEE] ${disabled ? "opacity-40" : ""}`}
    >
      <Icon name={icon} size={17} tint={colors.navy} />
    </Pressable>
  );
}

function Header({
  top,
  canClear,
  onShare,
  onClear,
}: {
  top: number;
  canClear: boolean;
  onShare: () => void;
  onClear: () => void;
}) {
  return (
    <View style={{ paddingTop: top - 22 }}>
      <View className="flex-row items-center gap-[3px] px-[22px]">
        <Icon name="paperplane.fill" size={20} tint={colors.navy} />
        <Text className="text-[15.5px] font-bold text-brand-navy">{strings.appName}</Text>
      </View>
      <View className="mt-[6px] flex-row items-center pl-[19px] pr-[16.5px]">
        <BotAvatar size={49} />
        <View className="ml-[10.5px] flex-1">
          <View className="flex-row items-center gap-[6px]">
            <Text accessibilityRole="header" className="text-[19px] font-bold text-brand-navy">
              {strings.assistant.title}
            </Text>
            <Icon name="sparkles" size={27} tint={colors.coral} />
          </View>
          <Text className="mt-[1px] text-[10.7px] text-brand-slate">{strings.assistant.subtitle}</Text>
        </View>
        <View className="-mt-[7px] flex-row gap-[9.5px]">
          <RoundButton icon="square.and.arrow.up" label={strings.assistant.share} onPress={onShare} disabled={!canClear} />
          <RoundButton icon="trash" label={strings.assistant.clear} onPress={onClear} disabled={!canClear} />
        </View>
      </View>
    </View>
  );
}

function Chip({
  suggestion,
  onPress,
  disabled,
}: {
  suggestion: Suggestion;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={suggestion.label}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      className={`${disabled ? "opacity-50" : ""} h-[31px] flex-row items-center gap-[7px] rounded-full bg-white px-[13px]`}
      style={chipShadow}
    >
      <Icon name={suggestion.icon} size={13} tint={colors.navy} rotate={suggestion.rotate} />
      <Text className="text-[9.6px] text-brand-navy">
        {suggestion.label}
      </Text>
    </Pressable>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  busy,
  voice,
  onVoice,
}: {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  busy: boolean;
  voice: VoiceState;
  onVoice: () => void;
}) {
  const canSend = value.trim().length > 0 && !busy && voice === "idle";
  const recording = voice === "recording";
  return (
    <View className="flex-row items-center gap-[8px] pl-[17px] pr-[17px]">
      <View
        className="h-[40px] flex-1 flex-row items-center rounded-full bg-white pl-[3px] pr-3"
        style={chipShadow}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.assistant.send}
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={onSend}
          hitSlop={6}
          className={`h-[32px] w-[32px] items-center justify-center rounded-full ${canSend ? "bg-brand-coral" : "bg-[#FDE4DE]"}`}
        >
          <Icon
            name={canSend ? "arrow.up" : "sparkles"}
            size={canSend ? 15 : 18}
            tint={canSend ? colors.white : colors.coral}
          />
        </Pressable>
        <TextInput
          accessibilityLabel={strings.assistant.inputPlaceholder}
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSend}
          placeholder={
            recording
              ? strings.assistant.listening
              : voice === "transcribing"
                ? strings.assistant.transcribing
                : strings.assistant.inputPlaceholder
          }
          placeholderTextColor={recording ? colors.coral : colors.gray}
          selectionColor={colors.coral}
          returnKeyType="send"
          maxLength={MAX_MESSAGE_CHARS}
          editable={!busy && voice === "idle"}
          className="ml-[7px] h-full flex-1 text-[11px] text-brand-navy"
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          recording
            ? strings.assistant.voiceStop
            : voice === "transcribing"
              ? strings.assistant.voiceBusy
              : strings.assistant.voice
        }
        accessibilityState={{ selected: recording, busy: voice === "transcribing", disabled: busy }}
        disabled={busy || voice === "transcribing"}
        onPress={onVoice}
        hitSlop={6}
        className={`h-[36px] w-[36px] items-center justify-center rounded-full ${recording ? "bg-brand-coral" : "bg-white"} ${busy ? "opacity-50" : ""}`}
        style={chipShadow}
      >
        {voice === "transcribing" ? (
          <ActivityIndicator size="small" color={colors.coral} />
        ) : (
          <Icon name={recording ? "stop.fill" : "mic"} size={recording ? 14 : 18} tint={recording ? colors.white : colors.navy} />
        )}
      </Pressable>
    </View>
  );
}

function RetryRow({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="flex-row items-center gap-[7px] pl-[52px] pr-4">
      <Text className="flex-shrink text-[10.5px] text-brand-error">{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.assistant.retry}
        onPress={onRetry}
        hitSlop={10}
        className="h-[26px] justify-center rounded-full bg-white px-3"
        style={chipShadow}
      >
        <Text className="text-[10.5px] font-semibold text-brand-coral">{strings.assistant.retry}</Text>
      </Pressable>
    </View>
  );
}

export function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [greetingMessage()]);
  // Why the last request failed, or null when it did not.
  const [failure, setFailure] = useState<"network" | "server" | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  // Bumped on clear so a reply that arrives after the chat was cleared is dropped.
  const conversationId = useRef(0);
  // Sent with every request so Sentry groups the turns of one chat; renewed on clear.
  const conversationKey = useRef(newConversationKey());
  const reply = useAssistantReply();
  // Spoken text is added to whatever is already typed.
  const voice = useVoiceInput((text) => setDraft((current) => (current ? `${current} ${text}` : text)));

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () =>
      setKeyboardOpen(true),
    );
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () =>
      setKeyboardOpen(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const busy = reply.isPending;
  const hasConversation = messages.length > 1;

  const ask = (history: ChatMessage[]) => {
    const id = conversationId.current;
    setFailure(null);
    const payload = history
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, text: messageForHistory(m).slice(0, MAX_MESSAGE_CHARS) }));
    reply.mutate({ messages: payload, conversationId: conversationKey.current }, {
      onSuccess: (data) => {
        if (id !== conversationId.current) return;
        setMessages((current) => [
          ...current,
          newMessage("assistant", data.text, {
            destinations: data.destinations,
            closing: data.closing,
            followUp: data.followUp,
          }),
        ]);
      },
      onError: (error) => {
        if (id !== conversationId.current) return;
        // Network and 4xx problems are the user's to fix; anything else is reported.
        if (!(error instanceof ApiError) || error.status >= 500) reportClientError(error);
        setFailure(error instanceof ApiError && error.status === 0 ? "network" : "server");
      },
    });
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next = [...messages, newMessage("user", trimmed)];
    setMessages(next);
    setDraft("");
    ask(next);
  };

  const clear = () => {
    conversationId.current += 1;
    conversationKey.current = newConversationKey();
    reply.reset();
    setFailure(null);
    setDraft("");
    setMessages([greetingMessage()]);
  };

  const share = () => {
    Share.share({ message: transcript(messages) }).catch(reportClientError);
  };

  const showTyping = busy;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-brand-canvas"
    >
      <StatusBar style="dark" />
      <Header top={insets.top} canClear={hasConversation} onShare={share} onClear={clear} />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(message) => message.id}
        renderItem={({ item }) => <Message message={item} onSelectDestination={(name) => send(strings.assistant.tellMeMore(name))} />}
        ItemSeparatorComponent={() => <View className="h-[3px]" />}
        ListFooterComponent={
          showTyping ? (
            <View className="pt-[8px]">
              <TypingIndicator />
            </View>
          ) : failure ? (
            <View className="pt-[8px]">
              <RetryRow
                message={failure === "network" ? strings.assistant.errorNetwork : strings.assistant.errorServer}
                onRetry={() => ask(messages)}
              />
            </View>
          ) : null
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        contentContainerClassName="pt-[10px] pb-3"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        className="flex-1"
      />
      {keyboardOpen ? null : (
        <View className="flex-row flex-wrap gap-x-[9.5px] gap-y-[6px] pl-[21px] pr-[16px] pb-[17px]">
          {suggestions.map((suggestion) => (
            <Chip
              key={suggestion.id}
              suggestion={suggestion}
              disabled={busy}
              onPress={() => send(suggestion.prompt)}
            />
          ))}
        </View>
      )}
      {/* iOS draws the floating tab bar over the screen; Android's native tabs reserve the space. */}
      <View style={{ paddingBottom: keyboardOpen ? 8 : Platform.OS === "ios" ? insets.bottom + 12 : 14 }}>
        <Composer
          value={draft}
          onChange={setDraft}
          onSend={() => send(draft)}
          busy={busy}
          voice={voice.state}
          onVoice={voice.toggle}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
