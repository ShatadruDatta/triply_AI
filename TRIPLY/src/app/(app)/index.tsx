import { useAuth } from "@clerk/expo";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text, View } from "react-native";

import { strings } from "@/lib/strings";

// Placeholder home until the trips UI lands (M6).
export default function Home() {
  const { signOut } = useAuth();

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-brand-night px-5">
      <StatusBar style="light" />
      <Text accessibilityRole="header" className="text-[32px] font-bold text-white">
        {strings.home.title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.home.signOut}
        onPress={() => signOut()}
        className="min-h-[44px] items-center justify-center rounded-full bg-white px-6 active:opacity-80"
      >
        <Text className="text-[16px] font-semibold text-brand-navy">
          {strings.home.signOut}
        </Text>
      </Pressable>
    </View>
  );
}
