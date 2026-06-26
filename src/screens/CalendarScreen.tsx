import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { catById, subscriptionBrandFor } from '../data/catalog';
import { fmtMXN } from '../data/format';
import { ruleOccursOnDate } from '../data/selectors';
import { Recurring } from '../data/types';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { softFor } from '../theme/theme';

import { CategoryBadge } from '../components/Badges';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { SubscriptionBadge } from '../components/SubscriptionBadge';
import { Sheet } from '../components/Sheet';
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

/**
 * Returns the confirmed transaction for a recurring rule in the same period
 * as scheduledDateMs, or undefined if not yet confirmed.
 */
function findConfirmedTx(
  ruleId: string,
  scheduledDateMs: number,
  frequency: Recurring['frequency'],
  transactions: { id: string; date: number }[]
) {
  const prefix = `tx-rec-${ruleId}-`;
  const candidates = transactions.filter(tx => tx.id.startsWith(prefix));
  if (candidates.length === 0) return undefined;

  const scheduledDay = startOfDay(scheduledDateMs);
  const sd = new Date(scheduledDay);

  for (const tx of candidates) {
    const txDay = startOfDay(tx.date);
    const txDate = new Date(txDay);

    switch (frequency) {
      case 'once':
        if (tx.id === `${prefix}${scheduledDay}`) return tx;
        break;
      case 'monthly':
        // Same month and year
        if (txDate.getFullYear() === sd.getFullYear() && txDate.getMonth() === sd.getMonth()) return tx;
        break;
      case 'weekly':
      case 'biweekly': {
        // Within 7 days of the scheduled day
        const diff = Math.abs(txDay - scheduledDay);
        if (diff <= 7 * 86400000) return tx;
        break;
      }
      case 'yearly':
        // Same year
        if (txDate.getFullYear() === sd.getFullYear()) return tx;
        break;
    }
  }
  return undefined;
}

