import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

import { catById } from '../data/catalog';
import { fmtMXN } from '../data/format';
import { spentByCategory } from '../data/selectors';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';

import { CategoryBadge } from '../components/Badges';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionTitle } from '../components/SectionTitle';

export function BudgetsScreen() {
  const { t } = useTheme();
  const { state } = useAppState();
  const { navigate } = useNavigation();

  const data = useMemo(() => state.budgets.map(b => {
    const cat = catById(b.categoryId, state.customCategories);
    const spent = spentByCategory(state.transactions, b.categoryId, 30);
    return { ...b, cat, spent, pct: (spent / b.limit) * 100, remaining: b.limit - spent };
  }), [state.budgets, state.transactions, state.customCategories]);

  const totalLimit = data.reduce((s, b) => s + b.limit, 0);
  const totalSpent = data.reduce((s, b) => s + b.spent, 0);
  const overall = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
  const overallPct = Math.min(100, overall);
  const r = 32, c = 2 * Math.PI * r;
  const dashLen = (overallPct / 100) * c;

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader subtitle="Tus" title="Presupuestos" rightIcon={null} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall card */}
        <View style={{
          borderRadius: 22, overflow: 'hidden',
          shadowColor: t.indigo, shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
        }}>
          <LinearGradient
            colors={[t.indigo, t.violet]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ padding: 22 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#C7D2FE',
                }}>Este mes</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 28, color: '#fff',
                  letterSpacing: -0.8, marginTop: 4,
                  fontVariant: ['tabular-nums'],
                }}>{fmtMXN(totalSpent)}</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: '#C7D2FE',
                  marginTop: 2,
                }}>de {fmtMXN(totalLimit)}</Text>
              </View>
              <View style={{ width: 80, height: 80, position: 'relative' }}>
                <Svg width={80} height={80}>
                  <Circle cx={40} cy={40} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={8} />
                  <Circle
                    cx={40} cy={40} r={r}
                    fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round"
                    strokeDasharray={`${dashLen} ${c}`}
                    transform={`rotate(-90 40 40)`}
                  />
                </Svg>
                <View style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: '#fff',
                    letterSpacing: -0.3,
                  }}>{overall.toFixed(0)}%</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={{ marginTop: 18 }}>
          <SectionTitle title="Por categoría" />
          {data.length === 0 ? (
            <View style={{ marginTop: 12 }}>
              <EmptyState
                icon="bolt"
                color="indigo"
                title="Sin presupuestos aún"
                message="Crea presupuestos por categoría para controlar tus gastos y recibir alertas."
                action="Próximamente"
              />
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 12 }}>
              {data.map(b => {
                const over = b.pct >= 100;
                const warn = b.pct >= 80;
                const pctColor = over ? t.rose : warn ? t.orange : t.textMuted;
                const barColor = over ? 'rose' : warn ? 'orange' : b.cat?.color;
                return (
                  <Card key={b.id}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <CategoryBadge cat={b.cat} size={42} radius={13} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <Text style={{
                            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: t.text,
                          }}>{b.cat?.name}</Text>
                          <Text style={{
                            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: pctColor,
                            fontVariant: ['tabular-nums'],
                          }}>{b.pct.toFixed(0)}%</Text>
                        </View>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                          marginTop: 2,
                        }}>{fmtMXN(b.spent)} de {fmtMXN(b.limit)}</Text>
                      </View>
                    </View>
                    <ProgressBar pct={b.pct} color={barColor} height={8} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
                      }}>{over ? '⚠ Te pasaste por' : 'Te quedan'}</Text>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12,
                        color: over ? t.rose : t.text,
                        fontVariant: ['tabular-nums'],
                      }}>{fmtMXN(Math.abs(b.remaining))}</Text>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
