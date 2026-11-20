import { StatusBar } from "expo-status-bar";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { strings } from "@/lib/strings";
import { colors, gradients } from "@/lib/theme";

import { PageHero } from "./page-hero";

const heroImage = require("@/assets/images/profile/privacy-hero.png");

const circleShadow = { boxShadow: "0 3px 10px rgba(15, 23, 42, 0.08)" } as const;

// One icon per section, in the order of strings.privacy.sections. The last three sit slightly
// further right than the first three, exactly as in the design.
// `nudge` moves a section up or down a little: the design's gaps are not perfectly even.
const sectionLook: { icon: SFSymbol; indent: number; nudge: number }[] = [
  { icon: "cylinder.split.1x2", indent: 0, nudge: -1 },
  { icon: "scope", indent: 0, nudge: -0.5 },
  { icon: "person.2", indent: 0, nudge: 0 },
  { icon: "lock", indent: 5.5, nudge: 2 },
  { icon: "slider.horizontal.3", indent: 5.5, nudge: -5.5 },
  { icon: "info.circle", indent: 5.5, nudge: 2.5 },
];

export function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-brand-canvas">
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "ios" ? insets.bottom + 100 : 24 }}
      >
        <PageHero
          title={strings.privacy.title}
          subtitle={strings.privacy.subtitle}
          subtitleMaxWidth={316}
          subtitleSize={12.6}
          edgeWidth={14}
          topFadeHeight={10}
          art={{ source: heroImage, width: 120, height: 141, top: 62 }}
          gradient={gradients.privacyHero}
          edgeGradient={gradients.privacyHeroEdge}
          topGradient={gradients.privacyHeroTop}
        />

        <View className="-mt-[12px] rounded-t-[26px] bg-brand-canvas pl-[21px] pr-[10px] pt-[5px]">
          {strings.privacy.sections.map((section, index) => {
            const look = sectionLook[index];
            return (
              <View key={section.id} className="pt-[13px]" style={{ marginTop: look.nudge }}>
                <View
                  className="absolute left-[-3px] top-[9.5px] h-[41px] w-[41px] items-center justify-center rounded-full bg-white"
                  style={circleShadow}
                >
                  <SymbolView
                    name={look.icon}
                    size={22}
                    tintColor={colors.navy}
                    resizeMode="scaleAspectFit"
                    style={{ width: 22, height: 22 }}
                  />
                </View>
                <View style={{ marginLeft: 51 + look.indent }}>
                  <Text accessibilityRole="header" className="text-[14.3px] font-bold leading-[22px] text-brand-navy">
                    {section.title}
                  </Text>
                  <Text className="mt-[4px] text-[10.45px] leading-[15.5px] text-brand-slate">{section.body}</Text>
                </View>
                {index < strings.privacy.sections.length - 1 ? (
                  <View className="mr-[7px] mt-[15px] h-[1px] bg-brand-line" />
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
