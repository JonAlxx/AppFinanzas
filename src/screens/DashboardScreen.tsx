import React, { useMemo, useState, useEffect } from 'react';
import { Image, Pressable, ScrollView, Text, View, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

import { catById } from '../data/catalog';
import { fmtMXN } from '../data/format';
import { Recurring } from '../data/types';
import {
  computeAccountBalance, computeBalanceSummary, computeTotalsForAccounts, dailySeries,
  isCreditAccount, isDebitAccount, isCashAccount, spentByCategory, upcomingPayments,
  getCardTypeForAccount,
} from '../data/selectors';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';

import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { SectionTitle } from '../components/SectionTitle';
import { TransactionRow } from '../components/TransactionRow';
import { BankCard } from '../components/BankCard';
import { CategoryBadge } from '../components/Badges';
import { Sheet } from '../components/Sheet';
import { Icon, IconName } from '../icons/Icon';

const NARROW_DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function MiniStat({ icon, iconColor, label, value }: { icon: IconName; iconColor: string; label: string; value: string }) {
  return (
    <View style={{ minWidth: 0, flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View style={{
          width: 16, height: 16, borderRadius: 5,
          backgroundColor: 'rgba(255,255,255,0.16)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={icon} size={10} color={iconColor} strokeWidth={3} />
        </View>
        <Text style={{
          fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#C7D2FE',
          letterSpacing: 0.2,
        }}>{label}</Text>
      </View>
      <Text numberOfLines={1} style={{
        fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff',
        letterSpacing: -0.3, marginTop: 4,
        fontVariant: ['tabular-nums'],
      }}>{value}</Text>
    </View>
  );
}

function QuickAction({ icon, color, label, onPress }: { icon: IconName; color: string; label: string; onPress: () => void }) {
  const { t, dark } = useTheme();
  const c = colorFor(t, color);
  const soft = softFor(t, color);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{
      flex: 1,
      backgroundColor: t.surface,
      paddingTop: 14, paddingBottom: 12, paddingHorizontal: 6,
      borderRadius: 18, alignItems: 'center', gap: 8,
      transform: [{ scale: pressed ? 0.97 : 1 }],
      ...(dark
        ? { borderWidth: 1, borderColor: t.border }
        : {
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 2,
            elevation: 1,
          }),
    }]}>
      <View style={{
        width: 38, height: 38, borderRadius: 12, backgroundColor: soft,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={20} color={c} strokeWidth={2.4} />
      </View>
      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.text }}>{label}</Text>
    </Pressable>
  );
}

export function DashboardScreen() {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { navigate } = useNavigation();

  const [showOrderSheet, setShowOrderSheet] = useState(false);
  const [selectedUpcoming, setSelectedUpcoming] = useState<{ rule: Recurring; date: number } | null>(null);
  const [detailSection, setDetailSection] = useState<string | null>(null);
  const [activeTx, setActiveTx] = useState<any>(null);
  const [showHealthSheet, setShowHealthSheet] = useState(false);

  const { accounts, transactions, budgets, recurring, notifications, balanceHidden, hiddenCards = [], goals, pushNotificationsEnabled } = state;
  const summary = useMemo(() => computeBalanceSummary(accounts, transactions), [accounts, transactions]);
  const debitAccounts = useMemo(() => accounts.filter(a => a.type === 'BANK' || a.type === 'DEBIT_CARD'), [accounts]);
  const cashAccounts = useMemo(() => accounts.filter(isCashAccount), [accounts]);
  const creditAccounts = useMemo(() => accounts.filter(isCreditAccount), [accounts]);
  const savingsAccounts = useMemo(() => accounts.filter(a => a.type === 'SAVINGS'), [accounts]);
  const investmentAccounts = useMemo(() => accounts.filter(a => a.type === 'INVESTMENT'), [accounts]);
  const vouchersAccounts = useMemo(() => accounts.filter(a => a.type === 'DIGITAL_WALLET'), [accounts]);
  
  const debitBalance = useMemo(() => {
    return debitAccounts.reduce((sum, acc) => sum + computeAccountBalance(acc, transactions), 0);
  }, [debitAccounts, transactions]);
  
  const cashBalance = useMemo(() => {
    return cashAccounts.reduce((sum, acc) => sum + computeAccountBalance(acc, transactions), 0);
  }, [cashAccounts, transactions]);

  const savingsBalance = useMemo(() => {
    return savingsAccounts.reduce((sum, acc) => sum + computeAccountBalance(acc, transactions), 0);
  }, [savingsAccounts, transactions]);

  const investmentBalance = useMemo(() => {
    return investmentAccounts.reduce((sum, acc) => sum + computeAccountBalance(acc, transactions), 0);
  }, [investmentAccounts, transactions]);

  const vouchersBalance = useMemo(() => {
    return vouchersAccounts.reduce((sum, acc) => sum + computeAccountBalance(acc, transactions), 0);
  }, [vouchersAccounts, transactions]);

  const debitTotals = useMemo(
    () => computeTotalsForAccounts(debitBalance, debitAccounts.map(a => a.id), transactions, 30),
    [debitBalance, debitAccounts, transactions]
  );
  const cashTotals = useMemo(
    () => computeTotalsForAccounts(cashBalance, cashAccounts.map(a => a.id), transactions, 30),
    [cashBalance, cashAccounts, transactions]
  );
  const savingsTotals = useMemo(
    () => computeTotalsForAccounts(savingsBalance, savingsAccounts.map(a => a.id), transactions, 30),
    [savingsBalance, savingsAccounts, transactions]
  );
  const investmentTotals = useMemo(
    () => computeTotalsForAccounts(investmentBalance, investmentAccounts.map(a => a.id), transactions, 30),
    [investmentBalance, investmentAccounts, transactions]
  );
  const vouchersTotals = useMemo(
    () => computeTotalsForAccounts(vouchersBalance, vouchersAccounts.map(a => a.id), transactions, 30),
    [vouchersBalance, vouchersAccounts, transactions]
  );
  const creditStats = useMemo(() => {
    let totalLimit = 0;
    let totalUsed = 0;
    let totalAvailable = 0;
    for (const acc of creditAccounts) {
      const limit = acc.limit || 0;
      const bal = computeAccountBalance(acc, transactions);
      const debt = bal < 0 ? Math.abs(bal) : 0;
      totalLimit += limit;
      totalUsed += debt;
      totalAvailable += Math.max(0, limit + bal);
    }
    return {
      limit: totalLimit,
      used: totalUsed,
      available: totalAvailable,
    };
  }, [creditAccounts, transactions]);
  
  const nextPayments = useMemo(() => upcomingPayments(recurring, 7, 3), [recurring]);

  const urgentPayments = useMemo(() => {
    return nextPayments.filter(p => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.round((p.date - today.getTime()) / 86400000);
      return diffDays >= 0 && diffDays <= 3;
    });
  }, [nextPayments]);

  const healthScore = useMemo(() => {
    // 1. Budget Score (40 pts)
    let budgetScore = 40;
    let totalBudgetLimit = 0;
    let totalBudgetSpent = 0;
    if (budgets.length > 0) {
      budgets.forEach(b => {
        totalBudgetLimit += b.limit;
        totalBudgetSpent += spentByCategory(transactions, b.categoryId, 30);
      });
      if (totalBudgetLimit > 0) {
        const ratio = totalBudgetSpent / totalBudgetLimit;
        if (ratio > 1.0) {
          budgetScore = Math.max(0, 40 - (ratio - 1.0) * 80);
        } else if (ratio > 0.8) {
          budgetScore = 40 - (ratio - 0.8) * 50;
        }
      }
    }

    // 2. Savings Score (30 pts)
    let savingsScore = 15;
    const totalIncome = transactions.filter(t => t.type === 'INCOME' && Date.now() - t.date <= 30 * 86400000).reduce((sum, t) => sum + t.amount, 0);
    const activeGoals = goals.filter(g => !g.completed);
    const totalSaved = activeGoals.reduce((sum, g) => sum + g.current, 0);
    if (totalIncome > 0) {
      const savingsRate = totalSaved / totalIncome;
      savingsScore = Math.min(30, Math.round(savingsRate * 100));
    } else if (totalSaved > 0) {
      savingsScore = 30;
    }

    // 3. Credit Score (30 pts)
    let creditScore = 30;
    if (creditStats.limit > 0) {
      const creditRatio = creditStats.used / creditStats.limit;
      if (creditRatio > 0.8) {
        creditScore = 5;
      } else if (creditRatio > 0.5) {
        creditScore = 15;
      } else if (creditRatio > 0.3) {
        creditScore = 25;
      }
    }

    const score = Math.max(0, Math.min(100, Math.round(budgetScore + savingsScore + creditScore)));
    
    let advice = "Excelente control financiero. Sigue así.";
    if (score < 50) {
      advice = "Alerta: Tus presupuestos están al límite y tu deuda es alta. Intenta recortar gastos.";
    } else if (score < 75) {
      advice = "Buen camino, pero intenta aumentar tu nivel de ahorro mensual.";
    } else if (budgetScore < 30) {
      advice = "Cuidado: Estás muy cerca de superar el límite de tus presupuestos.";
    } else if (creditScore < 20) {
      advice = "Consejo: Tus tarjetas de crédito están muy usadas, intenta liquidar saldos.";
    }

    return {
      score,
      advice,
      budgetScore: Math.round(budgetScore),
      savingsScore: Math.round(savingsScore),
      creditScore: Math.round(creditScore),
      totalBudgetLimit,
      totalBudgetSpent,
      totalIncome,
      totalSaved,
      creditLimit: creditStats.limit,
      creditUsed: creditStats.used
    };
  }, [budgets, transactions, goals, creditStats]);

  function confirmPayment(p: { rule: Recurring; date: number }) {
    const isIncome = p.rule.type === 'INCOME';
    const acc = accounts.find(a => a.id === p.rule.accountId);

    if (!isIncome) {
      const balance = acc ? computeAccountBalance(acc, transactions) : 0;
      if (p.rule.amount > balance) {
        Alert.alert(
          'Saldo insuficiente',
          `La cuenta "${acc?.name || 'seleccionada'}" tiene un saldo actual de ${fmtMXN(balance)}, el cual es menor al monto del pago de ${fmtMXN(p.rule.amount)}.\n\nPor favor, revisa tus fondos o edita la programación de este pago para seleccionar otra cuenta con el saldo requerido.`,
          [{ text: 'Entendido' }]
        );
        return;
      }
    }

    // Use today's date with the actual current time as the transaction date (user is confirming it now).
    // If confirming a past date, preserve that scheduled date but with the current hour/minute to have a proper timestamp.
    // lastGenerated keeps the scheduled date to maintain the recurring cycle correctly.
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
  const recentTxs = useMemo(
    () => [...transactions].sort((a, b) => b.date - a.date).slice(0, 4),
    [transactions]
  );
  const series = useMemo(() => dailySeries(transactions, 7, 'EXPENSE'), [transactions]);
  const unread = notifications.filter(n => !n.read).length;
  const activeBudgets = useMemo(() => {
    return budgets.map(b => {
      const cat = catById(b.categoryId, state.customCategories);
      const spent = spentByCategory(transactions, b.categoryId, 30);
      return { ...b, cat, spent, pct: (spent / b.limit) * 100 };
    }).sort((a, b) => b.pct - a.pct).slice(0, 3);
  }, [budgets, transactions, state.customCategories]);

  const seriesMax = Math.max(...series.map(x => x.amount), 1);
  const seriesTotal = series.reduce((s, d) => s + d.amount, 0);
  const branded = accounts.filter(a => a.brand || a.type === 'DEBIT_CARD' || a.type === 'CREDIT_CARD' || a.type === 'DIGITAL_WALLET');

  const activeSection = detailSection;

  const activeAccounts = useMemo(() => {
    if (!activeSection) return [];
    switch (activeSection) {
      case 'debit':
        return debitAccounts;
      case 'cash':
        return cashAccounts;
      case 'credit':
        return creditAccounts;
      case 'savings':
        return savingsAccounts;
      case 'investment':
        return investmentAccounts;
      case 'vouchers':
        return vouchersAccounts;
      default:
        return [];
    }
  }, [activeSection, debitAccounts, cashAccounts, creditAccounts, savingsAccounts, investmentAccounts, vouchersAccounts]);

  const activeTotals = useMemo(() => {
    if (!activeSection) return null;
    switch (activeSection) {
      case 'debit':
        return debitTotals;
      case 'cash':
        return cashTotals;
      case 'savings':
        return savingsTotals;
      case 'investment':
        return investmentTotals;
      case 'vouchers':
        return vouchersTotals;
      default:
        return null;
    }
  }, [activeSection, debitTotals, cashTotals, savingsTotals, investmentTotals, vouchersTotals]);

  const activeAccountIds = useMemo(() => activeAccounts.map(a => a.id), [activeAccounts]);

  const sectionTxs = useMemo(() => {
    if (!activeSection) return [];
    return transactions
      .filter(tx => activeAccountIds.includes(tx.accountId))
      .sort((a, b) => b.date - a.date)
      .slice(0, 4);
  }, [transactions, activeAccountIds, activeSection]);

  const isActiveSectionHidden = useMemo(() => {
    if (!activeSection) return false;
    return balanceHidden || hiddenCards.includes(activeSection);
  }, [balanceHidden, hiddenCards, activeSection]);

  const order = useMemo(() => {
    const mandatory = ['debit', 'cash', 'credit'];
    
    const dynamic: string[] = [];
    if (state.accounts.some(a => a.type === 'SAVINGS')) dynamic.push('savings');
    if (state.accounts.some(a => a.type === 'INVESTMENT')) dynamic.push('investment');
    if (state.accounts.some(a => a.type === 'DIGITAL_WALLET')) dynamic.push('vouchers');

    const activeTypes = [...mandatory, ...dynamic];
    
    const savedOrder = state.cardOrder || [];
    const orderedActive = savedOrder.filter(item => activeTypes.includes(item));
    
    for (const type of activeTypes) {
      if (!orderedActive.includes(type)) {
        orderedActive.push(type);
      }
    }
    
    const finalMandatory = orderedActive.filter(item => mandatory.includes(item));
    const finalDynamic = orderedActive.filter(item => dynamic.includes(item));
    
    return [...finalMandatory, ...finalDynamic];
  }, [state.accounts, state.cardOrder]);

  function moveCard(index: number, direction: 'up' | 'down') {
    const nextOrder = [...order];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= nextOrder.length) return;
    const temp = nextOrder[index];
    nextOrder[index] = nextOrder[targetIndex];
    nextOrder[targetIndex] = temp;
    dispatch({ type: 'SET_CARD_ORDER', order: nextOrder });
  }

  const renderCard = (cardType: string) => {
    const isHidden = balanceHidden || hiddenCards.includes(cardType);
    switch (cardType) {
      case 'debit':
        return (
          <Pressable
            key="debit"
            onPress={() => setDetailSection('debit')}
            onLongPress={() => setShowOrderSheet(true)}
            delayLongPress={300}
            style={({ pressed }) => [{
              width: 280, height: 255, borderRadius: 28, overflow: 'hidden',
              shadowColor: t.indigo, shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.5, shadowRadius: 30, elevation: 12,
              opacity: pressed ? 0.95 : 1,
            }]}
          >
            <LinearGradient
              colors={[t.indigo, t.violet]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 22, position: 'relative', overflow: 'hidden', flex: 1 }}
            >
              <View style={{
                position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80,
                backgroundColor: 'rgba(255,255,255,0.08)',
              }} />
              <View style={{
                position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: 60,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text numberOfLines={1} style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#C7D2FE',
                  letterSpacing: 0.3, flex: 1, marginRight: 8,
                }}>DÉBITO Y CUENTAS</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <Pressable
                    onPress={() => dispatch({ type: 'TOGGLE_CARD_VISIBILITY', cardType: 'debit' })}
                    style={{
                      width: 24, height: 24, borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.16)',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon name={hiddenCards.includes('debit') ? 'eye-off' : 'eye'} size={12} color="#fff" />
                  </Pressable>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
                    backgroundColor: 'rgba(255,255,255,0.18)',
                  }}>
                    <Icon name="trending" size={11} color="#fff" />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#fff' }}>MXN</Text>
                  </View>
                </View>
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#fff',
                letterSpacing: -1.5, marginTop: 8,
                fontVariant: ['tabular-nums'],
              }}>{isHidden ? '••••' : fmtMXN(debitTotals.total)}</Text>
              <View style={{
                marginTop: 18, padding: 14, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                flexDirection: 'row', gap: 12, alignItems: 'center',
              }}>
                <MiniStat icon="arrow-down" iconColor="#6EE7B7" label="Ingresos" value={isHidden ? '••••' : fmtMXN(debitTotals.income)} />
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'stretch' }} />
                <MiniStat icon="arrow-up" iconColor="#FDA4AF" label="Gastos" value={isHidden ? '••••' : fmtMXN(debitTotals.expense)} />
              </View>
              <Pressable
                onPress={() => navigate({ screen: 'accounts', filter: 'debit' })}
                style={({ pressed }) => [{
                  marginTop: 12, paddingVertical: 10, borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: pressed ? 0.75 : 1,
                }]}
              >
                <Icon name="wallet" size={15} color="#fff" strokeWidth={2.5} />
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: '#fff' }}>
                  Ver cuentas
                </Text>
              </Pressable>
            </LinearGradient>
          </Pressable>
        );
      case 'cash':
        return (
          <Pressable
            key="cash"
            onPress={() => setDetailSection('cash')}
            onLongPress={() => setShowOrderSheet(true)}
            delayLongPress={300}
            style={({ pressed }) => [{
              width: 280, height: 255, borderRadius: 28, overflow: 'hidden',
              shadowColor: t.green, shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.35, shadowRadius: 30, elevation: 12,
              opacity: pressed ? 0.95 : 1,
            }]}
          >
            <LinearGradient
              colors={[t.green, t.teal]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 22, position: 'relative', overflow: 'hidden', flex: 1 }}
            >
              <View style={{
                position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80,
                backgroundColor: 'rgba(255,255,255,0.08)',
              }} />
              <View style={{
                position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: 60,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text numberOfLines={1} style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#CCFBF1',
                  letterSpacing: 0.3, flex: 1, marginRight: 8,
                }}>EFECTIVO</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <Pressable
                    onPress={() => dispatch({ type: 'TOGGLE_CARD_VISIBILITY', cardType: 'cash' })}
                    style={{
                      width: 24, height: 24, borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.16)',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon name={hiddenCards.includes('cash') ? 'eye-off' : 'eye'} size={12} color="#fff" />
                  </Pressable>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
                    backgroundColor: 'rgba(255,255,255,0.18)',
                  }}>
                    <Icon name="cash" size={11} color="#fff" />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#fff' }}>MXN</Text>
                  </View>
                </View>
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#fff',
                letterSpacing: -1.5, marginTop: 8,
                fontVariant: ['tabular-nums'],
              }}>{isHidden ? '••••' : fmtMXN(cashTotals.total)}</Text>
              <View style={{
                marginTop: 18, padding: 14, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                flexDirection: 'row', gap: 12, alignItems: 'center',
              }}>
                <MiniStat icon="arrow-down" iconColor="#6EE7B7" label="Ingresos" value={isHidden ? '••••' : fmtMXN(cashTotals.income)} />
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'stretch' }} />
                <MiniStat icon="arrow-up" iconColor="#FDA4AF" label="Gastos" value={isHidden ? '••••' : fmtMXN(cashTotals.expense)} />
              </View>
              <Pressable
                onPress={() => navigate({ screen: 'accounts', filter: 'cash' })}
                style={({ pressed }) => [{
                  marginTop: 12, paddingVertical: 10, borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: pressed ? 0.75 : 1,
                }]}
              >
                <Icon name="cash" size={15} color="#fff" strokeWidth={2.5} />
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: '#fff' }}>
                  Ver efectivo
                </Text>
              </Pressable>
            </LinearGradient>
          </Pressable>
        );
      case 'credit':
        return (
          <Pressable
            key="credit"
            onPress={() => setDetailSection('credit')}
            onLongPress={() => setShowOrderSheet(true)}
            delayLongPress={300}
            style={({ pressed }) => [{
              width: 280, height: 255, borderRadius: 28, overflow: 'hidden',
              shadowColor: t.blue, shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.5, shadowRadius: 30, elevation: 12,
              opacity: pressed ? 0.95 : 1,
            }]}
          >
            <LinearGradient
              colors={['#0EA5E9', t.blue]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 22, position: 'relative', overflow: 'hidden', flex: 1 }}
            >
              <View style={{
                position: 'absolute', top: -50, right: -48, width: 150, height: 150, borderRadius: 75,
                backgroundColor: 'rgba(255,255,255,0.10)',
              }} />
              <View style={{
                position: 'absolute', bottom: -42, left: -34, width: 112, height: 112, borderRadius: 56,
                backgroundColor: 'rgba(255,255,255,0.07)',
              }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text numberOfLines={1} style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#DBEAFE',
                  letterSpacing: 0.3, flex: 1, marginRight: 8,
                }}>TARJETAS DE CRÉDITO</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <Pressable
                    onPress={() => dispatch({ type: 'TOGGLE_CARD_VISIBILITY', cardType: 'credit' })}
                    style={{
                      width: 24, height: 24, borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.16)',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon name={hiddenCards.includes('credit') ? 'eye-off' : 'eye'} size={12} color="#fff" />
                  </Pressable>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
                    backgroundColor: 'rgba(255,255,255,0.18)',
                  }}>
                    <Icon name="card" size={11} color="#fff" />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#fff' }}>MXN</Text>
                  </View>
                </View>
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#fff',
                letterSpacing: -1.5, marginTop: 8,
                fontVariant: ['tabular-nums'],
              }}>{isHidden ? '••••' : fmtMXN(creditStats.available)}</Text>
              <View style={{
                marginTop: 18, padding: 14, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                flexDirection: 'row', gap: 12, alignItems: 'center',
              }}>
                <MiniStat icon="check" iconColor="#6EE7B7" label="Disponible" value={isHidden ? '••••' : fmtMXN(creditStats.available)} />
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'stretch' }} />
                <MiniStat icon="arrow-up" iconColor="#FDA4AF" label="Usado" value={isHidden ? '••••' : fmtMXN(creditStats.used)} />
              </View>
              <Pressable
                onPress={() => navigate({ screen: 'accounts', filter: 'credit' })}
                style={({ pressed }) => [{
                  marginTop: 12, paddingVertical: 10, borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: pressed ? 0.75 : 1,
                }]}
              >
                <Icon name="card" size={15} color="#fff" strokeWidth={2.5} />
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: '#fff' }}>
                  Ver tarjetas
                </Text>
              </Pressable>
            </LinearGradient>
          </Pressable>
        );
      case 'savings':
        return (
          <Pressable
            key="savings"
            onPress={() => setDetailSection('savings')}
            onLongPress={() => setShowOrderSheet(true)}
            delayLongPress={300}
            style={({ pressed }) => [{
              width: 280, height: 255, borderRadius: 28, overflow: 'hidden',
              shadowColor: t.rose, shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.5, shadowRadius: 30, elevation: 12,
              opacity: pressed ? 0.95 : 1,
            }]}
          >
            <LinearGradient
              colors={[t.rose, '#EC4899']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 22, position: 'relative', overflow: 'hidden', flex: 1 }}
            >
              <View style={{
                position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80,
                backgroundColor: 'rgba(255,255,255,0.08)',
              }} />
              <View style={{
                position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: 60,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text numberOfLines={1} style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#FFE4E6',
                  letterSpacing: 0.3, flex: 1, marginRight: 8,
                }}>AHORRO</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <Pressable
                    onPress={() => dispatch({ type: 'TOGGLE_CARD_VISIBILITY', cardType: 'savings' })}
                    style={{
                      width: 24, height: 24, borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.16)',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon name={hiddenCards.includes('savings') ? 'eye-off' : 'eye'} size={12} color="#fff" />
                  </Pressable>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
                    backgroundColor: 'rgba(255,255,255,0.18)',
                  }}>
                    <Icon name="piggy" size={11} color="#fff" />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#fff' }}>MXN</Text>
                  </View>
                </View>
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#fff',
                letterSpacing: -1.5, marginTop: 8,
                fontVariant: ['tabular-nums'],
              }}>{isHidden ? '••••' : fmtMXN(savingsTotals.total)}</Text>
              <View style={{
                marginTop: 18, padding: 14, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                flexDirection: 'row', gap: 12, alignItems: 'center',
              }}>
                <MiniStat icon="arrow-down" iconColor="#6EE7B7" label="Ingresos" value={isHidden ? '••••' : fmtMXN(savingsTotals.income)} />
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'stretch' }} />
                <MiniStat icon="arrow-up" iconColor="#FDA4AF" label="Gastos" value={isHidden ? '••••' : fmtMXN(savingsTotals.expense)} />
              </View>
              <Pressable
                onPress={() => navigate({ screen: 'accounts', filter: 'savings' })}
                style={({ pressed }) => [{
                  marginTop: 12, paddingVertical: 10, borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: pressed ? 0.75 : 1,
                }]}
              >
                <Icon name="piggy" size={15} color="#fff" strokeWidth={2.5} />
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: '#fff' }}>
                  Ver ahorros
                </Text>
              </Pressable>
            </LinearGradient>
          </Pressable>
        );
      case 'investment':
        return (
          <Pressable
            key="investment"
            onPress={() => setDetailSection('investment')}
            onLongPress={() => setShowOrderSheet(true)}
            delayLongPress={300}
            style={({ pressed }) => [{
              width: 280, height: 255, borderRadius: 28, overflow: 'hidden',
              shadowColor: t.violet, shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.5, shadowRadius: 30, elevation: 12,
              opacity: pressed ? 0.95 : 1,
            }]}
          >
            <LinearGradient
              colors={[t.violet, '#D946EF']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 22, position: 'relative', overflow: 'hidden', flex: 1 }}
            >
              <View style={{
                position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80,
                backgroundColor: 'rgba(255,255,255,0.08)',
              }} />
              <View style={{
                position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: 60,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text numberOfLines={1} style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#F5F3FF',
                  letterSpacing: 0.3, flex: 1, marginRight: 8,
                }}>INVERSIÓN</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <Pressable
                    onPress={() => dispatch({ type: 'TOGGLE_CARD_VISIBILITY', cardType: 'investment' })}
                    style={{
                      width: 24, height: 24, borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.16)',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon name={hiddenCards.includes('investment') ? 'eye-off' : 'eye'} size={12} color="#fff" />
                  </Pressable>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
                    backgroundColor: 'rgba(255,255,255,0.18)',
                  }}>
                    <Icon name="trending" size={11} color="#fff" />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#fff' }}>MXN</Text>
                  </View>
                </View>
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#fff',
                letterSpacing: -1.5, marginTop: 8,
                fontVariant: ['tabular-nums'],
              }}>{isHidden ? '••••' : fmtMXN(investmentTotals.total)}</Text>
              <View style={{
                marginTop: 18, padding: 14, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                flexDirection: 'row', gap: 12, alignItems: 'center',
              }}>
                <MiniStat icon="arrow-down" iconColor="#6EE7B7" label="Ingresos" value={isHidden ? '••••' : fmtMXN(investmentTotals.income)} />
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'stretch' }} />
                <MiniStat icon="arrow-up" iconColor="#FDA4AF" label="Gastos" value={isHidden ? '••••' : fmtMXN(investmentTotals.expense)} />
              </View>
              <Pressable
                onPress={() => navigate({ screen: 'accounts', filter: 'investment' })}
                style={({ pressed }) => [{
                  marginTop: 12, paddingVertical: 10, borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: pressed ? 0.75 : 1,
                }]}
              >
                <Icon name="trending" size={15} color="#fff" strokeWidth={2.5} />
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: '#fff' }}>
                  Ver inversiones
                </Text>
              </Pressable>
            </LinearGradient>
          </Pressable>
        );
      case 'vouchers':
        return (
          <Pressable
            key="vouchers"
            onPress={() => setDetailSection('vouchers')}
            onLongPress={() => setShowOrderSheet(true)}
            delayLongPress={300}
            style={({ pressed }) => [{
              width: 280, height: 255, borderRadius: 28, overflow: 'hidden',
              shadowColor: '#E30613', shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.5, shadowRadius: 30, elevation: 12,
              opacity: pressed ? 0.95 : 1,
            }]}
          >
            <LinearGradient
              colors={['#E30613', '#FF4D4D']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 22, position: 'relative', overflow: 'hidden', flex: 1 }}
            >
              <View style={{
                position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80,
                backgroundColor: 'rgba(255,255,255,0.08)',
              }} />
              <View style={{
                position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: 60,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text numberOfLines={1} style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#FEE2E2',
                  letterSpacing: 0.3, flex: 1, marginRight: 8,
                }}>VALES DE DESPENSA</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <Pressable
                    onPress={() => dispatch({ type: 'TOGGLE_CARD_VISIBILITY', cardType: 'vouchers' })}
                    style={{
                      width: 24, height: 24, borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.16)',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon name={hiddenCards.includes('vouchers') ? 'eye-off' : 'eye'} size={12} color="#fff" />
                  </Pressable>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
                    backgroundColor: 'rgba(255,255,255,0.18)',
                  }}>
                    <Icon name="wallet" size={11} color="#fff" />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#fff' }}>MXN</Text>
                  </View>
                </View>
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#fff',
                letterSpacing: -1.5, marginTop: 8,
                fontVariant: ['tabular-nums'],
              }}>{isHidden ? '••••' : fmtMXN(vouchersTotals.total)}</Text>
              <View style={{
                marginTop: 18, padding: 14, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                flexDirection: 'row', gap: 12, alignItems: 'center',
              }}>
                <MiniStat icon="arrow-down" iconColor="#6EE7B7" label="Ingresos" value={isHidden ? '••••' : fmtMXN(vouchersTotals.income)} />
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'stretch' }} />
                <MiniStat icon="arrow-up" iconColor="#FDA4AF" label="Gastos" value={isHidden ? '••••' : fmtMXN(vouchersTotals.expense)} />
              </View>
              <Pressable
                onPress={() => navigate({ screen: 'accounts', filter: 'vouchers' })}
                style={({ pressed }) => [{
                  marginTop: 12, paddingVertical: 10, borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: pressed ? 0.75 : 1,
                }]}
              >
                <Icon name="wallet" size={15} color="#fff" strokeWidth={2.5} />
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: '#fff' }}>
                  Ver vales
                </Text>
              </Pressable>
            </LinearGradient>
          </Pressable>
        );
      case 'goals': {
        const goalsTarget = goals.reduce((s, g) => s + g.target, 0);
        const goalsPct = goalsTarget > 0 ? (healthScore.totalSaved / goalsTarget) * 100 : 0;
        return (
          <Pressable
            key="goals"
            onPress={() => navigate('goals')}
            onLongPress={() => setShowOrderSheet(true)}
            delayLongPress={300}
            style={({ pressed }) => [{
              width: 280, height: 255, borderRadius: 28, overflow: 'hidden',
              shadowColor: t.rose, shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.5, shadowRadius: 30, elevation: 12,
              opacity: pressed ? 0.95 : 1,
            }]}
          >
            <LinearGradient
              colors={[t.rose, '#EC4899']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 22, position: 'relative', overflow: 'hidden', flex: 1, justifyContent: 'space-between' }}
            >
              <View style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <View style={{ position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' }} />
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#FFE4E6', letterSpacing: 0.3, flex: 1, marginRight: 8 }}>
                  METAS DE AHORRO
                </Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                }}>
                  <Icon name="target" size={11} color="#fff" />
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#fff' }}>MXN</Text>
                </View>
              </View>

              <View style={{ zIndex: 1, marginTop: 4 }}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#fff',
                  letterSpacing: -1.5, fontVariant: ['tabular-nums'],
                }}>
                  {isHidden ? '••••' : fmtMXN(healthScore.totalSaved)}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11.5, color: 'rgba(255,255,255,0.8)' }}>
                    Progreso total
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11.5, color: '#fff', fontVariant: ['tabular-nums'] }}>
                    {goalsPct.toFixed(0)}%
                  </Text>
                </View>
                <View style={{ height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden', marginTop: 4 }}>
                  <View style={{ height: '100%', width: `${Math.min(100, goalsPct)}%`, backgroundColor: '#fff', borderRadius: 2.5 }} />
                </View>
              </View>

              {/* Unified 2-column info box */}
              <View style={{
                marginTop: 8, padding: 12, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                flexDirection: 'row', gap: 12, alignItems: 'center',
                zIndex: 1,
              }}>
                <MiniStat icon="piggy" iconColor="#FDA4AF" label="Ahorrado" value={isHidden ? '••••' : fmtMXN(healthScore.totalSaved)} />
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'stretch' }} />
                <MiniStat icon="target" iconColor="#93C5FD" label="Meta" value={isHidden ? '••••' : fmtMXN(goalsTarget)} />
              </View>

              <Pressable
                onPress={() => navigate('goals')}
                style={({ pressed }) => [{
                  marginTop: 8, paddingVertical: 10, borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: pressed ? 0.75 : 1,
                  zIndex: 2,
                }]}
              >
                <Icon name="target" size={15} color="#fff" strokeWidth={2.5} />
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: '#fff' }}>
                  Ver metas
                </Text>
              </Pressable>
            </LinearGradient>
          </Pressable>
        );
      }
      case 'budgets': {
        const overallPct = healthScore.totalBudgetLimit > 0 ? (healthScore.totalBudgetSpent / healthScore.totalBudgetLimit) * 100 : 0;
        const remainingBudget = Math.max(0, healthScore.totalBudgetLimit - healthScore.totalBudgetSpent);
        const realFunds = debitTotals.total + cashTotals.total;
        return (
          <Pressable
            key="budgets"
            onPress={() => navigate('budgets')}
            onLongPress={() => setShowOrderSheet(true)}
            delayLongPress={300}
            style={({ pressed }) => [{
              width: 280, height: 255, borderRadius: 28, overflow: 'hidden',
              shadowColor: t.indigo, shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.5, shadowRadius: 30, elevation: 12,
              opacity: pressed ? 0.95 : 1,
            }]}
          >
            <LinearGradient
              colors={[t.indigo, t.violet]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 22, position: 'relative', overflow: 'hidden', flex: 1, justifyContent: 'space-between' }}
            >
              <View style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <View style={{ position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' }} />
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#C7D2FE', letterSpacing: 0.3, flex: 1, marginRight: 8 }}>
                  PRESUPUESTOS
                </Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                }}>
                  <Icon name="chart" size={11} color="#fff" />
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#fff' }}>MXN</Text>
                </View>
              </View>

              <View style={{ zIndex: 1, marginTop: 4 }}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#fff',
                  letterSpacing: -1.5, fontVariant: ['tabular-nums'],
                }}>
                  {isHidden ? '••••' : fmtMXN(healthScore.totalBudgetSpent)}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11.5, color: 'rgba(255,255,255,0.8)' }}>
                    Progreso total gastado
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11.5, color: '#fff', fontVariant: ['tabular-nums'] }}>
                    {overallPct.toFixed(0)}%
                  </Text>
                </View>
                <View style={{ height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden', marginTop: 4 }}>
                  <View style={{ height: '100%', width: `${Math.min(100, overallPct)}%`, backgroundColor: '#fff', borderRadius: 2.5 }} />
                </View>
                
                {/* Real funds link message */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' }} />
                  <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10.5, color: '#A7F3D0' }}>
                    Fondos reales (Débito + Efectivo): {isHidden ? '••••' : fmtMXN(realFunds)}
                  </Text>
                </View>
              </View>

              {/* Unified 2-column info box */}
              <View style={{
                marginTop: 6, padding: 10, borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                flexDirection: 'row', gap: 12, alignItems: 'center',
                zIndex: 1,
              }}>
                <MiniStat icon="lock" iconColor="#A5B4FC" label="LÍMITE" value={isHidden ? '••••' : fmtMXN(healthScore.totalBudgetLimit)} />
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'stretch' }} />
                <MiniStat icon="check" iconColor="#6EE7B7" label="DISPONIBLE" value={isHidden ? '••••' : fmtMXN(remainingBudget)} />
              </View>

              <Pressable
                onPress={() => navigate('budgets')}
                style={({ pressed }) => [{
                  marginTop: 6, paddingVertical: 10, borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: pressed ? 0.75 : 1,
                  zIndex: 2,
                }]}
              >
                <Icon name="chart" size={15} color="#fff" strokeWidth={2.5} />
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: '#fff' }}>
                  Ver presupuestos
                </Text>
              </Pressable>
            </LinearGradient>
          </Pressable>
        );
      }
      default:
        return null;
    }
  };

  // Removed redundant renderSubtotalBox

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile greeting */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingHorizontal: 4, paddingTop: 14, paddingBottom: 8,
        }}>
          <Pressable onPress={() => navigate('settings')} style={{ position: 'relative' }}>
            <LinearGradient
              colors={[t.indigo, t.violet]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{
                width: 44, height: 44, borderRadius: 22,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#fff',
              }}>
                {(state.profile?.name || '').trim()
                  ? (state.profile?.name || '').trim().split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
                  : 'U'}
              </Text>
            </LinearGradient>
            <View style={{
              position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6,
              backgroundColor: t.green, borderWidth: 2, borderColor: t.bg,
            }} />
          </Pressable>

          <Pressable onPress={() => navigate('settings')} style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted }}>Bienvenido</Text>
            <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 17, color: t.text, letterSpacing: -0.4 }}>
              {state.profile?.name || 'Tus finanzas'}
            </Text>
          </Pressable>

          <Pressable onPress={() => dispatch({ type: 'TOGGLE_HIDE' })} style={{
            width: 40, height: 40, borderRadius: 14, backgroundColor: t.surface,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
          }}>
            <Icon name={balanceHidden ? 'eye-off' : 'eye'} size={20} color={t.text} />
          </Pressable>

          <Pressable onPress={() => navigate('notifications')} style={{
            width: 40, height: 40, borderRadius: 14, backgroundColor: t.surface,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
          }}>
            <Icon name="bell" size={20} color={t.text} />
            {unread > 0 ? (
              <View style={{
                position: 'absolute', top: 7, right: 9, minWidth: 14, height: 14,
                paddingHorizontal: 4, borderRadius: 7, backgroundColor: t.rose,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: t.surface,
              }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 9, color: '#fff' }}>{unread}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -16, marginTop: 8 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}
          snapToInterval={292}
          decelerationRate="fast"
        >
          {order.map(renderCard)}
        </ScrollView>

        {/* Quick actions row 1 */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <QuickAction icon="plus" color="indigo" label="Registrar" onPress={() => navigate({ screen: 'add-transaction', type: 'EXPENSE' })} />
          <QuickAction icon="chart" color="teal" label="Presupuestos" onPress={() => navigate('budgets')} />
          <QuickAction icon="target" color="violet" label="Metas" onPress={() => navigate('goals')} />
        </View>

        {/* Quick actions row 2 */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <QuickAction icon="rotate" color="orange" label="Recurrentes" onPress={() => navigate('recurring')} />
          <QuickAction icon="calendar" color="blue" label="Calendario" onPress={() => navigate('calendar')} />
          <QuickAction icon="calculator" color="indigo" label="Calculadora" onPress={() => navigate('calculator')} />
        </View>

        {/* Score de Salud Financiera */}
        <View style={{ marginTop: 16 }}>
          <SectionTitle title="Salud Financiera" />
          <Pressable
            onPress={() => setShowHealthSheet(true)}
            style={({ pressed }) => [{
              opacity: pressed ? 0.9 : 1,
              marginTop: 8,
            }]}
          >
            <Card padding={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {/* Gauge */}
              <View style={{ width: 56, height: 56, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                <Svg width={56} height={56} viewBox="0 0 56 56" style={{ transform: [{ rotate: '-90deg' }] }}>
                  <Circle
                    cx={28}
                    cy={28}
                    r={23}
                    stroke={t.border}
                    strokeWidth={4.5}
                    fill="transparent"
                  />
                  <Circle
                    cx={28}
                    cy={28}
                    r={23}
                    stroke={healthScore.score >= 75 ? t.green : healthScore.score >= 50 ? t.orange : t.rose}
                    strokeWidth={4.5}
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 23}
                    strokeDashoffset={(2 * Math.PI * 23) - ((2 * Math.PI * 23) * healthScore.score) / 100}
                    strokeLinecap="round"
                  />
                </Svg>
                <Text style={{ position: 'absolute', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text }}>
                  {healthScore.score}
                </Text>
              </View>
              {/* Description */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text }}>
                  {healthScore.score >= 75 ? 'Excelente' : healthScore.score >= 50 ? 'Estable' : 'En Riesgo'}
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted, marginTop: 3, lineHeight: 14 }}>
                  {healthScore.advice}
                </Text>
              </View>
            </Card>
          </Pressable>
        </View>

        {/* Próximos movimientos */}
        {nextPayments.length > 0 ? (
          <View style={{ marginTop: 18 }}>
            <SectionTitle title="Próximos movimientos" action="Ver todo" onAction={() => navigate('calendar')} />
            <Card padding={4} style={{ marginTop: 10 }}>
              {nextPayments.map((p, i) => {
                const cat = p.rule.categoryId ? catById(p.rule.categoryId, state.customCategories) : undefined;
                const isIncome = p.rule.type === 'INCOME';
                const d = new Date(p.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const diffDays = Math.round((p.date - today.getTime()) / 86400000);
                const when = diffDays === 0 ? 'Hoy'
                  : diffDays === 1 ? 'Mañana'
                  : `En ${diffDays} días`;
                return (
                  <Pressable
                    key={i}
                    onPress={() => setSelectedUpcoming(p)}
                    style={({ pressed }) => [{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingHorizontal: 14, paddingVertical: 10,
                      borderBottomWidth: i < nextPayments.length - 1 ? 1 : 0,
                      borderBottomColor: t.border,
                      opacity: pressed ? 0.7 : 1,
                    }]}
                  >
                    <View style={{
                      width: 38, height: 38, borderRadius: 11,
                      backgroundColor: softFor(t, isIncome ? 'green' : 'rose'),
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={isIncome ? 'arrow-down' : 'rotate'} size={18} color={isIncome ? t.green : t.rose} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text,
                      }}>{p.rule.note || cat?.name || 'Recurrente'}</Text>
                      <Text numberOfLines={1} style={{
                        fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted,
                        marginTop: 2,
                      }}>{when} · {d.getDate()}/{d.getMonth() + 1}</Text>
                    </View>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14,
                      color: isIncome ? t.green : t.text,
                      fontVariant: ['tabular-nums'],
                    }}>{isIncome ? '+' : '-'}{fmtMXN(p.rule.amount).replace('-', '')}</Text>
                  </Pressable>
                );
              })}
            </Card>
          </View>
        ) : null}

        {/* Spending trend mini-card */}
        <View style={{ marginTop: 18 }}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted }}>Gasto últimos 7 días</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 20, color: t.text,
                  marginTop: 4, letterSpacing: -0.6,
                }}>{fmtMXN(seriesTotal)}</Text>
              </View>
              <Pressable onPress={() => navigate('reports')}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.indigo,
                }}>Ver análisis →</Text>
              </Pressable>
            </View>
            <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 80 }}>
              {series.map((d, i) => {
                const h = Math.max(4, (d.amount / seriesMax) * 70);
                const isToday = i === series.length - 1;
                const dn = NARROW_DAYS[new Date(d.date).getDay()];
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                    {isToday ? (
                      <LinearGradient
                        colors={[t.indigo, t.violet]}
                        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                        style={{ width: '100%', height: h, borderRadius: 6 }}
                      />
                    ) : (
                      <View style={{
                        width: '100%', height: h, borderRadius: 6,
                        backgroundColor: softFor(t, 'indigo'),
                      }} />
                    )}
                    <Text style={{
                      fontFamily: isToday ? 'PlusJakartaSans_800ExtraBold' : 'PlusJakartaSans_600SemiBold',
                      fontSize: 10,
                      color: isToday ? t.indigo : t.textMuted,
                    }}>{dn}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        </View>

        {/* Tus tarjetas */}
        {branded.length > 0 ? (
          <View style={{ marginTop: 22 }}>
            <SectionTitle title="Tus tarjetas" action="Ver todas" onAction={() => navigate('accounts')} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -16, marginTop: 10 }}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}
              snapToInterval={232}
              decelerationRate="fast"
            >
              {branded.map(acc => {
                const bal = computeAccountBalance(acc, state.transactions);
                const isAccHidden = balanceHidden || hiddenCards.includes(getCardTypeForAccount(acc));
                return (
                  <View key={acc.id} style={{ width: 220 }}>
                    <BankCard
                      acc={acc}
                      balance={bal}
                      onPress={() => navigate({ screen: 'account-detail', id: acc.id })}
                      compact
                      isHidden={isAccHidden}
                    />
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Simulator Calculator CTA */}
        <View style={{ marginTop: 18 }}>
          <SectionTitle title="Simulador de Nómina" />
          <Pressable
            onPress={() => navigate('calculator')}
            style={({ pressed }) => [{
              marginTop: 10,
              opacity: pressed ? 0.9 : 1,
            }]}
          >
            <LinearGradient
              colors={[t.indigo, t.violet]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 16,
                padding: 18,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                shadowColor: t.indigo,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 6,
              }}
            >
              <View style={{
                width: 46, height: 46, borderRadius: 14,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="calculator" size={24} color="#fff" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff',
                }}>Simulador de gastos</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: '#fff',
                  opacity: 0.85, marginTop: 4, lineHeight: 15,
                }}>
                  Calcula de forma rápida cuánto te quedará de tu nómina simulando egresos o compras adicionales.
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#fff" strokeWidth={2.5} />
            </LinearGradient>
          </Pressable>
        </View>

        {/* Recent transactions */}
        <View style={{ marginTop: 22 }}>
          <SectionTitle title="Movimientos recientes" action="Ver todo" onAction={() => navigate('transactions')} />
          <View style={{
            marginTop: 10, backgroundColor: t.surface, borderRadius: 22, padding: 4,
          }}>
            {recentTxs.length === 0 ? (
              <View style={{ padding: 28, alignItems: 'center' }}>
                <Text style={{ color: t.textMuted, fontSize: 13 }}>Aún no tienes movimientos</Text>
              </View>
            ) : recentTxs.map((tx, i) => (
              <TransactionRow
                key={tx.id} tx={tx} accounts={state.accounts}
                goals={goals}
                customCategories={state.customCategories}
                divider={i < recentTxs.length - 1}
                onPress={() => navigate({ screen: 'transaction-detail', id: tx.id })}
                onLongPress={() => setActiveTx(tx)}
              />
            ))}
          </View>
        </View>


      </ScrollView>

      {/* Reordering Sheet */}
      <Sheet open={showOrderSheet} onClose={() => setShowOrderSheet(false)} height="60%">
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            letterSpacing: -0.3, marginBottom: 16,
          }}>Organizar balance</Text>
          
          <ScrollView 
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {order.map((cardType, index) => {
              const isFirst = index === 0;
              const isLast = index === order.length - 1;
              
              let label = '';
              let iconName: IconName = 'wallet';
              let badgeColor = t.indigo;
              let bgSoft = softFor(t, 'indigo');
              
              if (cardType === 'debit') {
                label = 'Débito y cuentas';
                iconName = 'wallet';
                badgeColor = t.indigo;
                bgSoft = softFor(t, 'indigo');
              } else if (cardType === 'cash') {
                label = 'Efectivo';
                iconName = 'cash';
                badgeColor = t.green;
                bgSoft = softFor(t, 'green');
              } else if (cardType === 'credit') {
                label = 'Tarjetas de crédito';
                iconName = 'card';
                badgeColor = t.rose;
                bgSoft = softFor(t, 'rose');
              } else if (cardType === 'savings') {
                label = 'Ahorro';
                iconName = 'piggy';
                badgeColor = t.rose;
                bgSoft = softFor(t, 'rose');
              } else if (cardType === 'investment') {
                label = 'Inversión';
                iconName = 'trending';
                badgeColor = t.violet;
                bgSoft = softFor(t, 'violet');
              } else if (cardType === 'vouchers') {
                label = 'Vales de despensa';
                iconName = 'wallet';
                badgeColor = '#E30613';
                bgSoft = '#FEE2E2';
              } else if (cardType === 'goals') {
                label = 'Metas de Ahorro';
                iconName = 'target';
                badgeColor = t.indigo;
                bgSoft = softFor(t, 'indigo');
              } else if (cardType === 'budgets') {
                label = 'Presupuestos';
                iconName = 'chart';
                badgeColor = t.green;
                bgSoft = softFor(t, 'green');
              }
              
              return (
                <View
                  key={cardType}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 16,
                    backgroundColor: t.surfaceAlt,
                    borderWidth: 1,
                    borderColor: t.border,
                    marginBottom: 10,
                    gap: 12,
                  }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: bgSoft,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={iconName} size={18} color={badgeColor} strokeWidth={2.4} />
                  </View>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold',
                    fontSize: 14,
                    color: t.text,
                    flex: 1,
                  }}>
                    {label}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Pressable
                      disabled={isFirst}
                      onPress={() => moveCard(index, 'up')}
                      style={({ pressed }) => [{
                        width: 32, height: 32, borderRadius: 10,
                        backgroundColor: isFirst ? 'transparent' : t.surface,
                        alignItems: 'center', justifyContent: 'center',
                        opacity: isFirst ? 0.3 : pressed ? 0.7 : 1,
                      }]}
                    >
                      <Icon name="chevron-up" size={18} color={isFirst ? t.textMuted : t.text} strokeWidth={2.5} />
                    </Pressable>
                    <Pressable
                      disabled={isLast}
                      onPress={() => moveCard(index, 'down')}
                      style={({ pressed }) => [{
                        width: 32, height: 32, borderRadius: 10,
                        backgroundColor: isLast ? 'transparent' : t.surface,
                        alignItems: 'center', justifyContent: 'center',
                        opacity: isLast ? 0.3 : pressed ? 0.7 : 1,
                      }]}
                    >
                      <Icon name="chevron-down" size={18} color={isLast ? t.textMuted : t.text} strokeWidth={2.5} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={() => setShowOrderSheet(false)}
            style={({ pressed }) => [{
              marginTop: 10,
              marginBottom: 10,
              paddingVertical: 14,
              borderRadius: 16,
              backgroundColor: t.indigo,
              alignItems: 'center',
              opacity: pressed ? 0.85 : 1,
            }]}
          >
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold',
              fontSize: 14,
              color: '#fff',
            }}>
              Listo
            </Text>
          </Pressable>
        </View>
      </Sheet>

      {/* Confirmation Sheet for Upcoming / Due Payment */}
      <Sheet open={selectedUpcoming !== null} onClose={() => setSelectedUpcoming(null)} height="55%">
        {selectedUpcoming && (() => {
          const p = selectedUpcoming;
          const cat = p.rule.categoryId ? catById(p.rule.categoryId, state.customCategories) : undefined;
          const isIncome = p.rule.type === 'INCOME';
          const acc = state.accounts.find(a => a.id === p.rule.accountId);
          const d = new Date(p.date);
          const dateStr = `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
          const todayMs = (() => { const t2 = new Date(); t2.setHours(0, 0, 0, 0); return t2.getTime(); })();
          const isEarly = p.date > todayMs; // user is confirming before scheduled date
          
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
                {isIncome ? 'Registrar Ingreso' : 'Registrar Pago'}
              </Text>
              
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                padding: 16, borderRadius: 18, backgroundColor: t.surfaceAlt,
                borderWidth: 1, borderColor: t.border, marginBottom: 20,
              }}>
                <View style={{
                  width: 46, height: 46, borderRadius: 14,
                  backgroundColor: softFor(t, isIncome ? 'green' : 'rose'),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={isIncome ? 'arrow-down' : 'rotate'} size={22} color={isIncome ? t.green : t.rose} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: t.text,
                  }}>{p.rule.note || cat?.name || 'Transacción Recurrente'}</Text>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
                    marginTop: 2,
                  }}>
                    {acc?.name} · {isEarly ? 'Se registrará hoy' : dateStr}
                  </Text>
                  {isEarly && (
                    <Text numberOfLines={1} style={{
                      fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10.5, color: t.indigo,
                      marginTop: 1,
                    }}>
                      📅 Programado para {dateStr} · se refleja hoy
                    </Text>
                  )}
                </View>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16,
                  color: isIncome ? t.green : t.text,
                  fontVariant: ['tabular-nums'],
                }}>
                  {isIncome ? '+' : '-'}{fmtMXN(p.rule.amount).replace('-', '')}
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                <Pressable
                  onPress={() => confirmPayment(p)}
                  style={({ pressed }) => [{
                    paddingVertical: 14,
                    borderRadius: 16,
                    backgroundColor: isIncome ? t.green : t.indigo,
                    alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center', gap: 8,
                    opacity: pressed ? 0.85 : 1,
                  }]}
                >
                  <Icon name="check" size={18} color="#fff" strokeWidth={3} />
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold',
                    fontSize: 14,
                    color: '#fff',
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
                    paddingVertical: 14,
                    borderRadius: 16,
                    backgroundColor: 'transparent',
                    borderWidth: 1, borderColor: t.border,
                    alignItems: 'center',
                    opacity: pressed ? 0.75 : 1,
                  }]}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold',
                    fontSize: 14,
                    color: t.text,
                  }}>
                    Editar Programación
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedUpcoming(null)}
                  style={({ pressed }) => [{
                    paddingVertical: 14,
                    borderRadius: 16,
                    backgroundColor: t.surfaceAlt,
                    alignItems: 'center',
                    opacity: pressed ? 0.75 : 1,
                  }]}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold',
                    fontSize: 14,
                    color: t.textMuted,
                  }}>
                    Cancelar
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })()}
      </Sheet>

      {/* Section Details Bottom Sheet */}
      <Sheet open={detailSection !== null} onClose={() => setDetailSection(null)} height="80%">
        {activeSection && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header / Title */}
            <SectionTitle
              title={
                activeSection === 'debit' ? 'Cuentas de débito'
                : activeSection === 'cash' ? 'Efectivo'
                : activeSection === 'credit' ? 'Tarjetas de crédito'
                : activeSection === 'savings' ? 'Ahorros'
                : activeSection === 'investment' ? 'Inversiones'
                : 'Vales de despensa'
              }
              action="Ver todas"
              onAction={() => {
                setDetailSection(null);
                navigate({ screen: 'accounts', filter: activeSection as any });
              }}
            />

            {/* Sub-stats de la sección */}
            {activeSection === 'credit' ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Card padding={10} style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted }}>LÍMITE</Text>
                  <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text, marginTop: 4 }}>
                    {isActiveSectionHidden ? '••••' : fmtMXN(creditStats.limit)}
                  </Text>
                </Card>
                <Card padding={10} style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.rose }}>DEUDA</Text>
                  <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.rose, marginTop: 4 }}>
                    {isActiveSectionHidden ? '••••' : fmtMXN(creditStats.used)}
                  </Text>
                </Card>
                <Card padding={10} style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.green }}>DISPONIBLE</Text>
                  <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.green, marginTop: 4 }}>
                    {isActiveSectionHidden ? '••••' : fmtMXN(creditStats.available)}
                  </Text>
                </Card>
              </View>
            ) : activeTotals ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Card padding={10} style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="arrow-down" size={10} color={t.green} />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted }}>INGRESOS (30D)</Text>
                  </View>
                  <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text, marginTop: 4 }}>
                    {isActiveSectionHidden ? '••••' : fmtMXN(activeTotals.income)}
                  </Text>
                </Card>
                <Card padding={10} style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="arrow-up" size={10} color={t.rose} />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted }}>GASTOS (30D)</Text>
                  </View>
                  <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text, marginTop: 4 }}>
                    {isActiveSectionHidden ? '••••' : fmtMXN(activeTotals.expense)}
                  </Text>
                </Card>
              </View>
            ) : null}

            {/* Tarjetas / Cuentas en esta sección */}
            <View style={{ marginTop: 16 }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text,
                marginBottom: 8, letterSpacing: -0.2,
              }}>Cuentas en esta sección</Text>
              
              {activeAccounts.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -20 }}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 4 }}
                  snapToInterval={232}
                  decelerationRate="fast"
                >
                  {activeAccounts.map(acc => {
                    const bal = computeAccountBalance(acc, state.transactions);
                    const isAccHidden = balanceHidden || hiddenCards.includes(getCardTypeForAccount(acc));
                    const isCardLike = acc.brand || acc.type === 'DEBIT_CARD' || acc.type === 'CREDIT_CARD' || acc.type === 'DIGITAL_WALLET';
                    
                    if (isCardLike) {
                      return (
                        <View key={acc.id} style={{ width: 220 }}>
                          <BankCard
                            acc={acc}
                            balance={bal}
                            onPress={() => {
                              setDetailSection(null);
                              navigate({ screen: 'account-detail', id: acc.id });
                            }}
                            compact
                            isHidden={isAccHidden}
                          />
                        </View>
                      );
                    } else {
                      return (
                        <Card
                          key={acc.id}
                          padding={14}
                          onPress={() => {
                            setDetailSection(null);
                            navigate({ screen: 'account-detail', id: acc.id });
                          }}
                          style={{ width: 220, justifyContent: 'center' }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{
                              width: 32, height: 32, borderRadius: 10,
                              backgroundColor: softFor(t, acc.color),
                              alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Icon name={acc.icon} size={16} color={colorFor(t, acc.color)} />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: t.text }}>
                                {acc.name}
                              </Text>
                              <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text, marginTop: 2 }}>
                                {isAccHidden ? '••••' : fmtMXN(bal)}
                              </Text>
                            </View>
                          </View>
                        </Card>
                      );
                    }
                  })}
                </ScrollView>
              ) : (
                <View style={{ padding: 20, backgroundColor: t.surface, borderRadius: 18, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted }}>
                    No hay cuentas en esta sección.
                  </Text>
                </View>
              )}
            </View>

            {/* Movimientos de la sección */}
            <View style={{ marginTop: 20 }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text,
                marginBottom: 8, letterSpacing: -0.2,
              }}>Movimientos de la sección</Text>
              <View style={{ backgroundColor: t.surface, borderRadius: 22, padding: 4 }}>
                {sectionTxs.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: t.textMuted, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12 }}>
                      Sin movimientos recientes en esta sección
                    </Text>
                  </View>
                ) : (
                  sectionTxs.map((tx, i) => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      accounts={state.accounts}
                      goals={goals}
                      customCategories={state.customCategories}
                      divider={i < sectionTxs.length - 1}
                      onPress={() => {
                        setDetailSection(null);
                        navigate({ screen: 'transaction-detail', id: tx.id });
                      }}
                      onLongPress={() => {
                        setDetailSection(null);
                        setActiveTx(tx);
                      }}
                    />
                  ))
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </Sheet>

      {/* Quick Actions Context Menu Sheet */}
      <Sheet open={activeTx !== null} onClose={() => setActiveTx(null)} height="38%">
        {activeTx && (() => {
          const cat = activeTx.categoryId ? catById(activeTx.categoryId, state.customCategories) : undefined;
          const isIncome = activeTx.type === 'INCOME';
          const isTransfer = activeTx.type === 'TRANSFER';
          const amtColor = isIncome ? t.green : isTransfer ? t.indigo : t.text;
          const sign = isIncome ? '+' : isTransfer ? '' : '-';
          
          return (
            <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
                letterSpacing: -0.3, marginBottom: 16,
              }}>Acciones Rápidas</Text>
              
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                padding: 16, borderRadius: 18, backgroundColor: t.surfaceAlt,
                borderWidth: 1, borderColor: t.border, marginBottom: 20,
              }}>
                <View style={{
                  width: 46, height: 46, borderRadius: 14,
                  backgroundColor: softFor(t, isIncome ? 'green' : isTransfer ? 'indigo' : 'rose'),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={isTransfer ? 'transfer' : isIncome ? 'arrow-down' : 'arrow-up'} size={22} color={isIncome ? t.green : isTransfer ? t.indigo : t.rose} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: t.text,
                  }}>{activeTx.note || (isTransfer ? 'Transferencia' : cat?.name || 'Sin categoría')}</Text>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
                    marginTop: 2,
                  }}>
                    {isTransfer ? 'Transferencia de cuenta' : cat?.name || 'Gasto'}
                  </Text>
                </View>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16,
                  color: amtColor,
                  fontVariant: ['tabular-nums'],
                }}>
                  {sign}{fmtMXN(activeTx.amount).replace('-', '')}
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                <Pressable
                  onPress={() => {
                    const tx = activeTx;
                    setActiveTx(null);
                    navigate({ screen: 'add-transaction', id: tx.id, type: tx.type });
                  }}
                  style={({ pressed }) => [{
                    paddingVertical: 14,
                    borderRadius: 16,
                    backgroundColor: t.indigo,
                    alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center', gap: 8,
                    opacity: pressed ? 0.85 : 1,
                  }]}
                >
                  <Icon name="edit" size={18} color="#fff" strokeWidth={2.5} />
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold',
                    fontSize: 14,
                    color: '#fff',
                  }}>
                    Editar Movimiento
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const txId = activeTx.id;
                    setActiveTx(null);
                    Alert.alert(
                      'Eliminar Movimiento',
                      '¿Estás seguro de que deseas eliminar este movimiento permanentemente?',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Eliminar',
                          style: 'destructive',
                          onPress: () => {
                            dispatch({ type: 'DELETE_TX', id: txId });
                          },
                        },
                      ]
                    );
                  }}
                  style={({ pressed }) => [{
                    paddingVertical: 14,
                    borderRadius: 16,
                    backgroundColor: 'transparent',
                    borderWidth: 1, borderColor: t.rose,
                    alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center', gap: 8,
                    opacity: pressed ? 0.75 : 1,
                  }]}
                >
                  <Icon name="trash" size={18} color={t.rose} strokeWidth={2.5} />
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold',
                    fontSize: 14,
                    color: t.rose,
                  }}>
                    Eliminar Movimiento
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })()}
      </Sheet>

      {/* Financial Health Details Sheet */}
      <Sheet open={showHealthSheet} onClose={() => setShowHealthSheet(false)} height="75%">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            letterSpacing: -0.3, marginBottom: 16,
          }}>Análisis de Salud Financiera</Text>

          {/* Large circular gauge card */}
          <View style={{
            alignItems: 'center', padding: 20, borderRadius: 24,
            backgroundColor: softFor(t, healthScore.score >= 75 ? 'green' : healthScore.score >= 50 ? 'orange' : 'rose'),
            marginBottom: 20, borderWidth: 1,
            borderColor: (healthScore.score >= 75 ? t.green : healthScore.score >= 50 ? t.orange : t.rose) + '22',
          }}>
            <View style={{ width: 80, height: 80, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
              <Svg width={80} height={80} viewBox="0 0 80 80" style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle cx={40} cy={40} r={34} stroke={t.surface} strokeWidth={6} fill="transparent" />
                <Circle
                  cx={40} cy={40} r={34}
                  stroke={healthScore.score >= 75 ? t.green : healthScore.score >= 50 ? t.orange : t.rose}
                  strokeWidth={6} fill="transparent"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={(2 * Math.PI * 34) - ((2 * Math.PI * 34) * healthScore.score) / 100}
                  strokeLinecap="round"
                />
              </Svg>
              <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: t.text }}>
                  {healthScore.score}
                </Text>
              </View>
            </View>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18,
              color: healthScore.score >= 75 ? t.green : healthScore.score >= 50 ? t.orange : t.rose,
              marginTop: 10,
            }}>
              Nivel: {healthScore.score >= 75 ? 'Excelente' : healthScore.score >= 50 ? 'Estable' : 'En Riesgo'}
            </Text>
            <Text style={{
              fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
              textAlign: 'center', marginTop: 6, lineHeight: 16,
            }}>
              Tu puntuación se calcula en base a tus presupuestos, tu hábito de ahorro y tu nivel de deuda.
            </Text>
          </View>

          {/* Breakdown Section */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            letterSpacing: 0.3, marginBottom: 12,
          }}>DESGLOSE DE PUNTUACIÓN</Text>

          {/* Row 1: Budgets */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 10,
                  backgroundColor: softFor(t, 'rose'),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="tag" size={16} color={t.rose} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text }}>Control de Presupuestos</Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted }}>
                    {healthScore.totalBudgetLimit > 0
                      ? `Límite: ${fmtMXN(healthScore.totalBudgetSpent)} de ${fmtMXN(healthScore.totalBudgetLimit)}`
                      : 'Sin presupuestos activos'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text }}>
                {healthScore.budgetScore} / 40 pts
              </Text>
            </View>
            {/* Progress bar */}
            <View style={{ height: 6, borderRadius: 3, backgroundColor: t.border, overflow: 'hidden' }}>
              <View style={{
                height: 6, borderRadius: 3,
                backgroundColor: healthScore.budgetScore >= 30 ? t.green : healthScore.budgetScore >= 15 ? t.orange : t.rose,
                width: `${(healthScore.budgetScore / 40) * 100}%`,
              }} />
            </View>
          </View>

          {/* Row 2: Savings */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 10,
                  backgroundColor: softFor(t, 'green'),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="piggy" size={16} color={t.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text }}>Hábito de Ahorro</Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted }}>
                    {healthScore.totalIncome > 0
                      ? `Ahorro mensual: ${fmtMXN(healthScore.totalSaved)} (Ingresos: ${fmtMXN(healthScore.totalIncome)})`
                      : `Total ahorrado: ${fmtMXN(healthScore.totalSaved)}`}
                  </Text>
                </View>
              </View>
              <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text }}>
                {healthScore.savingsScore} / 30 pts
              </Text>
            </View>
            {/* Progress bar */}
            <View style={{ height: 6, borderRadius: 3, backgroundColor: t.border, overflow: 'hidden' }}>
              <View style={{
                height: 6, borderRadius: 3,
                backgroundColor: healthScore.savingsScore >= 20 ? t.green : healthScore.savingsScore >= 10 ? t.orange : t.rose,
                width: `${(healthScore.savingsScore / 30) * 100}%`,
              }} />
            </View>
          </View>

          {/* Row 3: Credit Utilization */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 10,
                  backgroundColor: softFor(t, 'indigo'),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="wallet" size={16} color={t.indigo} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text }}>Uso de Crédito</Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted }}>
                    {healthScore.creditLimit > 0
                      ? `Uso: ${fmtMXN(healthScore.creditUsed)} de ${fmtMXN(healthScore.creditLimit)}`
                      : 'Sin tarjetas de crédito activas'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text }}>
                {healthScore.creditScore} / 30 pts
              </Text>
            </View>
            {/* Progress bar */}
            <View style={{ height: 6, borderRadius: 3, backgroundColor: t.border, overflow: 'hidden' }}>
              <View style={{
                height: 6, borderRadius: 3,
                backgroundColor: healthScore.creditScore >= 20 ? t.green : healthScore.creditScore >= 10 ? t.orange : t.rose,
                width: `${(healthScore.creditScore / 30) * 100}%`,
              }} />
            </View>
          </View>

          {/* Advice Card */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            letterSpacing: 0.3, marginBottom: 10,
          }}>RECOMENDACIÓN DEL DÍA</Text>
          <View style={{
            padding: 16, borderRadius: 18,
            backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border,
            flexDirection: 'row', alignItems: 'flex-start', gap: 12,
          }}>
            <View style={{
              width: 30, height: 30, borderRadius: 10,
              backgroundColor: softFor(t, healthScore.score >= 75 ? 'green' : healthScore.score >= 50 ? 'orange' : 'rose'),
              alignItems: 'center', justifyContent: 'center', marginTop: 2,
            }}>
              <Icon
                name={healthScore.score >= 75 ? 'check' : 'bell'}
                size={15}
                color={healthScore.score >= 75 ? t.green : healthScore.score >= 50 ? t.orange : t.rose}
                strokeWidth={3}
              />
            </View>
            <Text style={{
              fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.text,
              flex: 1, lineHeight: 18,
            }}>
              {healthScore.advice}
            </Text>
          </View>
        </ScrollView>
      </Sheet>
    </View>
  );
}
