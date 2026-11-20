import { Stack } from "expo-router";

export const unstable_settings = { anchor: "index" };

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="help" />
      <Stack.Screen name="privacy" />
    </Stack>
  );
}
