import { useAuth } from "@clerk/expo";
import { Pressable, Text, View } from "react-native";

import { disableDevBypass } from "@/lib/dev-bypass";
import { strings } from "@/lib/strings";

// Placeholder profile; keeps sign-out reachable until the real screen lands.
export default function ProfileTab() {
  const { signOut, isSignedIn } = useAuth();

  async function handleSignOut() {
    disableDevBypass();
    if (isSignedIn) await signOut();
  }

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-brand-canvas">
      <Text accessibilityRole="header" className="text-[28px] font-bold text-brand-navy">
        {strings.placeholders.profile}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.placeholders.signOut}
        onPress={handleSignOut}
        className="min-h-[44px] items-center justify-center rounded-full bg-brand-navy px-6 active:opacity-80"
      >
        <Text className="text-[16px] font-semibold text-white">{strings.placeholders.signOut}</Text>
      </Pressable>
    </View>
  );
}
