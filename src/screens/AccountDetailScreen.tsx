import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { labelType } from '../data/catalog';
import { fmtMXN } from '../data/format';
import { computeAccountBalance, getCardTypeForAccount } from '../data/selectors';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';

import { BankCard } from '../components/BankCard';
import { Card } from '../components/Card';
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
              }}>{isHidden ? '••••' : (acc.type === 'CREDIT_CARD' && acc.limit ? fmtMXN(acc.limit - Math.abs(balance)) : (acc.type === 'CREDIT_CARD' ? fmtMXN(Math.abs(balance)) : fmtMXN(balance)))}</Text>
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

        {/* Detalle de Crédito si aplica */}
        {acc.type === 'CREDIT_CARD' && (
          <Card padding={16} style={{ marginTop: 14 }}>
            <SectionTitle title="Detalle de Crédito" />
            
            {acc.limit ? (
              <>
                <View style={{ marginTop: 8, marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                    }}>Progreso de uso</Text>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: t.text,
                      fontVariant: ['tabular-nums'],
                    }}>
                      {((Math.abs(balance) / acc.limit) * 100).toFixed(0)}% usado
                    </Text>
                  </View>
                  <ProgressBar
                    pct={(Math.abs(balance) / acc.limit) * 100}
                    color={acc.color || 'rose'}
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
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.rose,
                      letterSpacing: 0.2,
                    }}>USADO (DEUDA)</Text>
                    <Text numberOfLines={1} style={{
                      fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.rose,
                      marginTop: 4, fontVariant: ['tabular-nums'],
                    }}>{isHidden ? '••••' : fmtMXN(Math.abs(balance))}</Text>
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
                    }}>{isHidden ? '••••' : fmtMXN(acc.limit - Math.abs(balance))}</Text>
                  </View>
                </View>

                {(acc.statementDay || acc.paymentDay) ? (
                  <>
                    <View style={{ height: 1, backgroundColor: t.border, marginVertical: 14 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
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
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
                            <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text, marginTop: 1 }}>
                              Día {acc.paymentDay}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={{ flex: 1 }} />
                      )}
                    </View>
                  </>
                ) : null}
              </>
            ) : (
              <View style={{ marginTop: 8 }}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: t.textMuted,
                }}>
                  Límite de crédito no configurado.
                </Text>
              </View>
            )}
          </Card>
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
    </View>
  );
}
