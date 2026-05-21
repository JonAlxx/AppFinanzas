import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { fmtMXN } from '../data/format';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';

import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { Icon } from '../icons/Icon';

export function GoalsScreen() {
  const { t } = useTheme();
  const { state } = useAppState();
  const { back } = useNavigation();

  const total = state.goals.reduce((s, g) => s + g.current, 0);
  const target = state.goals.reduce((s, g) => s + g.target, 0);
  const totalPct = target > 0 ? (total / target) * 100 : 0;

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        leftIcon="chevron-left"
        onLeft={back}
        title="Metas de ahorro"
        rightIcon={null}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{
          borderRadius: 22, overflow: 'hidden',
          shadowColor: t.rose, shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
        }}>
          <LinearGradient
            colors={[t.rose, t.violet]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ padding: 22 }}
          >
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.85)',
              letterSpacing: 0.3,
            }}>AHORRADO EN METAS</Text>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 30, color: '#fff',
              letterSpacing: -1, marginTop: 4,
              fontVariant: ['tabular-nums'],
            }}>{fmtMXN(total)}</Text>
            <Text style={{
              fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.85)',
              marginTop: 2,
            }}>de {fmtMXN(target)} totales</Text>
            <View style={{
              marginTop: 14, height: 6, borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden',
            }}>
              <View style={{
                height: '100%',
                width: `${Math.min(100, totalPct)}%`,
                backgroundColor: '#fff', borderRadius: 3,
              }} />
            </View>
          </LinearGradient>
        </View>

        <View style={{ marginTop: 18, gap: 12 }}>
          {state.goals.map(g => {
            const pct = (g.current / g.target) * 100;
            const c = colorFor(t, g.color);
            const soft = softFor(t, g.color);
            const daysLeft = g.deadline ? Math.ceil((g.deadline - Date.now()) / 86400000) : null;
            return (
              <Card key={g.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 50, height: 50, borderRadius: 16, backgroundColor: soft,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={g.icon} size={24} color={c} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: t.text,
                      letterSpacing: -0.3,
                    }}>{g.name}</Text>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                      marginTop: 2,
                    }}>{daysLeft != null ? `${daysLeft} días restantes` : 'Sin fecha límite'}</Text>
                  </View>
                  <View style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
                    backgroundColor: soft,
                  }}>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: c,
                    }}>{pct.toFixed(0)}%</Text>
                  </View>
                </View>
                <View style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
                  marginTop: 14, marginBottom: 8,
                }}>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 19, color: t.text,
                    letterSpacing: -0.4,
                    fontVariant: ['tabular-nums'],
                  }}>{fmtMXN(g.current)}</Text>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                    fontVariant: ['tabular-nums'],
                  }}>de {fmtMXN(g.target)}</Text>
                </View>
                <ProgressBar pct={pct} color={g.color} height={8} />
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: c, marginTop: 8,
                }}>{pct.toFixed(0)}% completado · faltan {fmtMXN(g.target - g.current)}</Text>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
