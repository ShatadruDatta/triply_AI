import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { openBrowserAsync } from "expo-web-browser";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/currency";
import { optimizedImageUrl } from "@/lib/imagekit";
import { strings } from "@/lib/strings";
import { colors, gradients } from "@/lib/theme";

import { formatShortDate, parseIsoDate } from "./date-utils";
import { useDeleteTrip, useTrip, useUpdateTripCover } from "./queries";
import { TripMapCard } from "./trip-map-card";
import type { Activity, Hotel, ImageCredit, TripDetail } from "./types";
import { Icon } from "./ui";

const text = strings.trips.detail;
const globeImage = require("@/assets/images/home/globe.png");
const softShadow = { boxShadow: "0 4px 14px rgba(15, 23, 42, 0.07)" } as const;

// Opened from Home (?from=home) goes back Home; otherwise back to the previous screen.
function useGoBack() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  return function goBack() {
    if (from === "home") router.navigate("/");
    else if (router.canGoBack()) router.back();
    else router.replace("/trips");
  };
}

function HeroButton({
  label,
  icon,
  onPress,
  onDark,
  disabled,
  loading,
}: {
  label: string;
  icon: "chevron.left" | "trash" | "camera";
  onPress: () => void;
  onDark?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={7}
      className={`h-[31px] w-[31px] items-center justify-center rounded-full ${
        onDark ? "bg-white/90" : "bg-white"
      }`}
      style={softShadow}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.navy} />
      ) : (
        <Icon name={icon} size={14} tint={icon === "trash" ? colors.error : colors.navy} />
      )}
    </Pressable>
  );
}

function BackButton({ onDark }: { onDark?: boolean }) {
  const goBack = useGoBack();
  return <HeroButton label={text.back} icon="chevron.left" onPress={goBack} onDark={onDark} />;
}

function PhotoCredit({ credit }: { credit: ImageCredit | null }) {
  if (!credit) return null;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={text.photoBy(credit.name)}
      onPress={() => openBrowserAsync(credit.photoUrl)}
      hitSlop={6}
    >
      <Text className="text-[8px] text-brand-slate">{text.photoBy(credit.name)}</Text>
    </Pressable>
  );
}

function StateScreen({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-brand-canvas px-5" style={{ paddingTop: insets.top + 8 }}>
      <StatusBar style="dark" />
      <BackButton />
      <View className="flex-1 items-center justify-center pb-24">{children}</View>
    </View>
  );
}

function GeneratingView({ destination }: { destination: string }) {
  const city = destination.split(",")[0];
  return (
    <StateScreen>
      <Image source={globeImage} contentFit="cover" style={{ width: 200, height: 100 }} />
      <Text
        accessibilityRole="header"
        className="mt-4 text-center text-[22px] font-bold text-brand-navy"
      >
        {text.generatingTitle(city)}
      </Text>
      <Text className="mt-2 text-center text-[14px] leading-[20px] text-brand-slate">
        {text.generatingBody}
      </Text>
      <ActivityIndicator className="mt-6" color={colors.coral} />
      <View className="mt-8 w-full gap-3">
        {[0, 1, 2].map((i) => (
          <View key={i} className="h-[56px] rounded-[16px] bg-brand-mist" />
        ))}
      </View>
    </StateScreen>
  );
}

function FailedView({ errorCode }: { errorCode: string | null }) {
  const body =
    errorCode === "ai_not_configured"
      ? text.failedNotConfigured
      : errorCode === "dispatch_failed"
        ? text.failedDispatch
        : errorCode === "generation_timeout"
          ? text.failedTimeout
          : text.failedBody;
  return (
    <StateScreen>
      <View className="h-[64px] w-[64px] items-center justify-center rounded-full bg-brand-errorSoft">
        <Icon name="exclamationmark.triangle" size={28} tint={colors.error} />
      </View>
      <Text accessibilityRole="header" className="mt-4 text-center text-[20px] font-bold text-brand-navy">
        {text.failedTitle}
      </Text>
      <Text className="mt-2 text-center text-[14px] leading-[20px] text-brand-slate">{body}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text.tryAgain}
        onPress={() => router.replace("/trips/new")}
        className="mt-6 h-[46px] items-center justify-center rounded-full px-8 active:opacity-90"
        style={{ experimental_backgroundImage: gradients.cta }}
      >
        <Text className="text-[16px] font-semibold text-white">{text.tryAgain}</Text>
      </Pressable>
    </StateScreen>
  );
}

