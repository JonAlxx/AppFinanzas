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
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionTitle } from '../components/SectionTitle';
import { Icon } from '../icons/Icon';

type AccountFilter = 'all' | 'debit' | 'cash' | 'credit' | 'liquid';

export function AccountsScreen({ initialFilter = 'all' }: { initialFilter?: AccountFilter }) {
  const { t } = useTheme();
  const { state } = useAppState();
  const { navigate } = useNavigation();
  const [filter, setFilter] = useState<AccountFilter>(
    initialFilter === 'liquid' ? 'debit' : initialFilter
  );

  const balances = useMemo(
    () => state.accounts.map(a => ({ ...a, balance: computeAccountBalance(a, state.transactions) })),
    [state.accounts, state.transactions]
  );
  const total = balances.reduce((s, a) => s + a.balance, 0);
  const debitTotal = balances.filter(isDebitAccount).reduce((s, a) => s + a.balance, 0);
  const cashTotal = balances.filter(isCashAccount).reduce((s, a) => s + a.balance, 0);
  const creditTotal = balances.filter(isCreditAccount).reduce((s, a) => s + a.balance, 0);
  
  const creditStats = useMemo(() => {
    const creditAccts = balances.filter(isCreditAccount);
    let totalLimit = 0;
    let totalUsed = 0;
    for (const acc of creditAccts) {
      totalLimit += acc.limit || 0;
      totalUsed += Math.abs(acc.balance);
    }
    return {
      limit: totalLimit,
      used: totalUsed,
      available: Math.max(0, totalLimit - totalUsed),
    };
  }, [balances]);

  const visibleBalances = balances.filter(a => {
    if (filter === 'debit') return isDebitAccount(a);
    if (filter === 'cash') return isCashAccount(a);
    if (filter === 'credit') return isCreditAccount(a);
    if (filter === 'liquid') return isDebitAccount(a) || isCashAccount(a);
    return true;
  });
  const branded = visibleBalances.filter(a => a.brand || a.type === 'DEBIT_CARD' || a.type === 'CREDIT_CARD');
  const others = visibleBalances.filter(a => !a.brand && a.type !== 'DEBIT_CARD' && a.type !== 'CREDIT_CARD');
  const openAccount = (id: string) => {
    navigate({ screen: 'account-detail', id });
  };

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
                }}>{fmtMXN(total)}</Text>
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
        <View style={{
          flexDirection: 'row', gap: 6, marginTop: 12,
          backgroundColor: t.surface, borderRadius: 16, padding: 4,
        }}>
          {[
            { id: 'all', label: 'Todo' },
            { id: 'debit', label: 'Débito' },
            { id: 'cash', label: 'Efectivo' },
            { id: 'credit', label: 'Crédito' },
          ].map(item => {
            const active = filter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setFilter(item.id as AccountFilter)}
                style={{
                  flex: 1, paddingVertical: 9, borderRadius: 12,
                  alignItems: 'center',
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
        </View>

        {/* Subtotales */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Card padding={10} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{
                width: 20, height: 20, borderRadius: 6,
                backgroundColor: t.indigoSoft,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="wallet" size={11} color={t.indigo} strokeWidth={2.4} />
              </View>
              <Text numberOfLines={1} style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted,
                letterSpacing: 0.1,
              }}>DÉBITO</Text>
            </View>
            <Text numberOfLines={1} style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text,
              marginTop: 6, letterSpacing: -0.4,
              fontVariant: ['tabular-nums'],
            }}>{fmtMXN(debitTotal)}</Text>
          </Card>
          
          <Card padding={10} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{
                width: 20, height: 20, borderRadius: 6,
                backgroundColor: t.greenSoft,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="cash" size={11} color={t.green} strokeWidth={2.4} />
              </View>
              <Text numberOfLines={1} style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted,
                letterSpacing: 0.1,
              }}>EFECTIVO</Text>
            </View>
            <Text numberOfLines={1} style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text,
              marginTop: 6, letterSpacing: -0.4,
              fontVariant: ['tabular-nums'],
            }}>{fmtMXN(cashTotal)}</Text>
          </Card>

          <Card padding={10} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{
                width: 20, height: 20, borderRadius: 6,
                backgroundColor: t.roseSoft,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="card" size={11} color={t.rose} strokeWidth={2.4} />
              </View>
              <Text numberOfLines={1} style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted,
                letterSpacing: 0.1,
              }}>CRÉDITO</Text>
            </View>
            <Text numberOfLines={1} style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold',
              fontSize: 13,
              color: t.text,
              marginTop: 6, letterSpacing: -0.4,
              fontVariant: ['tabular-nums'],
            }}>{fmtMXN(creditStats.available)}</Text>
          </Card>
        </View>

        {/* Tarjetas */}
        {branded.length > 0 ? (
          <View style={{ marginTop: 18 }}>
            <SectionTitle title="Tarjetas" />
            <View style={{ gap: 14, marginTop: 12 }}>
              {branded.map(acc => {
                const isCC = acc.type === 'CREDIT_CARD';
                return (
                  <View key={acc.id}>
                    <BankCard
                      acc={acc}
                      balance={acc.balance}
                      onPress={() => openAccount(acc.id)}
                    />
                    {isCC && acc.limit ? (
                      <View style={{ marginTop: 8, paddingHorizontal: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{
                            fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.textMuted,
                          }}>Disponible</Text>
                          <Text style={{
                            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.text,
                            fontVariant: ['tabular-nums'],
                          }}>{fmtMXN(acc.limit - Math.abs(acc.balance))} de {fmtMXN(acc.limit)}</Text>
                        </View>
                        <ProgressBar pct={(Math.abs(acc.balance) / acc.limit) * 100} color={acc.color} height={5} />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Efectivo y ahorro */}
        {others.length > 0 ? (
          <View style={{ marginTop: 22 }}>
            <SectionTitle title="Efectivo y ahorro" />
            <View style={{ gap: 10, marginTop: 12 }}>
              {others.map(acc => (
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
                    }}>{fmtMXN(acc.balance)}</Text>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
