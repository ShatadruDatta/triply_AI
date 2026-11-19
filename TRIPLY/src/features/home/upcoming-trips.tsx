import { Image } from "expo-image";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { optimizedImageUrl } from "@/lib/imagekit";
import { strings } from "@/lib/strings";
import { colors } from "@/lib/theme";

import { formatShortDate, parseIsoDate, toIsoDate } from "@/features/trips/date-utils";
import { useTrips } from "@/features/trips/queries";
import type { TripSummary } from "@/features/trips/types";
import { Icon } from "@/features/trips/ui";

const text = strings.home;
const softShadow = { boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)" } as const;

// Trips that haven't ended yet (failed ones never show here), soonest first.
export function upcomingOnly(trips: TripSummary[] | undefined) {
  const today = toIsoDate(new Date());
  return (trips ?? [])
    .filter((trip) => trip.status !== "failed" && trip.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function dateRange(trip: TripSummary) {
  const start = parseIsoDate(trip.startDate);
  const end = parseIsoDate(trip.endDate);
  return `${formatShortDate(start)} – ${formatShortDate(end)}, ${end.getFullYear()}`;
}

function TripRow({ trip }: { trip: TripSummary }) {
  const ready = trip.status === "ready";
  const image = optimizedImageUrl(trip.heroImageUrl, 300) ?? trip.heroImageUrl;
  const range = dateRange(trip);
  const city = trip.destinationName.split(",")[0];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${city}, ${range}`}
      onPress={() => router.push({ pathname: "/trips/[id]", params: { id: trip.id, from: "home" } })}
      className="mx-[14px] flex-row items-center rounded-[16px] bg-white/90 p-2 active:opacity-90"
      style={softShadow}
    >
      <View className="h-[57px] w-[82px] items-center justify-center overflow-hidden rounded-[10px] bg-brand-mist">
        {image ? (
          <Image source={{ uri: image }} contentFit="cover" style={{ width: 82, height: 57 }} />
        ) : (
          <Icon name="photo" size={20} tint={colors.gray} />
        )}
      </View>
      <View className="ml-[10px] flex-1 gap-[2px]">
        <Text numberOfLines={1} className="mr-[70px] text-[15.5px] font-bold text-brand-navy">
          {city}
        </Text>
        <View className="flex-row items-center gap-[6px]">
          <Icon name="calendar" size={14} tint={colors.slate} />
          <Text className="text-[10.5px] text-brand-slate">{range}</Text>
        </View>
        <View className="flex-row items-center gap-[6px]">
          <Icon name="person.2" size={14} tint={colors.slate} />
          <Text className="text-[10.5px] text-brand-slate">{text.travelers(trip.travelers)}</Text>
        </View>
      </View>
      {ready ? (
        <View className="absolute right-[26px] top-[8px] rounded-full bg-brand-mint px-[9px] py-[3px]">
          <Text className="text-[10px] font-semibold text-brand-teal">{text.ready}</Text>
        </View>
      ) : (
        <View className="absolute right-[26px] top-[8px] rounded-full bg-brand-warnSoft px-[9px] py-[3px]">
          <Text className="text-[10px] font-semibold text-brand-coral">
            {strings.trips.status[trip.status]}
          </Text>
        </View>
      )}
      <Icon name="chevron.right" size={13} tint={colors.slate} />
      <View className="w-2" />
    </Pressable>
  );
}

function Message({ children, action }: { children: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View className="mx-[14px] items-center rounded-[16px] bg-white/90 px-4 py-5" style={softShadow}>
      <Text className="text-center text-[13px] text-brand-slate">{children}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          className="mt-3 h-[40px] items-center justify-center rounded-full bg-brand-navy px-5"
        >
          <Text className="text-[13px] font-semibold text-white">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Home's "Your Upcoming Trips": the signed-in user's trips from the database.
export function UpcomingTrips() {
  const { data, isPending, isError, refetch } = useTrips();
  const trips = upcomingOnly(data);

  return (
    <View className="mt-[10px] gap-[10px]">
      {isPending ? (
        <View className="items-center py-6">
          <ActivityIndicator color={colors.coral} />
        </View>
      ) : isError ? (
        <Message action={{ label: strings.trips.retry, onPress: () => refetch() }}>
          {text.upcomingError}
        </Message>
      ) : trips.length === 0 ? (
        <Message action={{ label: text.planATrip, onPress: () => router.push({ pathname: "/trips/new", params: { from: "home" } }) }}>
          {text.upcomingEmpty}
        </Message>
      ) : (
        trips.map((trip) => <TripRow key={trip.id} trip={trip} />)
      )}
    </View>
  );
}
