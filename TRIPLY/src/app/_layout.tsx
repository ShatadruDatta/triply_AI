import "../../global.css";

import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import { useEffect } from "react";

import { useDevBypass } from "@/lib/dev-bypass";
import { queryClient } from "@/lib/query-client";

function getPublishableKey() {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to .env");
  return key;
}

const publishableKey = getPublishableKey();

function RootNavigator() {
  const { isLoaded, isSignedIn: clerkSignedIn } = useAuth();
  const devBypass = useDevBypass();
  const isSignedIn = clerkSignedIn || devBypass;

  // Flipping the guard alone leaves the sign-in screen showing; navigate to Home explicitly.
  useEffect(() => {
    if (devBypass) router.replace("/");
  }, [devBypass]);

  if (!isLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <RootNavigator />
      </QueryClientProvider>
    </ClerkProvider>
  );
}
