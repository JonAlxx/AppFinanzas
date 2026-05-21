import React from 'react';
import { View } from 'react-native';
import { Account, Category } from '../data/types';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';
import { Icon } from '../icons/Icon';

export function CategoryBadge({
  cat, size = 44, radius = 14, iconSize,
}: { cat?: Category; size?: number; radius?: number; iconSize?: number }) {
  const { t } = useTheme();
  const bg = softFor(t, cat?.color || 'indigo');
  const fg = colorFor(t, cat?.color || 'indigo');
  return (
    <View style={{
      width: size, height: size, borderRadius: radius, backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={cat?.icon || 'tag'} size={iconSize || size * 0.5} color={fg} strokeWidth={2.2} />
    </View>
  );
}

export function AccountBadge({
  acc, size = 40, radius = 12,
}: { acc?: Account; size?: number; radius?: number }) {
  const { t } = useTheme();
  if (!acc) return <View style={{ width: size, height: size }} />;
  const c = colorFor(t, acc.color);
  const soft = softFor(t, acc.color);
  return (
    <View style={{
      width: size, height: size, borderRadius: radius, backgroundColor: soft,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={acc.icon} size={size * 0.5} color={c} />
    </View>
  );
}
