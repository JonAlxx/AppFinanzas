import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, Modal, TextInput, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { catById, labelType } from '../data/catalog';
import { fmtMXN } from '../data/format';
import { calculateCurrentCycleExpenses, calculateStatementBalance, computeAccountBalance, getCardTypeForAccount } from '../data/selectors';
import { Category, Transaction } from '../data/types';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';

import { BankCard } from '../components/BankCard';
import { Card } from '../components/Card';
import { CategoryBadge } from '../components/Badges';
import { EmptyState } from '../components/EmptyState';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionTitle } from '../components/SectionTitle';
import { TransactionRow } from '../components/TransactionRow';
import { Icon } from '../icons/Icon';

export interface AccountDetailScreenProps {
  accountId: string;
}

export function AccountDetailScreen({ accountId }: AccountDetailScreenProps) {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { balanceHidden, hiddenCards = [] } = state;
  const { navigate, back } = useNavigation();

  const acc = state.accounts.find(a => a.id === accountId);

  const {
    paymentsSinceCutoff,
    remainingStatementBalance,
    remainingMinimumPayment,
    hasPaidMinimum,
    hasPaidTotal
  } = useMemo(() => {
    if (!acc || acc.type !== 'CREDIT_CARD') {
      return {
        paymentsSinceCutoff: 0,
        remainingStatementBalance: 0,
        remainingMinimumPayment: 0,
        hasPaidMinimum: false,
        hasPaidTotal: false
      };
    }

    const statementDay = acc.statementDay || 1;
    const now = new Date();
    let cutYear = now.getFullYear();
    let cutMonth = now.getMonth();
    
    if (now.getDate() < statementDay) {
      cutMonth -= 1;
      if (cutMonth < 0) {
        cutMonth = 11;
        cutYear -= 1;
      }
    }
    const cutoffDate = new Date(cutYear, cutMonth, statementDay, 0, 0, 0);
    const cutoffMs = cutoffDate.getTime();

    let totalPayments = 0;
    for (const tx of state.transactions) {
      if (tx.date >= cutoffMs) {
        if (tx.type === 'TRANSFER' && tx.destinationAccountId === acc.id) {
          totalPayments += tx.amount;
        } else if (tx.type === 'INCOME' && tx.accountId === acc.id) {
          totalPayments += tx.amount;
        }
      }
    }

    const currentBalance = computeAccountBalance(acc, state.transactions);
    const rawDebt = Math.abs(currentBalance);

    const initialStatementBalance = acc.statementBalance !== undefined ? acc.statementBalance : rawDebt;
    const initialMinimumPayment = acc.statementMinimumPayment !== undefined 
      ? acc.statementMinimumPayment 
      : Math.round(initialStatementBalance * 0.05);

    const calculatedStatement = calculateStatementBalance(acc, state.transactions);
    const remainingStatement = currentBalance >= 0 
      ? 0 
      : (acc.statementBalance !== undefined 
          ? Math.max(0, Math.min(rawDebt, acc.statementBalance - totalPayments)) 
          : Math.min(rawDebt, calculatedStatement));
      
    const remainingMin = Math.max(0, initialMinimumPayment - totalPayments);

    return {
      paymentsSinceCutoff: totalPayments,
      remainingStatementBalance: remainingStatement,
      remainingMinimumPayment: remainingMin,
      hasPaidMinimum: totalPayments >= initialMinimumPayment && initialMinimumPayment > 0,
      hasPaidTotal: totalPayments >= initialStatementBalance && initialStatementBalance > 0
    };
  }, [acc, state.transactions]);

  const postCutoffExpenses = useMemo(() => {
    if (!acc || acc.type !== 'CREDIT_CARD') return 0;
    return calculateCurrentCycleExpenses(acc, state.transactions);
  }, [acc, state.transactions]);

  const installmentsData = useMemo(() => {
    if (!acc || acc.type !== 'CREDIT_CARD') {
      return { items: [], totalMonthlyCents: 0, totalRemainingCents: 0 };
    }

    const MONTHS_SHORT_NAME = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const now = new Date();
    const items: {
      tx: Transaction;
      category: Category | undefined;
      totalMonths: number;
      elapsedMonths: number;
      monthlyCents: number;
      paidCents: number;
      remainingCents: number;
      pct: number;
      isMci: boolean;
      endDateLabel: string;
    }[] = [];

    let totalMonthlyCents = 0;
    let totalRemainingCents = 0;

    for (const tx of state.transactions) {
      if (tx.accountId !== acc.id || tx.type !== 'EXPENSE') continue;
      const totalMonths = tx.msiMonths || tx.mciMonths;
      if (!totalMonths || totalMonths <= 0) continue;

      const sd = acc.statementDay || 1;
      const txDate = new Date(tx.date);

      let firstCutoff = new Date(txDate.getFullYear(), txDate.getMonth(), sd, 23, 59, 59, 999);
      if (tx.date > firstCutoff.getTime()) {
        firstCutoff = new Date(txDate.getFullYear(), txDate.getMonth() + 1, sd, 23, 59, 59, 999);
      }

      let cutoffsPassed = 0;
      let curCut = new Date(firstCutoff.getTime());
      while (curCut.getTime() <= now.getTime()) {
        cutoffsPassed++;
        curCut = new Date(curCut.getFullYear(), curCut.getMonth() + 1, sd, 23, 59, 59, 999);
      }

      const totalAmountCents = tx.amount;
      const monthlyCents = Math.round(totalAmountCents / totalMonths);

      // Count card payment transactions registered on or after tx.date
      let paymentsCount = 0;
      for (const t of state.transactions) {
        if (t.date >= tx.date) {
          if ((t.type === 'INCOME' && t.accountId === acc.id && t.categoryId === 'cat-debt') ||
              (t.type === 'TRANSFER' && t.destinationAccountId === acc.id)) {
            paymentsCount++;
          }
        }
      }

      const isSettled = tx.isEarlySettled || (paymentsCount >= totalMonths);

      const elapsedMonths = isSettled 
        ? totalMonths 
        : Math.min(totalMonths, paymentsCount);

      const isMci = !!tx.mciMonths;
      const paidCents = isSettled ? totalAmountCents : Math.min(totalAmountCents, Math.round(monthlyCents * elapsedMonths));
      const remainingCents = isSettled ? 0 : Math.max(0, totalAmountCents - paidCents);

      const sdFixed = Math.min(28, Math.max(1, sd));
      let firstCutoffYear = txDate.getFullYear();
      let firstCutoffMonth = txDate.getMonth();

      const sameMonthCutoff = new Date(firstCutoffYear, firstCutoffMonth, sdFixed, 23, 59, 59, 999);
      if (tx.date > sameMonthCutoff.getTime()) {
        firstCutoffMonth += 1;
        if (firstCutoffMonth > 11) {
          firstCutoffMonth = 0;
          firstCutoffYear += 1;
        }
      }

      const lastCutoffTotalMonths = firstCutoffMonth + (totalMonths - 1);
      const lastCutoffYear = firstCutoffYear + Math.floor(lastCutoffTotalMonths / 12);
      const lastCutoffMonth = lastCutoffTotalMonths % 12;
      const endDateLabel = `${MONTHS_SHORT_NAME[lastCutoffMonth]} ${lastCutoffYear}`;

      const category = catById(tx.categoryId, state.customCategories);
      const pct = isSettled ? 100 : Math.min(100, Math.round((elapsedMonths / totalMonths) * 100));

      items.push({
        tx,
        category,
        totalMonths,
        elapsedMonths,
        monthlyCents,
        paidCents,
        remainingCents,
        pct,
        isMci,
        endDateLabel,
      });

      if (remainingCents > 0 || elapsedMonths < totalMonths) {
        totalMonthlyCents += monthlyCents;
        totalRemainingCents += remainingCents;
      }
    }

    return {
      items,
      totalMonthlyCents,
      totalRemainingCents,
    };
  }, [acc, state.transactions, state.customCategories]);

  const activeInstallmentsDueInCycle = useMemo(() => {
    if (!acc || acc.type !== 'CREDIT_CARD') return 0;
    let sum = 0;
    for (const item of installmentsData.items) {
      if (item.remainingCents > 0 && item.elapsedMonths < item.totalMonths) {
        let paymentsAfterPurchase = 0;
        for (const t of state.transactions) {
          if (t.date >= item.tx.date) {
            if ((t.type === 'INCOME' && t.accountId === acc.id && t.categoryId === 'cat-debt') ||
                (t.type === 'TRANSFER' && t.destinationAccountId === acc.id)) {
              paymentsAfterPurchase++;
            }
          }
        }
        if (paymentsAfterPurchase === 0) {
          sum += item.monthlyCents;
        }
      }
    }
    return sum;
  }, [acc, installmentsData, state.transactions]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'period' | 'total' | 'custom'>('period');
  const [customPaymentAmount, setCustomPaymentAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [showCutoffModal, setShowCutoffModal] = useState(false);
  const [showDatesSection, setShowDatesSection] = useState(false);
  const [showUseSection, setShowUseSection] = useState(true);
  const [showInstallmentsSection, setShowInstallmentsSection] = useState(false);
  const [installmentsFilter, setInstallmentsFilter] = useState<'active' | 'settled' | 'all'>('active');
  const [cutoffAmount, setCutoffAmount] = useState('');
  const [cutoffMinimumPayment, setCutoffMinimumPayment] = useState('');
  const [cutoffInterestRate, setCutoffInterestRate] = useState('');
  const [paymentModalStatementDay, setPaymentModalStatementDay] = useState('');
  const [paymentModalPaymentDay, setPaymentModalPaymentDay] = useState('');
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [interestAmount, setInterestAmount] = useState('');

  function confirmDelete() {
    if (!acc) return;
    Alert.alert(
      'Eliminar cuenta',
      `¿Seguro que quieres eliminar "${acc.name}"? Esta acción también borra sus movimientos y recurrentes asociados, y no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: () => {
            dispatch({ type: 'DELETE_ACC', id: acc.id });
            back();
          },
        },
      ],
    );
  }

  const accTxs = useMemo(() => {
    if (!acc) return [];
    return state.transactions
      .filter(tx => tx.accountId === acc.id || tx.destinationAccountId === acc.id)
      .sort((a, b) => b.date - a.date);
  }, [state.transactions, acc]);

  const stats = useMemo(() => {
    if (!acc) return { income: 0, expense: 0 };
    let income = 0, expense = 0;
    const since = Date.now() - 30 * 86400000;
    for (const tx of accTxs) {
      if (tx.date < since) continue;
      if (tx.type === 'INCOME' && tx.accountId === acc.id) income += tx.amount;
      if (tx.type === 'EXPENSE' && tx.accountId === acc.id) expense += tx.amount;
      if (tx.type === 'TRANSFER') {
        if (tx.accountId === acc.id) expense += tx.amount;
        if (tx.destinationAccountId === acc.id) income += tx.amount;
      }
    }
    return { income, expense };
  }, [accTxs, acc]);

  if (!acc) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title="Cuenta" leftIcon="chevron-left" onLeft={back} rightIcon={null} />
        <View style={{ padding: 40 }}>
          <Text style={{ color: t.textMuted, fontFamily: 'PlusJakartaSans_500Medium' }}>
            Cuenta no encontrada
          </Text>
        </View>
      </View>
    );
  }

  const balance = computeAccountBalance(acc, state.transactions);
  const isHidden = balanceHidden || hiddenCards.includes(getCardTypeForAccount(acc));

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title={acc.name}
        leftIcon="chevron-left"
        onLeft={back}
        rightIcon={null}
        large={false}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {acc.brand ? (
          <BankCard acc={acc} balance={balance} isHidden={isHidden} />
        ) : (
          <View style={{
            borderRadius: 22, overflow: 'hidden',
            shadowColor: colorFor(t, acc.color),
            shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
          }}>
            <LinearGradient
              colors={[colorFor(t, acc.color), colorFor(t, acc.color) + 'cc' as any]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 22 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.22)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={acc.icon} size={22} color="#fff" />
                </View>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: 'rgba(255,255,255,0.85)',
                  letterSpacing: 0.3,
                }}>{labelType(acc.type).toUpperCase()}</Text>
              </View>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: 'rgba(255,255,255,0.8)',
                letterSpacing: 0.4, marginTop: 22,
              }}>{acc.type === 'CREDIT_CARD' ? 'DISPONIBLE' : 'SALDO'}</Text>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 28, color: '#fff',
                letterSpacing: -0.8, marginTop: 2,
                fontVariant: ['tabular-nums'],
              }}>{isHidden ? '••••' : (acc.type === 'CREDIT_CARD' && acc.limit ? fmtMXN(acc.limit + balance) : (acc.type === 'CREDIT_CARD' ? fmtMXN(Math.abs(balance)) : fmtMXN(balance)))}</Text>
            </LinearGradient>
          </View>
        )}

        {/* Edit + Delete actions */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Pressable
            onPress={() => navigate({ screen: 'add-account', id: acc.id })}
            style={({ pressed }) => [{
              flex: 1, paddingVertical: 13, borderRadius: 14,
              backgroundColor: t.surface,
              borderWidth: 1, borderColor: t.border,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: pressed ? 0.8 : 1,
            }]}
          >
            <Icon name="edit" size={16} color={t.text} />
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
            }}>Editar</Text>
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            style={({ pressed }) => [{
              flex: 1, paddingVertical: 13, borderRadius: 14,
              backgroundColor: softFor(t, 'rose'),
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: pressed ? 0.8 : 1,
            }]}
          >
            <Icon name="trash" size={16} color={t.rose} />
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.rose,
            }}>Eliminar</Text>
          </Pressable>
        </View>

        {/* Acción Principal: Registrar Pago (Ubicado justo debajo de Editar/Eliminar) */}
        {acc.type === 'CREDIT_CARD' && (
          <View style={{ gap: 8, marginTop: 10 }}>
            {balance < 0 && (
              <Pressable
                onPress={() => {
                  const firstLiquidAcc = state.accounts.find(a => a.type !== 'CREDIT_CARD');
                  setFromAccountId(firstLiquidAcc?.id || '');
                  setPaymentType(remainingStatementBalance > 0 ? 'total' : 'custom');
                  setCustomPaymentAmount('');
                  setPaymentModalStatementDay(acc.statementDay ? String(acc.statementDay) : '');
                  setPaymentModalPaymentDay(acc.paymentDay ? String(acc.paymentDay) : '');
                  setShowPaymentModal(true);
                }}
                style={({ pressed }) => [{
                  borderRadius: 14, overflow: 'hidden',
                  opacity: pressed ? 0.9 : 1,
                }]}
              >
                <LinearGradient
                  colors={[colorFor(t, acc.color), colorFor(t, acc.color) + 'cc' as any]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Icon name="cash" size={16} color="#fff" strokeWidth={2.5} />
                  <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: '#fff', letterSpacing: 0.3 }}>
                    REGISTRAR PAGO DE TARJETA
                  </Text>
                </LinearGradient>
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                setInterestAmount('');
                setShowInterestModal(true);
              }}
              style={({ pressed }) => [{
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: t.rose,
                backgroundColor: softFor(t, 'rose'),
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: pressed ? 0.8 : 1,
              }]}
            >
              <Icon name="trending-up" size={16} color={t.rose} strokeWidth={2.5} />
              <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.rose, letterSpacing: 0.3 }}>
                REGISTRAR INTERÉS GENERADO
              </Text>
            </Pressable>
          </View>
        )}

        {/* Detalle de Crédito si aplica */}
        {acc.type === 'CREDIT_CARD' && (
          <>
            {acc.limit ? (
              <>
                {/* Módulo 1: Uso del Crédito (Colapsable) */}
                <Card padding={16} style={{ marginTop: 14 }}>
                  <Pressable
                    onPress={() => setShowUseSection(!showUseSection)}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <SectionTitle title="Uso del Crédito" />
                    <Icon name={showUseSection ? "chevron-up" : "chevron-down"} size={18} color={t.textMuted} />
                  </Pressable>
                     {showUseSection && (() => {
                    const isPositiveBalance = balance > 0;
                    const debtAmount = balance < 0 ? Math.abs(balance) : 0;
                    const availablePct = acc.limit ? Math.min(100, Math.max(0, ((acc.limit - debtAmount) / acc.limit) * 100)) : 0;
                    const availableAmount = acc.limit + balance;

                    return (
                      <>
                        <View style={{ marginTop: 12, marginBottom: 16 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text style={{
                              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                            }}>Crédito disponible</Text>
                            <Text style={{
                              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: t.text,
                              fontVariant: ['tabular-nums'],
                            }}>
                              {availablePct.toFixed(0)}% disponible
                            </Text>
                          </View>
                          <ProgressBar
                            pct={availablePct}
                            color={availablePct > 20 ? (acc.color || 'green') : 'rose'}
                            height={8}
                          />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{
                              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.textMuted,
                              letterSpacing: 0.2,
                            }}>LÍMITE</Text>
                            <Text numberOfLines={1} style={{
                              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text,
                              marginTop: 4, fontVariant: ['tabular-nums'],
                            }}>{isHidden ? '••••' : fmtMXN(acc.limit)}</Text>
                          </View>
                          
                          <View style={{ width: 1, backgroundColor: t.border, alignSelf: 'stretch' }} />

                          <View style={{ flex: 1 }}>
                            <Text style={{
                              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: isPositiveBalance ? t.green : t.rose,
                              letterSpacing: 0.1,
                            }}>{isPositiveBalance ? 'SALDO A FAVOR' : 'USADO (DEUDA)'}</Text>
                            <Text numberOfLines={1} style={{
                              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: isPositiveBalance ? t.green : t.rose,
                              marginTop: 4, fontVariant: ['tabular-nums'],
                            }}>{isHidden ? '••••' : fmtMXN(isPositiveBalance ? balance : debtAmount)}</Text>
                          </View>

                          <View style={{ width: 1, backgroundColor: t.border, alignSelf: 'stretch' }} />

                          <View style={{ flex: 1 }}>
                            <Text style={{
                              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.green,
                              letterSpacing: 0.2,
                            }}>DISPONIBLE</Text>
                            <Text numberOfLines={1} style={{
                              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.green,
                              marginTop: 4, fontVariant: ['tabular-nums'],
                            }}>{isHidden ? '••••' : fmtMXN(availableAmount)}</Text>
                          </View>
                        </View>
                      </>
                    );
                  })()}
                </Card>

                {/* Módulo 2: Fechas y Estado de Cuenta (Colapsable) */}
                {(acc.statementDay || acc.paymentDay) && (
                  <Card padding={16} style={{ marginTop: 14 }}>
                    <Pressable
                      onPress={() => setShowDatesSection(!showDatesSection)}
                      style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <SectionTitle title="Fechas y Estado de Cuenta" />
                      <Icon name={showDatesSection ? "chevron-up" : "chevron-down"} size={18} color={t.textMuted} />
                    </Pressable>
                    
                    {showDatesSection && (
                      <>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
                          {acc.statementDay ? (
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{
                                width: 28, height: 28, borderRadius: 8, backgroundColor: softFor(t, 'indigo'),
                                alignItems: 'center', justifyContent: 'center'
                              }}>
                                <Icon name="calendar" size={14} color={t.indigo} />
                              </View>
                              <View>
                                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted }}>
                                  DÍA DE CORTE
                                </Text>
                                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text, marginTop: 1 }}>
                                  Día {acc.statementDay}
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <View style={{ flex: 1 }} />
                          )}
                          
                          {acc.paymentDay ? (
                            <Pressable
                              onPress={() => {
                                if (balance < 0) {
                                  const firstLiquidAcc = state.accounts.find(a => a.type !== 'CREDIT_CARD');
                                  setFromAccountId(firstLiquidAcc?.id || '');
                                  setPaymentType(remainingStatementBalance > 0 ? 'total' : 'custom');
                                  setCustomPaymentAmount('');
                                  setPaymentModalStatementDay(acc.statementDay ? String(acc.statementDay) : '');
                                  setPaymentModalPaymentDay(acc.paymentDay ? String(acc.paymentDay) : '');
                                  setShowPaymentModal(true);
                                } else {
                                  Alert.alert('Sin deuda', 'Esta tarjeta no tiene saldo deudor que pagar.');
                                }
                              }}
                              style={({ pressed }) => [{
                                flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
                                opacity: pressed ? 0.7 : 1,
                              }]}
                            >
                              <View style={{
                                width: 28, height: 28, borderRadius: 8, backgroundColor: softFor(t, 'rose'),
                                alignItems: 'center', justifyContent: 'center'
                              }}>
                                <Icon name="cash" size={14} color={t.rose} />
                              </View>
                              <View>
                                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted }}>
                                  DÍA DE PAGO
                                </Text>
                                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.indigo, marginTop: 1 }}>
                                  Día {acc.paymentDay} ➔
                                </Text>
                              </View>
                            </Pressable>
                          ) : (
                            <View style={{ flex: 1 }} />
                          )}
                        </View>

                        <View style={{ height: 1, backgroundColor: t.border, marginVertical: 14 }} />
                        
                        <View style={{ gap: 10 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted, letterSpacing: 0.2 }}>
                                COMPRAS DE CONTADO (CICLO ACTUAL)
                              </Text>
                              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text, marginTop: 3, fontVariant: ['tabular-nums'] }}>
                                {fmtMXN(postCutoffExpenses)}
                              </Text>
                            </View>
                            <Pressable
                              onPress={() => {
                                setCutoffAmount(acc.statementBalance ? (acc.statementBalance / 100).toFixed(2) : '');
                                setCutoffMinimumPayment(acc.statementMinimumPayment ? (acc.statementMinimumPayment / 100).toFixed(2) : '');
                                setCutoffInterestRate(acc.interestRate ? String(acc.interestRate) : '');
                                setShowCutoffModal(true);
                              }}
                              style={({ pressed }) => [{
                                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                                backgroundColor: softFor(t, 'indigo'),
                                opacity: pressed ? 0.8 : 1,
                              }]}
                            >
                              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.indigo }}>
                                {acc.statementBalance ? 'Ajustar' : 'Ajuste manual'}
                              </Text>
                            </Pressable>
                          </View>

                          {installmentsData.totalMonthlyCents > 0 && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted, letterSpacing: 0.2 }}>
                                  CUOTAS DE COMPRAS A MESES (DEL MES)
                                </Text>
                                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.indigo, marginTop: 3, fontVariant: ['tabular-nums'] }}>
                                  +{fmtMXN(installmentsData.totalMonthlyCents)}
                                </Text>
                              </View>
                              <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: softFor(t, 'indigo') }}>
                                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.indigo }}>
                                  Parcialidades
                                </Text>
                              </View>
                            </View>
                          )}

                          <View style={{ height: 1, backgroundColor: t.border, marginVertical: 2 }} />

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted, letterSpacing: 0.2 }}>
                                TOTAL PAGO DEL PERIODO (CORTE A CORTE)
                              </Text>
                              {(() => {
                                const debtAmount = balance < 0 ? Math.abs(balance) : 0;
                                const singleExpensesInCycle = postCutoffExpenses;
                                const grossPeriodAmountCents = singleExpensesInCycle + activeInstallmentsDueInCycle;
                                const remainingPeriod = balance >= 0 ? 0 : Math.min(debtAmount, grossPeriodAmountCents);
                                return (
                                  <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: remainingPeriod > 0 ? t.rose : t.green, marginTop: 3, fontVariant: ['tabular-nums'] }}>
                                    {remainingPeriod === 0 ? '✅ ¡Periodo al corriente! ($0.00)' : fmtMXN(remainingPeriod)}
                                  </Text>
                                );
                              })()}
                            </View>
                          </View>
                        </View>
                      </>
                    )}
                  </Card>
                )}

                {/* Módulo 3: Compras a Meses Activas (MSI / MCI) (Colapsable) */}
                <Card padding={16} style={{ marginTop: 14 }}>
                  <Pressable
                    onPress={() => setShowInstallmentsSection(!showInstallmentsSection)}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}
                  >
                    <Text numberOfLines={1} style={{
                      fontFamily: 'PlusJakartaSans_800ExtraBold',
                      fontSize: 15, color: t.text, letterSpacing: -0.3,
                      flex: 1,
                    }}>
                      Compras a Meses (MSI / MCI)
                    </Text>
                    {(() => {
                      const activeCount = installmentsData.items.filter(i => i.remainingCents > 0).length;
                      return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <View style={{
                            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                            backgroundColor: activeCount > 0 ? softFor(t, 'indigo') : t.surfaceAlt,
                          }}>
                            <Text style={{
                              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10,
                              color: activeCount > 0 ? t.indigo : t.textMuted,
                            }}>
                              {activeCount === 0 ? 'Sin activas' : `${activeCount} ${activeCount === 1 ? 'activa' : 'activas'}`}
                            </Text>
                          </View>
                          <Icon name={showInstallmentsSection ? "chevron-up" : "chevron-down"} size={18} color={t.textMuted} />
                        </View>
                      );
                    })()}
                  </Pressable>

                  {showInstallmentsSection && (
                    <View style={{ marginTop: 12 }}>
                      {installmentsData.items.length > 0 ? (
                        <>
                          {/* Summary Box */}
                          <View style={{
                            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                            backgroundColor: t.surfaceAlt, padding: 12, borderRadius: 12,
                            borderWidth: 1, borderColor: t.border, marginBottom: 12,
                          }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted, letterSpacing: 0.3 }}>
                                PAGO MENSUAL ACUMULADO
                              </Text>
                              <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.indigo, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                                {fmtMXN(installmentsData.totalMonthlyCents)}/mes
                              </Text>
                            </View>
                            <View style={{ width: 1, height: 26, backgroundColor: t.border, marginHorizontal: 8 }} />
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted, letterSpacing: 0.3 }}>
                                SALDO TOTAL PENDIENTE
                              </Text>
                              <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                                {fmtMXN(installmentsData.totalRemainingCents)}
                              </Text>
                            </View>
                          </View>

                          {/* Segmented Filter Control */}
                          {(() => {
                            const activeItems = installmentsData.items.filter(i => i.remainingCents > 0);
                            const settledItems = installmentsData.items.filter(i => i.remainingCents === 0);
                            const displayedItems = installmentsFilter === 'active' 
                              ? activeItems 
                              : installmentsFilter === 'settled' 
                                ? settledItems 
                                : installmentsData.items;

                            return (
                              <>
                                <View style={{
                                  flexDirection: 'row', backgroundColor: t.surfaceAlt,
                                  padding: 3, borderRadius: 10, marginBottom: 12,
                                  borderWidth: 1, borderColor: t.border,
                                }}>
                                  <Pressable
                                    onPress={() => setInstallmentsFilter('active')}
                                    style={{
                                      flex: 1, paddingVertical: 6, borderRadius: 8,
                                      backgroundColor: installmentsFilter === 'active' ? t.surface : 'transparent',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <Text style={{
                                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11,
                                      color: installmentsFilter === 'active' ? t.text : t.textMuted,
                                    }}>
                                      Activas ({activeItems.length})
                                    </Text>
                                  </Pressable>

                                  <Pressable
                                    onPress={() => setInstallmentsFilter('settled')}
                                    style={{
                                      flex: 1, paddingVertical: 6, borderRadius: 8,
                                      backgroundColor: installmentsFilter === 'settled' ? t.surface : 'transparent',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <Text style={{
                                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11,
                                      color: installmentsFilter === 'settled' ? t.text : t.textMuted,
                                    }}>
                                      Finalizadas ({settledItems.length})
                                    </Text>
                                  </Pressable>

                                  <Pressable
                                    onPress={() => setInstallmentsFilter('all')}
                                    style={{
                                      flex: 1, paddingVertical: 6, borderRadius: 8,
                                      backgroundColor: installmentsFilter === 'all' ? t.surface : 'transparent',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <Text style={{
                                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11,
                                      color: installmentsFilter === 'all' ? t.text : t.textMuted,
                                    }}>
                                      Todas ({installmentsData.items.length})
                                    </Text>
                                  </Pressable>
                                </View>

                                {/* Items List */}
                                {displayedItems.length > 0 ? (
                                  <View style={{ gap: 10 }}>
                                    {displayedItems.map((item) => (
                                      <Pressable
                                        key={item.tx.id}
                                        onPress={() => navigate({ screen: 'transaction-detail', id: item.tx.id })}
                                        style={({ pressed }) => [{
                                          padding: 12, borderRadius: 14,
                                          backgroundColor: t.surface,
                                          borderWidth: 1, borderColor: t.border,
                                          opacity: pressed ? 0.75 : 1,
                                        }]}
                                      >
                                        {/* Top row: Badge + Title + MSI/MCI Pill */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                          <CategoryBadge cat={item.category} size={32} radius={9} />
                                          <View style={{ flex: 1 }}>
                                            <Text numberOfLines={1} style={{
                                              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text,
                                            }}>{item.tx.note || item.category?.name || 'Compra'}</Text>
                                            <Text style={{
                                              fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted, marginTop: 1,
                                            }}>
                                              {item.remainingCents === 0 ? `✅ Liquidada total (${item.totalMonths} de ${item.totalMonths})` : (item.elapsedMonths === 0 ? `0 de ${item.totalMonths} pagados (Próximo 1er pago)` : `Pago ${item.elapsedMonths} de ${item.totalMonths}`)}
                                            </Text>
                                          </View>
                                          <View style={{
                                            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                                            backgroundColor: item.isMci ? softFor(t, 'orange') : softFor(t, 'green'),
                                          }}>
                                            <Text style={{
                                              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 9.5,
                                              color: item.isMci ? t.orange : t.green,
                                            }}>
                                              {item.totalMonths} {item.isMci ? 'MCI' : 'MSI'}
                                            </Text>
                                          </View>
                                        </View>

                                        {/* Progress bar */}
                                        <ProgressBar pct={item.pct} color={item.isMci ? 'orange' : 'green'} height={5} />

                                        {/* Bottom row: Monthly payment + Remaining balance + End date */}
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11.5, color: t.text, fontVariant: ['tabular-nums'] }}>
                                            {fmtMXN(item.monthlyCents)}/mes
                                          </Text>
                                          <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.textMuted, fontVariant: ['tabular-nums'] }}>
                                            {item.remainingCents > 0 ? `Resta ${fmtMXN(item.remainingCents)} · ` : '¡Finalizado! · '}
                                            {item.endDateLabel}
                                          </Text>
                                        </View>
                                      </Pressable>
                                    ))}
                                  </View>
                                ) : (
                                  <Text style={{
                                    fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                                    textAlign: 'center', paddingVertical: 14,
                                  }}>
                                    {installmentsFilter === 'active' 
                                      ? 'No tienes compras a meses activas en esta tarjeta.'
                                      : installmentsFilter === 'settled'
                                        ? 'No tienes compras a meses finalizadas aún.'
                                        : 'No tienes compras a meses registradas.'}
                                  </Text>
                                )}
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                          textAlign: 'center', paddingVertical: 10,
                        }}>
                          No tienes compras activas a MSI o MCI en esta tarjeta.
                        </Text>
                      )}
                    </View>
                  )}
                </Card>
              </>
            ) : (
              <View style={{ marginTop: 8 }}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: t.textMuted,
                  textAlign: 'center', paddingVertical: 20
                }}>
                  Ingresa un límite de crédito para ver los detalles.
                </Text>
              </View>
            )}
          </>
        )}

        {/* Stats 30d */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Card padding={14} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="arrow-down" size={14} color={t.green} strokeWidth={2.5} />
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
              }}>ENTRA · 30d</Text>
            </View>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 17, color: t.text,
              marginTop: 4, letterSpacing: -0.3,
              fontVariant: ['tabular-nums'],
            }}>{isHidden ? '••••' : fmtMXN(stats.income)}</Text>
          </Card>
          <Card padding={14} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="arrow-up" size={14} color={t.rose} strokeWidth={2.5} />
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
              }}>SALE · 30d</Text>
            </View>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 17, color: t.text,
              marginTop: 4, letterSpacing: -0.3,
              fontVariant: ['tabular-nums'],
            }}>{isHidden ? '••••' : fmtMXN(stats.expense)}</Text>
          </Card>
        </View>

        {/* Movimientos */}
        <View style={{ marginTop: 18 }}>
          <SectionTitle title="Movimientos" />
          {accTxs.length === 0 ? (
            <View style={{ marginTop: 12 }}>
              <EmptyState
                icon="list"
                title="Sin movimientos"
                message="Esta cuenta no tiene transacciones todavía."
              />
            </View>
          ) : (
            <Card padding={4} style={{ marginTop: 12 }}>
              {accTxs.slice(0, 12).map((tx, i) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  accounts={state.accounts}
                  customCategories={state.customCategories}
                  divider={i < Math.min(accTxs.length, 12) - 1}
                  onPress={() => navigate({ screen: 'transaction-detail', id: tx.id })}
                />
              ))}
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Credit Card Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(10, 10, 12, 0.75)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: t.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: '88%',
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 34 : 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 20,
          }}>
            {/* Grabber handle */}
            <View style={{
              width: 38, height: 4.5, borderRadius: 2.25,
              backgroundColor: t.border, alignSelf: 'center',
              marginBottom: 16, marginTop: 4,
            }} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
              }}>Registrar Pago</Text>
              <Pressable onPress={() => setShowPaymentModal(false)} style={{ padding: 4 }}>
                <Icon name="x" size={18} color={t.textMuted} />
              </Pressable>
            </View>

            {/* Deuda info box */}
            {acc && (
              <View style={{
                backgroundColor: softFor(t, acc.color || 'rose'),
                padding: 14, borderRadius: 14, marginBottom: 18,
                borderWidth: 1, borderColor: colorFor(t, acc.color || 'rose') + '22' as any,
              }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: colorFor(t, acc.color || 'rose'), letterSpacing: 0.3 }}>
                  DEUDA ACTUAL EN {acc.name.toUpperCase()}
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24, color: colorFor(t, acc.color || 'rose'), marginTop: 4, fontVariant: ['tabular-nums'] }}>
                  {fmtMXN(Math.abs(balance))}
                </Text>
              </View>
            )}

            {/* Fechas de Corte/Pago Banner or Inline Registration */}
            {acc.statementDay && acc.paymentDay ? (
              <View style={{
                backgroundColor: t.surfaceAlt, padding: 10, borderRadius: 12,
                marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                borderWidth: 1, borderColor: t.border,
              }}>
                <View>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted, letterSpacing: 0.2 }}>
                    FECHAS CONFIGURADAS
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.text, marginTop: 2 }}>
                    Corte: Día {acc.statementDay} · Pago: Día {acc.paymentDay}
                  </Text>
                </View>
                <View style={{
                  width: 20, height: 20, borderRadius: 10, backgroundColor: softFor(t, 'green'),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="check" size={12} color={t.green} strokeWidth={3} />
                </View>
              </View>
            ) : (
              <View style={{
                backgroundColor: softFor(t, 'indigo'), padding: 12, borderRadius: 12,
                marginBottom: 14, borderWidth: 1, borderColor: t.indigo + '22' as any,
              }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.indigo }}>
                  💡 PRECISIÓN RECOMENDADA
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, color: t.text, marginTop: 4, lineHeight: 14 }}>
                  Registra las fechas de tu tarjeta para obtener simulaciones y estimaciones de interés exactas:
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 8, color: t.textMuted, marginBottom: 3 }}>DÍA DE CORTE</Text>
                    <TextInput
                      value={paymentModalStatementDay}
                      onChangeText={(v) => {
                        const clean = v.replace(/[^0-9]/g, '');
                        const num = parseInt(clean);
                        if (clean === '' || (num >= 1 && num <= 31)) {
                          setPaymentModalStatementDay(clean);
                        }
                      }}
                      placeholder="Ej. 15"
                      placeholderTextColor={t.textMuted}
                      keyboardType="number-pad"
                      maxLength={2}
                      style={{
                        paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8,
                        backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
                        color: t.text, fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold',
                        fontVariant: ['tabular-nums'],
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 8, color: t.textMuted, marginBottom: 3 }}>DÍA DE PAGO</Text>
                    <TextInput
                      value={paymentModalPaymentDay}
                      onChangeText={(v) => {
                        const clean = v.replace(/[^0-9]/g, '');
                        const num = parseInt(clean);
                        if (clean === '' || (num >= 1 && num <= 31)) {
                          setPaymentModalPaymentDay(clean);
                        }
                      }}
                      placeholder="Ej. 5"
                      placeholderTextColor={t.textMuted}
                      keyboardType="number-pad"
                      maxLength={2}
                      style={{
                        paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8,
                        backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
                        color: t.text, fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold',
                        fontVariant: ['tabular-nums'],
                      }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Payment Options */}
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted, marginBottom: 8 }}>
              SELECCIONA TU OPCIÓN DE PAGO
            </Text>

            {/* Option 1: Pago del Periodo (Corte a corte) */}
            {(() => {
              const debtAmount = balance < 0 ? Math.abs(balance) : 0;
              const singleExpensesInCycle = postCutoffExpenses;
              const grossPeriodAmountCents = singleExpensesInCycle + activeInstallmentsDueInCycle;
              const periodAmountCents = balance >= 0 ? 0 : Math.min(debtAmount, grossPeriodAmountCents);
              const totalDebtCents = Math.abs(balance);
              return (
                <>
                  <Pressable
                    onPress={() => setPaymentType('period')}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      padding: 12, borderRadius: 12, borderWidth: 1,
                      borderColor: paymentType === 'period' ? t.indigo : t.border,
                      backgroundColor: paymentType === 'period' ? softFor(t, 'indigo') : 'transparent',
                      marginBottom: 8,
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
                        Gastos del ciclo actual + parcialidades del mes a meses
                      </Text>
                      <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: periodAmountCents === 0 ? t.green : t.indigo, marginTop: 3, fontVariant: ['tabular-nums'] }}>
                        {periodAmountCents === 0 ? '✅ ¡Periodo al corriente! ($0.00)' : fmtMXN(periodAmountCents)}
                      </Text>
                    </View>
                  </Pressable>

                  {/* Option 2: Liquidación Total de la Tarjeta */}
                  <Pressable
                    onPress={() => setPaymentType('total')}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      padding: 12, borderRadius: 12, borderWidth: 1,
                      borderColor: paymentType === 'total' ? t.green : t.border,
                      backgroundColor: paymentType === 'total' ? softFor(t, 'green') : 'transparent',
                      marginBottom: 8,
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
                        Liquidación Total de la Tarjeta
                      </Text>
                      <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10.5, color: t.textMuted, marginTop: 1 }}>
                        Pagas toda la deuda retenida de la tarjeta al 100% (Deuda a $0.00)
                      </Text>
                      <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: t.green, marginTop: 3, fontVariant: ['tabular-nums'] }}>
                        {fmtMXN(totalDebtCents)}
                      </Text>
                    </View>
                  </Pressable>

                  {/* Option 3: Custom Amount */}
                  <Pressable
                    onPress={() => setPaymentType('custom')}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      padding: 12, borderRadius: 12, borderWidth: 1,
                      borderColor: paymentType === 'custom' ? t.orange : t.border,
                      backgroundColor: paymentType === 'custom' ? softFor(t, 'orange') : 'transparent',
                      marginBottom: 14,
                    }}
                  >
                    <View style={{
                      width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                      borderColor: paymentType === 'custom' ? t.orange : t.textMuted,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {paymentType === 'custom' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.orange }} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text, marginBottom: paymentType === 'custom' ? 6 : 0 }}>
                        Otro monto (Abono libre)
                      </Text>
                      {paymentType === 'custom' && (
                        <TextInput
                          value={customPaymentAmount}
                          onChangeText={(v) => {
                            const clean = v.replace(/[^0-9.]/g, '');
                            setCustomPaymentAmount(clean);
                          }}
                          placeholder="0.00"
                          placeholderTextColor={t.textMuted}
                          keyboardType="decimal-pad"
                          style={{
                            paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: t.orange,
                            color: t.text, fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold',
                            fontVariant: ['tabular-nums'],
                          }}
                        />
                      )}
                    </View>
                  </Pressable>

                  {/* Interest Warning Logic */}
                  {(() => {
                    let paidValCents = 0;
                    if (paymentType === 'period') paidValCents = periodAmountCents;
                    else if (paymentType === 'total') paidValCents = totalDebtCents;
                    else paidValCents = Math.round((parseFloat(customPaymentAmount) || 0) * 100);

                    const paidVal = paidValCents / 100;
                    const periodDebt = periodAmountCents / 100;

                    // Hide interest warning if there is an active insufficient balance warning to avoid screen clutter
                    const selectedAcc = state.accounts.find(a => a.id === fromAccountId);
                    const bal = selectedAcc ? computeAccountBalance(selectedAcc, state.transactions) : 0;
                    if (bal < paidValCents) return null;

                    const remaining = Math.max(0, periodDebt - paidVal);
                    if (remaining > 0) {
                      const annualRate = (acc.interestRate ?? 55) / 100;
                      const estimatedInterest = (remaining * annualRate) / 12;
                      return (
                        <View style={{
                          backgroundColor: softFor(t, 'rose'), padding: 10, borderRadius: 10,
                          marginBottom: 16, borderWidth: 1, borderColor: t.rose + '22' as any,
                        }}>
                          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.rose }}>
                            ⚠️ ALERTA DE INTERESES
                          </Text>
                          <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.rose, marginTop: 4, lineHeight: 14 }}>
                            Quedará un saldo pendiente de <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold' }}>{fmtMXN(Math.round(remaining * 100))}</Text> del periodo. Esto generará un interés estimado de <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold' }}>{fmtMXN(Math.round(estimatedInterest * 100))}</Text> en tu próximo corte.
                          </Text>
                        </View>
                      );
                    }
                    return (
                      <View style={{
                        backgroundColor: softFor(t, 'green'), padding: 10, borderRadius: 10,
                        marginBottom: 16, borderWidth: 1, borderColor: t.green + '22' as any,
                      }}>
                        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.green }}>
                          ✅ EXENTO DE INTERESES
                        </Text>
                        <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.green, marginTop: 4, lineHeight: 14 }}>
                          ¡Excelente! Cubrir el pago del periodo asegura que tu tarjeta no generará intereses en este ciclo.
                        </Text>
                      </View>
                    );
                  })()}

                  {/* Select account to pay from */}
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted, marginBottom: 8 }}>
                    PAGAR DESDE CUENTA
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginHorizontal: -22, marginBottom: 20 }}
                    contentContainerStyle={{ paddingHorizontal: 22, gap: 8, paddingVertical: 4 }}
                  >
                    {state.accounts.filter(a => a.type !== 'CREDIT_CARD').map(a => {
                      const bal = computeAccountBalance(a, state.transactions);
                      const selected = fromAccountId === a.id;
                      return (
                        <Pressable
                          key={a.id}
                          onPress={() => setFromAccountId(a.id)}
                          style={{
                            height: 48, paddingHorizontal: 12, borderRadius: 10,
                            backgroundColor: selected ? softFor(t, 'indigo') : t.surfaceAlt,
                            borderWidth: selected ? 2 : 1,
                            borderColor: selected ? t.indigo : t.border,
                            flexDirection: 'row', alignItems: 'center', gap: 6,
                          }}
                        >
                          <Text style={{
                            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                            color: selected ? t.indigo : t.text,
                          }}>{a.name} ({fmtMXN(bal)})</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {/* Insufficient balance warning */}
                  {(() => {
                    const selectedAcc = state.accounts.find(a => a.id === fromAccountId);
                    if (!selectedAcc) return null;
                    const bal = computeAccountBalance(selectedAcc, state.transactions);
                    let paidValCents = 0;
                    if (paymentType === 'period') paidValCents = periodAmountCents;
                    else if (paymentType === 'total') paidValCents = totalDebtCents;
                    else paidValCents = Math.round((parseFloat(customPaymentAmount) || 0) * 100);

                    if (bal < paidValCents) {
                      return (
                        <View style={{
                          backgroundColor: softFor(t, 'rose'), padding: 10, borderRadius: 10,
                          marginBottom: 16, borderWidth: 1, borderColor: t.rose + '22' as any,
                        }}>
                          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.rose }}>
                            ⚠️ SALDO INSUFICIENTE
                          </Text>
                          <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.rose, marginTop: 4, lineHeight: 14 }}>
                            La cuenta seleccionada no tiene saldo suficiente para cubrir este pago de {fmtMXN(paidValCents)}. Saldo disponible: {fmtMXN(bal)}.
                          </Text>
                        </View>
                      );
                    }
                    return null;
                  })()}



                  {/* Confirm button */}
                  {acc && (() => {
                    let paidValCents = 0;
                    if (paymentType === 'period') paidValCents = periodAmountCents;
                    else if (paymentType === 'total') paidValCents = totalDebtCents;
                    else paidValCents = Math.round((parseFloat(customPaymentAmount) || 0) * 100);

                    const selectedAcc = state.accounts.find(a => a.id === fromAccountId);
                    const selectedAccBal = selectedAcc ? computeAccountBalance(selectedAcc, state.transactions) : 0;
                    const isDisabled = paidValCents <= 0 || !fromAccountId || selectedAccBal < paidValCents;

                    return (
                      <Pressable
                        onPress={() => {
                          if (isDisabled) return;

                          const timeNow = Date.now();
                          const pairId = 'pair-' + timeNow;

                          const expenseTx = {
                            id: 't-exp-' + timeNow,
                            type: 'EXPENSE' as const,
                            amount: paidValCents,
                            date: timeNow,
                            accountId: fromAccountId,
                            categoryId: 'cat-debt',
                            note: paymentType === 'total' ? `Pago de tarjeta (Total): ${acc.name}` : `Pago de tarjeta (Periodo): ${acc.name}`,
                            destinationAccountId: null,
                            destinationGoalId: null,
                            transferPairId: pairId,
                          };
                          dispatch({ type: 'ADD_TX', tx: expenseTx });

                          const incomeTx = {
                            id: 't-inc-' + (timeNow + 1),
                            type: 'INCOME' as const,
                            amount: paidValCents,
                            date: timeNow + 1,
                            accountId: acc.id,
                            categoryId: 'cat-debt',
                            note: `Abono por pago recibido`,
                            destinationAccountId: null,
                            destinationGoalId: null,
                            transferPairId: pairId,
                          };
                          dispatch({ type: 'ADD_TX', tx: incomeTx });

                          // If paying Total Debt, mark all active installment purchases on this card as early settled!
                          if (paymentType === 'total') {
                            for (const item of installmentsData.items) {
                              if (item.remainingCents > 0) {
                                dispatch({
                                  type: 'UPDATE_TX',
                                  tx: { ...item.tx, isEarlySettled: true, settledByTxId: incomeTx.id },
                                });
                              }
                            }
                          }

                          // Update account: save statement dates if entered
                          const updatedAcc = {
                            ...acc,
                            ...((paymentModalStatementDay && !acc.statementDay) && { statementDay: parseInt(paymentModalStatementDay) }),
                            ...((paymentModalPaymentDay && !acc.paymentDay) && { paymentDay: parseInt(paymentModalPaymentDay) }),
                          };
                          dispatch({ type: 'UPDATE_ACC', acc: updatedAcc });

                          setShowPaymentModal(false);
                          setCustomPaymentAmount('');
                          Alert.alert('Pago registrado', `Se registró el pago por ${fmtMXN(paidValCents)} desde tu cuenta.`);
                        }}
                        disabled={isDisabled}
                        style={({ pressed }) => [{
                          borderRadius: 14, overflow: 'hidden', marginTop: 10,
                          opacity: isDisabled ? 0.5 : (pressed ? 0.85 : 1),
                        }]}
                      >
                        <LinearGradient
                          colors={isDisabled ? [t.border, t.border] : [t.indigo, t.violet]}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={{ paddingVertical: 14, alignItems: 'center' }}
                        >
                          <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#fff', letterSpacing: 0.2 }}>
                            CONFIRMAR PAGO DE {fmtMXN(paidValCents)}
                          </Text>
                        </LinearGradient>
                      </Pressable>
                    );
                  })()}
                </>
              );
            })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Statement Cutoff Balance Modal */}
      <Modal
        visible={showCutoffModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowCutoffModal(false)}
      >
        <View style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center', alignItems: 'center',
          padding: 24,
        }}>
          {acc && (
            <Card padding={22} style={{ width: '100%', maxWidth: 340, borderRadius: 24 }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
                marginBottom: 12,
              }}>{acc.statementBalance ? 'Ajustar Saldo al Corte' : 'Registrar Saldo al Corte'}</Text>

              <Text style={{
                fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
                marginBottom: 16, lineHeight: 18,
              }}>
                Ingresa el saldo al corte de tu último estado de cuenta. El simulador de pagos utilizará esta cifra exacta en lugar de tu saldo actual de compras.
              </Text>

              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
                marginBottom: 8,
              }}>SALDO AL CORTE</Text>
              <TextInput
                value={cutoffAmount}
                onChangeText={(v) => {
                  const clean = v.replace(/[^0-9.]/g, '');
                  setCutoffAmount(clean);
                }}
                placeholder="0.00"
                placeholderTextColor={t.textMuted}
                keyboardType="decimal-pad"
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1, borderBottomColor: t.indigo,
                  color: t.text, fontSize: 15,
                  fontFamily: 'PlusJakartaSans_700Bold',
                  fontVariant: ['tabular-nums'],
                  marginBottom: 14,
                }}
              />

              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
                marginBottom: 8,
              }}>PAGO MÍNIMO DEL CORTE (OPCIONAL)</Text>
              <TextInput
                value={cutoffMinimumPayment}
                onChangeText={(v) => {
                  const clean = v.replace(/[^0-9.]/g, '');
                  setCutoffMinimumPayment(clean);
                }}
                placeholder="Se calcula al 5%"
                placeholderTextColor={t.textMuted}
                keyboardType="decimal-pad"
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1, borderBottomColor: t.indigo,
                  color: t.text, fontSize: 15,
                  fontFamily: 'PlusJakartaSans_700Bold',
                  fontVariant: ['tabular-nums'],
                  marginBottom: 14,
                }}
              />

              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
                marginBottom: 8,
              }}>TASA DE INTERÉS / CAT % (OPCIONAL)</Text>
              <TextInput
                value={cutoffInterestRate}
                onChangeText={(v) => {
                  const clean = v.replace(/[^0-9.]/g, '');
                  setCutoffInterestRate(clean);
                }}
                placeholder={acc.interestRate ? `${acc.interestRate}%` : "55.0%"}
                placeholderTextColor={t.textMuted}
                keyboardType="decimal-pad"
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1, borderBottomColor: t.indigo,
                  color: t.text, fontSize: 15,
                  fontFamily: 'PlusJakartaSans_700Bold',
                  fontVariant: ['tabular-nums'],
                  marginBottom: 20,
                }}
              />

              <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                <Pressable
                  onPress={() => setShowCutoffModal(false)}
                  style={{ paddingHorizontal: 16, paddingVertical: 10 }}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.textMuted,
                  }}>Cancelar</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const amtVal = parseFloat(cutoffAmount) || 0;
                    const minVal = parseFloat(cutoffMinimumPayment) || 0;
                    const rateVal = parseFloat(cutoffInterestRate) || 0;
                    const updatedAcc = {
                      ...acc,
                      statementBalance: amtVal > 0 ? Math.round(amtVal * 100) : undefined,
                      statementMinimumPayment: minVal > 0 ? Math.round(minVal * 100) : undefined,
                      interestRate: rateVal > 0 ? rateVal : undefined,
                    };
                    dispatch({ type: 'UPDATE_ACC', acc: updatedAcc });
                    setShowCutoffModal(false);
                  }}
                  style={({ pressed }) => [{
                    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
                    backgroundColor: t.indigo,
                    opacity: pressed ? 0.85 : 1,
                  }]}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#fff',
                  }}>Guardar</Text>
                </Pressable>
              </View>
            </Card>
          )}
        </View>
      </Modal>

      {/* Modal: Registrar Interés Generado */}
      <Modal
        visible={showInterestModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowInterestModal(false)}
      >
        <View style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center', alignItems: 'center',
          padding: 24,
        }}>
          {acc && (
            <Card padding={22} style={{ width: '100%', maxWidth: 340, borderRadius: 24 }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
                marginBottom: 12,
              }}>Registrar Interés</Text>

              <Text style={{
                fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
                marginBottom: 16, lineHeight: 18,
              }}>
                Si realizaste pagos parciales o mínimos, ingresa el interés generado al corte para que se sume a tu deuda y disminuya tu crédito disponible de forma correcta.
              </Text>

              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
                marginBottom: 8,
              }}>MONTO DEL INTERÉS</Text>
              <TextInput
                value={interestAmount}
                onChangeText={(v) => {
                  const clean = v.replace(/[^0-9.]/g, '');
                  setInterestAmount(clean);
                }}
                placeholder="0.00"
                placeholderTextColor={t.textMuted}
                keyboardType="decimal-pad"
                autoFocus
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1, borderBottomColor: t.rose,
                  color: t.text, fontSize: 15,
                  fontFamily: 'PlusJakartaSans_700Bold',
                  fontVariant: ['tabular-nums'],
                  marginBottom: 20,
                }}
              />

              <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                <Pressable
                  onPress={() => setShowInterestModal(false)}
                  style={{ paddingHorizontal: 16, paddingVertical: 10 }}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.textMuted,
                  }}>Cancelar</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const amtVal = parseFloat(interestAmount) || 0;
                    if (amtVal <= 0) return;

                    // An interest charge on a credit card behaves as an EXPENSE (Gasto) on the card account,
                    // which increases the debt (balance goes further negative) and reduces available credit.
                    const interestTx = {
                      id: 't-int-charge-' + Date.now(),
                      type: 'EXPENSE' as const,
                      amount: Math.round(amtVal * 100),
                      date: Date.now(),
                      accountId: acc.id,
                      categoryId: 'cat-debt', // Tracked under Debt/Intereses
                      note: `Intereses generados por financiamiento`,
                      destinationAccountId: null,
                      destinationGoalId: null,
                    };
                    dispatch({ type: 'ADD_TX', tx: interestTx });

                    setShowInterestModal(false);
                    Alert.alert('Interés registrado', `Se cargaron ${fmtMXN(Math.round(amtVal * 100))} de intereses a tu tarjeta.`);
                  }}
                  disabled={!(parseFloat(interestAmount) > 0)}
                  style={({ pressed }) => [{
                    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
                    backgroundColor: t.rose,
                    opacity: (parseFloat(interestAmount) > 0) ? (pressed ? 0.85 : 1) : 0.5,
                  }]}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#fff',
                  }}>Registrar</Text>
                </Pressable>
              </View>
            </Card>
          )}
        </View>
      </Modal>
    </View>
  );
}
