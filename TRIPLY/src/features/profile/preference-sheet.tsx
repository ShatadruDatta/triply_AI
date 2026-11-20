import { router, useLocalSearchParams } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import type { z } from "zod";

import { strings } from "@/lib/strings";
import { colors } from "@/lib/theme";

import {
  FOOD_PREFERENCES,
  foodPreferenceSchema,
  TRAVEL_STYLES,
  TRAVEL_WITH,
  travelStyleSchema,
  travelWithSchema,
} from "./preferences";

const cardShadow = { boxShadow: "0 3px 10px rgba(15, 23, 42, 0.05)" } as const;

type Option<T extends string> = { value: T; icon: SFSymbol; tint: string };

type SheetConfig<T extends string> = {
  // The Edit Profile search param this sheet hands its answer back through.
  param: "travelStyle" | "foodPreference" | "travelWith";
  schema: z.ZodType<T>;
  title: string;
  subtitle: string;
  descriptions: Record<T, string>;
  options: readonly Option<T>[];
  // Where each card starts, in pt from the top of the sheet. Taken from the design, whose
  // spacing is not perfectly even from one sheet to the next.
  cardTops: readonly number[];
  // Subtitle and Apply button positions (pt from the top of the sheet), also from the design.
  subtitleTop: number;
  subtitleLineHeight: number;
  applyTop: number;
};

function Icon({ name, size, tint, weight }: { name: SFSymbol; size: number; tint: string; weight?: "semibold" | "bold" }) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={tint}
      weight={weight}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
    />
  );
}

function Radio({ selected }: { selected: boolean }) {
  return selected ? (
    <View className="h-[20px] w-[20px] items-center justify-center rounded-full bg-brand-coralStrong">
      <Icon name="checkmark" size={11} tint={colors.white} weight="bold" />
    </View>
  ) : (
    <View
      className="h-[20px] w-[20px] rounded-full bg-white"
      style={{ borderWidth: 1.5, borderColor: colors.radioRing }}
    />
  );
}

// The sheet is 590pt tall on the design's phone; it never takes more than 90% of a short screen.
const SHEET_HEIGHT = 590;

