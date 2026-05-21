import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';
import { Icon, IconName } from '../icons/Icon';
import { Card } from './Card';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
  color?: string;
}

export function EmptyState({
  icon = 'sparkles', title, message, action, onAction, color = 'indigo',
}: EmptyStateProps) {
  const { t } = useTheme();
  const c = colorFor(t, color);
  const soft = softFor(t, color);
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 22 }}>
      <View style={{
        width: 56, height: 56, borderRadius: 18, backgroundColor: soft,
        alignItems: 'center', justifyContent: 'center', marginBottom: 14,
      }}>
        <Icon name={icon} size={28} color={c} />
      </View>
      <Text style={{
        fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: t.text,
        letterSpacing: -0.3, marginBottom: 6, textAlign: 'center',
      }}>{title}</Text>
      <Text style={{
        fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: t.textMuted,
        lineHeight: 19, textAlign: 'center',
      }}>{message}</Text>
      {action ? (
        <Pressable onPress={onAction} style={({ pressed }) => [{
          marginTop: 16, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14,
          backgroundColor: c, opacity: pressed ? 0.85 : 1,
        }]}>
          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#fff' }}>{action}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}
