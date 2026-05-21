import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { catById } from '../data/catalog';
import { fmtMXN } from '../data/format';
import {
  computeAccountBalance, computeBalanceSummary, computeTotalsForAccounts, dailySeries,
  isCreditAccount, isLiquidAccount, spentByCategory, upcomingPayments,
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
import { Icon, IconName } from '../icons/Icon';

const NARROW_DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

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

  const { accounts, transactions, budgets, recurring, notifications, balanceHidden } = state;
  const summary = useMemo(() => computeBalanceSummary(accounts, transactions), [accounts, transactions]);
  const liquidAccounts = useMemo(() => accounts.filter(isLiquidAccount), [accounts]);
  const creditAccounts = useMemo(() => accounts.filter(isCreditAccount), [accounts]);
  const liquidTotals = useMemo(
    () => computeTotalsForAccounts(summary.liquid, liquidAccounts.map(a => a.id), transactions, 30),
    [summary.liquid, liquidAccounts, transactions]
  );
  const nextPayments = useMemo(() => upcomingPayments(recurring, 30, 3), [recurring]);
  const recentTxs = useMemo(
    () => [...transactions].sort((a, b) => b.date - a.date).slice(0, 4),
    [transactions]
  );
  const series = useMemo(() => dailySeries(transactions, 7, 'EXPENSE'), [transactions]);
  const unread = notifications.filter(n => !n.read).length;
  const activeBudgets = useMemo(() => {
    return budgets.map(b => {
      const cat = catById(b.categoryId);
      const spent = spentByCategory(transactions, b.categoryId, 30);
      return { ...b, cat, spent, pct: (spent / b.limit) * 100 };
    }).sort((a, b) => b.pct - a.pct).slice(0, 3);
  }, [budgets, transactions]);

  const seriesMax = Math.max(...series.map(x => x.amount), 1);
  const seriesTotal = series.reduce((s, d) => s + d.amount, 0);
  const branded = accounts.filter(a => a.brand);

  return (
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
          />
          <View style={{
            position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6,
            backgroundColor: t.green, borderWidth: 2, borderColor: t.bg,
          }} />
        </Pressable>

        <Pressable onPress={() => navigate('settings')} style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted }}>Bienvenido</Text>
          <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 17, color: t.text, letterSpacing: -0.4 }}>Tus finanzas</Text>
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
        snapToInterval={304}
        decelerationRate="fast"
      >
      {/* Balance card */}
      <View style={{
        width: 292, borderRadius: 28, overflow: 'hidden',
        shadowColor: t.indigo, shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5, shadowRadius: 30, elevation: 12,
      }}>
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
            }}>DÉBITO Y EFECTIVO</Text>
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
          }}>{balanceHidden ? '••••••••' : fmtMXN(liquidTotals.total)}</Text>
          <View style={{
            marginTop: 18, padding: 14, borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.10)',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
            flexDirection: 'row', gap: 12, alignItems: 'center',
          }}>
            <MiniStat icon="arrow-down" iconColor="#6EE7B7" label="Ingresos" value={balanceHidden ? '••••' : fmtMXN(liquidTotals.income)} />
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'stretch' }} />
            <MiniStat icon="arrow-up" iconColor="#FDA4AF" label="Gastos" value={balanceHidden ? '••••' : fmtMXN(liquidTotals.expense)} />
          </View>
          <Pressable
            onPress={() => navigate({ screen: 'accounts', filter: 'liquid' })}
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
      </View>

      {/* Credit cards total */}
      <View style={{
        width: 292, borderRadius: 28, overflow: 'hidden',
        shadowColor: t.blue, shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.26, shadowRadius: 24, elevation: 8,
      }}>
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
          }}>{balanceHidden ? '••••••••' : fmtMXN(summary.credit)}</Text>
          <View style={{
            marginTop: 18, padding: 14, borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.10)',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
              <View style={{
                width: 24, height: 24, borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.16)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="card" size={14} color="#BFDBFE" strokeWidth={2.5} />
              </View>
              <Text numberOfLines={1} style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#DBEAFE',
              }}>{creditAccounts.length === 1 ? '1 tarjeta registrada' : `${creditAccounts.length} tarjetas registradas`}</Text>
            </View>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: '#fff',
            }}>Crédito</Text>
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
      </View>

      </ScrollView>

      {/* Subtotals: liquid vs credit */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Card padding={14} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{
              width: 22, height: 22, borderRadius: 7,
              backgroundColor: softFor(t, 'green'),
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="wallet" size={12} color={t.green} strokeWidth={2.4} />
            </View>
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.textMuted,
              letterSpacing: 0.3,
            }}>EN DÉBITO Y EFECTIVO</Text>
          </View>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            marginTop: 6, letterSpacing: -0.4,
            fontVariant: ['tabular-nums'],
          }}>{balanceHidden ? '••••' : fmtMXN(summary.liquid)}</Text>
        </Card>
        <Card padding={14} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{
              width: 22, height: 22, borderRadius: 7,
              backgroundColor: softFor(t, 'rose'),
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="card" size={12} color={t.rose} strokeWidth={2.4} />
            </View>
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.textMuted,
              letterSpacing: 0.3,
            }}>EN TARJETAS DE CRÉDITO</Text>
          </View>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18,
            color: summary.credit < 0 ? t.rose : t.text,
            marginTop: 6, letterSpacing: -0.4,
            fontVariant: ['tabular-nums'],
          }}>{balanceHidden ? '••••' : fmtMXN(summary.credit)}</Text>
        </Card>
      </View>

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
        <QuickAction icon="chart" color="teal" label="Presupuestos" onPress={() => navigate('budgets')} />
        <QuickAction icon="cog" color="indigo" label="Ajustes" onPress={() => navigate('settings')} />
      </View>

      {/* Próximos pagos */}
      {nextPayments.length > 0 ? (
        <View style={{ marginTop: 18 }}>
          <SectionTitle title="Próximos pagos" action="Ver todo" onAction={() => navigate('calendar')} />
          <Card padding={4} style={{ marginTop: 10 }}>
            {nextPayments.map((p, i) => {
              const cat = p.rule.categoryId ? catById(p.rule.categoryId) : undefined;
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
                  onPress={() => navigate({ screen: 'add-recurring', id: p.rule.id })}
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

      {/* Active budgets */}
      {activeBudgets.length > 0 ? (
        <View style={{ marginTop: 18 }}>
          <SectionTitle title="Presupuestos del mes" action="Ver todo" onAction={() => navigate('budgets')} />
          <View style={{ gap: 10, marginTop: 10 }}>
            {activeBudgets.map(b => {
              const overColor = b.pct >= 100 ? t.rose : b.pct >= 80 ? t.orange : t.textMuted;
              const barColor = b.pct >= 100 ? 'rose' : b.pct >= 80 ? 'orange' : b.cat?.color;
              return (
                <Card key={b.id} padding={14}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <CategoryBadge cat={b.cat} size={36} radius={11} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text }}>{b.cat?.name}</Text>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                          color: overColor,
                          fontVariant: ['tabular-nums'],
                        }}>{fmtMXN(b.spent)} / {fmtMXN(b.limit)}</Text>
                      </View>
                      <ProgressBar pct={b.pct} color={barColor} />
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>
      ) : null}

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
              divider={i < recentTxs.length - 1}
              onPress={() => navigate({ screen: 'transaction-detail', id: tx.id })}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