function ActivityCard({ activity, currency }: { activity: Activity; currency: string }) {
  return (
    <View className="flex-row gap-[9px] rounded-[12px] bg-white px-[8px] pb-[5px] pt-[7px]" style={softShadow}>
      {activity.imageUrl ? (
        <Image
          source={{ uri: activity.imageUrl }}
          contentFit="cover"
          accessibilityLabel={activity.name}
          style={{ width: 77, height: 72, borderRadius: 9 }}
        />
      ) : null}
      <View className="flex-1">
        <Text className="text-[8.5px] font-semibold uppercase text-brand-coral">
          {text.timeSlot[activity.timeSlot]}
        </Text>
        <Text className="text-[12px] font-bold leading-[15px] text-brand-navy">{activity.name}</Text>
        <Text className="mr-[36px] mt-[1px] text-[10.3px] leading-[11.5px] text-brand-slate">
          {activity.description}
        </Text>
        <View className="mt-[5px] flex-row items-center justify-between pr-[2px]">
          <Text className="rounded-full bg-brand-mist px-[8px] py-[1px] text-[9px] capitalize text-brand-slate">
            {activity.category}
          </Text>
          <Text className="text-[11px] font-bold text-brand-navy">
            {activity.estCost ? formatMoney(activity.estCost, currency) : text.free}
          </Text>
        </View>
      </View>
    </View>
  );
}

function HotelCard({ hotel }: { hotel: Hotel }) {
  return (
    <View className="w-[160px] overflow-hidden rounded-[12px] bg-white" style={softShadow}>
      <View className="h-[88px] items-center justify-center bg-brand-mist">
        {hotel.imageUrl ? (
          <Image
            source={{ uri: hotel.imageUrl }}
            contentFit="cover"
            accessibilityLabel={hotel.name}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <Icon name="bed.double.fill" size={30} tint={colors.gray} />
        )}
      </View>
      <View className="p-3">
        <Text numberOfLines={1} className="text-[14.5px] font-bold text-brand-navy">
          {hotel.name}
        </Text>
        {hotel.area ? (
          <Text numberOfLines={1} className="mt-[1px] text-[12px] text-brand-slate">
            {hotel.area}
          </Text>
        ) : null}
        <View className="mt-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <Icon name="star.fill" size={12} tint={colors.coral} />
            <Text className="text-[12.5px] font-semibold text-brand-navy">
              {hotel.rating ? hotel.rating.toFixed(1) : "–"}
            </Text>
          </View>
          <Text className="text-[12.5px] font-semibold text-brand-slate">{hotel.priceRange}</Text>
        </View>
      </View>
    </View>
  );
}

function BudgetCard({ trip }: { trip: TripDetail }) {
  const budget = trip.budgetBreakdown;
  if (!budget) return null;
  const biggest = Math.max(...budget.items.map((i) => i.amount), 1);
  return (
    <View className="mx-4 rounded-[20px] bg-white p-4" style={softShadow}>
      <View className="flex-row items-end justify-between">
        <View>
          <Text className="text-[12px] text-brand-slate">{text.total}</Text>
          <Text className="text-[26px] font-bold text-brand-navy">
            {formatMoney(budget.total, budget.currency)}
          </Text>
        </View>
        {budget.perDay ? (
          <Text className="pb-1 text-[13px] text-brand-slate">
            {formatMoney(budget.perDay, budget.currency)} {text.perDay}
          </Text>
        ) : null}
      </View>
      <View className="mt-3 gap-3">
        {budget.items.map((item) => (
          <View key={item.category}>
            <View className="flex-row justify-between">
              <Text className="text-[13px] text-brand-navy">
                {text.budgetCategories[item.category]}
              </Text>
              <Text className="text-[13px] font-semibold text-brand-navy">
                {formatMoney(item.amount, budget.currency)}
              </Text>
            </View>
            <View className="mt-1 h-[6px] rounded-full bg-brand-mist">
              <View
                className="h-[6px] rounded-full bg-brand-teal"
                style={{ width: `${Math.max(4, (item.amount / biggest) * 100)}%` }}
              />
            </View>
          </View>
        ))}
      </View>
      <Text className="mt-3 text-[11.5px] text-brand-slate">{text.budgetNote}</Text>
    </View>
  );
}

