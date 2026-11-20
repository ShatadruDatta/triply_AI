import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { strings } from "@/lib/strings";
import { colors } from "@/lib/theme";

import type { ChatMessage } from "./data";
import type { ReplyDestination } from "./schema";

const botImage = require("@/assets/images/assistant/bot.png");

export function BotAvatar({ size }: { size: number }) {
  return (
    <Image
      source={botImage}
      accessibilityLabel={strings.assistant.title}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
    />
  );
}

function Time({ children, align = "left" }: { children: string; align?: "left" | "right" }) {
  return (
    <Text className={`mt-[5px] text-[8.5px] text-brand-gray ${align === "right" ? "mr-0" : "ml-[2px]"}`}>
      {children}
    </Text>
  );
}

const bubble = "rounded-[16px] bg-[#F1EEEE]";

function BotMessage({
  message,
  onSelectDestination,
}: {
  message: ChatMessage;
  onSelectDestination: (name: string) => void;
}) {
  const destinations = message.destinations ?? [];
  const rich = destinations.length > 0;
  return (
    <View
      className={`flex-row items-start ${rich ? "mt-[5px] gap-[9px] pl-[16.5px] pr-[17px]" : "gap-2 pl-[14px] pr-4"}`}
    >
      <View className="mt-[8px]">
        <BotAvatar size={30} />
      </View>
      <View className={`flex-1 items-start ${rich ? "" : "max-w-[295px]"}`}>
        <View className={`${bubble} ${rich ? "w-full pb-[12px]" : "pb-[9px]"} px-[13px] pt-[9px]`}>
          <Text selectable className="text-[11.9px] leading-[16px] text-brand-navy">
            {message.text}
          </Text>
          {rich ? <DestinationRows destinations={destinations} onSelect={onSelectDestination} /> : null}
          {message.closing ? (
            <Text selectable className="mt-[8px] text-[11.9px] leading-[16px] text-brand-navy">
              {message.closing}
            </Text>
          ) : null}
          {message.followUp ? (
            <Text selectable className="mt-[6px] text-[11.9px] leading-[16px] text-brand-navy">
              {message.followUp}
            </Text>
          ) : null}
        </View>
        <Time>{message.time}</Time>
      </View>
    </View>
  );
}

export function TypingIndicator() {
  return (
    <View
      accessible
      accessibilityLabel={strings.assistant.thinking}
      className="flex-row items-center gap-2 pl-[14px] pr-4"
    >
      <BotAvatar size={30} />
      <View className={`${bubble} h-[34px] justify-center px-[16px]`}>
        <ActivityIndicator size="small" color={colors.gray} />
      </View>
    </View>
  );
}

function UserMessage({ text, time }: { text: string; time: string }) {
  return (
    <View className="items-end pl-16 pr-[16.5px]">
      <View className="rounded-[18px] bg-[#F4573E] px-[15px] py-[9px]">
        <Text selectable className="text-[11.9px] leading-[16px] text-white">{text}</Text>
      </View>
      <View className="mt-[5px] flex-row items-center gap-1">
        <Text className="text-[8.5px] text-brand-gray">{time}</Text>
        <View
          accessible
          accessibilityLabel={strings.assistant.delivered}
          style={{ width: 14, height: 10 }}
        >
          <SymbolView
            name="checkmark"
            size={9}
            weight="bold"
            tintColor="#1FA39A"
            style={{ position: "absolute", left: 0, width: 9, height: 9 }}
          />
          <SymbolView
            name="checkmark"
            size={9}
            weight="bold"
            tintColor="#1FA39A"
            style={{ position: "absolute", left: 5, width: 9, height: 9 }}
          />
        </View>
      </View>
    </View>
  );
}

function DestinationRows({
  destinations,
  onSelect,
}: {
  destinations: ReplyDestination[];
  onSelect: (name: string) => void;
}) {
  return (
    <View className="-mx-[4px] mt-[8px] overflow-hidden rounded-[14px] bg-white/80">
      {destinations.map((destination, index) => (
        <Pressable
          key={destination.name}
          onPress={() => onSelect(destination.name)}
          accessibilityRole="button"
          accessibilityLabel={`${strings.assistant.openDestination}: ${destination.name}`}
          className={`flex-row items-center px-[5px] py-[5px] ${index > 0 ? "border-t border-brand-line/60" : ""}`}
        >
          {destination.imageUrl ? (
            <Image
              source={{ uri: destination.imageUrl }}
              style={{ width: 78, height: 48, borderRadius: 7 }}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View className="h-[48px] w-[78px] items-center justify-center rounded-[7px] bg-brand-mist">
              <SymbolView name="mappin.and.ellipse" size={18} tintColor={colors.gray} style={{ width: 18, height: 18 }} />
            </View>
          )}
          <View className="ml-[12px] flex-1">
            <Text className="-mt-[3px] text-[11.1px] font-bold leading-[16px] text-brand-navy">
              {destination.name}
            </Text>
            <Text className="mt-[1px] text-[9.5px] leading-[13.5px] text-brand-slate">
              {destination.blurb}
            </Text>
          </View>
          <SymbolView
            name="chevron.right"
            size={11}
            weight="semibold"
            tintColor={colors.navy}
            style={{ width: 11, height: 11, marginLeft: 8, marginRight: 8 }}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function Message({
  message,
  onSelectDestination,
}: {
  message: ChatMessage;
  onSelectDestination: (name: string) => void;
}) {
  return message.role === "user" ? (
    <UserMessage text={message.text} time={message.time} />
  ) : (
    <BotMessage message={message} onSelectDestination={onSelectDestination} />
  );
}
