import "../../global.css";

import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClientProvider } from "@tanstack/react-query";
import { isRunningInExpoGo } from "expo";
import { router, Stack, useNavigationContainerRef } from "expo-router";
import { useEffect } from "react";

import * as Sentry from "@sentry/react-native";

import { useDevBypass } from "@/lib/dev-bypass";
import { queryClient } from "@/lib/query-client";

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

// Without a DSN (local dev) Sentry stays off.
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableLogs: true,
  // Sample everything while developing; in production keep a fraction to control volume.
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  // Navigation transactions (one per screen change), including time to initial display.
  integrations: [navigationIntegration],
  enableNativeFramesTracking: !isRunningInExpoGo(),
  // Only our own API gets the sentry-trace/baggage headers, so a request from the app and the
  // server work it triggers show up as one trace. Never forwarded to Clerk or other third parties.
  tracePropagationTargets: [/\/api\//],
  environment: __DEV__ ? "development" : "production",
  sendDefaultPii: false,
});

function getPublishableKey() {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to .env");
  return key;
}

const publishableKey = getPublishableKey();

// Bottom sheets opened from Edit Profile. They draw their own dimmed backdrop and sheet, so
// every position can match the design (iOS 26's native form sheet floats with side margins).
const preferenceSheet = {
  presentation: "transparentModal" as const,
  animation: "fade" as const,
  contentStyle: { backgroundColor: "transparent" },
};

function RootNavigator() {
  const { isLoaded, isSignedIn: clerkSignedIn, userId } = useAuth();
  const devBypass = useDevBypass();
  const isSignedIn = clerkSignedIn || devBypass;

  // Adds `user.id` to every log and error. The id only, never the email or name.
  useEffect(() => {
    Sentry.setUser(userId ? { id: userId } : null);
  }, [userId]);

  // Flipping the guard alone leaves the sign-in screen showing; navigate to Home explicitly.
  useEffect(() => {
    if (devBypass) router.replace("/");
  }, [devBypass]);

  if (!isLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(app)" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="travel-style" options={preferenceSheet} />
        <Stack.Screen name="food-preference" options={preferenceSheet} />
        <Stack.Screen name="travel-with" options={preferenceSheet} />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

function RootLayout() {
  // Lets Sentry see route changes so each screen transition becomes a transaction.
  const navigationRef = useNavigationContainerRef();
  useEffect(() => {
    if (navigationRef) navigationIntegration.registerNavigationContainer(navigationRef);
  }, [navigationRef]);

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <RootNavigator />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default Sentry.wrap(RootLayout);
