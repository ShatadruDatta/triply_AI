import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { strings } from "@/lib/strings";
import { colors, gradients } from "@/lib/theme";

import {
  addDays,
  buildMonthWeeks,
  daysBetween,
  formatFullDate,
  formatMonthTitle,
  isSameDay,
  startOfDay,
  type CalendarDay,
} from "./date-utils";
import { MAX_TRIP_DAYS, usePlanDraft } from "./plan-draft";
import { GradientButton, Icon, RoundStepButton, SegmentedControl, SheetHeader } from "./ui";

const text = strings.planTrip.dates;

type Mode = "dates" | "duration";
const modeOptions: { value: Mode; label: string }[] = [
  { value: "dates", label: text.tabDates },
  { value: "duration", label: text.tabDuration },
];

type DayCellProps = {
  day: CalendarDay;
  column: number;
  today: Date;
  start: Date | null;
  end: Date | null;
  onPress: (date: Date) => void;
};

function DayCell({ day, column, today, start, end, onPress }: DayCellProps) {
  const { date, inMonth } = day;

  if (!inMonth) {
    return (
      <View className="h-[40px] flex-1 items-center justify-center">
        <Text className="text-[16px] text-brand-gray/60">{date.getDate()}</Text>
      </View>
    );
  }

  const disabled = date < today;
  const isStart = isSameDay(date, start);
  const isEnd = isSameDay(date, end);
  const hasRange = !!start && !!end && !isSameDay(start, end);
  const inRange = hasRange && date >= start && date <= end;
  const selected = isStart || isEnd;

  return (
    <View className="h-[40px] flex-1 items-center justify-center">
      {inRange ? (
        <View
          className={`absolute bottom-[3px] top-[3px] bg-brand-coral/15 ${
            column === 0 || isStart ? "rounded-l-full" : ""
          } ${column === 6 || isEnd ? "rounded-r-full" : ""}`}
          style={{ left: isStart ? "50%" : 0, right: isEnd ? "50%" : 0 }}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={formatFullDate(date)}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={() => onPress(date)}
        className="h-[36px] w-[36px] items-center justify-center rounded-full"
        style={selected ? { experimental_backgroundImage: gradients.cta } : undefined}
      >
        <Text
          className={`text-[17px] ${
            selected
              ? "font-semibold text-white"
              : disabled
                ? "text-brand-gray/60"
                : "text-brand-navy"
          }`}
        >
          {date.getDate()}
        </Text>
      </Pressable>
    </View>
  );
}

export function DatesSheet() {
  const { draft, update } = usePlanDraft();
  const [mode, setMode] = useState<Mode>("dates");
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(() => {
    const base = draft.startDate ?? today;
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const { startDate, endDate } = draft;
  const weeks = buildMonthWeeks(cursor.year, cursor.month);
  const atCurrentMonth = cursor.year === today.getFullYear() && cursor.month === today.getMonth();

  function shiftMonth(delta: number) {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  }

  function selectDate(date: Date) {
    if (!startDate || endDate || date < startDate) {
      update({ startDate: date, endDate: null });
      return;
    }
    update({ endDate: date, durationDays: Math.min(daysBetween(startDate, date), MAX_TRIP_DAYS) });
  }

  function setDuration(days: number) {
    update({
      durationDays: days,
      endDate: startDate ? addDays(startDate, days - 1) : null,
    });
  }

  const hasRange = !!startDate && !!endDate;

  return (
    <View className="flex-1 bg-white px-4 pt-6">
      <SheetHeader
        icon="calendar"
        title={text.title}
        closeLabel={strings.planTrip.close}
        onClose={() => router.back()}
      />

      <SegmentedControl options={modeOptions} value={mode} onChange={setMode} className="mt-4" />

      {mode === "dates" ? (
        <View className="mt-3">
          <View className="flex-row items-center justify-between px-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={text.previousMonth}
              accessibilityState={{ disabled: atCurrentMonth }}
              disabled={atCurrentMonth}
              onPress={() => shiftMonth(-1)}
              hitSlop={10}
              className={`h-11 w-11 justify-center ${atCurrentMonth ? "opacity-30" : ""}`}
            >
              <Icon name="chevron.left" size={18} tint={colors.navy} />
            </Pressable>
            <Text accessibilityRole="header" className="text-[19px] font-bold text-brand-navy">
              {formatMonthTitle(cursor.year, cursor.month)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={text.nextMonth}
              onPress={() => shiftMonth(1)}
              hitSlop={10}
              className="h-11 w-11 items-end justify-center"
            >
              <Icon name="chevron.right" size={18} tint={colors.navy} />
            </Pressable>
          </View>

          <View className="mt-1 flex-row">
            {text.weekdays.map((weekday) => (
              <Text
                key={weekday}
                className="h-[28px] flex-1 text-center text-[14px] font-medium text-brand-navy"
              >
                {weekday}
              </Text>
            ))}
          </View>

          {weeks.map((week) => (
            <View key={week[0].date.getTime()} className="flex-row">
              {week.map((day, column) => (
                <DayCell
                  key={day.date.getTime()}
                  day={day}
                  column={column}
                  today={today}
                  start={startDate}
                  end={endDate}
                  onPress={selectDate}
                />
              ))}
            </View>
          ))}
        </View>
      ) : (
        <View className="mt-6 items-center rounded-[20px] bg-brand-mist px-4 py-6">
          <Text className="text-[15px] text-brand-slate">{text.durationLabel}</Text>
          <View className="mt-4 flex-row items-center gap-6">
            <RoundStepButton
              symbol="minus"
              label={text.decrease}
              disabled={draft.durationDays <= 1}
              onPress={() => setDuration(draft.durationDays - 1)}
            />
            <Text className="min-w-[90px] text-center text-[26px] font-bold text-brand-navy">
              {text.days(draft.durationDays)}
            </Text>
            <RoundStepButton
              symbol="plus"
              label={text.increase}
              disabled={draft.durationDays >= MAX_TRIP_DAYS}
              onPress={() => setDuration(draft.durationDays + 1)}
            />
          </View>
          <Text className="mt-4 text-center text-[12.5px] text-brand-slate">{text.durationHint}</Text>
        </View>
      )}

      <View
        className="mt-3 flex-row items-center rounded-[18px] bg-white px-4 py-3"
        style={{ boxShadow: "0 4px 18px rgba(15, 23, 42, 0.07)" }}
      >
        <Icon name="calendar" size={26} tint={colors.coral} />
        <View className="ml-3 flex-1">
          <Text className="text-[16px] font-bold text-brand-navy">{text.selectedDates}</Text>
          <Text className="mt-[2px] text-[13px] text-brand-slate">
            {startDate && endDate
              ? `${formatFullDate(startDate)} – ${formatFullDate(endDate)}`
              : startDate
                ? formatFullDate(startDate)
                : text.noDatesSelected}
          </Text>
        </View>
        {hasRange ? (
          <View className="rounded-full bg-brand-coral/15 px-3 py-[5px]">
            <Text className="text-[13px] font-medium text-brand-coral">
              {text.days(daysBetween(startDate, endDate))}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-4">
        <GradientButton label={strings.planTrip.done} onPress={() => router.back()} />
      </View>
    </View>
  );
}
