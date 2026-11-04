import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { strings } from "@/lib/strings";

import { SocialButton } from "./social-button";

const backgroundImage = require("@/assets/images/auth/auth-bg.jpg");
const googleLogo = require("@/assets/images/auth/google-g.png");

// The background is fitted to the screen width and top-aligned; this fades its
// lower part into the solid night color that fills the rest of the screen.
const imageFade =
  "linear-gradient(to bottom, rgba(2,20,34,0) 63%, rgba(2,20,34,0.15) 70%, rgba(2,20,34,0.38) 77%, rgba(2,20,34,0.62) 83%, rgba(2,20,34,0.8) 88%, rgba(2,20,34,0.92) 94%, rgba(2,20,34,1) 100%)";

type SignInScreenProps = {
  onApplePress: () => void;
  onGooglePress: () => void;
};

export function SignInScreen({ onApplePress, onGooglePress }: SignInScreenProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const imageHeight = width * 2;

  return (
    <View className="flex-1 bg-brand-night">
      <StatusBar style="light" />

      <View className="absolute left-0 right-0 top-0" style={{ height: imageHeight }}>
        <Image source={backgroundImage} contentFit="cover" style={{ flex: 1 }} />
        <View
          className="absolute inset-0"
          style={{ experimental_backgroundImage: imageFade }}
        />
      </View>

      <View
        className="absolute left-0 right-0 items-center"
        style={{ top: imageHeight * 0.2525 - 16 }}
      >
        <Text
          accessibilityRole="header"
          className="text-[84px] font-bold leading-[96px] tracking-[0.5px] text-white"
          style={{
            textShadowColor: "rgba(0, 0, 0, 0.15)",
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 12,
          }}
        >
          {strings.appName}
        </Text>
        <View className="mt-[4px] items-center">
          <Text className="text-[23px] font-medium leading-[26px] text-white">
            {strings.auth.taglineLine1}
          </Text>
          <Text className="text-[23px] font-medium leading-[26px] text-white">
            {strings.auth.taglineLine2}
          </Text>
        </View>
      </View>

      <View
        className="absolute left-0 right-0 bottom-0 px-5"
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <View className="gap-[14px]">
          <SocialButton
            variant="dark"
            label={strings.auth.signInWithApple}
            onPress={onApplePress}
            icon={
              <SymbolView
                name="apple.logo"
                size={37}
                tintColor="#FFFFFF"
                fallback={null}
              />
            }
          />
          <SocialButton
            variant="light"
            label={strings.auth.continueWithGoogle}
            onPress={onGooglePress}
            icon={<Image source={googleLogo} style={{ width: 33, height: 33 }} />}
          />
        </View>

        <View className="mt-[28px] items-center">
          <Text className="text-[14px] leading-[20.5px] text-white/75">
            {strings.auth.legalLine1}
          </Text>
          <Text className="text-[14px] leading-[20.5px] text-white/75">
            {strings.auth.legalLine2}
          </Text>
        </View>
      </View>
    </View>
  );
}
