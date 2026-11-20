import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { reportClientError } from "@/lib/report-error";
import { strings } from "@/lib/strings";
import { colors, gradients } from "@/lib/theme";

import {
  foodPreferenceSchema,
  readPrefs,
  travelStyleSchema,
  travelWithSchema,
} from "./preferences";

const defaultAvatar = require("@/assets/images/profile/avatar.png");

const cardShadow = { boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)" } as const;

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

function Field({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  hint,
  labelDx = 0,
  valueDx = 0,
  ...input
}: {
  icon: SFSymbol;
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  hint?: string;
  // Small sideways offsets (pt): the design's text is not perfectly aligned from field to field.
  labelDx?: number;
  valueDx?: number;
} & Pick<React.ComponentProps<typeof TextInput>, "keyboardType" | "autoCapitalize" | "autoComplete" | "textContentType" | "maxLength">) {
  return (
    <View className="mt-[10px] h-[47.7px] flex-row items-center rounded-[24px] bg-white" style={cardShadow}>
      <View className="w-[51px] items-center pl-[1px]">
        <Icon name={icon} size={21} tint={colors.navy} />
      </View>
      <View className="flex-1 pr-[14px]">
        <Text className="text-[10.8px] leading-[16px] text-brand-slate" style={{ marginLeft: labelDx }}>
          {label}
        </Text>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={hint}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray}
          selectionColor={colors.coral}
          editable={editable}
          autoCorrect={false}
          className="h-[20px] p-0 text-[13.15px] font-semibold text-brand-navy"
          style={{ marginLeft: valueDx }}
          {...input}
        />
      </View>
    </View>
  );
}

function PreferenceRow({
  icon,
  label,
  value,
  onPress,
  last,
}: {
  icon: SFSymbol;
  label: string;
  value: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      className="h-[36.7px] flex-row items-center active:opacity-60"
    >
      <View className="w-[51.6px] items-center pr-[3px]">
        <Icon name={icon} size={22} tint={colors.navy} />
      </View>
      <Text className="flex-1 text-[11.35px] font-semibold text-brand-navy">{label}</Text>
      <Text className="mr-[10px] text-[12px] text-brand-slate">{value}</Text>
      <View className="mr-[11.6px]">
        <Icon name="chevron.right" size={11} tint={colors.slate} />
      </View>
      {last ? null : <View className="absolute bottom-0 left-[51.6px] right-0 h-[1px] bg-brand-line" />}
    </Pressable>
  );
}

