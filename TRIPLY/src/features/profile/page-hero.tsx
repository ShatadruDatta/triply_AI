import { Image, type ImageSource } from "expo-image";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { strings } from "@/lib/strings";
import { colors } from "@/lib/theme";

type Art = { source: ImageSource; width: number; height: number; top: number };

// Back arrow, title, subtitle and illustration shared by the profile sub-pages. The art's top and
// left edges fade into the background colours so the cropped picture has no visible seam.
export function PageHero({
  title,
  subtitle,
  subtitleMaxWidth,
  subtitleSize = 13,
  edgeWidth = 58,
  topFadeHeight = 36,
  art,
  gradient,
  edgeGradient,
  topGradient,
}: {
  title: string;
  subtitle: string;
  subtitleMaxWidth: number;
  subtitleSize?: number;
  // How far the art fades into the background on its left and top edges.
  edgeWidth?: number;
  topFadeHeight?: number;
  art: Art;
  gradient: string;
  edgeGradient: string;
  topGradient: string;
}) {
  const insets = useSafeAreaInsets();
  const edge = Math.min(edgeWidth, art.width / 2);

  return (
    <View style={{ height: 215, paddingTop: insets.top - 15, experimental_backgroundImage: gradient }}>
      <Image
        source={art.source}
        contentFit="cover"
        style={{ position: "absolute", right: 0, top: art.top, width: art.width, height: art.height }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: art.width - edge,
          top: art.top,
          width: edge,
          height: art.height,
          experimental_backgroundImage: edgeGradient,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: 0,
          top: art.top,
          width: art.width,
          height: topFadeHeight,
          experimental_backgroundImage: topGradient,
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.help.back}
        onPress={() => router.back()}
        hitSlop={8}
        className="ml-[13px] h-[44px] w-[44px] items-center justify-center active:opacity-60"
      >
        <SymbolView
          name="arrow.left"
          size={20}
          tintColor={colors.navy}
          resizeMode="scaleAspectFit"
          style={{ width: 20, height: 20 }}
        />
      </Pressable>
      <Text
        accessibilityRole="header"
        className="mt-[6px] px-[22px] text-[28.5px] font-bold leading-[34px] text-brand-navy"
      >
        {title}
      </Text>
      <Text
        className="mt-[6px] px-[22px] leading-[20px] text-brand-navy"
        style={{ maxWidth: subtitleMaxWidth, fontSize: subtitleSize }}
      >
        {subtitle}
      </Text>
    </View>
  );
}
