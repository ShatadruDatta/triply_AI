import { PlanTripScreen } from "@/features/trips/plan-trip-screen";
import { useResetOnTabBlur } from "@/features/trips/use-reset-on-tab-blur";

export default function NewTrip() {
  useResetOnTabBlur();
  return <PlanTripScreen />;
}
