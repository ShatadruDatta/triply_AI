import { randomUUID } from "expo-crypto";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { SFSymbol } from "expo-symbols";
import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApiError } from "@/lib/api";
import { deviceCurrency } from "@/lib/currency";
import { strings } from "@/lib/strings";
import { colors, gradients } from "@/lib/theme";

import { formatShortDate, toIsoDate } from "./date-utils";
import {
  totalTravelers,
  usePlanDraft,
  type Budget,
  type Interest,
  type Pace,
} from "./plan-draft";
import { useCreateTrip, usePlaceSuggestions } from "./queries";
import { tripInputSchema } from "./schema";
import { GradientButton, Icon, SegmentedControl } from "./ui";

const heroImage = require("@/assets/images/auth/auth-bg.jpg");
const globeImage = require("@/assets/images/home/globe.png");

const text = strings.planTrip;
const softShadow = { boxShadow: "0 4px 14px rgba(15, 23, 42, 0.07)" } as const;

const budgetOptions = (Object.keys(text.budgetOptions) as Budget[]).map((value) => ({
  value,
  label: text.budgetOptions[value],
}));
const paceOptions = (Object.keys(text.paceOptions) as Pace[]).map((value) => ({
  value,
  label: text.paceOptions[value],
}));

const interestOptions: { value: Interest; icon: SFSymbol }[] = [
  { value: "food", icon: "fork.knife" },
  { value: "culture", icon: "building.columns" },
  { value: "nature", icon: "mountain.2" },
  { value: "nightlife", icon: "wineglass" },
  { value: "shopping", icon: "bag" },
  { value: "adventure", icon: "figure.hiking" },
];

function SectionLabel({ icon, title, note }: { icon: SFSymbol; title: string; note?: string }) {
  return (
    <View className="mb-2 mt-4 flex-row items-center gap-2 px-1">
      <Icon name={icon} size={20} tint={colors.navy} />
      <Text accessibilityRole="header" className="text-[16px] font-bold text-brand-navy">
        {title}
        {note ? <Text className="text-[13px] font-normal"> {note}</Text> : null}
      </Text>
    </View>
  );
}

