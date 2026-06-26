import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, Modal, TextInput, Platform } from 'react-native';
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

    const remainingStatement = Math.max(0, initialStatementBalance - totalPayments);
    const remainingMin = Math.max(0, initialMinimumPayment - totalPayments);

    return {
      paymentsSinceCutoff: totalPayments,
      remainingStatementBalance: remainingStatement,
      remainingMinimumPayment: remainingMin,
      hasPaidMinimum: totalPayments >= initialMinimumPayment && initialMinimumPayment > 0,
      hasPaidTotal: totalPayments >= initialStatementBalance && initialStatementBalance > 0
    };
  }, [acc, state.transactions]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'total' | 'minimum' | 'custom'>('total');
  const [customPaymentAmount, setCustomPaymentAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [showCutoffModal, setShowCutoffModal] = useState(false);
  const [showDatesSection, setShowDatesSection] = useState(false);
  const [showUseSection, setShowUseSection] = useState(true);
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
                  setPaymentType(remainingStatementBalance > 0 ? 'total' : (remainingMinimumPayment > 0 ? 'minimum' : 'custom'));
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
                    const usedPct = acc.limit ? Math.min(100, Math.max(0, (debtAmount / acc.limit) * 100)) : 0;
                    const availableAmount = acc.limit + balance;

                    return (
                      <>
                        <View style={{ marginTop: 12, marginBottom: 16 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text style={{
                              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                            }}>Progreso de uso</Text>
                            <Text style={{
                              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: t.text,
                              fontVariant: ['tabular-nums'],
                            }}>
                              {usedPct.toFixed(0)}% usado
                            </Text>
                          </View>
                          <ProgressBar
                            pct={usedPct}
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
                                  setPaymentType(remainingStatementBalance > 0 ? 'total' : (remainingMinimumPayment > 0 ? 'minimum' : 'custom'));
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
                        
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted, letterSpacing: 0.2 }}>
                              SALDO AL CORTE REGISTRADO
                            </Text>
                            <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: acc.statementBalance ? t.indigo : t.textSubtle, marginTop: 4, fontVariant: ['tabular-nums'] }}>
                              {acc.statementBalance ? (
                                remainingStatementBalance === 0
                                  ? '✅ ¡Liquidado!'
                                  : `${fmtMXN(remainingStatementBalance)} de ${fmtMXN(acc.statementBalance)}`
                              ) : 'Sin registrar'}
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
                              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                              backgroundColor: softFor(t, 'indigo'),
                              opacity: pressed ? 0.8 : 1,
                            }]}
                          >
                            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.indigo }}>
                              {acc.statementBalance ? 'Ajustar' : 'Ingresar'}
                            </Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                  </Card>
                )}
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
              OPCIÓN DE PAGO
            </Text>

            {/* Option A: Pago Total */}
            <Pressable
              onPress={() => setPaymentType('total')}
              disabled={hasPaidTotal}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 12, borderRadius: 12, borderWidth: 1,
                borderColor: hasPaidTotal ? t.border : (paymentType === 'total' ? t.green : t.border),
                backgroundColor: hasPaidTotal ? t.surfaceAlt : (paymentType === 'total' ? softFor(t, 'green') : 'transparent'),
                marginBottom: 8,
                opacity: hasPaidTotal ? 0.65 : 1,
              }}
            >
              <View style={{
                width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                borderColor: hasPaidTotal ? t.textSubtle : (paymentType === 'total' ? t.green : t.textMuted),
                alignItems: 'center', justifyContent: 'center',
              }}>
                {paymentType === 'total' && !hasPaidTotal && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.green }} />}
                {hasPaidTotal && <Icon name="check" size={10} color={t.green} strokeWidth={3} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: hasPaidTotal ? t.textMuted : t.text }}>
                  {hasPaidTotal 
                    ? 'Saldo al Corte liquidado' 
                    : (acc.statementBalance ? 'Pago para no generar intereses (Saldo al Corte)' : 'Pago para no generar intereses')}
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: hasPaidTotal ? t.textMuted : t.green, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                  {hasPaidTotal ? 'Pagado' : fmtMXN(remainingStatementBalance)}
                </Text>
              </View>
            </Pressable>

            {/* Option B: Pago Mínimo */}
            <Pressable
              onPress={() => setPaymentType('minimum')}
              disabled={hasPaidMinimum}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 12, borderRadius: 12, borderWidth: 1,
                borderColor: hasPaidMinimum ? t.border : (paymentType === 'minimum' ? t.yellow : t.border),
                backgroundColor: hasPaidMinimum ? t.surfaceAlt : (paymentType === 'minimum' ? softFor(t, 'yellow') : 'transparent'),
                marginBottom: 8,
                opacity: hasPaidMinimum ? 0.65 : 1,
              }}
            >
              <View style={{
                width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                borderColor: hasPaidMinimum ? t.textSubtle : (paymentType === 'minimum' ? t.yellow : t.textMuted),
                alignItems: 'center', justifyContent: 'center',
              }}>
                {paymentType === 'minimum' && !hasPaidMinimum && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.yellow }} />}
                {hasPaidMinimum && <Icon name="check" size={10} color={t.green} strokeWidth={3} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: hasPaidMinimum ? t.textMuted : t.text }}>
                  {hasPaidMinimum 
                    ? 'Pago mínimo cubierto' 
                    : (acc.statementMinimumPayment ? 'Pago mínimo de tu estado' : 'Pago mínimo sugerido (5%)')}
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: hasPaidMinimum ? t.textMuted : t.yellow, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                  {hasPaidMinimum ? 'Cubierto' : fmtMXN(remainingMinimumPayment)}
                </Text>
              </View>
            </Pressable>

            {/* Option C: Custom Amount */}
            <Pressable
              onPress={() => setPaymentType('custom')}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 12, borderRadius: 12, borderWidth: 1,
                borderColor: paymentType === 'custom' ? t.indigo : t.border,
                backgroundColor: paymentType === 'custom' ? softFor(t, 'indigo') : 'transparent',
                marginBottom: 14,
              }}
            >
              <View style={{
                width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                borderColor: paymentType === 'custom' ? t.indigo : t.textMuted,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {paymentType === 'custom' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.indigo }} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text, marginBottom: paymentType === 'custom' ? 6 : 0 }}>
                  Otro monto
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
                      paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: t.indigo,
                      color: t.text, fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold',
                      fontVariant: ['tabular-nums'],
                    }}
                  />
                )}
              </View>
            </Pressable>

            {/* Interest Warning Logic */}
            {(() => {
              const debt = remainingStatementBalance / 100;
              let paidVal = 0;
              if (paymentType === 'total') paidVal = debt;
              else if (paymentType === 'minimum') {
                paidVal = remainingMinimumPayment / 100;
              } else paidVal = parseFloat(customPaymentAmount) || 0;

              // Hide interest warning if there is an active insufficient balance warning to avoid screen clutter
              const selectedAcc = state.accounts.find(a => a.id === fromAccountId);
              const bal = selectedAcc ? computeAccountBalance(selectedAcc, state.transactions) : 0;
              const paidValCents = Math.round(paidVal * 100);
              if (bal < paidValCents) return null;

              const remaining = Math.max(0, debt - paidVal);
              if (remaining > 0) {
                const annualRate = (acc.interestRate ?? 55) / 100; // Custom interest rate or default to 55%
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
                      Quedará un saldo insoluto de <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold' }}>{fmtMXN(Math.round(remaining * 100))}</Text>. Esto generará un interés estimado de <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold' }}>{fmtMXN(Math.round(estimatedInterest * 100))}</Text> en tu próximo estado de cuenta (CAT aprox. {acc.interestRate ?? 55}% anual).
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
                    ¡Excelente! Liquidar el monto total asegura que tu tarjeta no generará intereses en este período.
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
              const debt = remainingStatementBalance / 100;
              let paidVal = 0;
              if (paymentType === 'total') paidVal = debt;
              else if (paymentType === 'minimum') {
                paidVal = remainingMinimumPayment / 100;
              } else paidVal = parseFloat(customPaymentAmount) || 0;
              const paidValCents = Math.round(paidVal * 100);
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
              const debt = remainingStatementBalance / 100;
              let paidVal = 0;
              if (paymentType === 'total') paidVal = debt;
              else if (paymentType === 'minimum') {
                paidVal = remainingMinimumPayment / 100;
              } else paidVal = parseFloat(customPaymentAmount) || 0;

              const selectedAcc = state.accounts.find(a => a.id === fromAccountId);
              const selectedAccBal = selectedAcc ? computeAccountBalance(selectedAcc, state.transactions) : 0;
              const paidValCents = Math.round(paidVal * 100);
              const isDisabled = paidVal <= 0 || !fromAccountId || selectedAccBal < paidValCents;

              return (
                <Pressable
                  onPress={() => {
                    if (isDisabled) return;

                    // Create paired transactions to track the payment as an EXPENSE (Gasto) under the Deudas category,
                    // and credit the card with an INCOME (Abono) to reduce its debt.
                    const expenseTx = {
                      id: 't-exp-' + Date.now(),
                      type: 'EXPENSE' as const,
                      amount: Math.round(paidVal * 100),
                      date: Date.now(),
                      accountId: fromAccountId,
                      categoryId: 'cat-debt',
                      note: paymentType === 'total' 
                        ? `Pago de tarjeta (Total): ${acc.name}` 
                        : `Pago de tarjeta (Parcial): ${acc.name}`,
                      destinationAccountId: null,
                      destinationGoalId: null,
                    };
                    dispatch({ type: 'ADD_TX', tx: expenseTx });

                    const incomeTx = {
                      id: 't-inc-' + Date.now(),
                      type: 'INCOME' as const,
                      amount: Math.round(paidVal * 100),
                      date: Date.now(),
                      accountId: acc.id,
                      categoryId: 'cat-debt',
                      note: `Abono por pago recibido`,
                      destinationAccountId: null,
                      destinationGoalId: null,
                    };
                    dispatch({ type: 'ADD_TX', tx: incomeTx });
                    
                    // Update account: clear statement balance and minimum payment if fully paid, and save billing dates if entered
                    const updatedAcc = {
                      ...acc,
                      ...( (paymentType === 'total' || paidVal >= debt) && { statementBalance: undefined, statementMinimumPayment: undefined } ),
                      ...((paymentModalStatementDay && !acc.statementDay) && { statementDay: parseInt(paymentModalStatementDay) }),
                      ...((paymentModalPaymentDay && !acc.paymentDay) && { paymentDay: parseInt(paymentModalPaymentDay) }),
                    };
                    dispatch({ type: 'UPDATE_ACC', acc: updatedAcc });

                    setShowPaymentModal(false);
                    Alert.alert('Pago registrado', `Se registró el pago por ${fmtMXN(Math.round(paidVal * 100))} desde tu cuenta.`);
                  }}
                  disabled={isDisabled}
                  style={({ pressed }) => [{
                    borderRadius: 14, overflow: 'hidden',
                    opacity: isDisabled ? 0.5 : (pressed ? 0.85 : 1),
                  }]}
                >
                  <LinearGradient
                    colors={isDisabled ? [t.border, t.border] : [t.indigo, t.violet]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ paddingVertical: 12, alignItems: 'center' }}
                  >
                    <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#fff', letterSpacing: 0.2 }}>
                      CONFIRMAR PAGO
                    </Text>
                  </LinearGradient>
                </Pressable>
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
