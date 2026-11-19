import { useLocalSearchParams } from "expo-router";

import { TripDetailsScreen } from "@/features/trips/trip-details-screen";
import { useResetOnTabBlur } from "@/features/trips/use-reset-on-tab-blur";

export default function TripDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useResetOnTabBlur();
  return <TripDetailsScreen id={id} />;
}
