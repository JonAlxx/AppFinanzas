import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { catById } from '../data/catalog';
import { fmtMXN } from '../data/format';
import { Recurring } from '../data/types';
import {
  computeAccountBalance, computeBalanceSummary, computeTotalsForAccounts, dailySeries,
  isCreditAccount, isDebitAccount, isCashAccount, spentByCategory, upcomingPayments,
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

  const { accounts, transactions, budgets, recurring, notifications, balanceHidden } = state;
  const summary = useMemo(() => computeBalanceSummary(accounts, transactions), [accounts, transactions]);
  const debitAccounts = useMemo(() => accounts.filter(isDebitAccount), [accounts]);
  const cashAccounts = useMemo(() => accounts.filter(isCashAccount), [accounts]);
  const creditAccounts = useMemo(() => accounts.filter(isCreditAccount), [accounts]);
  
  const debitTotals = useMemo(
    () => computeTotalsForAccounts(summary.debit, debitAccounts.map(a => a.id), transactions, 30),
    [summary.debit, debitAccounts, transactions]
  );
  const cashTotals = useMemo(
    () => computeTotalsForAccounts(summary.cash, cashAccounts.map(a => a.id), transactions, 30),
    [summary.cash, cashAccounts, transactions]
  );
  const creditStats = useMemo(() => {
    let totalLimit = 0;
    let totalUsed = 0;
    for (const acc of creditAccounts) {
      const bal = computeAccountBalance(acc, transactions);
      totalLimit += acc.limit || 0;
      totalUsed += Math.abs(bal);
    }
    const totalAvailable = Math.max(0, totalLimit - totalUsed);
    return {
      limit: totalLimit,
      used: totalUsed,
      available: totalAvailable,
    };
  }, [creditAccounts, transactions]);
  
  const nextPayments = useMemo(() => upcomingPayments(recurring, 7, 3), [recurring]);

  function confirmPayment(p: { rule: Recurring; date: number }) {
    const newTx = {
      id: 'tx-rec-' + p.rule.id + '-' + p.date,
      type: p.rule.type,
      amount: p.rule.amount,
      date: p.date,
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
  const branded = accounts.filter(a => a.brand || a.type === 'DEBIT_CARD' || a.type === 'CREDIT_CARD');

  const order = state.cardOrder || ['debit', 'cash', 'credit'];

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
    switch (cardType) {
      case 'debit':
        return (
          <Pressable
            key="debit"
            onLongPress={() => setShowOrderSheet(true)}
            delayLongPress={300}
            style={({ pressed }) => [{
              width: 280, borderRadius: 28, overflow: 'hidden',
              shadowColor: t.indigo, shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.5, shadowRadius: 30, elevation: 12,
              opacity: pressed ? 0.95 : 1,
            }]}
          >
            <LinearGradient
              colors={[t.indigo, t.violet]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 22, position: 'relative', overflow: 'hidden' }}
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
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#C7D2FE',
                  letterSpacing: 0.3,
                }}>DÉBITO Y CUENTAS</Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                }}>
                  <Icon name="trending" size={11} color="#fff" />
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#fff' }}>MXN</Text>
                </View>
              </View>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#fff',
                letterSpacing: -1.5, marginTop: 8,
                fontVariant: ['tabular-nums'],
              }}>{balanceHidden ? '••••••••' : fmtMXN(debitTotals.total)}</Text>
              <View style={{
                marginTop: 18, padding: 14, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                flexDirection: 'row', gap: 12, alignItems: 'center',
              }}>
                <MiniStat icon="arrow-down" iconColor="#6EE7B7" label="Ingresos" value={balanceHidden ? '••••' : fmtMXN(debitTotals.income)} />
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'stretch' }} />
                <MiniStat icon="arrow-up" iconColor="#FDA4AF" label="Gastos" value={balanceHidden ? '••••' : fmtMXN(debitTotals.expense)} />
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
            onLongPress={() => setShowOrderSheet(true)}
            delayLongPress={300}
            style={({ pressed }) => [{
              width: 280, borderRadius: 28, overflow: 'hidden',
              shadowColor: t.green, shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.35, shadowRadius: 30, elevation: 12,
              opacity: pressed ? 0.95 : 1,
            }]}
          >
            <LinearGradient
              colors={[t.green, t.teal]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 22, position: 'relative', overflow: 'hidden' }}
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
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#CCFBF1',
                  letterSpacing: 0.3,
                }}>EFECTIVO</Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                }}>
                  <Icon name="cash" size={11} color="#fff" />
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#fff' }}>MXN</Text>
                </View>
              </View>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#fff',
                letterSpacing: -1.5, marginTop: 8,
                fontVariant: ['tabular-nums'],
              }}>{balanceHidden ? '••••••••' : fmtMXN(cashTotals.total)}</Text>
              <View style={{
                marginTop: 18, padding: 14, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                flexDirection: 'row', gap: 12, alignItems: 'center',
              }}>
                <MiniStat icon="arrow-down" iconColor="#6EE7B7" label="Ingresos" value={balanceHidden ? '••••' : fmtMXN(cashTotals.income)} />
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'stretch' }} />
                <MiniStat icon="arrow-up" iconColor="#FDA4AF" label="Gastos" value={balanceHidden ? '••••' : fmtMXN(cashTotals.expense)} />
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
            onLongPress={() => setShowOrderSheet(true)}
            delayLongPress={300}
            style={({ pressed }) => [{
              width: 280, borderRadius: 28, overflow: 'hidden',
              shadowColor: t.blue, shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.5, shadowRadius: 30, elevation: 12,
              opacity: pressed ? 0.95 : 1,
            }]}
          >
            <LinearGradient
              colors={['#0EA5E9', t.blue]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 22, position: 'relative', overflow: 'hidden' }}
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
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#DBEAFE',
                  letterSpacing: 0.3,
                }}>TARJETAS DE CRÉDITO</Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                }}>
                  <Icon name="card" size={11} color="#fff" />
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#fff' }}>MXN</Text>
                </View>
              </View>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#fff',
                letterSpacing: -1.5, marginTop: 8,
                fontVariant: ['tabular-nums'],
              }}>{balanceHidden ? '••••••••' : fmtMXN(creditStats.available)}</Text>
              <View style={{
                marginTop: 18, padding: 14, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                flexDirection: 'row', gap: 12, alignItems: 'center',
              }}>
                <MiniStat icon="check" iconColor="#6EE7B7" label="Disponible" value={balanceHidden ? '••••' : fmtMXN(creditStats.available)} />
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'stretch' }} />
                <MiniStat icon="arrow-up" iconColor="#FDA4AF" label="Usado" value={balanceHidden ? '••••' : fmtMXN(creditStats.used)} />
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

        {/* Removed redundant subtotal boxes */}

        {/* Quick actions row 1 */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <QuickAction icon="arrow-down" color="green" label="Ingreso" onPress={() => navigate({ screen: 'add-transaction', type: 'INCOME' })} />
          <QuickAction icon="arrow-up" color="rose" label="Gasto" onPress={() => navigate({ screen: 'add-transaction', type: 'EXPENSE' })} />
          <QuickAction icon="transfer" color="indigo" label="Transferir" onPress={() => navigate({ screen: 'add-transaction', type: 'TRANSFER' })} />
          <QuickAction icon="target" color="violet" label="Metas" onPress={() => navigate('goals')} />
        </View>

        {/* Quick actions row 2 */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <QuickAction icon="rotate" color="violet" label="Recurrentes" onPress={() => navigate('recurring')} />
          <QuickAction icon="calendar" color="blue" label="Calendario" onPress={() => navigate('calendar')} />
          <QuickAction icon="calculator" color="teal" label="Calculadora" onPress={() => navigate('calculator')} />
          <QuickAction icon="cog" color="indigo" label="Ajustes" onPress={() => navigate('settings')} />
        </View>

        {/* Próximos pagos */}
        {nextPayments.length > 0 ? (
          <View style={{ marginTop: 18 }}>
            <SectionTitle title="Próximos pagos" action="Ver todo" onAction={() => navigate('calendar')} />
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

        {/* Bank cards strip */}
        {branded.length > 0 ? (
          <View style={{ marginTop: 22 }}>
            <SectionTitle title="Tus tarjetas" action="Ver todas" onAction={() => navigate('accounts')} />
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -16, marginTop: 10 }}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}
              snapToInterval={252}
              decelerationRate="fast"
            >
              {branded.map(acc => {
                const bal = computeAccountBalance(acc, state.transactions);
                return (
                  <View key={acc.id} style={{ width: 240 }}>
                    <BankCard acc={acc} balance={bal} onPress={() => navigate({ screen: 'account-detail', id: acc.id })} />
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
                customCategories={state.customCategories}
                divider={i < recentTxs.length - 1}
                onPress={() => navigate({ screen: 'transaction-detail', id: tx.id })}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Reordering Sheet */}
      <Sheet open={showOrderSheet} onClose={() => setShowOrderSheet(false)} height="45%">
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            letterSpacing: -0.3, marginBottom: 16,
          }}>Organizar balance</Text>
          
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

          <Pressable
            onPress={() => setShowOrderSheet(false)}
            style={({ pressed }) => [{
              marginTop: 10,
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
    </View>
  );
}
