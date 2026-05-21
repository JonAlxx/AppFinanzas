import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: number;
  radius?: number;
}

export function Card({ children, style, onPress, padding = 18, radius = 22 }: CardProps) {
  const { t, dark } = useTheme();
  const containerStyle: StyleProp<ViewStyle> = {
    backgroundColor: t.surface,
    borderRadius: radius,
    padding,
    ...(dark
      ? { borderWidth: 1, borderColor: t.border }
      : {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        }),
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [containerStyle, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[containerStyle, style]}>{children}</View>;
}
