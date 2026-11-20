import { StatusBar } from "expo-status-bar";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { reportClientError } from "@/lib/report-error";
import { strings } from "@/lib/strings";
import { colors, gradients } from "@/lib/theme";

import { PageHero } from "./page-hero";

const heroImage = require("@/assets/images/profile/help-hero.png");

const cardShadow = { boxShadow: "0 6px 20px rgba(15, 23, 42, 0.06)" } as const;

type Topic = { id: string; icon: SFSymbol; label: string };

const topics: Topic[] = [
  { id: "trips", icon: "calendar", label: strings.help.topics.trips },
  { id: "bookings", icon: "creditcard", label: strings.help.topics.bookings },
  { id: "account", icon: "person", label: strings.help.topics.account },
  { id: "planner", icon: "sparkles", label: strings.help.topics.planner },
  { id: "privacy", icon: "checkmark.shield", label: strings.help.topics.privacy },
  { id: "features", icon: "square.grid.2x2", label: strings.help.topics.features },
];

function Icon({ name, size, tint }: { name: SFSymbol; size: number; tint: string }) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={tint}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
    />
  );
}

// The topic pages are not written yet, so a tap says so instead of doing nothing.
function openTopic() {
  Alert.alert(strings.profile.comingSoonTitle, strings.profile.comingSoonBody);
}

function contactSupport() {
  const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
  if (!email) {
    Alert.alert(strings.help.contactUnavailableTitle, strings.help.contactUnavailableBody);
    return;
  }
  Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(strings.help.contactSubject)}`).catch(
    reportClientError,
  );
}

export function HelpScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = needle ? topics.filter((topic) => topic.label.toLowerCase().includes(needle)) : topics;

  return (
    <View className="flex-1 bg-brand-canvas">
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: Platform.OS === "ios" ? insets.bottom + 100 : 24 }}
      >
        <PageHero
          title={strings.help.title}
          subtitle={strings.help.subtitle}
          subtitleMaxWidth={290}
          art={{ source: heroImage, width: 148, height: 140, top: 63 }}
          gradient={gradients.helpHero}
          edgeGradient={gradients.helpHeroEdge}
          topGradient={gradients.helpHeroTop}
        />

        <View className="-mt-[12px] rounded-t-[26px] bg-brand-canvas pl-[20px] pr-[16px] pt-[12px]">
          <View
            className="h-[42px] flex-row items-center rounded-full bg-white pl-[17px] pr-[14px]"
            style={cardShadow}
          >
            <Icon name="magnifyingglass" size={17} tint={colors.navy} />
            <TextInput
              accessibilityLabel={strings.help.searchPlaceholder}
              value={query}
              onChangeText={setQuery}
              placeholder={strings.help.searchPlaceholder}
              placeholderTextColor={colors.hint}
              selectionColor={colors.coral}
              returnKeyType="search"
              autoCorrect={false}
              numberOfLines={1}
              className="ml-[12px] h-full flex-1 text-[12.5px] text-brand-navy"
            />
          </View>

          <Text accessibilityRole="header" className="mt-[24px] text-[17.5px] font-bold leading-[22px] text-brand-navy">
            {strings.help.popularTopics}
          </Text>

          <View className="mt-[10px] overflow-hidden rounded-[20px] bg-white pb-[3px]" style={cardShadow}>
            {visible.length === 0 ? (
              <Text className="px-[20px] py-[22px] text-[14px] text-brand-slate">{strings.help.noResults}</Text>
            ) : (
              visible.map((topic, index) => (
                <Pressable
                  key={topic.id}
                  accessibilityRole="button"
                  accessibilityLabel={topic.label}
                  onPress={openTopic}
                  className="h-[44px] flex-row items-center pl-[9px] pr-[14px] active:opacity-60"
                >
                  <View className="w-[40px] items-center">
                    <Icon name={topic.icon} size={22} tint={colors.navy} />
                  </View>
                  <Text className="ml-[10px] flex-1 text-[15px] font-medium text-brand-navy">{topic.label}</Text>
                  <Icon name="chevron.right" size={12} tint={colors.slate} />
                  {index < visible.length - 1 ? (
                    <View className="absolute bottom-0 left-[59px] right-0 h-[1px] bg-brand-line" />
                  ) : null}
                </Pressable>
              ))
            )}
          </View>

          <View className="-ml-[4px] -mr-[3px] mt-[27px] h-[69px] flex-row items-center rounded-[20px] bg-brand-peach pl-[17px] pr-[10px]">
            <Icon name="envelope" size={27} tint={colors.coral} />
            <View className="ml-[13px] flex-1">
              <Text className="text-[15px] font-bold leading-[19px] text-brand-navy">{strings.help.stillNeedHelp}</Text>
              <Text className="mt-[2px] text-[11.2px] leading-[16px] text-brand-slate">
                {strings.help.stillNeedHelpBody}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.help.contactUs}
              onPress={contactSupport}
              hitSlop={4}
              className="h-[36px] w-[105px] items-center justify-center rounded-full bg-brand-coral active:opacity-80"
            >
              <Text className="text-[13px] font-semibold text-white">{strings.help.contactUs}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
