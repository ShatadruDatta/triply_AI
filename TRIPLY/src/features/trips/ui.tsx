import { SymbolView, type SFSymbol } from "expo-symbols";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { colors, gradients } from "@/lib/theme";

export function Icon({ name, size, tint }: { name: SFSymbol; size: number; tint: string }) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={tint}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
    />
  );
}

const softShadow = { boxShadow: "0 4px 14px rgba(15, 23, 42, 0.07)" } as const;

type SegmentedControlProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <View
      className={`h-[36px] flex-row rounded-full bg-white/85 p-[2px] ${className ?? ""}`}
      style={softShadow}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className="flex-1 items-center justify-center rounded-full"
            style={selected ? { experimental_backgroundImage: gradients.cta } : undefined}
          >
            <Text
              className={`text-[14px] ${selected ? "font-medium text-white" : "text-brand-navy"}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function GradientButton({
  label,
  onPress,
  leading,
  trailing,
  loading,
}: {
  label: string;
  onPress: () => void;
  leading?: SFSymbol;
  trailing?: SFSymbol;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: !!loading, disabled: !!loading }}
      disabled={loading}
      onPress={onPress}
      className={`h-[46px] flex-row items-center justify-center gap-3 rounded-full active:opacity-90 ${
        loading ? "opacity-80" : ""
      }`}
      style={{
        experimental_backgroundImage: gradients.cta,
        boxShadow: "0 8px 18px rgba(255, 90, 58, 0.35)",
      }}
    >
      {loading ? <ActivityIndicator color={colors.white} /> : null}
      {leading && !loading ? <Icon name={leading} size={20} tint={colors.white} /> : null}
      <Text className="text-[17px] font-semibold text-white">{label}</Text>
      {trailing ? (
        <View className="absolute right-5">
          <Icon name={trailing} size={20} tint={colors.white} />
        </View>
      ) : null}
    </Pressable>
  );
}

export function SheetHeader({
  icon,
  title,
  closeLabel,
  onClose,
}: {
  icon: SFSymbol;
  title: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-3">
        <Icon name={icon} size={24} tint={colors.navy} />
        <Text accessibilityRole="header" className="text-[19px] font-bold text-brand-navy">
          {title}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        onPress={onClose}
        hitSlop={6}
        className="h-[36px] w-[36px] items-center justify-center rounded-full border border-brand-line bg-white active:opacity-70"
      >
        <Icon name="xmark" size={14} tint={colors.navy} />
      </Pressable>
    </View>
  );
}

export function RoundStepButton({
  symbol,
  label,
  onPress,
  disabled,
}: {
  symbol: "plus" | "minus";
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      className={`h-[36px] w-[36px] items-center justify-center rounded-full bg-brand-mist active:opacity-70 ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <Icon name={symbol} size={14} tint={colors.navy} />
    </Pressable>
  );
}
