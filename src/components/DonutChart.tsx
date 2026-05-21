import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

export interface DonutSegment {
  value: number;
  color: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  total: number;
  centerLabel: string;
  centerSub?: string;
  size?: number;
  thickness?: number;
}

export function DonutChart({
  segments, total, centerLabel, centerSub, size = 110, thickness = 16,
}: DonutChartProps) {
  const { t } = useTheme();
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const safeTotal = total > 0 ? total : 1;

  let offset = 0;
  const circles = segments.map((s, i) => {
    const len = (s.value / safeTotal) * circ;
    const el = (
      <Circle
        key={i}
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={s.color}
        strokeWidth={thickness}
        strokeDasharray={`${len} ${circ - len}`}
        strokeDashoffset={-offset}
        strokeLinecap="butt"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    );
    offset += len;
    return el;
  });

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={t.border} strokeWidth={thickness} />
        {circles}
      </Svg>
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{
          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: t.text,
          letterSpacing: -0.4,
        }}>{centerLabel}</Text>
        {centerSub ? (
          <Text style={{
            fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, color: t.textMuted,
            marginTop: -2,
          }}>{centerSub}</Text>
        ) : null}
      </View>
    </View>
  );
}
