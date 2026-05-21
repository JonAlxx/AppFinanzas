import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { colorFor } from '../theme/theme';

export interface ChipProps {
  active?: boolean;
  onPress?: () => void;
  children: string;
  color?: string;
}

export function Chip({ active, onPress, children, color }: ChipProps) {
  const { t } = useTheme();
  const accent = color ? colorFor(t, color) : t.indigo;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 100,
      borderWidth: active ? 1.5 : 1,
      borderColor: active ? accent : t.border,
      backgroundColor: active ? accent : t.chipBg,
      ...(active && {
        shadowColor: accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 3,
      }),
      opacity: pressed ? 0.85 : 1,
    }]}>
      <Text style={{
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13,
        color: active ? '#fff' : t.chipText,
      }}>{children}</Text>
    </Pressable>
  );
}
