import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { catById, subscriptionBrandFor } from '../data/catalog';
import { fmtMXN } from '../data/format';
import { ruleOccursOnDate, getCardCutoffProjection, CardCutoffProjection } from '../data/selectors';
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

  // Card Payment Modal states
  const [cardPaymentModalProj, setCardPaymentModalProj] = useState<CardCutoffProjection | null>(null);
  const [paymentType, setPaymentType] = useState<'period' | 'total' | 'custom'>('period');
  const [customPaymentAmount, setCustomPaymentAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');

  function confirmCardPayment(
    cardAcc: any,
    periodAmtCents: number,
    totalDebtCents: number,
    sourceAccId: string
  ) {
    let payAmtCents = 0;
    if (paymentType === 'period') payAmtCents = periodAmtCents > 0 ? periodAmtCents : totalDebtCents;
    else if (paymentType === 'total') payAmtCents = totalDebtCents;
    else if (paymentType === 'custom') payAmtCents = Math.round((parseFloat(customPaymentAmount) || 0) * 100);

    if (payAmtCents <= 0) return;

    const now = Date.now();
    const sourceAcc = state.accounts.find(a => a.id === sourceAccId) || state.accounts.find(a => a.type !== 'CREDIT_CARD');

    if (sourceAcc && sourceAcc.id !== cardAcc.id) {
      dispatch({
        type: 'ADD_TX',
        tx: {
          id: 'tx-' + now,
          type: 'TRANSFER',
          amount: payAmtCents,
          date: now,
          accountId: sourceAcc.id,
          destinationAccountId: cardAcc.id,
          note: `Pago de tarjeta ${cardAcc.name}`,
        },
      });
    } else {
      dispatch({
        type: 'ADD_TX',
        tx: {
          id: 'tx-' + now,
          type: 'INCOME',
          amount: payAmtCents,
          date: now,
          accountId: cardAcc.id,
          categoryId: 'cat-debt',
          note: `Pago de tarjeta ${cardAcc.name}`,
        },
      });
    }

    setCardPaymentModalProj(null);
    setCustomPaymentAmount('');
  }

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

  // Credit card cutoff projections for the current viewMonth
  const creditCardProjections = useMemo(() => {
    const creditAccounts = state.accounts.filter(a => a.type === 'CREDIT_CARD');
    const list: CardCutoffProjection[] = [];
    for (const acc of creditAccounts) {
      const proj = getCardCutoffProjection(acc, state.transactions, viewYear, viewMonth);
      if (proj) list.push(proj);
    }
    return list;
  }, [state.accounts, state.transactions, viewYear, viewMonth]);

  // Map cutoff & payment days -> projections
  const cardCutoffDayMap = useMemo(() => {
    const map = new Map<number, CardCutoffProjection[]>();
    for (const proj of creditCardProjections) {
      const sd = Math.min(28, Math.max(1, proj.account.statementDay || 1));
      const pd = proj.account.paymentDay ? Math.min(28, Math.max(1, proj.account.paymentDay)) : null;

      const existingSd = map.get(sd) || [];
      if (!existingSd.includes(proj)) existingSd.push(proj);
      map.set(sd, existingSd);

      if (pd != null) {
        const existingPd = map.get(pd) || [];
        if (!existingPd.includes(proj)) existingPd.push(proj);
        map.set(pd, existingPd);
      }
    }
    return map;
  }, [creditCardProjections]);

  // Projections for selected date
  const selectedDayCutoffProjections = useMemo(() => {
    const d = new Date(selectedDate);
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();
    if (month !== viewMonth || year !== viewYear) return [];
    return cardCutoffDayMap.get(day) || [];
  }, [selectedDate, viewMonth, viewYear, cardCutoffDayMap]);

  function navMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m > 11) { m = 0; y += 1; }
    if (m < 0) { m = 11; y -= 1; }
    setViewMonth(m);
    setViewYear(y);

    const creditAccounts = state.accounts.filter(a => a.type === 'CREDIT_CARD');
    const targetSd = creditAccounts.length > 0
      ? (creditAccounts[0].paymentDay || creditAccounts[0].statementDay || 15)
      : 1;
    setSelectedDate(new Date(y, m, Math.min(28, Math.max(1, targetSd))).getTime());
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
              const cardCutoffs = cardCutoffDayMap.get(cell);
              const hasIncome = rules?.some(r => r.type === 'INCOME');
              const hasExpense = rules?.some(r => r.type === 'EXPENSE');
              const hasCardCutoff = cardCutoffs && cardCutoffs.length > 0;
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
                    {(hasIncome || hasExpense || hasCardCutoff) ? (
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
                        {hasCardCutoff ? (
                          <View style={{
                            width: 4, height: 4, borderRadius: 2,
                            backgroundColor: isSelected ? '#fff' : t.indigo,
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.indigo }} />
              <Text style={{
                fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.textMuted,
              }}>Corte Tarjeta</Text>
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

          {/* Credit Card Cutoff / Payment Projection Cards */}
          {selectedDayCutoffProjections.map((proj) => {
            const selDayNum = new Date(selectedDate).getDate();
            const sd = Math.min(28, Math.max(1, proj.account.statementDay || 1));
            const pd = proj.account.paymentDay ? Math.min(28, Math.max(1, proj.account.paymentDay)) : null;

            const isPaymentView = pd != null && pd === selDayNum && pd !== sd;
            const cardThemeColor = isPaymentView ? t.green : t.indigo;
            const bgSoft = isPaymentView ? softFor(t, 'green') : softFor(t, 'indigo');
            const titleText = isPaymentView ? `Fecha Límite de Pago · ${proj.account.name}` : `Corte ${proj.account.name}`;
            const badgeText = isPaymentView ? `Límite de Pago día ${pd}` : `Corte día ${sd}`;

            return (
              <Card key={proj.account.id} padding={14} style={{ marginBottom: 14, backgroundColor: bgSoft, borderWidth: 1, borderColor: cardThemeColor + '33' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name="card" size={20} color={cardThemeColor} strokeWidth={2.5} />
                    <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: t.text }}>
                      {titleText}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: cardThemeColor }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 10, color: '#fff' }}>
                      {badgeText}
                    </Text>
                  </View>
                </View>

                {isPaymentView ? (
                  /* Fecha Límite de Pago View: Focus on Pago de Corte a Corte vs Pago Total Deuda Tarjeta */
                  <View style={{ gap: 10 }}>
                    <View style={{
                      backgroundColor: t.surface, padding: 14, borderRadius: 14,
                      borderWidth: 1, borderColor: t.border, gap: 12,
                    }}>
                      {/* Row 1: Pago de Corte a Corte */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted, letterSpacing: 0.2 }}>
                            PAGO DE CORTE A CORTE (PERIODO)
                          </Text>
                          <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10.5, color: t.textMuted, marginTop: 2 }}>
                            Monto a liquidar hoy para no generar intereses
                          </Text>
                        </View>
                        <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: proj.periodObligationCents > 0 ? t.rose : t.green, fontVariant: ['tabular-nums'] }}>
                          {proj.periodObligationCents === 0 ? '✅ $0.00 al corriente' : fmtMXN(proj.periodObligationCents)}
                        </Text>
                      </View>

                      <View style={{ height: 1, backgroundColor: t.border }} />

                      {/* Row 2: Pago Total Deuda Tarjeta */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted, letterSpacing: 0.2 }}>
                            PAGO TOTAL DEUDA TARJETA
                          </Text>
                          <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10.5, color: t.textMuted, marginTop: 2 }}>
                            Saldo total pendiente en la tarjeta de crédito
                          </Text>
                        </View>
                        <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: t.text, fontVariant: ['tabular-nums'] }}>
                          {fmtMXN(proj.totalCardDebtCents)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  /* Día de Corte View: Dual Balances + Breakdown of Active Installments & Single Purchases */
                  <>
                    {/* Dual Balances */}
                    <View style={{
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      backgroundColor: t.surface, padding: 12, borderRadius: 12,
                      borderWidth: 1, borderColor: t.border, marginBottom: 10,
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted, letterSpacing: 0.2 }}>
                          PAGO DEL PERIODO (OBLIGATORIO)
                        </Text>
                        <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: proj.periodObligationCents > 0 ? t.rose : t.green, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                          {proj.periodObligationCents === 0 ? '✅ $0.00 al corriente' : fmtMXN(proj.periodObligationCents)}
                        </Text>
                      </View>
                      <View style={{ width: 1, height: 26, backgroundColor: t.border, marginHorizontal: 8 }} />
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted, letterSpacing: 0.2 }}>
                          DEUDA TOTAL ACUMULADA
                        </Text>
                        <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                          {fmtMXN(proj.totalCardDebtCents)}
                        </Text>
                      </View>
                    </View>

                    {/* Active Breakdown Sections */}
                    {proj.activeInstallments.length > 0 || proj.singleExpensesList.length > 0 ? (
                      <View style={{ gap: 10 }}>
                        {/* Section 1: Active Installments */}
                        {proj.activeInstallments.length > 0 && (
                          <View style={{ gap: 5 }}>
                            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10.5, color: t.textMuted }}>
                              📦 Compras a meses (cuota del mes):
                            </Text>
                            {proj.activeInstallments.map((inst, i) => (
                              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.surfaceAlt, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 }}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                  <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.text }}>
                                    {inst.tx.note || 'Compra a Meses'}
                                  </Text>
                                  <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10, color: t.textMuted, marginTop: 1 }}>
                                    Cuota {inst.installmentIndex} de {inst.totalMonths} {inst.isMci ? 'MCI' : 'MSI'}
                                  </Text>
                                </View>
                                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: t.indigo, fontVariant: ['tabular-nums'] }}>
                                  {fmtMXN(inst.monthlyCents)}/mes
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Section 2: Single Purchases in Cycle */}
                        {proj.singleExpensesList.length > 0 && (
                          <View style={{ gap: 5 }}>
                            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10.5, color: t.textMuted }}>
                              🛒 Compras de contado del ciclo:
                            </Text>
                            {proj.singleExpensesList.map((tx, i) => (
                              <View key={tx.id || i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.surfaceAlt, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 }}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                  <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.text }}>
                                    {tx.note || catById(tx.categoryId || '', state.customCategories)?.name || 'Compra de contado'}
                                  </Text>
                                  <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10, color: t.textMuted, marginTop: 1 }}>
                                    Contado (Corte activo)
                                  </Text>
                                </View>
                                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: t.rose, fontVariant: ['tabular-nums'] }}>
                                  {fmtMXN(tx.amount)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    ) : (
                      <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted, textAlign: 'center', paddingVertical: 4 }}>
                        No hay consumos ni mensualidades en este corte.
                      </Text>
                    )}
                  </>
                )}

                {/* Direct Payment Action Button */}
                <Pressable
                  onPress={() => {
                    setCardPaymentModalProj(proj);
                    setPaymentType('period');
                    setCustomPaymentAmount('');
                  }}
                  style={({ pressed }) => [{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    backgroundColor: cardThemeColor, paddingVertical: 12, borderRadius: 12, marginTop: 12,
                    opacity: pressed ? 0.8 : 1,
                  }]}
                >
                  <Icon name="card" size={16} color="#fff" strokeWidth={2.5} />
                  <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: '#fff' }}>
                    REGISTRAR PAGO DE TARJETA
                  </Text>
                </Pressable>
              </Card>
            );
          })}

          {selectedRules.length === 0 && selectedDayCutoffProjections.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Sin pagos este día"
              message={isSelectedInView ? 'Toca otro día con punto para ver sus pagos.' : 'Cambia de mes para ver más días con pagos.'}
            />
          ) : selectedRules.length > 0 ? (
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
          ) : null}
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

      {/* Card Payment Modal Sheet */}
      <Sheet open={cardPaymentModalProj !== null} onClose={() => setCardPaymentModalProj(null)} height="70%">
        {cardPaymentModalProj && (() => {
          const cardAcc = cardPaymentModalProj.account;
          const periodAmt = cardPaymentModalProj.periodObligationCents;
          const totalDebt = cardPaymentModalProj.totalCardDebtCents;

          const debitAccounts = state.accounts.filter(a => a.id !== cardAcc.id);
          const currentSourceAccId = fromAccountId || (debitAccounts[0]?.id || '');

          return (
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text }}>
                  Registrar Pago a {cardAcc.name}
                </Text>
                <Pressable onPress={() => setCardPaymentModalProj(null)} style={{ padding: 4 }}>
                  <Icon name="x" size={18} color={t.textMuted} />
                </Pressable>
              </View>

              {/* Debt Info */}
              <View style={{ backgroundColor: softFor(t, 'indigo'), padding: 14, borderRadius: 14, borderWidth: 1, borderColor: t.indigo + '33' }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.indigo, letterSpacing: 0.3 }}>
                  DEUDA ACTUAL EN TARJETA
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24, color: t.indigo, marginTop: 4, fontVariant: ['tabular-nums'] }}>
                  {fmtMXN(totalDebt)}
                </Text>
              </View>

              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted }}>
                OPCIÓN DE PAGO
              </Text>

              {/* Option 1: Pago del Periodo */}
              <Pressable
                onPress={() => setPaymentType('period')}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 12, borderRadius: 12, borderWidth: 1,
                  borderColor: paymentType === 'period' ? t.indigo : t.border,
                  backgroundColor: paymentType === 'period' ? softFor(t, 'indigo') : 'transparent',
                }}
              >
                <View style={{
                  width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                  borderColor: paymentType === 'period' ? t.indigo : t.textMuted,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {paymentType === 'period' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.indigo }} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text }}>
                    Pago del Periodo (Corte a corte)
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10.5, color: t.textMuted, marginTop: 1 }}>
                    Monto para no generar intereses en este ciclo
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: periodAmt === 0 ? t.green : t.indigo, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                    {periodAmt === 0 ? '✅ Periodo al corriente ($0.00)' : fmtMXN(periodAmt)}
                  </Text>
                </View>
              </Pressable>

              {/* Option 2: Pago Total */}
              <Pressable
                onPress={() => setPaymentType('total')}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 12, borderRadius: 12, borderWidth: 1,
                  borderColor: paymentType === 'total' ? t.green : t.border,
                  backgroundColor: paymentType === 'total' ? softFor(t, 'green') : 'transparent',
                }}
              >
                <View style={{
                  width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                  borderColor: paymentType === 'total' ? t.green : t.textMuted,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {paymentType === 'total' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.green }} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text }}>
                    Pago Total (Liquidación completa)
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10.5, color: t.textMuted, marginTop: 1 }}>
                    Liquida la deuda entera del plástico
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: t.green, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                    {fmtMXN(totalDebt)}
                  </Text>
                </View>
              </Pressable>

              {/* Account selector */}
              {debitAccounts.length > 0 && (
                <View style={{ gap: 6 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted }}>
                    PAGAR DESDE CUENTA:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {debitAccounts.map((a) => {
                      const isSel = currentSourceAccId === a.id;
                      return (
                        <Pressable
                          key={a.id}
                          onPress={() => setFromAccountId(a.id)}
                          style={{
                            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
                            borderColor: isSel ? t.indigo : t.border,
                            backgroundColor: isSel ? softFor(t, 'indigo') : t.surfaceAlt,
                          }}
                        >
                          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: isSel ? t.indigo : t.text }}>
                            {a.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Confirm Button */}
              <Pressable
                onPress={() => confirmCardPayment(cardAcc, periodAmt, totalDebt, currentSourceAccId)}
                style={({ pressed }) => [{
                  backgroundColor: t.indigo, paddingVertical: 14, borderRadius: 14,
                  alignItems: 'center', justifyContent: 'center', marginTop: 6,
                  opacity: pressed ? 0.8 : 1,
                }]}
              >
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff' }}>
                  Confirmar Pago
                </Text>
              </Pressable>
            </View>
          );
        })()}
      </Sheet>
    </View>
  );
}
