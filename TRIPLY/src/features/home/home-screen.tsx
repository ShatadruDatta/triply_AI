import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useState } from "react";
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { strings } from "@/lib/strings";
import { colors, gradients } from "@/lib/theme";

import { popularDestinations } from "./data";
import { UpcomingTrips } from "./upcoming-trips";

const heroImage = require("@/assets/images/auth/auth-bg.jpg");
const avatarImage = require("@/assets/images/home/avatar.png");
const globeImage = require("@/assets/images/home/globe.png");

const softShadow = { boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)" } as const;

function Icon({
  name,
  size,
  tint,
  rotate,
}: {
  name: SFSymbol;
  size: number;
  tint: string;
  rotate?: string;
}) {
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

function Header({ top }: { top: number }) {
  return (
    <View className="flex-row items-center justify-between px-5" style={{ paddingTop: top - 14 }}>
      <View className="flex-row items-center gap-2">
        <Icon name="paperplane.fill" size={34} tint={colors.navy} />
        <View>
          <Text className="text-[28px] font-bold leading-[32px] text-brand-navy">
            {strings.appName}
          </Text>
          <Text className="-mt-[2px] text-[11px] font-medium text-brand-navy">
            {strings.home.tagline}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.home.notifications}
          hitSlop={10}
          className="h-11 w-11 items-center justify-center"
        >
          <Icon name="bell" size={24} tint={colors.navy} />
          <View className="absolute right-[9px] top-[9px] h-[8px] w-[8px] rounded-full bg-brand-coral" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.home.profilePhoto}
          hitSlop={6}
        >
          <Image
            source={avatarImage}
            style={{ width: 34, height: 34, borderRadius: 17 }}
            contentFit="cover"
          />
        </Pressable>
      </View>
    </View>
  );
}

function SearchBar() {
  const [query, setQuery] = useState("");
  const [filtersActive, setFiltersActive] = useState(false);

  return (
    <View
      className="mx-5 h-[46px] flex-row items-center rounded-full bg-white pl-4 pr-[7px]"
      style={{ boxShadow: "0 8px 22px rgba(15, 23, 42, 0.14)" }}
    >
      <Icon name="magnifyingglass" size={19} tint={colors.navy} />
      <TextInput
        accessibilityLabel={strings.home.searchPlaceholder}
        value={query}
        onChangeText={setQuery}
        placeholder={strings.home.searchPlaceholder}
        placeholderTextColor={colors.slate}
        selectionColor={colors.coral}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="words"
        clearButtonMode="while-editing"
        onSubmitEditing={() => Keyboard.dismiss()}
        className="ml-3 h-full flex-1 text-[13.5px] text-brand-navy"
      />
      <View className="mx-2 h-[24px] w-px bg-brand-gray/40" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.home.searchFilters}
        accessibilityState={{ selected: filtersActive }}
        hitSlop={6}
        onPress={() => setFiltersActive((active) => !active)}
        className="h-[34px] w-[34px] items-center justify-center"
      >
        <Icon name="slider.horizontal.3" size={19} tint={filtersActive ? colors.coral : colors.navy} />
      </Pressable>
    </View>
  );
}

const quickActions: { key: keyof typeof strings.home.quickActions; icon: SFSymbol; tint: string; rotate?: string }[] =
  [
    { key: "flights", icon: "airplane", tint: colors.coral, rotate: "-45deg" },
    { key: "hotels", icon: "bed.double.fill", tint: colors.coral },
    { key: "trips", icon: "mappin.and.ellipse", tint: colors.coral },
    { key: "aiPlan", icon: "sparkle", tint: colors.violet },
  ];

