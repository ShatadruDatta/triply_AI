import { useSSO } from "@clerk/expo";
import { useSignInWithApple } from "@clerk/expo/apple";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform } from "react-native";

import { strings } from "@/lib/strings";

type Provider = "apple" | "google";

type FlowResult = {
  createdSessionId: string | null;
  setActive?: (params: { session: string }) => Promise<void>;
  signUp?: { status: string | null; missingFields?: string[] } | null;
  signIn?: { status: string | null } | null;
};

const CANCELLED_CODES = ["ERR_REQUEST_CANCELED", "SIGN_IN_CANCELLED", "-5"];

function isCancellation(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  return CANCELLED_CODES.includes(String(error.code));
}

function describeError(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const clerkErrors = "errors" in error ? error.errors : undefined;
    if (Array.isArray(clerkErrors) && clerkErrors.length > 0) {
      return clerkErrors
        .map((e: { code?: string; longMessage?: string; message?: string }) =>
          [e.code, e.longMessage ?? e.message].filter(Boolean).join(": "),
        )
        .join("\n");
    }
    if ("message" in error) return String(error.message);
  }
  return strings.auth.errorMessage;
}

export function useSocialAuth() {
  const { startSSOFlow } = useSSO();
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const [pending, setPending] = useState<Provider | null>(null);

  async function run(provider: Provider, flow: () => Promise<FlowResult>) {
    if (pending) return;
    setPending(provider);
    try {
      const { createdSessionId, setActive, signUp, signIn } = await flow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/");
        return;
      }
      // No session: either the user dismissed the sheet (statuses stay empty),
      // or Clerk finished the attempt without completing it.
      const signUpStatus = signUp?.status;
      const signInStatus = signIn?.status;
      const incomplete =
        (signUpStatus && signUpStatus !== "complete") ||
        (signInStatus && signInStatus !== "complete");
      if (incomplete) {
        Alert.alert(
          strings.auth.errorTitle,
          __DEV__
            ? `signUp: ${signUpStatus ?? "-"} (${(signUp?.missingFields ?? []).join(", ")})\nsignIn: ${signInStatus ?? "-"}`
            : strings.auth.errorMessage,
        );
      }
    } catch (error) {
      if (!isCancellation(error)) {
        // Dev builds show the underlying cause; release builds show the generic copy.
        Alert.alert(
          strings.auth.errorTitle,
          __DEV__ ? describeError(error) : strings.auth.errorMessage,
        );
      }
    } finally {
      setPending(null);
    }
  }

  // Native Sign in with Apple sheet on iOS; browser SSO on Android.
  const signInWithApple = () =>
    run("apple", () =>
      Platform.OS === "ios"
        ? startAppleAuthenticationFlow()
        : startSSOFlow({ strategy: "oauth_apple" }),
    );

  const signInWithGoogle = () =>
    run("google", () => startSSOFlow({ strategy: "oauth_google" }));

  return { pending, signInWithApple, signInWithGoogle };
}
