import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

type SocialButtonProps = {
  label: string;
  icon: ReactNode;
  variant: "dark" | "light";
  onPress: () => void;
};

export function SocialButton({ label, icon, variant, onPress }: SocialButtonProps) {
  const isDark = variant === "dark";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`h-[56px] flex-row items-center justify-center gap-[18px] rounded-full active:opacity-80 ${
        isDark ? "border border-white/15 bg-black" : "bg-white"
      }`}
      style={{ boxShadow: "0px 6px 16px rgba(0, 0, 0, 0.25)" }}
    >
      <View className="items-center justify-center">{icon}</View>
      <Text
        className={`font-semibold ${
          isDark ? "text-[19.5px] text-white" : "text-[18px] text-brand-navy"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
