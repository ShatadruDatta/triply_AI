import { openBrowserAsync } from "expo-web-browser";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

import { strings } from "@/lib/strings";
import { colors, gradients } from "@/lib/theme";

import type { TripDetail } from "./types";
import { Icon } from "./ui";

const text = strings.trips.detail;
const MAP_HEIGHT = 148;

type Point = { x: number; y: number };
type Stop = { label: string; sub: string; at: Point };

// Stylised island scenery behind the route (fractions of the map box).
const islands = [
  { x: 0.1, y: 0.06, w: 58, h: 32, rot: -25 },
  { x: 0.02, y: 0.36, w: 30, h: 24, rot: 10 },
  { x: 0.46, y: 0.2, w: 84, h: 30, rot: -14 },
  { x: 0.57, y: 0.6, w: 112, h: 46, rot: -14 },
  { x: 0.46, y: 0.64, w: 46, h: 40, rot: 20 },
  { x: 0.78, y: 0.86, w: 62, h: 30, rot: -10 },
  { x: 0.9, y: 0.08, w: 28, h: 20, rot: 0 },
] as const;

// Solid teardrop map pin with a white hole.
function DropPin({ size }: { size: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderBottomRightRadius: 0,
        backgroundColor: colors.coral,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ rotate: "45deg" }],
      }}
    >
      <View
        style={{ width: size * 0.36, height: size * 0.36, borderRadius: size, backgroundColor: colors.white }}
      />
    </View>
  );
}

function cubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function dashedPath(points: [Point, Point, Point, Point], steps = 26) {
  return Array.from({ length: steps + 1 }, (_, i) => cubic(...points, i / steps)).filter(
    (_, i) => i % 2 === 0,
  );
}

function StopChip({ stop, width, height }: { stop: Stop; width: number; height: number }) {
  const left = stop.at.x * width - 14;
  return (
    <View
      className="absolute flex-row items-center gap-[4px] rounded-full bg-white/85 py-[3px] pl-[3px] pr-[8px]"
      style={{
        left,
        top: stop.at.y * height - 31,
        maxWidth: Math.min(width - left - 8, width * 0.22),
      }}
    >
      <View className="h-[17px] w-[17px] items-center justify-center rounded-full bg-brand-coral">
        <Icon name="mappin" size={8} tint={colors.white} />
      </View>
      <View className="shrink">
        <Text numberOfLines={2} className="text-[7.5px] font-bold leading-[9.5px] text-brand-navy">
          {stop.label}
        </Text>
        <Text className="text-[7.5px] leading-[9.5px] text-brand-navy">{stop.sub}</Text>
      </View>
    </View>
  );
}

export function TripMapCard({ trip }: { trip: TripDetail }) {
  // Card margin (10) + padding (2) + border (1) on each side.
  const width = useWindowDimensions().width - 2 * (10 + 2 + 1);
  const city = trip.destinationName.split(",")[0];

  // Route: arrival, then the first activity of the next two days.
  const stops: Stop[] = [
    { label: "", sub: "", at: { x: 0.165, y: 0.494 } },
    ...trip.days
      .slice(1, 3)
      .flatMap((day, index) => {
        const first = day.activities[0];
        if (!first) return [];
        return [
          {
            label: first.name,
            sub: text.day(day.dayNumber),
            at: index === 0 ? { x: 0.607, y: 0.263 } : { x: 0.783, y: 0.59 },
          },
        ];
      }),
  ];
  const [, second, third] = stops;
  const routeNames = [city, ...stops.slice(1).map((s) => s.label)];

  const firstLeg = second
    ? dashedPath([
        { x: 0.19, y: 0.46 },
        { x: 0.35, y: 0.56 },
        { x: 0.5, y: 0.5 },
        { x: second.at.x, y: second.at.y + 0.04 },
      ])
    : [];
  const secondLeg =
    second && third
      ? dashedPath([
          { x: second.at.x, y: second.at.y + 0.04 },
          { x: 0.66, y: 0.38 },
          { x: 0.6, y: 0.62 },
          { x: third.at.x, y: third.at.y },
        ])
      : [];
  const plane = firstLeg[Math.floor(firstLeg.length * 0.4)];

  return (
    <View
      className="mx-[10px] mt-[10px] rounded-[14px] border border-brand-line bg-white p-[2px]"
      style={{ boxShadow: "0 4px 14px rgba(15, 23, 42, 0.07)" }}
    >
      <View className="h-[25px] flex-row items-center justify-between px-[8px]">
        <View className="flex-row items-center gap-[5px]">
          <DropPin size={12} />
          <Text accessibilityRole="header" className="text-[11.8px] font-bold text-brand-navy">
            {text.tripMap}
          </Text>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={text.viewFullMap}
          onPress={() =>
            openBrowserAsync(
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.destinationName)}`,
            )
          }
          hitSlop={10}
          className="flex-row items-center gap-[3px]"
        >
          <Text className="text-[8px] font-semibold text-brand-link">{text.viewFullMap}</Text>
          <Icon name="arrow.up.right" size={8} tint={colors.link} />
        </Pressable>
      </View>

      <View
        className="overflow-hidden rounded-[10px]"
        style={{ height: MAP_HEIGHT, experimental_backgroundImage: gradients.ocean }}
      >
        {width > 0 ? (
          <>
            {islands.map((island, index) => (
              <View
                key={index}
                className="absolute rounded-[40px]"
                style={{
                  left: island.x * width,
                  top: island.y * MAP_HEIGHT,
                  width: island.w,
                  height: island.h,
                  backgroundColor: colors.oceanLand,
                  borderWidth: 2,
                  borderColor: colors.oceanLandLight,
                  opacity: 0.85,
                  transform: [{ rotate: `${island.rot}deg` }],
                }}
              />
            ))}

            {[...firstLeg, ...secondLeg].map((point, index) => (
              <View
                key={index}
                className="absolute h-[3.5px] w-[3.5px] rounded-full bg-white"
                style={{ left: point.x * width - 1.75, top: point.y * MAP_HEIGHT - 1.75 }}
              />
            ))}
            {plane ? (
              <View
                className="absolute"
                style={{
                  left: plane.x * width - 9,
                  top: plane.y * MAP_HEIGHT - 17,
                  transform: [{ rotate: "-8deg" }],
                }}
              >
                <Icon name="airplane" size={19} tint={colors.white} />
              </View>
            ) : null}

            <View
              className="absolute items-center"
              style={{ left: 0.165 * width - 26, top: 0.494 * MAP_HEIGHT - 12 }}
            >
              <View className="h-[22px] w-[22px] items-center justify-center">
                <DropPin size={17} />
              </View>
              <View className="-mt-[1px] items-center rounded-[6px] bg-white/85 px-[6px] py-[1px]">
                <Text className="text-[8px] font-bold leading-[10px] text-brand-navy">{city}</Text>
                <Text className="text-[8px] leading-[10px] text-brand-navy">{text.arrival}</Text>
              </View>
            </View>

            {stops.slice(1).map((stop) => (
              <StopChip key={stop.sub} stop={stop} width={width} height={MAP_HEIGHT} />
            ))}
          </>
        ) : null}

        {routeNames.length > 1 ? (
          <View className="absolute bottom-[7px] left-[7px] max-w-[34%] flex-row items-center gap-[6px] rounded-[10px] bg-white/85 px-[8px] py-[6px]">
            <Icon name="airplane" size={14} tint={colors.link} />
            <Text numberOfLines={2} className="shrink text-[8px] leading-[11px] text-brand-navy">
              {routeNames.join(" → ")}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
