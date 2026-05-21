import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon, IconName } from '../icons/Icon';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  leftIcon?: IconName;
  onLeft?: () => void;
  rightIcon?: IconName | null;
  onRight?: () => void;
  rightBadge?: boolean;
  large?: boolean;
}

export function ScreenHeader({
  title, subtitle, leftIcon, onLeft, rightIcon = 'bell', onRight, rightBadge, large = true,
}: ScreenHeaderProps) {
  const { t, dark } = useTheme();
  const iconBtnStyle = {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: t.surface,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    ...(dark
      ? { borderWidth: 1, borderColor: t.border }
      : {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 2,
          elevation: 1,
        }),
  };
  return (
    <View style={{
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    }}>
      {leftIcon ? (
        <Pressable onPress={onLeft} style={iconBtnStyle}>
          <Icon name={leftIcon} size={20} color={t.text} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        {subtitle ? (
          <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted, marginBottom: 2 }}>
            {subtitle}
          </Text>
        ) : null}
        <Text numberOfLines={1} style={{
          fontFamily: 'PlusJakartaSans_800ExtraBold',
          fontSize: large ? 22 : 18,
          color: t.text,
          letterSpacing: -0.5,
        }}>{title}</Text>
      </View>
      {rightIcon ? (
        <Pressable onPress={onRight} style={iconBtnStyle}>
          <Icon name={rightIcon} size={20} color={t.text} />
          {rightBadge ? (
            <View style={{
              position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4,
              backgroundColor: t.rose, borderWidth: 2, borderColor: t.surface,
            }} />
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}