export function CalendarScreen() {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { back, navigate } = useNavigation();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedDate, setSelectedDate] = useState<number>(today);
  const [selectedUpcoming, setSelectedUpcoming] = useState<{ rule: Recurring; date: number } | null>(null);

  function confirmPayment(p: { rule: Recurring; date: number }) {
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let actualDate: number;
    if (p.date >= todayStart.getTime()) {
      actualDate = now.getTime();
    } else {
      const scheduled = new Date(p.date);
      scheduled.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      actualDate = scheduled.getTime();
    }
    const newTx = {
      id: 'tx-rec-' + p.rule.id + '-' + p.date,
      type: p.rule.type,
      amount: p.rule.amount,
      date: actualDate,
      accountId: p.rule.accountId,
      categoryId: p.rule.categoryId || null,
      note: p.rule.note || null,
    };
    const updatedRules = state.recurring.map(r =>
      r.id === p.rule.id ? { ...r, lastGenerated: p.date, active: r.frequency === 'once' ? false : r.active } : r
    );
    dispatch({ type: 'APPLY_MATERIALIZATION', newTxs: [newTx], updatedRules });
    setSelectedUpcoming(null);
  }

  // Build calendar grid
  const grid = useMemo(() => {
    const first = startOfMonth(viewYear, viewMonth);
    const startWeekday = first.getDay();
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
                  const cat = r.categoryId ? catById(r.categoryId, state.customCategories) : undefined;
                  const brand = subscriptionBrandFor(r.subscriptionBrand);
                  const acc = state.accounts.find(a => a.id === r.accountId);
                  const isIncome = r.type === 'INCOME';
                  const confirmedTx = findConfirmedTx(r.id, selectedDate, r.frequency, state.transactions);
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => setSelectedUpcoming({ rule: r, date: selectedDate })}
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
                      <View style={{ alignItems: 'flex-end', gap: 3 }}>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14,
                          color: isIncome ? t.green : t.text,
                          fontVariant: ['tabular-nums'],
                        }}>{isIncome ? '+' : '-'}{fmtMXN(r.amount).replace('-', '')}</Text>
                        {confirmedTx ? (
                          <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 3,
                            paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                            backgroundColor: softFor(t, 'green'),
                          }}>
                            <Icon name="check" size={9} color={t.green} strokeWidth={3} />
                            <Text style={{
                              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.green,
                            }}>{isIncome ? 'Recibido' : 'Pagado'}</Text>
                          </View>
                        ) : null}
                      </View>
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

      {/* Confirmation / Status Sheet */}
      <Sheet open={selectedUpcoming !== null} onClose={() => setSelectedUpcoming(null)} height="55%">
        {selectedUpcoming && (() => {
          const p = selectedUpcoming;
          const cat = p.rule.categoryId ? catById(p.rule.categoryId, state.customCategories) : undefined;
          const isIncome = p.rule.type === 'INCOME';
          const acc = state.accounts.find(a => a.id === p.rule.accountId);
          const d = new Date(p.date);
          const dateStr = `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
          const confirmedTx = findConfirmedTx(p.rule.id, p.date, p.rule.frequency, state.transactions);

          // Human-readable date when the payment was actually made
          const paidDateStr = confirmedTx ? (() => {
            const pd = new Date(confirmedTx.date);
            const pdDay = startOfDay(confirmedTx.date);
            const todayDay = startOfDay(Date.now());
            if (pdDay === todayDay) return 'hoy';
            if (pdDay === todayDay - 86400000) return 'ayer';
            return `el ${pd.getDate()} de ${MONTHS[pd.getMonth()]}`;
          })() : null;

          // Custom Nomina detection
          const isSalary = p.rule.note?.toLowerCase().includes('nomina') ||
                          p.rule.note?.toLowerCase().includes('nómina') ||
                          p.rule.note?.toLowerCase().includes('sueldo') ||
                          cat?.name?.toLowerCase().includes('nomina') ||
                          cat?.name?.toLowerCase().includes('sueldo');

          return (
            <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
                letterSpacing: -0.3, marginBottom: 16,
              }}>
                {confirmedTx
                  ? (isIncome ? 'Ingreso Registrado' : 'Pago Registrado')
                  : (isIncome ? 'Registrar Ingreso' : 'Registrar Pago')}
              </Text>

              {/* Payment detail card */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                padding: 16, borderRadius: 18, backgroundColor: t.surfaceAlt,
                borderWidth: 1, borderColor: t.border, marginBottom: 20,
              }}>
                <View style={{
                  width: 46, height: 46, borderRadius: 14,
                  backgroundColor: softFor(t, confirmedTx ? 'green' : (isIncome ? 'green' : 'rose')),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon
                    name={confirmedTx ? 'check' : (isIncome ? 'arrow-down' : 'rotate')}
                    size={22}
                    color={confirmedTx ? t.green : (isIncome ? t.green : t.rose)}
                    strokeWidth={2.2}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: t.text,
                  }}>{p.rule.note || cat?.name || 'Transacción Recurrente'}</Text>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
                    marginTop: 2,
                  }}>
                    {acc?.name} · {dateStr}
                  </Text>
                </View>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16,
                  color: isIncome ? t.green : t.text,
                  fontVariant: ['tabular-nums'],
                }}>
                  {isIncome ? '+' : '-'}{fmtMXN(p.rule.amount).replace('-', '')}
                </Text>
              </View>

              {confirmedTx ? (
                // ── Already paid / received ──
                <View style={{ gap: 10 }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    paddingVertical: 16, paddingHorizontal: 18,
                    borderRadius: 16,
                    backgroundColor: softFor(t, 'green'),
                    borderWidth: 1, borderColor: t.green + '40',
                  }}>
                    <View style={{
                      width: 36, height: 36, borderRadius: 10,
                      backgroundColor: t.green + '22',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name="check" size={20} color={t.green} strokeWidth={2.5} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.green,
                      }}>
                        {isIncome ? 'Ingreso recibido' : 'Pago realizado'}
                      </Text>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.green,
                        marginTop: 2, opacity: 0.8,
                      }}>
                        Registrado {paidDateStr}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => {
                      setSelectedUpcoming(null);
                      navigate({ screen: 'add-recurring', id: p.rule.id });
                    }}
                    style={({ pressed }) => [{
                      paddingVertical: 14, borderRadius: 16,
                      backgroundColor: 'transparent',
                      borderWidth: 1, borderColor: t.border,
                      alignItems: 'center',
                      opacity: pressed ? 0.75 : 1,
                    }]}
                  >
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                    }}>
                      Editar Programación
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setSelectedUpcoming(null)}
                    style={({ pressed }) => [{
                      paddingVertical: 14, borderRadius: 16,
                      backgroundColor: t.surfaceAlt,
                      alignItems: 'center',
                      opacity: pressed ? 0.75 : 1,
                    }]}
                  >
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.textMuted,
                    }}>
                      Cerrar
                    </Text>
                  </Pressable>
                </View>
              ) : (
                // ── Pending payment ──
                <View style={{ gap: 10 }}>
                  <Pressable
                    onPress={() => confirmPayment(p)}
                    style={({ pressed }) => [{
                      paddingVertical: 14, borderRadius: 16,
                      backgroundColor: isIncome ? t.green : t.indigo,
                      alignItems: 'center',
                      flexDirection: 'row', justifyContent: 'center', gap: 8,
                      opacity: pressed ? 0.85 : 1,
                    }]}
                  >
                    <Icon name="check" size={18} color="#fff" strokeWidth={3} />
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#fff',
                    }}>
                      {isIncome
                        ? (isSalary ? '¡Sí, ya cayó la nómina!' : 'Confirmar Ingreso Recibido')
                        : 'Confirmar Pago Realizado'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setSelectedUpcoming(null);
                      navigate({ screen: 'add-recurring', id: p.rule.id });
                    }}
                    style={({ pressed }) => [{
                      paddingVertical: 14, borderRadius: 16,
                      backgroundColor: 'transparent',
                      borderWidth: 1, borderColor: t.border,
                      alignItems: 'center',
                      opacity: pressed ? 0.75 : 1,
                    }]}
                  >
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                    }}>
                      Editar Programación
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setSelectedUpcoming(null)}
                    style={({ pressed }) => [{
                      paddingVertical: 14, borderRadius: 16,
                      backgroundColor: t.surfaceAlt,
                      alignItems: 'center',
                      opacity: pressed ? 0.75 : 1,
                    }]}
                  >
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.textMuted,
                    }}>
                      Cancelar
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })()}
      </Sheet>
    </View>
  );
}
