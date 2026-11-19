import { Stack } from "expo-router";

import { PlanDraftProvider } from "@/features/trips/plan-draft";
import { colors } from "@/lib/theme";

export const unstable_settings = { anchor: "index" };

const sheetOptions = {
  presentation: "formSheet",
  sheetGrabberVisible: true,
  sheetCornerRadius: 28,
  contentStyle: { backgroundColor: colors.white },
} as const;

export default function TripsLayout() {
  return (
    <PlanDraftProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="new" />
        <Stack.Screen
          name="select-dates"
          options={{ ...sheetOptions, sheetAllowedDetents: [0.7] }}
        />
        <Stack.Screen
          name="select-travelers"
          options={{ ...sheetOptions, sheetAllowedDetents: [0.5] }}
        />
      </Stack>
    </PlanDraftProvider>
  );
}
