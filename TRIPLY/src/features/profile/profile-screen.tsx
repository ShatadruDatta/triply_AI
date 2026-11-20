import { useAuth, useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { disableDevBypass } from "@/lib/dev-bypass";
import { reportClientError } from "@/lib/report-error";
import { strings } from "@/lib/strings";
import { colors } from "@/lib/theme";

import { useMe } from "./queries";
import { QuotaRing } from "./quota-ring";

const defaultAvatar = require("@/assets/images/profile/avatar.png");

const cardShadow = { boxShadow: "0 6px 20px rgba(15, 23, 42, 0.06)" } as const;

function Icon({ name, size, tint }: { name: SFSymbol; size: number; tint: string }) {
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

// Features that are not built yet say so instead of doing nothing.
function comingSoon() {
  Alert.alert(strings.profile.comingSoonTitle, strings.profile.comingSoonBody);
}

function formatReset(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function ProfileCard({
  name,
  email,
  avatarUrl,
}: {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}) {
  return (
    <View className="ml-[19px] mr-[16px] h-[115px] flex-row items-center rounded-[24px] bg-white pb-[4px] pl-[12px]" style={cardShadow}>
      <Image
        accessibilityLabel={strings.profile.avatar}
        source={avatarUrl ? { uri: avatarUrl } : defaultAvatar}
        contentFit="cover"
        style={{ width: 88, height: 88, borderRadius: 44 }}
      />
      <View className="ml-[17px] flex-1 pr-3">
        {name ? (
          <Text numberOfLines={1} accessibilityRole="header" className="text-[21px] font-bold leading-[24px] text-brand-navy">
            {name}
          </Text>
        ) : null}
        {email ? (
          <Text numberOfLines={1} className="mt-[2px] text-[14px] leading-[18px] text-brand-slate">
            {email}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.profile.editProfile}
          onPress={() => router.push("/edit-profile")}
          hitSlop={5}
          className="mt-[5px] h-[34px] flex-row items-center gap-[7px] self-start rounded-full bg-brand-coralSoft px-[15px] active:opacity-70"
        >
          <Icon name="pencil" size={15} tint={colors.coral} />
          <Text className="text-[13px] font-semibold text-brand-coral">{strings.profile.editProfile}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function QuotaCard() {
  const me = useMe();
  const quota = me.data?.quota;

  return (
    <View className="ml-[19px] mr-[15px] mt-[15px] h-[138px] rounded-[24px] bg-white pl-[12px]" style={cardShadow}>
      <Text accessibilityRole="header" className="mt-[10px] text-[18px] font-bold leading-[24px] text-brand-navy">
        {strings.profile.quotaTitle}
      </Text>
      {quota ? (
        <View className="mt-[5px] flex-row items-center pl-[13px]">
          <QuotaRing
            fraction={quota.tripsTotal ? quota.tripsLeft / quota.tripsTotal : 0}
            label={strings.profile.quotaFraction(quota.tripsLeft, quota.tripsTotal)}
          />
          <View className="ml-[24px] h-[61px] w-[1px] bg-brand-line" />
          <View className="-mt-[7px] ml-[15px] flex-1">
            <Text className="text-[14.7px] font-semibold text-brand-navy">
              {strings.profile.quotaLeft(quota.tripsLeft, quota.tripsTotal)}
            </Text>
            <Text className="mt-[5px] text-[14px] text-brand-slate">
              {strings.profile.quotaResets(formatReset(quota.resetsAt))}
            </Text>
          </View>
        </View>
      ) : me.isError ? (
        <View className="flex-1 items-start justify-center gap-[8px] pb-[10px]">
          <Text className="text-[14px] text-brand-error">{strings.profile.quotaError}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.profile.retry}
            onPress={() => void me.refetch()}
            hitSlop={8}
            className="h-[34px] justify-center rounded-full bg-brand-coralSoft px-[16px] active:opacity-70"
          >
            <Text className="text-[14px] font-semibold text-brand-coral">{strings.profile.retry}</Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-[5px] flex-row items-center pl-[13px]">
          <View className="h-[87px] w-[87px] rounded-full border-[11px] border-brand-line" />
        </View>
      )}
    </View>
  );
}

function Row({
  icon,
  label,
  onPress,
  last,
}: {
  icon: SFSymbol;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={{ top: 3, bottom: 3 }}
      className="h-[39px] flex-row items-center px-[11px] active:opacity-60"
    >
      <View className="w-[45px] items-center">
        <Icon name={icon} size={25} tint={colors.navy} />
      </View>
      <Text className="ml-[10px] flex-1 text-[14px] font-semibold text-brand-navy">{label}</Text>
      <View className="mr-[7px]">
        <Icon name="chevron.right" size={11} tint={colors.slate} />
      </View>
      {last ? null : <View className="absolute bottom-0 left-[66px] right-[11px] h-[1px] bg-brand-line" />}
    </Pressable>
  );
}

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut, isSignedIn } = useAuth();
  const me = useMe();

  // Clerk's copy comes first so an edit shows up at once, before the server has synced it.
  const name = user?.fullName ?? me.data?.user.name ?? null;
  const email = user?.primaryEmailAddress?.emailAddress ?? me.data?.user.email ?? null;
  const avatarUrl = (user?.hasImage ? user.imageUrl : null) ?? me.data?.user.avatarUrl ?? null;

  async function handleSignOut() {
    try {
      disableDevBypass();
      if (isSignedIn) await signOut();
    } catch (error) {
      reportClientError(error);
      Alert.alert(strings.profile.signOut, strings.auth.errorMessage);
    }
  }

  return (
    <View className="flex-1 bg-brand-canvas">
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "ios" ? insets.bottom + 100 : 24 }}
      >
        <View style={{ paddingTop: insets.top - 19 }}>
          <View className="flex-row items-center gap-[3px] px-[22px]">
            <Icon name="paperplane.fill" size={22} tint={colors.navy} />
            <Text className="text-[19px] font-bold text-brand-navy">{strings.appName}</Text>
          </View>
          <Text accessibilityRole="header" className="mt-[16px] px-[22px] text-[27px] font-bold leading-[32px] text-brand-navy">
            {strings.profile.title}
          </Text>
          <Text className="mt-[3px] px-[22px] text-[13.2px] leading-[18px] text-brand-slate">
            {strings.profile.subtitle}
          </Text>
        </View>

        <View className="mt-[14px]">
          <ProfileCard name={name} email={email} avatarUrl={avatarUrl} />
          <QuotaCard />
        </View>

        <Text className="mt-[19px] px-[23px] text-[14.3px] font-medium leading-[18px] text-brand-slate">
          {strings.profile.accountSupport}
        </Text>
        <View className="ml-[19px] mr-[16px] mt-[7px] rounded-[24px] bg-white pb-[9.5px] pt-[3px]" style={cardShadow}>
          <Row icon="bell" label={strings.profile.notifications} onPress={comingSoon} />
          <Row icon="link" label={strings.profile.shareLinks} onPress={comingSoon} />
          <Row icon="questionmark.circle" label={strings.profile.help} onPress={() => router.push("/profile/help")} />
          <Row icon="checkmark.shield" label={strings.profile.privacy} onPress={() => router.push("/profile/privacy")} />
          <Row icon="rectangle.portrait.and.arrow.right" label={strings.profile.signOut} onPress={handleSignOut} last />
          <View className="mx-[11px] mt-[4px] h-[1px] bg-brand-line" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.profile.deleteAccount}
            onPress={comingSoon}
            hitSlop={{ top: 1, bottom: 1 }}
            className="mx-[11px] mt-[10px] h-[44px] flex-row items-center rounded-[18px] bg-brand-dangerSoft active:opacity-70"
          >
            <View className="w-[45px] items-center">
              <Icon name="trash" size={25} tint={colors.danger} />
            </View>
            <Text className="ml-[10px] flex-1 text-[14.5px] font-bold text-brand-danger">
              {strings.profile.deleteAccount}
            </Text>
            <View className="mr-[7px]">
              <Icon name="chevron.right" size={11} tint={colors.danger} />
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
