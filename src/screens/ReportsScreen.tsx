import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { fmtMXN, fmtShort } from '../data/format';
import { expenseByCategory, monthlySeries } from '../data/selectors';
import { useAppState } from '../state/AppStateContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor } from '../theme/theme';

import { CategoryBadge } from '../components/Badges';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { DonutChart } from '../components/DonutChart';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';

function Legend({ dot, label }: { dot: string; label: string }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <Text style={{
        fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.textMuted,
      }}>{label}</Text>
    </View>
  );
}

export function ReportsScreen() {
  const { t } = useTheme();
  const { state } = useAppState();
  const [range, setRange] = useState(30);

  const cats = useMemo(
    () => expenseByCategory(state.transactions, range),
    [state.transactions, range]
  );
  const totalExp = cats.reduce((s, c) => s + c.amount, 0);
  const months = useMemo(() => monthlySeries(state.transactions, 6), [state.transactions]);
  const maxMonth = Math.max(...months.flatMap(m => [m.income, m.expense]), 1);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader subtitle="Tu" title="Análisis" rightIcon={null} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <Chip active={range === 7} onPress={() => setRange(7)}>7 días</Chip>
          <Chip active={range === 30} onPress={() => setRange(30)}>30 días</Chip>
          <Chip active={range === 90} onPress={() => setRange(90)}>90 días</Chip>
        </View>

        {/* Monthly bars */}
        <Card>
          <View>
            <Text style={{
              fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
            }}>Ingreso vs Gasto · 6 meses</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
              <Legend dot={t.green} label="Ingresos" />
              <Legend dot={t.rose} label="Gastos" />
            </View>
          </View>
          <View style={{
            marginTop: 14, flexDirection: 'row', alignItems: 'flex-end',
            gap: 10, height: 130,
          }}>
            {months.map((m, i) => {
              const hi = Math.max(2, (m.income / maxMonth) * 110);
              const he = Math.max(2, (m.expense / maxMonth) * 110);
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'flex-end', gap: 3,
                    height: 110, width: '100%', justifyContent: 'center',
                  }}>
                    <View style={{ width: '40%', height: hi, borderTopLeftRadius: 4, borderTopRightRadius: 4, overflow: 'hidden' }}>
                      <LinearGradient
                        colors={[t.green, t.green + '80' as any]}
                        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                        style={{ flex: 1 }}
                      />
                    </View>
                    <View style={{ width: '40%', height: he, borderTopLeftRadius: 4, borderTopRightRadius: 4, overflow: 'hidden' }}>
                      <LinearGradient
                        colors={[t.rose, t.rose + '80' as any]}
                        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10.5, color: t.textMuted,
                    textTransform: 'uppercase',
                  }}>{m.month}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Pie + categories */}
        <Card style={{ marginTop: 14 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
          }}>Gasto por categoría</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
            <DonutChart
              segments={cats.map(c => ({
                value: c.amount,
                color: colorFor(t, c.category?.color || 'indigo'),
              }))}
              total={totalExp}
              centerLabel={fmtShort(totalExp)}
              centerSub="total"
            />
            <View style={{ flex: 1, gap: 8 }}>
              {cats.slice(0, 4).map(c => {
                const pct = totalExp > 0 ? (c.amount / totalExp) * 100 : 0;
                return (
                  <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{
                      width: 8, height: 8, borderRadius: 4,
                      backgroundColor: colorFor(t, c.category?.color || 'indigo'),
                    }} />
                    <Text numberOfLines={1} style={{
                      flex: 1,
                      fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.text,
                    }}>{c.category?.name}</Text>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                      fontVariant: ['tabular-nums'],
                    }}>{pct.toFixed(0)}%</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {cats.length > 0 ? (
            <View style={{
              marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: t.border,
              gap: 12,
            }}>
              {cats.slice(0, 6).map(c => (
                <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <CategoryBadge cat={c.category} size={36} radius={11} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text,
                      }}>{c.category?.name}</Text>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text,
                        fontVariant: ['tabular-nums'],
                      }}>{fmtMXN(c.amount)}</Text>
                    </View>
                    <ProgressBar pct={(c.amount / cats[0].amount) * 100} color={c.category?.color} height={5} />
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      </ScrollView>
    </View>
  );
}
