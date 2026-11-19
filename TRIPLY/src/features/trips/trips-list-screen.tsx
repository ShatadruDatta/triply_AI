import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { optimizedImageUrl } from "@/lib/imagekit";
import { strings } from "@/lib/strings";
import { colors, gradients } from "@/lib/theme";

import { formatShortDate, parseIsoDate } from "./date-utils";
import { ApiError } from "@/lib/api";

import { useDeleteTrip, useTrips } from "./queries";
import type { TripStatus, TripSummary } from "./types";
import { Icon } from "./ui";

const text = strings.trips;

const pillStyle: Record<TripStatus, { box: string; label: string }> = {
  ready: { box: "bg-brand-mint", label: "text-brand-teal" },
  pending: { box: "bg-brand-warnSoft", label: "text-brand-coral" },
  generating: { box: "bg-brand-warnSoft", label: "text-brand-coral" },
  failed: { box: "bg-brand-errorSoft", label: "text-brand-error" },
};

function TripCard({ trip }: { trip: TripSummary }) {
  const pill = pillStyle[trip.status];
  const deleteTrip = useDeleteTrip();
  const busy = trip.status === "pending" || trip.status === "generating";

  function confirmDelete() {
    Alert.alert(text.deleteTitle, text.deleteBody(trip.destinationName), [
      { text: text.deleteCancel, style: "cancel" },
      {
        text: text.deleteConfirm,
        style: "destructive",
        onPress: () =>
          deleteTrip.mutate(trip.id, {
            onError: (failure) =>
              Alert.alert(
                failure instanceof ApiError && failure.code === "generation_in_progress"
                  ? text.deleteBusy
                  : text.deleteFailed,
              ),
          }),
      },
    ]);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trip.destinationName}, ${text.status[trip.status]}`}
      onPress={() => router.push({ pathname: "/trips/[id]", params: { id: trip.id } })}
      className="h-[132px] justify-end overflow-hidden rounded-[20px] bg-brand-navy active:opacity-90"
    >
      {trip.heroImageUrl ? (
        <Image
          source={{ uri: optimizedImageUrl(trip.heroImageUrl, 900) ?? trip.heroImageUrl }}
          contentFit="cover"
          style={{ position: "absolute", inset: 0 }}
        />
      ) : null}
      <View className="absolute inset-0" style={{ experimental_backgroundImage: gradients.cardScrim }} />
      <View className={`absolute right-3 top-3 rounded-full px-3 py-[4px] ${pill.box}`}>
        <Text className={`text-[11.5px] font-semibold ${pill.label}`}>{text.status[trip.status]}</Text>
      </View>
      {busy ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.deleteLabel}
          onPress={confirmDelete}
          disabled={deleteTrip.isPending}
          hitSlop={4}
          className="absolute bottom-2 right-2 h-[44px] w-[44px] items-center justify-center rounded-full bg-black/40 active:opacity-70"
        >
          {deleteTrip.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Icon name="trash" size={18} tint={colors.white} />
          )}
        </Pressable>
      )}
      <View className="p-3 pr-14">
        <Text numberOfLines={1} className="text-[20px] font-bold text-white">
          {trip.destinationName}
        </Text>
        <Text className="mt-[2px] text-[12.5px] text-white">
          {formatShortDate(parseIsoDate(trip.startDate))} – {formatShortDate(parseIsoDate(trip.endDate))}
          {" · "}
          {strings.home.travelers(trip.travelers)}
        </Text>
      </View>
    </Pressable>
  );
}

export function TripsListScreen() {
  const insets = useSafeAreaInsets();
  const { data, isPending, isError, refetch } = useTrips();
  const listRef = useRef<FlatList<TripSummary>>(null);
  // Only a manual pull-to-refresh drives the spinner. Showing it for background refetches
  // (e.g. right after a trip is created) leaves iOS with a broken scroll offset.
  const [pulling, setPulling] = useState(false);

  async function pullToRefresh() {
    setPulling(true);
    try {
      await refetch();
    } finally {
      setPulling(false);
    }
  }

  // Always show the list from the top when the screen comes into view.
  useFocusEffect(
    useCallback(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, []),
  );

  return (
    <View className="flex-1 bg-brand-canvas">
      <StatusBar style="dark" />
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={pulling}
        onRefresh={pullToRefresh}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 8,
          paddingBottom: Platform.OS === "ios" ? insets.bottom + 61 : 24,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <View className="mb-4 flex-row items-center justify-between">
            <Text accessibilityRole="header" className="text-[30px] font-bold text-brand-navy">
              {text.listTitle}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={text.planCta}
              onPress={() => router.push("/trips/new")}
              hitSlop={6}
              className="h-[40px] w-[40px] items-center justify-center rounded-full active:opacity-80"
              style={{ experimental_backgroundImage: gradients.cta }}
            >
              <Icon name="plus" size={18} tint={colors.white} />
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          isPending ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.coral} />
            </View>
          ) : isError ? (
            <View className="flex-1 items-center justify-center gap-4">
              <Text className="text-center text-[15px] text-brand-slate">{text.loadError}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={text.retry}
                onPress={() => refetch()}
                className="h-[44px] items-center justify-center rounded-full bg-brand-navy px-6"
              >
                <Text className="text-[15px] font-semibold text-white">{text.retry}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center pb-16">
              <Icon name="suitcase" size={44} tint={colors.gray} />
              <Text className="mt-4 text-[20px] font-bold text-brand-navy">{text.listEmptyTitle}</Text>
              <Text className="mt-1 text-center text-[14px] text-brand-slate">{text.listEmptyBody}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={text.planCta}
                onPress={() => router.push("/trips/new")}
                className="mt-5 h-[46px] items-center justify-center rounded-full px-8 active:opacity-90"
                style={{ experimental_backgroundImage: gradients.cta }}
              >
                <Text className="text-[16px] font-semibold text-white">{text.planCta}</Text>
              </Pressable>
            </View>
          )
        }
        renderItem={({ item }) => <TripCard trip={item} />}
      />
    </View>
  );
}
