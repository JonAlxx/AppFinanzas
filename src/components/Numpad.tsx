import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from '../icons/Icon';

let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  // Fail-safe if expo-haptics is not installed
}

function triggerLightFeedback() {
  if (Haptics && Haptics.impactAsync && Haptics.ImpactFeedbackStyle) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

export type NumpadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back';

const KEYS: NumpadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

export interface NumpadProps {
  onPress: (key: NumpadKey) => void;
}

export function Numpad({ onPress }: NumpadProps) {
  const { t } = useTheme();
  return (
    <View style={{
      backgroundColor: t.surface,
      paddingHorizontal: 14, paddingTop: 14, paddingBottom: 24,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      flexDirection: 'row', flexWrap: 'wrap',
      shadowColor: '#0F172A', shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
    }}>
      {KEYS.map(k => (
        <View key={k} style={{ width: '33.333%', padding: 3 }}>
          <Pressable
            onPress={() => {
              triggerLightFeedback();
              onPress(k);
            }}
            style={({ pressed }) => [{
              height: 46, borderRadius: 14,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: pressed ? t.bg : 'transparent',
            }]}
          >
            {k === 'back' ? (
              <Icon name="chevron-left" size={22} color={t.text} />
            ) : (
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: t.text,
              }}>{k}</Text>
            )}
          </Pressable>
        </View>
      ))}
    </View>
  );
}
