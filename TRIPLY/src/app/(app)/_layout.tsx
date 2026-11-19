import { NativeTabs } from "expo-router/unstable-native-tabs";

import { strings } from "@/lib/strings";
import { colors } from "@/lib/theme";

export default function AppTabsLayout() {
  return (
    <NativeTabs tintColor={colors.coral}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{strings.tabs.home}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="assistant">
        <NativeTabs.Trigger.Label>{strings.tabs.assistant}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sparkles" md="auto_awesome" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="trips">
        <NativeTabs.Trigger.Label>{strings.tabs.trips}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="suitcase" md="luggage" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>{strings.tabs.profile}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person", selected: "person.fill" }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
