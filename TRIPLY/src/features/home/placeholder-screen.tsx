import { Text, View } from "react-native";

import { strings } from "@/lib/strings";

export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-brand-canvas">
      <Text accessibilityRole="header" className="text-[28px] font-bold text-brand-navy">
        {title}
      </Text>
      <Text className="text-[15px] text-brand-slate">{strings.placeholders.comingSoon}</Text>
    </View>
  );
}
