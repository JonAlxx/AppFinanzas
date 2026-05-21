import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { Icon, IconName } from '../icons/Icon';

export type BottomTabId = 'dashboard' | 'transactions' | 'accounts' | 'reports' | null;

interface Tab {
  id: BottomTabId | 'fab';
  label: string;
  icon: IconName;
}

const TABS: Tab[] = [
  { id: 'dashboard', label: 'Inicio', icon: 'home' },
  { id: 'transactions', label: 'Movs', icon: 'list' },
  { id: 'fab', label: '', icon: 'plus' },
  { id: 'accounts', label: 'Cuentas', icon: 'wallet' },
  { id: 'reports', label: 'Análisis', icon: 'chart' },
];

export interface BottomBarProps {
  current: BottomTabId;
  onChange: (id: Exclude<BottomTabId, null>) => void;
  onFab: () => void;
}

export function BottomBar({ current, onChange, onFab }: BottomBarProps) {
  const { t, dark } = useTheme();
  return (
    <View style={{
      position: 'absolute', bottom: 14, left: 14, right: 14,
      height: 64, borderRadius: 28,
      backgroundColor: t.surface,
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-around',
      paddingHorizontal: 6,
      ...(dark
        ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }
        : {
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.18,
            shadowRadius: 24,
            elevation: 16,
          }),
    }}>
      {TABS.map(tab => {
        if (tab.id === 'fab') {
          return (
            <Pressable key="fab" onPress={onFab} style={({ pressed }) => [{
              width: 52, height: 52, borderRadius: 18,
              marginTop: -16, marginHorizontal: 2,
              shadowColor: t.indigo, shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5, shadowRadius: 20, elevation: 8,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            }]}>
              <LinearGradient
                colors={[t.indigo, t.violet]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{
                  width: '100%', height: '100%', borderRadius: 18,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icon name="plus" size={26} color="#fff" strokeWidth={2.5} />
              </LinearGradient>
            </Pressable>
          );
        }
        const active = current === tab.id;
        return (
          <Pressable
            key={tab.id ?? ''}
            onPress={() => tab.id && onChange(tab.id as Exclude<BottomTabId, null>)}
            style={{
              flex: 1, alignItems: 'center', gap: 2,
              paddingVertical: 6, paddingHorizontal: 4,
            }}
          >
            <Icon name={tab.icon} size={22} color={active ? t.indigo : t.textMuted} strokeWidth={active ? 2.3 : 2} />
            <Text style={{
              fontFamily: active ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_600SemiBold',
              fontSize: 10.5,
              color: active ? t.indigo : t.textMuted,
              letterSpacing: 0.1,
            }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
