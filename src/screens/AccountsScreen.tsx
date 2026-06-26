import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { labelType } from '../data/catalog';
import { fmtMXN, getCurrency } from '../data/format';
import { computeAccountBalance, isCreditAccount, isDebitAccount, isCashAccount } from '../data/selectors';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';

import { AccountBadge } from '../components/Badges';
import { BankCard } from '../components/BankCard';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionTitle } from '../components/SectionTitle';
import { Icon, IconName } from '../icons/Icon';

type AccountFilter = 'all' | 'debit' | 'cash' | 'credit' | 'liquid' | 'savings' | 'investment' | 'vouchers';

export function AccountsScreen({ initialFilter = 'all' }: { initialFilter?: AccountFilter }) {
  const { t } = useTheme();
  const { state } = useAppState();
  const { balanceHidden, hiddenCards = [] } = state;
  const { navigate } = useNavigation();
  const [filter, setFilter] = useState<AccountFilter>(
    initialFilter === 'liquid' ? 'debit' : initialFilter
  );

  const balances = useMemo(
    () => state.accounts.map(a => ({ ...a, balance: computeAccountBalance(a, state.transactions) })),
    [state.accounts, state.transactions]
  );
  const total = balances.reduce((s, a) => s + a.balance, 0);
  
  // Calculate category totals
  const debitTotal = useMemo(
    () => balances.filter(a => a.type === 'BANK' || a.type === 'DEBIT_CARD').reduce((s, a) => s + a.balance, 0),
    [balances]
  );
  const cashTotal = balances.filter(isCashAccount).reduce((s, a) => s + a.balance, 0);
  const creditTotal = balances.filter(isCreditAccount).reduce((s, a) => s + a.balance, 0);
  const savingsTotal = useMemo(
    () => balances.filter(a => a.type === 'SAVINGS').reduce((s, a) => s + a.balance, 0),
    [balances]
  );
  const investmentTotal = useMemo(
    () => balances.filter(a => a.type === 'INVESTMENT').reduce((s, a) => s + a.balance, 0),
    [balances]
  );
  const vouchersTotal = useMemo(
    () => balances.filter(a => a.type === 'DIGITAL_WALLET').reduce((s, a) => s + a.balance, 0),
    [balances]
  );

  // Check section visibility
  const showSavings = useMemo(() => balances.some(a => a.type === 'SAVINGS'), [balances]);
  const showInvestment = useMemo(() => balances.some(a => a.type === 'INVESTMENT'), [balances]);
  const showVouchers = useMemo(() => balances.some(a => a.type === 'DIGITAL_WALLET'), [balances]);
  
  const creditStats = useMemo(() => {
    const creditAccts = balances.filter(isCreditAccount);
    let totalLimit = 0;
    let totalUsed = 0;
    let totalAvailable = 0;
    for (const acc of creditAccts) {
      const limit = acc.limit || 0;
      const debt = acc.balance < 0 ? Math.abs(acc.balance) : 0;
      totalLimit += limit;
      totalUsed += debt;
      totalAvailable += Math.max(0, limit + acc.balance);
    }
    return {
      limit: totalLimit,
      used: totalUsed,
      available: totalAvailable,
    };
  }, [balances]);

  const visibleBalances = useMemo(() => {
    return balances.filter(a => {
      if (filter === 'debit') return a.type === 'BANK' || a.type === 'DEBIT_CARD';
      if (filter === 'cash') return isCashAccount(a);
      if (filter === 'credit') return isCreditAccount(a);
      if (filter === 'liquid') return a.type === 'BANK' || a.type === 'DEBIT_CARD' || isCashAccount(a);
      if (filter === 'savings') return a.type === 'SAVINGS';
      if (filter === 'investment') return a.type === 'INVESTMENT';
      if (filter === 'vouchers') return a.type === 'DIGITAL_WALLET';
      return true;
    });
  }, [balances, filter]);
  const sections = useMemo(() => {
    const list: { key: string; title: string; accounts: typeof visibleBalances }[] = [];
    
    const debit = visibleBalances.filter(a => a.type === 'BANK' || a.type === 'DEBIT_CARD');
    const cash = visibleBalances.filter(a => a.type === 'CASH');
    const credit = visibleBalances.filter(a => a.type === 'CREDIT_CARD');
    const savings = visibleBalances.filter(a => a.type === 'SAVINGS');
    const investment = visibleBalances.filter(a => a.type === 'INVESTMENT');
    const vouchers = visibleBalances.filter(a => a.type === 'DIGITAL_WALLET');

    if (debit.length > 0) {
      list.push({ key: 'debit', title: 'Débito y cuentas', accounts: debit });
    }
    if (cash.length > 0) {
      list.push({ key: 'cash', title: 'Efectivo', accounts: cash });
    }
    if (credit.length > 0) {
      list.push({ key: 'credit', title: 'Tarjetas de crédito', accounts: credit });
    }
    if (savings.length > 0) {
      list.push({ key: 'savings', title: 'Ahorro', accounts: savings });
    }
    if (investment.length > 0) {
      list.push({ key: 'investment', title: 'Inversión', accounts: investment });
    }
    if (vouchers.length > 0) {
      list.push({ key: 'vouchers', title: 'Vales de despensa', accounts: vouchers });
    }

    return list;
  }, [visibleBalances]);

  const openAccount = (id: string) => {
    navigate({ screen: 'account-detail', id });
  };

  const filterItems = useMemo(() => {
    const list = [
      { id: 'all', label: 'Todo' },
      { id: 'debit', label: 'Débito' },
      { id: 'cash', label: 'Efectivo' },
      { id: 'credit', label: 'Crédito' },
    ];
    if (showSavings) list.push({ id: 'savings', label: 'Ahorro' });
    if (showInvestment) list.push({ id: 'investment', label: 'Inversión' });
    if (showVouchers) list.push({ id: 'vouchers', label: 'Vales' });
    return list;
  }, [showSavings, showInvestment, showVouchers]);

  const subtotalCards = useMemo(() => {
    const list: {
      key: string;
      title: string;
      icon: IconName;
      color: string;
      softBg: string;
      value: number;
    }[] = [
      {
        key: 'debit',
        title: 'DÉBITO',
        icon: 'wallet' as const,
        color: t.indigo,
        softBg: t.indigoSoft,
        value: debitTotal,
      },
      {
        key: 'cash',
        title: 'EFECTIVO',
        icon: 'cash' as const,
        color: t.green,
        softBg: t.greenSoft,
        value: cashTotal,
      },
      {
        key: 'credit',
        title: 'CRÉDITO',
        icon: 'card' as const,
        color: t.rose,
        softBg: t.roseSoft,
        value: creditStats.available,
      },
    ];
    if (showSavings) {
      list.push({
        key: 'savings',
        title: 'AHORRO',
        icon: 'piggy' as const,
        color: t.rose,
        softBg: t.roseSoft,
        value: savingsTotal,
      });
    }
    if (showInvestment) {
      list.push({
        key: 'investment',
        title: 'INVERSIÓN',
        icon: 'trending' as const,
        color: t.violet,
        softBg: t.purpleSoft,
        value: investmentTotal,
      });
    }
    if (showVouchers) {
      list.push({
        key: 'vouchers',
        title: 'VALES',
        icon: 'wallet' as const,
        color: '#E30613',
        softBg: 'rgba(227, 6, 19, 0.12)',
        value: vouchersTotal,
      });
    }
    return list;
  }, [t, debitTotal, cashTotal, creditStats.available, showSavings, savingsTotal, showInvestment, investmentTotal, showVouchers, vouchersTotal]);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        subtitle="Tus"
        title="Cuentas"
        rightIcon="plus"
        onRight={() => navigate('add-account')}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Patrimonio total */}
        <View style={{
          borderRadius: 22, overflow: 'hidden',
          shadowColor: t.indigo, shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
        }}>
          <LinearGradient
            colors={[t.indigo, t.violet]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ padding: 20 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#C7D2FE',
                  letterSpacing: 0.3,
                }}>PATRIMONIO TOTAL</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 30, color: '#fff',
                  letterSpacing: -1, marginTop: 4,
                  fontVariant: ['tabular-nums'],
                }}>{balanceHidden ? '••••••••' : fmtMXN(total)}</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: '#C7D2FE',
                  marginTop: 2,
                }}>en {balances.length} cuentas</Text>
              </View>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
                backgroundColor: 'rgba(255,255,255,0.18)',
              }}>
                <Icon name="trending" size={11} color="#fff" />
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#fff' }}>{getCurrency()}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Filtros */}
        <View style={{ marginTop: 12 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ backgroundColor: t.surface, borderRadius: 16 }}
            contentContainerStyle={{ padding: 4, gap: 6 }}
          >
            {filterItems.map(item => {
              const active = filter === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setFilter(item.id as AccountFilter)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: active ? t.indigo : 'transparent',
                  }}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11,
                    color: active ? '#fff' : t.textMuted,
                  }}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Subtotales */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 12, marginHorizontal: -16 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {subtotalCards
            .filter(card => filter === 'all' || card.key === filter)
            .map(card => {
              const isCardHidden = balanceHidden || hiddenCards.includes(card.key);
              return (
                <Card
                  key={card.key}
                  padding={10}
                  style={{ width: 110 }}
                  onPress={() => setFilter(card.key as AccountFilter)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{
                      width: 20, height: 20, borderRadius: 6,
                      backgroundColor: card.softBg,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={card.icon} size={11} color={card.color} strokeWidth={2.4} />
                    </View>
                    <Text numberOfLines={1} style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted,
                      letterSpacing: 0.1, flex: 1,
                    }}>{card.title}</Text>
                  </View>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text,
                    marginTop: 6, letterSpacing: -0.4,
                    fontVariant: ['tabular-nums'],
                  }}>{isCardHidden ? '••••' : fmtMXN(card.value)}</Text>
                </Card>
              );
            })}
        </ScrollView>

        {sections.map(sec => {
          const secBranded = sec.accounts.filter(a => a.brand || a.type === 'DEBIT_CARD' || a.type === 'CREDIT_CARD' || a.type === 'DIGITAL_WALLET');
          const secOthers = sec.accounts.filter(a => !a.brand && a.type !== 'DEBIT_CARD' && a.type !== 'CREDIT_CARD' && a.type !== 'DIGITAL_WALLET');
          const secIsHidden = balanceHidden || hiddenCards.includes(sec.key);

          return (
            <View key={sec.key} style={{ marginTop: 20 }}>
              <SectionTitle title={sec.title} />
              
              {secBranded.length > 0 && (
                <View style={{ gap: 14, marginTop: 12 }}>
                  {secBranded.map(acc => {
                    const isCC = acc.type === 'CREDIT_CARD';
                    return (
                      <View key={acc.id}>
                        <BankCard
                          acc={acc}
                          balance={acc.balance}
                          onPress={() => openAccount(acc.id)}
                          compact
                          isHidden={secIsHidden}
                        />
                        {isCC && acc.limit ? (() => {
                          const availableCredit = acc.limit + acc.balance;
                          const debt = acc.balance < 0 ? Math.abs(acc.balance) : 0;
                          const usedPct = Math.min(100, Math.max(0, (debt / acc.limit) * 100));
                          const availPct = 100 - usedPct;
                          return (
                            <View style={{ marginTop: 8, paddingHorizontal: 4 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{
                                  fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.textMuted,
                                }}>Disponible</Text>
                                <Text style={{
                                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.text,
                                  fontVariant: ['tabular-nums'],
                                }}>{secIsHidden ? '•••• de ••••' : `${fmtMXN(availableCredit)} de ${fmtMXN(acc.limit)}`}</Text>
                              </View>
                              <View style={{
                                width: '100%', height: 5, borderRadius: 5,
                                backgroundColor: t.border,
                                overflow: 'hidden',
                                flexDirection: 'row',
                              }}>
                                <View style={{
                                  width: `${availPct}%`,
                                  height: '100%',
                                  backgroundColor: t.green,
                                }} />
                                <View style={{
                                  width: `${usedPct}%`,
                                  height: '100%',
                                  backgroundColor: t.rose,
                                }} />
                              </View>
                            </View>
                          );
                        })() : null}
                      </View>
                    );
                  })}
                </View>
              )}

              {secOthers.length > 0 && (
                <View style={{ gap: 10, marginTop: 12 }}>
                  {secOthers.map(acc => (
                    <Card
                      key={acc.id}
                      padding={14}
                      onPress={() => openAccount(acc.id)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <AccountBadge acc={acc} size={42} radius={13} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{
                            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text,
                            letterSpacing: -0.2,
                          }}>{acc.name}</Text>
                          <Text style={{
                            fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                            marginTop: 2,
                          }}>{labelType(acc.type)}</Text>
                        </View>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: t.text,
                          letterSpacing: -0.3,
                          fontVariant: ['tabular-nums'],
                        }}>{secIsHidden ? '••••' : fmtMXN(acc.balance)}</Text>
                      </View>
                    </Card>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