// Coral switch with a sliding white thumb (the native one is a different size from the design).
function Toggle({ value, onChange, label }: { value: boolean; onChange: (next: boolean) => void; label: string }) {
  const progress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 180 });
  }, [value, progress]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: progress.value * 18 }] }));
  const track = useAnimatedStyle(() => ({
    backgroundColor: progress.value > 0.5 ? colors.coralStrong : colors.track,
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      hitSlop={10}
    >
      <Animated.View style={[{ width: 42.6, height: 24.6, borderRadius: 12.3, padding: 2 }, track]}>
        <Animated.View
          style={[
            {
              width: 20.6,
              height: 20.6,
              borderRadius: 10.3,
              backgroundColor: colors.white,
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.25)",
            },
            thumb,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

function EditProfileForm() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const initial = readPrefs(user?.unsafeMetadata);

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(initial.phone);
  const [homeCity, setHomeCity] = useState(initial.homeCity);
  // The preference sheets hand their choice back as a param when the user taps Apply; until
  // then the saved value is used.
  const params = useLocalSearchParams<{ travelStyle?: string; foodPreference?: string; travelWith?: string }>();
  const travelStyle = travelStyleSchema.safeParse(params.travelStyle).data ?? initial.travelStyle;
  const foodPreference = foodPreferenceSchema.safeParse(params.foodPreference).data ?? initial.foodPreference;
  const travelWith = travelWithSchema.safeParse(params.travelWith).data ?? initial.travelWith;
  const [travelUpdates, setTravelUpdates] = useState(initial.travelUpdates);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const avatarSource = photoUri
    ? { uri: photoUri }
    : user?.hasImage
      ? { uri: user.imageUrl }
      : defaultAvatar;

  async function changePhoto() {
    if (!user) {
      Alert.alert(strings.editProfile.saveFailedTitle, strings.editProfile.unavailable);
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      const asset = result.assets?.[0];
      if (result.canceled || !asset?.base64) return;
      setPhotoUri(asset.uri);
      setUploading(true);
      await user.setProfileImage({ file: `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}` });
    } catch (error) {
      reportClientError(error);
      setPhotoUri(null);
      Alert.alert(strings.editProfile.saveFailedTitle, strings.editProfile.photoFailedBody);
    } finally {
      if (mounted.current) setUploading(false);
    }
  }

  async function save() {
    if (!user) {
      Alert.alert(strings.editProfile.saveFailedTitle, strings.editProfile.unavailable);
      return;
    }
    const name = fullName.trim();
    if (!name) {
      Alert.alert(strings.editProfile.saveFailedTitle, strings.editProfile.nameRequired);
      return;
    }
    setSaving(true);
    try {
      const [firstName, ...rest] = name.split(/\s+/);
      await user.update({ firstName, lastName: rest.join(" ") });
      await user.updateMetadata({
        unsafeMetadata: { phone: phone.trim(), homeCity: homeCity.trim(), travelStyle, foodPreference, travelWith, travelUpdates },
      });
      router.back();
    } catch (error) {
      reportClientError(error);
      Alert.alert(strings.editProfile.saveFailedTitle, strings.editProfile.saveFailedBody);
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-brand-canvas" style={{ experimental_backgroundImage: gradients.editBg }}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
      >
        <View style={{ paddingTop: insets.top - 31 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.editProfile.back}
            onPress={() => router.back()}
            hitSlop={8}
            className="ml-[10px] h-[44px] w-[44px] items-center justify-center active:opacity-60"
          >
            <Icon name="arrow.left" size={20} tint={colors.navy} />
          </Pressable>
          <Text
            accessibilityRole="header"
            className="-mt-[6px] px-[26px] text-[24.8px] font-bold leading-[30px] text-brand-navy"
          >
            {strings.editProfile.title}
          </Text>
          <Text className="px-[26px] text-[13.2px] leading-[18px] text-brand-slate">
            {strings.editProfile.subtitle}
          </Text>
        </View>

        <View className="mt-[15px] items-center">
          <View style={{ width: 105, height: 105 }}>
            <Image
              accessibilityLabel={strings.profile.avatar}
              source={avatarSource}
              contentFit="cover"
              style={{ width: 105, height: 105, borderRadius: 52.5 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.editProfile.changePhoto}
              onPress={changePhoto}
              disabled={uploading}
              hitSlop={8}
              className="absolute -right-[3px] bottom-0 h-[36px] w-[36px] items-center justify-center rounded-full bg-white active:opacity-70"
              style={{ boxShadow: "0 3px 10px rgba(15, 23, 42, 0.12)" }}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.coral} />
              ) : (
                <Icon name="camera" size={19} tint={colors.coralStrong} />
              )}
            </Pressable>
          </View>
        </View>

        <View className="mt-[4px] pl-[16px] pr-[15.6px]">
          <Field icon="person" label={strings.editProfile.fullName} value={fullName} labelDx={0} valueDx={1} onChangeText={setFullName} autoCapitalize="words" autoComplete="name" textContentType="name" maxLength={80} />
          <Field
            icon="envelope"
            label={strings.editProfile.email}
            value={email}
            editable={false}
            labelDx={0.5}
            valueDx={0.5}
            hint={strings.editProfile.emailManaged}
            keyboardType="email-address"
          />
          <Field icon="phone" label={strings.editProfile.phone} value={phone} labelDx={1} valueDx={2.5} onChangeText={setPhone} placeholder={strings.editProfile.phonePlaceholder} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" maxLength={30} />
          <Field icon="mappin.and.ellipse" label={strings.editProfile.homeCity} value={homeCity} labelDx={1} valueDx={3} onChangeText={setHomeCity} placeholder={strings.editProfile.cityPlaceholder} autoCapitalize="words" maxLength={80} />
        </View>

        <Text accessibilityRole="header" className="mt-[17px] px-[21px] text-[18px] font-bold leading-[24px] text-brand-navy">
          {strings.editProfile.travelPreferences}
        </Text>
        <Text className="-mt-[1px] px-[22.5px] text-[12.5px] leading-[18px] text-brand-slate">
          {strings.editProfile.travelPreferencesBody}
        </Text>

        <View className="ml-[20.3px] mr-[15.5px] mt-[7px] rounded-[24px] bg-white pb-[2px] pl-[0px] pt-[1px]" style={cardShadow}>
          <PreferenceRow
            icon="suitcase"
            label={strings.editProfile.travelStyle}
            value={travelStyle}
            onPress={() => router.push({ pathname: "/travel-style", params: { value: travelStyle } })}
          />
          <PreferenceRow
            icon="fork.knife"
            label={strings.editProfile.foodPreference}
            value={foodPreference}
            onPress={() => router.push({ pathname: "/food-preference", params: { value: foodPreference } })}
          />
          <PreferenceRow
            icon="person.2"
            label={strings.editProfile.travelWith}
            value={travelWith}
            last
            onPress={() => router.push({ pathname: "/travel-with", params: { value: travelWith } })}
          />
        </View>

        <View className="ml-[16px] mr-[15.6px] mt-[13.6px] h-[55.8px] flex-row items-center rounded-[24px] bg-white" style={cardShadow}>
          <View className="w-[51px] items-center pl-[1px]">
            <Icon name="bell" size={22} tint={colors.navy} />
          </View>
          <View className="-mt-[2px] flex-1">
            <Text className="text-[11.6px] font-bold leading-[17px] text-brand-navy">{strings.editProfile.updatesTitle}</Text>
            <Text className="mt-[1px] text-[9.95px] leading-[15px] text-brand-slate">{strings.editProfile.updatesBody}</Text>
          </View>
          <View className="mr-[13.7px]">
            <Toggle
              label={strings.editProfile.updatesTitle}
              value={travelUpdates}
              onChange={setTravelUpdates}
            />
          </View>
        </View>

        <View className="mt-[30.4px] pl-[16px] pr-[15.6px]">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.editProfile.save}
            accessibilityState={{ busy: saving, disabled: saving }}
            disabled={saving}
            onPress={save}
            className="h-[41.2px] items-center justify-center rounded-full bg-brand-coralStrong active:opacity-80"
            style={{ boxShadow: "0 6px 16px rgba(253, 94, 64, 0.25)" }}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="text-[15.2px] font-semibold text-white">{strings.editProfile.save}</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.editProfile.cancel}
            onPress={() => router.back()}
            className="mt-[11.3px] h-[40.2px] items-center justify-center rounded-full bg-white active:opacity-70"
            style={cardShadow}
          >
            <Text className="text-[15px] font-semibold text-brand-navy">{strings.editProfile.cancel}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// Keyed on the user so the form fills in correctly even if Clerk finishes loading after mount.
export function EditProfileScreen() {
  const { user } = useUser();
  return <EditProfileForm key={user?.id ?? "anonymous"} />;
}
