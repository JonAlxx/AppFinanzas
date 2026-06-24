import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon, IconName } from '../icons/Icon';

export interface FormRowProps {
  icon: IconName;
  label: string;
  children?: React.ReactNode;
  onPress?: () => void;
  stack?: boolean;
}

export function FormRow({ icon, label, children, onPress, stack }: FormRowProps) {
  const { t } = useTheme();

  const inner = (
    <View style={stack ? {} : { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        ...(stack ? { marginBottom: 8 } : {}),
      }}>
        <Icon name={icon} size={18} color={t.textMuted} />
        <Text style={{
          fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: t.textMuted,
        }}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: stack ? 0 : 1, justifyContent: 'flex-end' }}>
        <View style={{ flex: stack ? 0 : 1, alignItems: 'flex-end' }}>{children}</View>
        {onPress ? <Icon name="chevron-right" size={16} color={t.textMuted} /> : null}
      </View>
    </View>
  );

  const wrapperStyle = {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  };

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [wrapperStyle, pressed && { opacity: 0.7 }]}>
        {inner}
      </Pressable>
    );
  }
  return <View style={wrapperStyle}>{inner}</View>;
}
