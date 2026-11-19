import { router } from "expo-router";
import { Text, View } from "react-native";

import { strings } from "@/lib/strings";
import { colors } from "@/lib/theme";

import { MAX_TRAVELERS, totalTravelers, usePlanDraft } from "./plan-draft";
import { GradientButton, Icon, RoundStepButton, SheetHeader } from "./ui";

const text = strings.planTrip.travelersSheet;

type Row = {
  key: "adults" | "children" | "infants";
  title: string;
  subtitle: string;
  min: number;
};

const rows: Row[] = [
  { key: "adults", title: text.adults, subtitle: text.adultsAge, min: 1 },
  { key: "children", title: text.children, subtitle: text.childrenAge, min: 0 },
  { key: "infants", title: text.infants, subtitle: text.infantsAge, min: 0 },
];

export function TravelersSheet() {
  const { draft, update } = usePlanDraft();
  const total = totalTravelers(draft);

  return (
    <View className="flex-1 bg-white px-4 pt-6">
      <SheetHeader
        icon="person.2"
        title={strings.planTrip.travelersSheet.title}
        closeLabel={strings.planTrip.close}
        onClose={() => router.back()}
      />

      <View
        className="mt-4 rounded-[20px] bg-white px-4"
        style={{ boxShadow: "0 4px 18px rgba(15, 23, 42, 0.07)" }}
      >
        {rows.map((row, index) => (
          <View
            key={row.key}
            className={`flex-row items-center justify-between py-3 ${
              index > 0 ? "border-t border-brand-line" : ""
            }`}
          >
            <View>
              <Text className="text-[17px] font-bold text-brand-navy">{row.title}</Text>
              <Text className="mt-[2px] text-[14px] text-brand-slate">{row.subtitle}</Text>
            </View>
            <View className="flex-row items-center gap-4">
              <RoundStepButton
                symbol="minus"
                label={text.decrease(row.title)}
                disabled={draft[row.key] <= row.min}
                onPress={() => update({ [row.key]: draft[row.key] - 1 })}
              />
              <Text className="w-[24px] text-center text-[18px] font-bold text-brand-navy">
                {draft[row.key]}
              </Text>
              <RoundStepButton
                symbol="plus"
                label={text.increase(row.title)}
                disabled={total >= MAX_TRAVELERS}
                onPress={() => update({ [row.key]: draft[row.key] + 1 })}
              />
            </View>
          </View>
        ))}
      </View>

      <View className="mt-5 h-[50px] flex-row items-center justify-between rounded-[16px] bg-brand-mist px-4">
        <View className="flex-row items-center gap-3">
          <Icon name="person.2" size={22} tint={colors.navy} />
          <Text className="text-[16px] font-bold text-brand-navy">{text.total}</Text>
        </View>
        <Text className="text-[20px] font-bold text-brand-navy">{total}</Text>
      </View>

      <View className="mt-6">
        <GradientButton label={strings.planTrip.done} onPress={() => router.back()} />
      </View>
    </View>
  );
}
