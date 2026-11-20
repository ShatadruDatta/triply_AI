import { Text, View } from 'react-native';

import { colors } from '@/lib/theme';

const SIZE = 87;
const STROKE = 11;
const RADIUS = (SIZE - STROKE) / 2;
const STEPS_PER_TURN = 100;

// A progress ring drawn with plain views (a grey track plus a row of overlapping dots along the
// arc), so no SVG library is needed. Progress starts at the top and runs clockwise; the rounded
// ends come for free from the dots.
export function QuotaRing({ fraction, label }: { fraction: number; label: string }) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const count = clamped === 0 ? 0 : Math.ceil(clamped * STEPS_PER_TURN) + 1;
  const dots = Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (clamped * 2 * Math.PI * i) / Math.max(1, count - 1);
    return {
      key: i,
      left: SIZE / 2 + RADIUS * Math.cos(angle) - STROKE / 2,
      top: SIZE / 2 + RADIUS * Math.sin(angle) - STROKE / 2,
    };
  });

  return (
    <View style={{ width: SIZE, height: SIZE }} accessible accessibilityLabel={label}>
      <View
        style={{
          position: 'absolute',
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: STROKE,
          borderColor: colors.track,
        }}
      />
      {dots.map((dot) => (
        <View
          key={dot.key}
          style={{
            position: 'absolute',
            left: dot.left,
            top: dot.top,
            width: STROKE,
            height: STROKE,
            borderRadius: STROKE / 2,
            backgroundColor: colors.teal,
          }}
        />
      ))}
      <View className="absolute inset-0 items-center justify-center">
        <Text className="text-[22px] font-bold text-brand-navy">{label}</Text>
      </View>
    </View>
  );
}
