import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { catById, subscriptionBrandFor } from '../data/catalog';
import { fmtMXN } from '../data/format';
import { ruleOccursOnDate } from '../data/selectors';
import { Recurring } from '../data/types';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';

import { CategoryBadge } from '../components/Badges';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { SubscriptionBadge } from '../components/SubscriptionBadge';
import { Icon } from '../icons/Icon';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WEEK_DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function CalendarScreen() {
  const { t } = useTheme();
  const { state } = useAppState();
  const { back, navigate } = useNavigation();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedDate, setSelectedDate] = useState<number>(today);

  // Build calendar grid
  const grid = useMemo(() => {
    const first = startOfMonth(viewYear, viewMonth);
    const startWeekday = first.getDay(); // 0=Sun
    const totalDays = daysInMonth(viewYear, viewMonth);
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  // Map day-of-month -> rules occurring that day
  const dayMap = useMemo(() => {
    const map = new Map<number, Recurring[]>();
    for (let d = 1; d <= daysInMonth(viewYear, viewMonth); d++) {
      const dateMs = new Date(viewYear, viewMonth, d).getTime();
      const matching = state.recurring.filter(r => ruleOccursOnDate(r, dateMs));
      if (matching.length > 0) map.set(d, matching);
    }
    return map;
  }, [state.recurring, viewYear, viewMonth]);

  // Payments for selected day
  const selectedRules = useMemo(() => {
    return state.recurring.filter(r => ruleOccursOnDate(r, selectedDate));
  }, [state.recurring, selectedDate]);

  function navMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m > 11) { m = 0; y += 1; }
    if (m < 0) { m = 11; y -= 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  const totalSelected = selectedRules.reduce((s, r) => s + (r.type === 'INCOME' ? r.amount : -r.amount), 0);
  const selectedDateObj = new Date(selectedDate);
  const isSelectedInView = selectedDateObj.getFullYear() === viewYear && selectedDateObj.getMonth() === viewMonth;

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        leftIcon="chevron-left"
        onLeft={back}
        title="Calendario"
        rightIcon="plus"
        onRight={() => navigate('add-recurring')}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Month navigator */}
        <Card padding={16}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <Pressable onPress={() => navMonth(-1)} hitSlop={8} style={{
              width: 32, height: 32, borderRadius: 10, backgroundColor: t.surfaceAlt,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="chevron-left" size={18} color={t.text} />
            </Pressable>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: t.text,
              textTransform: 'capitalize', letterSpacing: -0.3,
            }}>{MONTHS[viewMonth]} {viewYear}</Text>
            <Pressable onPress={() => navMonth(1)} hitSlop={8} style={{
              width: 32, height: 32, borderRadius: 10, backgroundColor: t.surfaceAlt,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="chevron-right" size={18} color={t.text} />
            </Pressable>
          </View>

          {/* Weekday header */}
          <View style={{ flexDirection: 'row' }}>
            {WEEK_DAYS.map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
                  letterSpacing: 0.4,
                }}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {grid.map((cell, idx) => {
              if (cell == null) {
                return <View key={idx} style={{ width: '14.2857%', aspectRatio: 1 }} />;
              }
              const cellMs = new Date(viewYear, viewMonth, cell).getTime();
              const isToday = cellMs === today;
              const isSelected = cellMs === selectedDate;
              const rules = dayMap.get(cell);
              const hasIncome = rules?.some(r => r.type === 'INCOME');
              const hasExpense = rules?.some(r => r.type === 'EXPENSE');
              return (
                <View key={idx} style={{ width: '14.2857%', aspectRatio: 1, padding: 2 }}>
                  <Pressable
                    onPress={() => setSelectedDate(cellMs)}
                    style={({ pressed }) => [{
                      flex: 1, borderRadius: 10,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isSelected ? t.indigo : isToday ? t.indigoSoft : 'transparent',
                      opacity: pressed ? 0.7 : 1,
                    }]}
                  >
                    <Text style={{
                      fontFamily: isToday || isSelected ? 'PlusJakartaSans_800ExtraBold' : 'PlusJakartaSans_600SemiBold',
                      fontSize: 13,
                      color: isSelected ? '#fff' : isToday ? t.indigo : t.text,
                      fontVariant: ['tabular-nums'],
                    }}>{cell}</Text>
                    {(hasIncome || hasExpense) ? (
                      <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                        {hasIncome ? (
                          <View style={{
                            width: 4, height: 4, borderRadius: 2,
                            backgroundColor: isSelected ? '#fff' : t.green,
                          }} />
                        ) : null}
                        {hasExpense ? (
                          <View style={{
                            width: 4, height: 4, borderRadius: 2,
                            backgroundColor: isSelected ? '#fff' : t.rose,
                          }} />
                        ) : null}
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={{
            flexDirection: 'row', justifyContent: 'center', gap: 16,
            marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.green }} />
              <Text style={{
                fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.textMuted,
              }}>Ingreso</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.rose }} />
              <Text style={{
                fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.textMuted,
              }}>Pago</Text>
            </View>
          </View>
        </Card>

        {/* Selected day detail */}
        <View style={{ marginTop: 18 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: t.text,
            letterSpacing: -0.3, paddingHorizontal: 4, marginBottom: 10,
            textTransform: 'capitalize',
          }}>
            {(() => {
              const d = new Date(selectedDate);
              if (selectedDate === today) return 'Hoy';
              if (selectedDate === today + 86400000) return 'Mañana';
              return `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
            })()}
          </Text>

          {selectedRules.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Sin pagos este día"
              message={isSelectedInView ? 'Toca otro día con punto para ver sus pagos.' : 'Cambia de mes para ver más días con pagos.'}
            />
          ) : (
            <>
              <Card padding={4}>
                {selectedRules.map((r, i) => {
                  const cat = r.categoryId ? catById(r.categoryId) : undefined;
                  const brand = subscriptionBrandFor(r.subscriptionBrand);
                  const acc = state.accounts.find(a => a.id === r.accountId);
                  const isIncome = r.type === 'INCOME';
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => navigate({ screen: 'add-recurring', id: r.id })}
                      style={({ pressed }) => [{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        paddingHorizontal: 14, paddingVertical: 12,
                        borderBottomWidth: i < selectedRules.length - 1 ? 1 : 0,
                        borderBottomColor: t.border,
                        opacity: pressed ? 0.7 : 1,
                      }]}
                    >
                      {brand ? (
                        <SubscriptionBadge brandId={r.subscriptionBrand} size={44} />
                      ) : (
                        <CategoryBadge cat={cat} />
                      )}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{
                          fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                        }}>{r.note || brand?.name || cat?.name || 'Recurrente'}</Text>
                        <Text numberOfLines={1} style={{
                          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                          marginTop: 2,
                        }}>{acc?.name}</Text>
                      </View>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14,
                        color: isIncome ? t.green : t.text,
                        fontVariant: ['tabular-nums'],
                      }}>{isIncome ? '+' : '-'}{fmtMXN(r.amount).replace('-', '')}</Text>
                    </Pressable>
                  );
                })}
              </Card>
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between',
                paddingHorizontal: 14, paddingTop: 12,
              }}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
                }}>Neto del día</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14,
                  color: totalSelected >= 0 ? t.green : t.rose,
                  fontVariant: ['tabular-nums'],
                }}>{totalSelected >= 0 ? '+' : '-'}{fmtMXN(Math.abs(totalSelected))}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