function PickerCard({
  icon,
  title,
  value,
  placeholder,
  onPress,
}: {
  icon: SFSymbol;
  title: string;
  value: string;
  placeholder?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${value}`}
      onPress={onPress}
      className="h-[60px] flex-1 justify-center rounded-[16px] bg-white px-3 active:opacity-80"
      style={softShadow}
    >
      <View className="flex-row items-center gap-2">
        <Icon name={icon} size={18} tint={colors.navy} />
        <Text className="text-[14px] font-bold text-brand-navy">{title}</Text>
      </View>
      <View className="mt-[3px] flex-row items-center justify-between pl-[26px]">
        <Text
          numberOfLines={1}
          className={`flex-1 text-[13px] ${placeholder ? "text-brand-slate" : "font-medium text-brand-navy"}`}
        >
          {value}
        </Text>
        <Icon name="chevron.down" size={12} tint={colors.navy} />
      </View>
    </Pressable>
  );
}

function InterestChip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: SFSymbol;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className="h-[30px] flex-row items-center gap-[6px] rounded-full px-3 active:opacity-80"
      style={
        selected
          ? { experimental_backgroundImage: gradients.cta }
          : { backgroundColor: colors.white, ...softShadow }
      }
    >
      <Icon name={selected ? "checkmark" : icon} size={15} tint={selected ? colors.white : colors.navy} />
      <Text className={`text-[13.5px] ${selected ? "font-medium text-white" : "text-brand-navy"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function PlanTripScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { draft, update } = usePlanDraft();
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sessionToken] = useState(() => randomUUID());
  const [error, setError] = useState<string | null>(null);
  const createTrip = useCreateTrip();
  const suggestions = usePlaceSuggestions(
    draft.destination,
    sessionToken,
    showSuggestions && !draft.destinationPlaceId,
  );

  const heroHeight = 266 + (insets.top - 59);
  const hasDates = !!draft.startDate;
  const datesLabel = draft.startDate
    ? draft.endDate
      ? `${formatShortDate(draft.startDate)} – ${formatShortDate(draft.endDate)}`
      : formatShortDate(draft.startDate)
    : text.selectDates;
  const travelers = totalTravelers(draft);

  function messageFor(failure: unknown) {
    if (failure instanceof ApiError) {
      if (failure.code === 'quota_exceeded') return text.errors.quotaExceeded;
      if (failure.code === 'generation_in_progress') return text.errors.inProgress;
      if (failure.code === 'network' || failure.status === 0) return text.errors.network;
      if (failure.status === 400 || failure.status === 502) return failure.message;
    }
    return text.errors.generic;
  }

  // Opened from Home (?from=home) goes back Home; opened from My Trips goes back to My Trips.
  function goBack() {
    if (from === "home" || !router.canGoBack()) router.navigate("/");
    else router.back();
  }

  function submit() {
    setError(null);
    if (!draft.startDate || !draft.endDate) {
      setError(draft.startDate ? text.errors.endDateRequired : text.errors.datesRequired);
      return;
    }
    const parsed = tripInputSchema.safeParse({
      destination: draft.destination,
      destinationPlaceId: draft.destinationPlaceId ?? undefined,
      startDate: toIsoDate(draft.startDate),
      endDate: toIsoDate(draft.endDate),
      travelers: totalTravelers(draft),
      budgetTier: draft.budget,
      currency: deviceCurrency(),
      interests: draft.interests,
      pace: draft.pace,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? text.errors.generic);
      return;
    }
    createTrip.mutate(parsed.data, {
      onSuccess: (id) => router.replace({ pathname: "/trips/[id]", params: { id } }),
      onError: (failure) => setError(messageFor(failure)),
    });
  }

  function toggleInterest(value: Interest) {
    const selected = draft.interests.includes(value);
    update({
      interests: selected ? draft.interests.filter((i) => i !== value) : [...draft.interests, value],
    });
  }

  return (
    <View className="flex-1 bg-brand-canvas">
      <StatusBar style="dark" />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "ios" ? insets.bottom + 61 : 24 }}
      >
        <View style={{ height: heroHeight }}>
          <View className="absolute inset-0 overflow-hidden">
            <Image
              source={heroImage}
              contentFit="cover"
              style={{
                position: "absolute",
                width: width * 1.5,
                height: width * 3,
                left: -width * 0.05,
                top: -width * 0.62,
              }}
            />
            <View className="absolute inset-0" style={{ experimental_backgroundImage: gradients.planHero }} />
          </View>

          <View
            className="h-[44px] flex-row items-center justify-between px-4"
            style={{ marginTop: insets.top - 6 }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={text.back}
              onPress={goBack}
              hitSlop={10}
              className="h-11 w-11 justify-center"
            >
              <Icon name="chevron.left" size={22} tint={colors.navy} />
            </Pressable>
            <Text accessibilityRole="header" className="text-[24px] font-bold text-brand-navy">
              {text.screenTitle}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={text.notifications}
              hitSlop={10}
              className="h-11 w-11 items-end justify-center"
            >
              <Icon name="bell" size={24} tint={colors.navy} />
              <View className="absolute right-[1px] top-[8px] h-[8px] w-[8px] rounded-full bg-brand-coral" />
            </Pressable>
          </View>

          <Image
            source={globeImage}
            contentFit="cover"
            style={{ position: "absolute", right: 6, top: heroHeight - 130, width: 150, height: 75 }}
          />

          <View className="absolute bottom-[38px] left-[14px]">
            <Text
              className="text-[27px] font-bold leading-[28px] text-white"
              style={{ textShadowColor: "rgba(60,30,90,0.35)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 }}
            >
              {text.heroTitleLine1}
              {"\n"}
              {text.heroTitleLine2}
            </Text>
            <Text
              className="mt-[8px] text-[13px] leading-[16px] text-white"
              style={{ textShadowColor: "rgba(60,30,90,0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 }}
            >
              {text.heroSubtitleLine1}
              {"\n"}
              {text.heroSubtitleLine2}
            </Text>
          </View>
        </View>

        <View
          className="mx-[9px] rounded-[28px] bg-white/85 px-4 pb-5 pt-3"
          style={{ boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}
        >
          <SectionLabel icon="mappin.and.ellipse" title={text.destination} />
          <View
            className={`h-[40px] flex-row items-center rounded-[14px] border bg-brand-mist/70 px-3 ${
              focused ? "border-brand-coral" : "border-brand-line"
            }`}
          >
            <Icon name="magnifyingglass" size={18} tint={colors.navy} />
            <TextInput
              accessibilityLabel={text.destinationPlaceholder}
              value={draft.destination}
              onChangeText={(destination) => {
                update({ destination, destinationPlaceId: null });
                setShowSuggestions(true);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={text.destinationPlaceholder}
              placeholderTextColor={colors.slate}
              selectionColor={colors.coral}
              returnKeyType="done"
              autoCorrect={false}
              autoCapitalize="words"
              clearButtonMode="while-editing"
              className="ml-3 h-full flex-1 text-[14px] text-brand-navy"
            />
          </View>

          {showSuggestions && suggestions.data?.length ? (
            <View
              className="mt-2 overflow-hidden rounded-[14px] bg-white"
              style={{ boxShadow: "0 4px 14px rgba(15, 23, 42, 0.08)" }}
            >
              {suggestions.data.slice(0, 5).map((suggestion, index) => (
                <Pressable
                  key={suggestion.placeId}
                  accessibilityRole="button"
                  accessibilityLabel={suggestion.description}
                  onPress={() => {
                    update({
                      destination: suggestion.description,
                      destinationPlaceId: suggestion.placeId,
                    });
                    setShowSuggestions(false);
                  }}
                  className={`flex-row items-center gap-3 px-3 py-[10px] active:bg-brand-mist ${
                    index > 0 ? "border-t border-brand-line" : ""
                  }`}
                >
                  <Icon name="mappin.and.ellipse" size={16} tint={colors.slate} />
                  <Text numberOfLines={1} className="flex-1 text-[14px] text-brand-navy">
                    {suggestion.description}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View className="mt-4 flex-row gap-[11px]">
            <PickerCard
              icon="calendar"
              title={text.travelDates}
              value={datesLabel}
              placeholder={!hasDates}
              onPress={() => router.push("/trips/select-dates")}
            />
            <PickerCard
              icon="person.2"
              title={text.travelers}
              value={strings.home.travelers(travelers)}
              onPress={() => router.push("/trips/select-travelers")}
            />
          </View>

          <SectionLabel icon="dollarsign.circle" title={text.budget} note={text.perPerson} />
          <SegmentedControl
            options={budgetOptions}
            value={draft.budget}
            onChange={(budget) => update({ budget })}
          />

          <SectionLabel icon="heart" title={text.interests} />
          <View className="flex-row flex-wrap gap-x-[10px] gap-y-[10px] px-[2px]">
            {interestOptions.map((option) => (
              <InterestChip
                key={option.value}
                label={text.interestOptions[option.value]}
                icon={option.icon}
                selected={draft.interests.includes(option.value)}
                onPress={() => toggleInterest(option.value)}
              />
            ))}
          </View>

          <SectionLabel icon="gauge.with.needle" title={text.pace} />
          <SegmentedControl
            options={paceOptions}
            value={draft.pace}
            onChange={(pace) => update({ pace })}
          />

          {error ? (
            <Text
              accessibilityRole="alert"
              className="mt-4 rounded-[12px] bg-brand-errorSoft px-3 py-[10px] text-[13px] text-brand-error"
            >
              {error}
            </Text>
          ) : null}

          <View className="mt-4">
            <GradientButton
              label={text.generate}
              leading="sparkles"
              trailing="arrow.right"
              loading={createTrip.isPending}
              onPress={submit}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