function PreferenceSheet<T extends string>({ config }: { config: SheetConfig<T> }) {
  const { height } = useWindowDimensions();
  const { value } = useLocalSearchParams<{ value?: string }>();
  const parsed = config.schema.safeParse(value);
  const [selected, setSelected] = useState<T>(parsed.success ? parsed.data : config.options[0].value);

  function apply() {
    // Goes back to Edit Profile and passes the choice along as a param.
    router.dismissTo({ pathname: "/edit-profile", params: { [config.param]: selected } });
  }

  return (
    <View className="flex-1 justify-end">
      <Animated.View entering={FadeIn.duration(200)} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0, 0, 0, 0.22)" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.preferenceSheets.close}
          onPress={() => router.back()}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(280)}
        className="overflow-hidden rounded-t-[26px] bg-brand-sheet"
        style={{ height: Math.min(SHEET_HEIGHT, height * 0.9) }}
      >
        <View className="absolute left-0 right-0 top-[10.2px] items-center">
          <View className="h-[4.3px] w-[43px] rounded-full bg-brand-grabber" />
        </View>

        <Text
          accessibilityRole="header"
          className="absolute left-[24px] top-[27px] text-[23.8px] font-bold leading-[30px] text-brand-navy"
        >
          {config.title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.preferenceSheets.close}
          onPress={() => router.back()}
          hitSlop={8}
          className="absolute right-[24px] top-[23.7px] h-[30px] w-[30px] items-center justify-center rounded-full bg-brand-closeChip active:opacity-70"
        >
          <Icon name="xmark" size={12} tint={colors.navy} weight="bold" />
        </Pressable>
        <Text
          className="absolute left-[24px] right-[22px] text-[14.4px] text-brand-slate"
          style={{ top: config.subtitleTop, lineHeight: config.subtitleLineHeight }}
        >
          {config.subtitle}
        </Text>

        {config.options.map((option, index) => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={`${option.value}, ${config.descriptions[option.value]}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelected(option.value)}
              className={`absolute left-[22px] right-[22px] h-[66px] flex-row items-center rounded-[18px] ${
                isSelected ? "bg-brand-selected" : "bg-white"
              }`}
              style={[
                { top: config.cardTops[index] },
                isSelected ? { borderWidth: 1.2, borderColor: colors.selectBorder } : cardShadow,
              ]}
            >
              <View className="w-[62px] items-center">
                <Icon name={option.icon} size={32} tint={option.tint} />
              </View>
              <View className="ml-[2px] flex-1">
                <Text className="text-[16px] font-bold leading-[20px] text-brand-navy">{option.value}</Text>
                <Text className="mt-[3px] text-[13.1px] leading-[18px] text-brand-slate">
                  {config.descriptions[option.value]}
                </Text>
              </View>
              <View className="mr-[11.3px]">
                <Radio selected={isSelected} />
              </View>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.preferenceSheets.apply}
          onPress={apply}
          className="absolute left-[22px] right-[22px] h-[49px] items-center justify-center rounded-full bg-brand-coralStrong active:opacity-80"
          style={{ top: config.applyTop }}
        >
          <Text className="text-[18.1px] font-bold text-white">{strings.preferenceSheets.apply}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styleCopy = strings.preferenceSheets.travelStyle;
const foodCopy = strings.preferenceSheets.foodPreference;
const withCopy = strings.preferenceSheets.travelWith;

const styleConfig: SheetConfig<(typeof TRAVEL_STYLES)[number]> = {
  param: "travelStyle",
  schema: travelStyleSchema,
  title: styleCopy.title,
  subtitle: styleCopy.subtitle,
  descriptions: styleCopy.options,
  options: [
    { value: "Adventure", icon: "mountain.2", tint: colors.coral },
    { value: "Relaxation", icon: "beach.umbrella", tint: colors.iconTeal },
    { value: "Culture", icon: "building.columns", tint: colors.violet },
    { value: "Nature", icon: "leaf", tint: colors.iconGreen },
    { value: "Luxury", icon: "crown", tint: colors.iconGold },
  ],
  cardTops: [102.4, 176, 245.9, 313, 380],
  subtitleTop: 61.5,
  subtitleLineHeight: 20.9,
  applyTop: 481,
};

const foodConfig: SheetConfig<(typeof FOOD_PREFERENCES)[number]> = {
  param: "foodPreference",
  schema: foodPreferenceSchema,
  title: foodCopy.title,
  subtitle: foodCopy.subtitle,
  descriptions: foodCopy.options,
  options: [
    { value: "Any", icon: "fork.knife", tint: colors.coral },
    { value: "Vegetarian", icon: "leaf", tint: colors.iconGreen },
    { value: "Vegan", icon: "carrot", tint: colors.iconGreen },
    { value: "Non-Vegetarian", icon: "fish", tint: colors.iconOrange },
    { value: "Jain", icon: "camera.macro", tint: colors.violet },
  ],
  cardTops: [113, 179.2, 244.6, 309.4, 374.3],
  subtitleTop: 60.5,
  subtitleLineHeight: 20.2,
  applyTop: 476,
};

const withConfig: SheetConfig<(typeof TRAVEL_WITH)[number]> = {
  param: "travelWith",
  schema: travelWithSchema,
  title: withCopy.title,
  subtitle: withCopy.subtitle,
  descriptions: withCopy.options,
  options: [
    { value: "Solo", icon: "person", tint: colors.iconBlue },
    { value: "Couple", icon: "person.2", tint: colors.iconPink },
    { value: "Family", icon: "figure.2.and.child.holdinghands", tint: colors.iconOrange },
    { value: "Friends", icon: "person.3", tint: colors.iconTeal },
    { value: "Business", icon: "briefcase", tint: colors.violet },
  ],
  cardTops: [100.5, 166.9, 233.9, 301.5, 370.6],
  subtitleTop: 61.5,
  subtitleLineHeight: 20.9,
  applyTop: 479.7,
};

export const TravelStyleSheet = () => <PreferenceSheet config={styleConfig} />;
export const FoodPreferenceSheet = () => <PreferenceSheet config={foodConfig} />;
export const TravelWithSheet = () => <PreferenceSheet config={withConfig} />;
