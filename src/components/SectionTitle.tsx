import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface SectionTitleProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionTitle({ title, action, onAction }: SectionTitleProps) {
  const { t } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
      paddingHorizontal: 4,
    }}>
      <Text style={{
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 18, color: t.text, letterSpacing: -0.4,
      }}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold',
            color: t.indigo, fontSize: 13,
          }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