function MetaItem({ icon, label }: { icon: "calendar" | "person.2" | "diamond"; label: string }) {
  return (
    <View className="flex-row items-center gap-[5px]">
      <Icon name={icon} size={16} tint={colors.white} />
      <Text className="text-[10px] font-medium text-white">{label}</Text>
    </View>
  );
}

function MetaDivider() {
  return <View className="mx-[10px] h-[11px] w-[1px] bg-white/60" />;
}

function ReadyView({ trip }: { trip: TripDetail }) {
  const insets = useSafeAreaInsets();
  const [selectedDay, setSelectedDay] = useState(1);
  const goBack = useGoBack();
  const deleteTrip = useDeleteTrip();
  const updateCover = useUpdateTripCover(trip.id);
  const day = trip.days.find((d) => d.dayNumber === selectedDay) ?? trip.days[0];
  const dateRange = `${formatShortDate(parseIsoDate(trip.startDate))} – ${formatShortDate(parseIsoDate(trip.endDate))}`;
  const budgetLabel = strings.planTrip.budgetOptions[trip.budgetTier as keyof typeof strings.planTrip.budgetOptions] ?? trip.budgetTier;
  // Must sit below the status bar: iOS keeps taps in that strip for its scroll-to-top gesture.
  const buttonTop = insets.top + (Platform.OS === "ios" ? 2 : 4);

  // Opens the photo library, then uploads the choice (the server stores it in ImageKit).
  async function pickCover() {
    const list = strings.trips.detail;
    let picker: typeof import("expo-image-picker");
    try {
      picker = await import("expo-image-picker");
    } catch {
      Alert.alert(list.coverNeedsRebuild);
      return;
    }
    let result: Awaited<ReturnType<typeof picker.launchImageLibraryAsync>>;
    try {
      // The system photo picker needs no permission prompt; quality re-encodes to a smaller JPEG.
      result = await picker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    } catch {
      Alert.alert(list.coverNeedsRebuild);
      return;
    }
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;

    updateCover.mutate(
      { uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" },
      {
        onError: (failure) => {
          const message =
            failure instanceof ApiError && failure.code === "image_too_large"
              ? list.coverTooLarge
              : failure instanceof ApiError && failure.code === "images_not_configured"
                ? list.coverNotConfigured
                : list.coverFailed;
          // Development aid: show what the request actually failed with.
          const detail = __DEV__
            ? failure instanceof ApiError
              ? `\n\n[${failure.status} ${failure.code}] ${failure.message}`
              : `\n\n[${String(failure)}]`
            : "";
          Alert.alert(message + detail);
        },
      },
    );
  }

  // Native confirmation, then delete from the database; the trips list is updated by the mutation.
  function confirmDelete() {
    const list = strings.trips;
    Alert.alert(list.deleteTitle, list.deleteBody(trip.destinationName), [
      { text: list.deleteCancel, style: "cancel" },
      {
        text: list.deleteConfirm,
        style: "destructive",
        onPress: () =>
          deleteTrip.mutate(trip.id, {
            onSuccess: goBack,
            onError: () => Alert.alert(list.deleteFailed),
          }),
      },
    ]);
  }

  return (
    <View className="flex-1 bg-brand-canvas">
      <StatusBar style="light" />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "ios" ? insets.bottom + 61 : 24 }}
      >
        <View className="h-[188px] justify-end bg-brand-navy">
          {trip.heroImageUrl ? (
            <Image
              source={{ uri: optimizedImageUrl(trip.heroImageUrl, 1200) ?? trip.heroImageUrl }}
              contentFit="cover"
              transition={200}
              accessibilityLabel={trip.destinationName}
              style={{ position: "absolute", inset: 0 }}
            />
          ) : null}
          <View className="absolute inset-0" style={{ experimental_backgroundImage: gradients.heroScrim }} />
          <View className="absolute left-[13px]" style={{ top: buttonTop }}>
            <BackButton onDark />
          </View>
          <View className="absolute right-[13px] flex-row gap-[8px]" style={{ top: buttonTop }}>
            <HeroButton
              label={text.changeCover}
              icon="camera"
              onPress={pickCover}
              loading={updateCover.isPending}
              disabled={updateCover.isPending || deleteTrip.isPending}
              onDark
            />
            <HeroButton
              label={strings.trips.deleteLabel}
              icon="trash"
              onPress={confirmDelete}
              disabled={deleteTrip.isPending}
              onDark
            />
          </View>
          <View className="px-[16px] pb-[10.5px]">
            <Text accessibilityRole="header" className="text-[27px] font-bold leading-[32px] text-white">
              {trip.destinationName.split(",")[0]}
            </Text>
            <View className="mt-[3px] flex-row items-center">
              <MetaItem icon="calendar" label={dateRange} />
              <MetaDivider />
              <MetaItem icon="person.2" label={strings.home.travelers(trip.travelers)} />
              <MetaDivider />
              <MetaItem icon="diamond" label={budgetLabel} />
            </View>
          </View>
        </View>
        <View className="items-end px-[16px] pt-[3px]">
          <PhotoCredit credit={trip.heroImageCredit} />
        </View>

        {trip.summary ? (
          <Text className="mx-[18px] mt-[6.5px] text-[11px] leading-[14.4px] text-brand-navy">{trip.summary}</Text>
        ) : null}

        <TripMapCard trip={trip} />

        <Text accessibilityRole="header" className="mx-[14px] mb-[6px] mt-[8px] text-[15.5px] font-bold text-brand-navy">
          {text.itinerary}
        </Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={trip.days}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 15, gap: 4 }}
          renderItem={({ item }) => {
            const selected = item.dayNumber === day?.dayNumber;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={text.day(item.dayNumber)}
                accessibilityState={{ selected }}
                onPress={() => setSelectedDay(item.dayNumber)}
                hitSlop={{ top: 8, bottom: 8 }}
                className="h-[27px] items-center justify-center rounded-full"
                style={[
                  { paddingHorizontal: selected ? 16 : 12 },
                  selected
                    ? { experimental_backgroundImage: gradients.cta }
                    : { backgroundColor: colors.white, ...softShadow },
                ]}
              >
                <Text className={`text-[9.5px] ${selected ? "font-semibold text-white" : "text-brand-navy"}`}>
                  {text.day(item.dayNumber)}
                </Text>
              </Pressable>
            );
          }}
        />

        {day ? (
          <View className="mt-[9px]">
            <View className="px-[16px]">
              <Text className="text-[13.5px] font-bold leading-[18px] text-brand-navy">{day.title}</Text>
              <Text className="text-[10px] leading-[13px] text-brand-slate">
                {formatShortDate(parseIsoDate(day.date))}
              </Text>
            </View>
            <Text className="ml-[18px] mr-[36px] mb-[10px] text-[11px] leading-[14px] text-brand-slate">{day.summary}</Text>
            <FlatList
              scrollEnabled={false}
              data={day.activities}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 12 }}
              ItemSeparatorComponent={() => <View className="h-[7px]" />}
              renderItem={({ item }) => <ActivityCard activity={item} currency={trip.currency} />}
            />
          </View>
        ) : null}

        {trip.hotels.length ? (
          <>
            <Text accessibilityRole="header" className="mx-[14px] mb-[6px] mt-[18px] text-[15.5px] font-bold text-brand-navy">
              {text.hotels}
            </Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={trip.hotels}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 13, gap: 8, paddingBottom: 6 }}
              renderItem={({ item }) => <HotelCard hotel={item} />}
            />
          </>
        ) : null}

        <Text accessibilityRole="header" className="mx-[14px] mb-[6px] mt-[18px] text-[15.5px] font-bold text-brand-navy">
          {text.budget}
        </Text>
        <BudgetCard trip={trip} />
      </ScrollView>
    </View>
  );
}

export function TripDetailsScreen({ id }: { id: string }) {
  const { data: trip, isPending, isError, refetch } = useTrip(id);

  if (isPending) {
    return (
      <StateScreen>
        <ActivityIndicator color={colors.coral} />
      </StateScreen>
    );
  }
  if (isError) {
    return (
      <StateScreen>
        <Text className="text-center text-[15px] text-brand-slate">{text.loadError}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.trips.retry}
          onPress={() => refetch()}
          className="mt-4 h-[44px] items-center justify-center rounded-full bg-brand-navy px-6"
        >
          <Text className="text-[15px] font-semibold text-white">{strings.trips.retry}</Text>
        </Pressable>
      </StateScreen>
    );
  }
  if (trip.status === "pending" || trip.status === "generating") {
    return <GeneratingView destination={trip.destinationName} />;
  }
  if (trip.status === "failed") return <FailedView errorCode={trip.errorCode} />;
  return <ReadyView trip={trip} />;
}