function QuickActions() {
  return (
    <View className="mx-5 mt-4 flex-row justify-between">
      {quickActions.map((action) => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={strings.home.quickActions[action.key]}
          className="h-[74px] w-[76px] items-center justify-center gap-[6px] rounded-[22px] bg-white/85 active:opacity-80"
          style={softShadow}
        >
          <Icon name={action.icon} size={27} tint={action.tint} rotate={action.rotate} />
          <Text className="text-[11px] font-medium text-brand-navy">
            {strings.home.quickActions[action.key]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function SectionHeader({
  title,
  className,
  onSeeAll,
}: {
  title: string;
  className?: string;
  onSeeAll?: () => void;
}) {
  return (
    <View className={`mx-[14px] flex-row items-center justify-between ${className ?? ""}`}>
      <Text accessibilityRole="header" className="text-[18px] font-bold text-brand-navy">
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${strings.home.seeAll} ${title}`}
        onPress={onSeeAll}
        hitSlop={10}
        className="flex-row items-center gap-1"
      >
        <Text className="text-[12px] font-medium text-brand-navy">{strings.home.seeAll}</Text>
        <Icon name="arrow.right" size={14} tint={colors.navy} />
      </Pressable>
    </View>
  );
}

function PopularDestinations() {
  return (
    <FlatList
      className="mt-3"
      horizontal
      showsHorizontalScrollIndicator={false}
      data={popularDestinations}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.city}, ${item.country}`}
          className="h-[111px] w-[119px] overflow-hidden rounded-[14px] bg-brand-navy"
        >
          <Image source={item.image} contentFit="cover" style={{ position: "absolute", inset: 0 }} />
          <View className="absolute inset-0" style={{ experimental_backgroundImage: gradients.cardScrim }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.home.favorite}
            hitSlop={10}
            className="absolute right-[6px] top-[6px]"
          >
            <Icon name="heart" size={20} tint="#FFFFFF" />
          </Pressable>
          <View className="absolute bottom-[7px] left-[8px]">
            <Text className="text-[15px] font-bold leading-[18px] text-white">{item.city}</Text>
            <Text className="text-[11.5px] leading-[14px] text-white">{item.country}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

function PlanBanner() {
  return (
    <View
      className="mx-[14px] mt-[14px] h-[110px] overflow-hidden rounded-[18px]"
      style={{ experimental_backgroundImage: gradients.banner }}
    >
      <Image
        source={globeImage}
        contentFit="cover"
        style={{ position: "absolute", left: 203, top: 4, width: 134, height: 67 }}
      />
      <View className="absolute left-[14px] top-[12px] flex-row items-center gap-[7px]">
        <Icon name="sparkles" size={24} tint={colors.coral} />
        <View>
          <Text className="text-[16px] font-bold leading-[20px] text-brand-navy">
            {strings.home.bannerTitleLine1}
          </Text>
          <Text className="text-[16px] font-bold leading-[20px] text-brand-navy">
            {strings.home.bannerTitleLine2}
          </Text>
        </View>
      </View>
      <Text className="absolute bottom-[17px] left-[14px] w-[190px] text-[11px] leading-[16px] text-brand-navy">
        {strings.home.bannerBody}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.home.planATrip}
        onPress={() => router.push({ pathname: "/trips/new", params: { from: "home" } })}
        hitSlop={6}
        className="absolute bottom-[10px] right-[12px] h-[34px] w-[153px] flex-row items-center justify-center gap-2 rounded-full active:opacity-90"
        style={{ experimental_backgroundImage: gradients.cta, boxShadow: "0 4px 12px rgba(255,90,58,0.35)" }}
      >
        <Text className="text-[13.5px] font-semibold text-white">{strings.home.planATrip}</Text>
        <Icon name="arrow.right" size={15} tint="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export function HomeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heroHeight = 400 + insets.top - 59;
  const imageWidth = width * 1.08;

  return (
    <View className="flex-1 bg-brand-canvas">
      <StatusBar style="dark" />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // iOS draws the floating tab bar over the content, so leave room to scroll past it.
        // Android's native tabs already reserve the bottom inset.
        contentContainerStyle={{ paddingBottom: Platform.OS === "ios" ? insets.bottom + 61 : 24 }}
      >
        <View className="absolute left-0 right-0 top-0 overflow-hidden" style={{ height: heroHeight }}>
          <Image
            source={heroImage}
            contentFit="cover"
            style={{ position: "absolute", width: imageWidth, height: imageWidth * 2, left: -width * 0.04, top: -50 }}
          />
          <View className="absolute inset-0" style={{ experimental_backgroundImage: gradients.heroSky }} />
          <View className="absolute inset-0" style={{ experimental_backgroundImage: gradients.heroFade }} />
        </View>

        <Header top={insets.top} />

        <View className="mt-[44px] px-5">
          <Text
            accessibilityRole="header"
            className="text-[30px] font-bold leading-[40px] text-white"
            style={{ textShadowColor: "rgba(0,0,0,0.25)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 }}
          >
            {strings.home.heroTitleLine1}
            {"\n"}
            {strings.home.heroTitleLine2}
          </Text>
          <Text
            className="mt-[4px] text-[13px] leading-[16px] text-white"
            style={{ textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 }}
          >
            {strings.home.heroSubtitleLine1}
            {"\n"}
            {strings.home.heroSubtitleLine2}
          </Text>
        </View>

        <View className="mt-[6px]">
          <SearchBar />
        </View>
        <QuickActions />

        <SectionHeader title={strings.home.popularDestinations} className="mt-[22px]" />
        <PopularDestinations />
        <PlanBanner />

        <SectionHeader
          title={strings.home.upcomingTrips}
          className="mt-[22px]"
          onSeeAll={() => router.navigate("/trips")}
        />
        <UpcomingTrips />
      </ScrollView>
    </View>
  );
}
