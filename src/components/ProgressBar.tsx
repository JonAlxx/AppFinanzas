import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';

export interface ProgressBarProps {
  pct: number;
  color?: string;
  height?: number;
  bg?: string;
}

export function ProgressBar({ pct, color, height = 8, bg }: ProgressBarProps) {
  const { t } = useTheme();
  const c = colorFor(t, color || 'indigo');
  const fillColor = pct >= 100 ? t.rose : c;
  const width = Math.min(100, Math.max(0, pct));
  return (
    <View style={{
      width: '100%', height, borderRadius: height,
      backgroundColor: bg || softFor(t, color || 'indigo'),
      overflow: 'hidden',
    }}>
      <View style={{
        width: `${width}%`,
        height: '100%',
        borderRadius: height,
        backgroundColor: fillColor,
      }} />
    </View>
  );
}
