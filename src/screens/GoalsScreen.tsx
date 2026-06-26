import React, { useState, useMemo } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Svg, { Circle } from 'react-native-svg';
import { fmtMXN } from '../data/format';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';
import { SavingsGoal } from '../data/types';
import { computeAccountBalance } from '../data/selectors';
import { catById } from '../data/catalog';
import { getPeriodBounds, spentInPeriod } from '../utils/budget';

import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { Sheet } from '../components/Sheet';
import { Icon } from '../icons/Icon';
import { SectionTitle } from '../components/SectionTitle';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function GoalsScreen() {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { goals, balanceHidden } = state;
  const { back, navigate } = useNavigation();

  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [actionType, setActionType] = useState<'view' | 'deposit' | 'withdraw'>('view');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Carousel states
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = screenWidth - 32;

  const onScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / (cardWidth + 12));
    setActiveCardIndex(index);
  };

  const activeGoals = useMemo(() => goals.filter(g => !g.completed), [goals]);
  const completedGoals = useMemo(() => goals.filter(g => g.completed), [goals]);

  const total = activeGoals.reduce((s, g) => s + g.current, 0);
  const target = activeGoals.reduce((s, g) => s + g.target, 0);
  const totalPct = target > 0 ? (total / target) * 100 : 0;

  // Find custom quincena days from any active biweekly recurring rule
  const biweeklyRule = useMemo(() => 
    state.recurring.find(r => r.active && r.frequency === 'biweekly' && (r.biweeklyDay1 !== undefined || r.biweeklyDay2 !== undefined)),
    [state.recurring]
  );
  const customDay1 = biweeklyRule?.biweeklyDay1;
  const customDay2 = biweeklyRule?.biweeklyDay2;

  // Compute budget data for the slide-to-side card
  const budgetData = useMemo(() => {
    return state.budgets.map(b => {
      const cat = catById(b.categoryId, state.customCategories);
      
      const { currentStart, currentEnd } = getPeriodBounds(
        b.period,
        Date.now(),
        customDay1,
        customDay2,
        b.customType,
        b.customStartDay,
        b.customEndDay,
        b.customDurationValue,
        b.customDurationUnit,
        b.customStartDate,
        b.customWeekStartDay
      );

      const spent = spentInPeriod(state.transactions, b.categoryId, currentStart, currentEnd);
      const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
      
      return {
        id: b.id,
        name: cat ? cat.name : 'Presupuesto',
        color: cat ? cat.color : 'indigo',
        spent,
        limit: b.limit,
        pct,
      };
    }).sort((a, b) => b.pct - a.pct);
  }, [state.budgets, state.transactions, state.customCategories, customDay1, customDay2]);

  const totalBudgetLimit = useMemo(() => budgetData.reduce((sum, b) => sum + b.limit, 0), [budgetData]);
  const totalBudgetSpent = useMemo(() => budgetData.reduce((sum, b) => sum + b.spent, 0), [budgetData]);
  const overallBudgetPct = totalBudgetLimit > 0 ? (totalBudgetSpent / totalBudgetLimit) * 100 : 0;

  function handleActionConfirm(isDeposit: boolean) {
    if (!selectedGoal) return;
    const num = parseFloat(amountInput) || 0;
    if (num <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto mayor a cero.');
      return;
    }
    if (!selectedAccountId) {
      Alert.alert('Cuenta requerida', 'Por favor selecciona una cuenta para realizar el movimiento.');
      return;
    }

    const centsVal = Math.round(num * 100);

    if (isDeposit) {
      const sourceAcc = state.accounts.find(a => a.id === selectedAccountId);
      if (sourceAcc) {
        const bal = computeAccountBalance(sourceAcc, state.transactions);
        const avail = sourceAcc.type === 'CREDIT_CARD' ? Math.max(0, (sourceAcc.limit || 0) - Math.abs(bal)) : bal;
        if (centsVal > avail) {
          Alert.alert(
            'Saldo insuficiente',
            `La cuenta "${sourceAcc.name}" no tiene fondos suficientes para realizar este abono.\n\nDisponible: ${fmtMXN(avail)}\nIntentado: ${fmtMXN(centsVal)}`
          );
          return;
        }
      }

      // Create transfer transaction from selectedAccountId to the goal's backing account
      const tx = {
        id: 'tx-' + Date.now(),
        type: 'TRANSFER' as const,
        amount: centsVal,
        date: Date.now(),
        accountId: selectedAccountId,
        destinationAccountId: selectedGoal.accountId,
        destinationGoalId: selectedGoal.id,
        note: `Abono a meta: ${selectedGoal.name}`,
      };

      dispatch({ type: 'ADD_TX', tx });
      
      const updatedGoal = { ...selectedGoal, current: Math.min(selectedGoal.target, selectedGoal.current + centsVal) };
      setSelectedGoal(updatedGoal);
    } else {
      // Withdrawal
      if (centsVal > selectedGoal.current) {
        Alert.alert('Monto excedido', 'No puedes retirar más de lo que has ahorrado en esta meta.');
        return;
      }

      // Create transfer transaction from goal's backing account to selectedAccountId
      const tx = {
        id: 'tx-' + Date.now(),
        type: 'TRANSFER' as const,
        amount: centsVal,
        date: Date.now(),
        accountId: selectedGoal.accountId,
        destinationAccountId: selectedAccountId,
        note: `Retiro de meta: ${selectedGoal.name}`,
      };

      dispatch({ type: 'ADD_TX', tx });
      
      const updatedGoal = { ...selectedGoal, current: Math.max(0, selectedGoal.current - centsVal) };
      dispatch({ type: 'UPDATE_GOAL', goal: updatedGoal });
      setSelectedGoal(updatedGoal);
    }

    setAmountInput('');
    setActionType('view');
    Alert.alert(
      isDeposit ? '¡Abono Exitoso!' : '¡Retiro Exitoso!',
      isDeposit 
        ? `Se han abonado ${fmtMXN(centsVal)} a tu meta desde la cuenta.`
        : `Se han retirado ${fmtMXN(centsVal)} de tu meta hacia la cuenta.`
    );
  }

  function handleGoalAchieved(g: SavingsGoal) {
    const cat = catById(g.categoryId || '', state.customCategories);
    const catName = cat ? cat.name : 'General';
    const acc = state.accounts.find(a => a.id === g.accountId);
    const accName = acc ? acc.name : 'Cuenta';

    Alert.alert(
      '¡Felicidades por tu Meta! 🏆',
      `¿Deseas registrar la compra de "${g.name}" por ${fmtMXN(g.current)}?\n\nEsto registrará un gasto en tu cuenta "${accName}" bajo la categoría "${catName}" y completará la meta de ahorro.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Registrar Gasto y Completar',
          onPress: () => {
            const expenseTx = {
              id: 'tx-' + Date.now(),
              type: 'EXPENSE' as const,
              amount: g.current,
              date: Date.now(),
              accountId: g.accountId,
              categoryId: g.categoryId || null,
              note: `🏆 Compra de meta: ${g.name}`,
            };

            dispatch({ type: 'ADD_TX', tx: expenseTx });
            dispatch({ type: 'UPDATE_GOAL', goal: { ...g, completed: true, completedDate: Date.now() } });
            setSelectedGoal(null);

            Alert.alert(
              '¡Meta Completada!',
              `Se ha registrado la compra de "${g.name}" y se han liberado los fondos de la meta.`
            );
          },
        },
      ]
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        leftIcon="chevron-left"
        onLeft={back}
        title="Metas de ahorro"
        rightIcon="plus"
        onRight={() => navigate('add-goal')}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Carousel ScrollView for Goals and Budgets */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -16, marginTop: 8 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 6 }}
          snapToInterval={cardWidth + 12}
          decelerationRate="fast"
          snapToAlignment="center"
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {/* Card 1: Goals Summary */}
          <View style={{
            width: cardWidth,
            height: 152,
            borderRadius: 22,
            overflow: 'hidden',
            shadowColor: t.rose,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 20,
            elevation: 8,
            marginRight: 12,
          }}>
            <LinearGradient
              colors={[t.rose, t.violet]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 22, height: '100%', justifyContent: 'space-between' }}
            >
              <View>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.85)',
                  letterSpacing: 0.3,
                }}>AHORRADO EN METAS</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 28, color: '#fff',
                  letterSpacing: -0.8, marginTop: 4,
                  fontVariant: ['tabular-nums'],
                }}>{balanceHidden ? '••••' : fmtMXN(total)}</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.85)',
                  marginTop: 2,
                }}>de {fmtMXN(target)} totales</Text>
              </View>
              <View style={{
                height: 6, borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden',
              }}>
                <View style={{
                  height: '100%',
                  width: `${Math.min(100, totalPct)}%`,
                  backgroundColor: '#fff', borderRadius: 3,
                }} />
              </View>
            </LinearGradient>
          </View>

          {/* Card 2: Budgets Summary */}
          <View style={{
            width: cardWidth,
            height: 152,
            borderRadius: 22,
            overflow: 'hidden',
            shadowColor: t.indigo,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 20,
            elevation: 8,
          }}>
            <LinearGradient
              colors={[t.indigo, t.violet]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 22, height: '100%', justifyContent: 'space-between' }}
            >
              <View>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.85)',
                  letterSpacing: 0.3,
                }}>PRESUPUESTOS ACTIVOS</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: '#fff',
                  letterSpacing: -0.8, marginTop: 4,
                  fontVariant: ['tabular-nums'],
                }}>{fmtMXN(totalBudgetSpent)}</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.85)',
                  marginTop: 2,
                }}>de {fmtMXN(totalBudgetLimit)} presupuestados ({overallBudgetPct.toFixed(0)}%)</Text>
              </View>

              {/* Top 2 budgets details */}
              <View style={{ gap: 6, marginTop: 4 }}>
                {budgetData.slice(0, 2).map((b) => (
                  <View key={b.id}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10.5, color: '#fff', flex: 1, marginRight: 8 }}>{b.name}</Text>
                      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10.5, color: '#fff', fontVariant: ['tabular-nums'] }}>
                        {b.pct.toFixed(0)}%
                      </Text>
                    </View>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${Math.min(100, b.pct)}%`, backgroundColor: '#fff', borderRadius: 2 }} />
                    </View>
                  </View>
                ))}
                {budgetData.length === 0 && (
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 8 }}>
                    No hay presupuestos configurados.
                  </Text>
                )}
              </View>
            </LinearGradient>
          </View>
        </ScrollView>

        {/* Carousel Pagination Dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8, marginBottom: 12 }}>
          <View style={{ width: activeCardIndex === 0 ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: activeCardIndex === 0 ? t.rose : t.border }} />
          <View style={{ width: activeCardIndex === 1 ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: activeCardIndex === 1 ? t.rose : t.border }} />
        </View>

        <View style={{ marginTop: 18, gap: 12 }}>
          {activeGoals.length === 0 ? (
            <EmptyState
              icon="target"
              color="rose"
              title="Sin metas de ahorro"
              message="Define metas para ahorrar hacia algo que quieras: viaje, fondo de emergencia, artículo especial."
              action="Agregar meta"
              onAction={() => navigate('add-goal')}
            />
          ) : null}
          {activeGoals.map(g => {
            const pct = (g.current / g.target) * 100;
            const c = colorFor(t, g.color);
            const soft = softFor(t, g.color);
            const daysLeft = g.deadline ? Math.ceil((g.deadline - Date.now()) / 86400000) : null;
            const acc = state.accounts.find(a => a.id === g.accountId);
            const generatesYields = g.yields || acc?.type === 'SAVINGS' || acc?.type === 'INVESTMENT';

            return (
              <Card key={g.id} onPress={() => {
                setSelectedGoal(g);
                setActionType('view');
                setAmountInput('');
                setSelectedAccountId(state.accounts[0]?.id || '');
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 50, height: 50, borderRadius: 16, backgroundColor: soft,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={g.icon} size={24} color={c} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: t.text,
                      letterSpacing: -0.3,
                    }}>{g.name}</Text>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                      marginTop: 2,
                    }}>{daysLeft != null ? `${daysLeft} días restantes` : 'Sin fecha límite'}</Text>
                  </View>
                  <View style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
                    backgroundColor: soft,
                  }}>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: c,
                    }}>{pct.toFixed(0)}%</Text>
                  </View>
                </View>
                <View style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
                  marginTop: 14, marginBottom: 8,
                }}>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 19, color: t.text,
                    letterSpacing: -0.4,
                    fontVariant: ['tabular-nums'],
                  }}>{balanceHidden ? '••••' : fmtMXN(g.current)}</Text>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                    fontVariant: ['tabular-nums'],
                  }}>de {fmtMXN(g.target)}</Text>
                </View>
                <ProgressBar pct={pct} color={g.color} height={8} />
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: c, marginTop: 8,
                }}>{pct.toFixed(0)}% completado · faltan {fmtMXN(g.target - g.current)}</Text>

                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  marginTop: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
                  backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border,
                }}>
                  <Icon name="wallet" size={14} color={t.textMuted} />
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.textMuted,
                  }}>
                    Guardado en: <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: t.text }}>{acc?.name || 'Cuentas generales'}</Text>
                  </Text>
                  {generatesYields && (
                    <View style={{
                      marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: softFor(t, 'green'), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                    }}>
                      <Icon name="trending" size={12} color={t.green} />
                      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.green }}>
                        {g.yields && g.yieldRate && g.yieldRate > 0 ? `${g.yieldRate}%` : 'Rendimiento'}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            );
          })}

          {completedGoals.length > 0 && (
            <View style={{ marginTop: 20, gap: 12 }}>
              <SectionTitle title="Metas Logradas 🏆" />
              <Text style={{
                fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                paddingHorizontal: 4, marginTop: -4, marginBottom: 4
              }}>
                Historial de tus metas completadas y celebradas
              </Text>
              {completedGoals.map(g => {
                const c = colorFor(t, 'yellow');
                const soft = softFor(t, 'yellow');
                const dateStr = g.completedDate ? new Date(g.completedDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Completada';
                const pct = (g.current / g.target) * 100;

                return (
                  <Card key={g.id} onPress={() => {
                    setSelectedGoal(g);
                    setActionType('view');
                    setAmountInput('');
                    setSelectedAccountId(state.accounts[0]?.id || '');
                  }} style={{ borderColor: c + '44', borderWidth: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{
                        width: 50, height: 50, borderRadius: 16, backgroundColor: soft,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name="award" size={24} color={c} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{
                            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: t.text,
                            letterSpacing: -0.3,
                            textDecorationLine: 'line-through',
                            opacity: 0.7,
                          }}>{g.name}</Text>
                          <Icon name="check" size={14} color={t.green} />
                        </View>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                          marginTop: 2,
                        }}>Lograda el {dateStr}</Text>
                      </View>
                      <View style={{
                        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
                        backgroundColor: soft,
                      }}>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: c,
                        }}>{pct.toFixed(0)}%</Text>
                      </View>
                    </View>
                    <View style={{
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
                      marginTop: 14,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: c,
                          letterSpacing: -0.4,
                        }}>{balanceHidden ? '••••' : fmtMXN(g.current)}</Text>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.textMuted,
                        }}>de {fmtMXN(g.target)}</Text>
                      </View>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.green,
                      }}>¡Compra registrada! 🎉</Text>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Goal Detail & Contribution Sheet */}
      <Sheet open={selectedGoal !== null} onClose={() => { setSelectedGoal(null); setActionType('view'); setAmountInput(''); }} height={actionType === 'view' ? '80%' : '58%'}>
        {selectedGoal && (() => {
          const g = selectedGoal;
          const pct = (g.current / g.target) * 100;
          const c = colorFor(t, g.color);
          const soft = softFor(t, g.color);
          const acc = state.accounts.find(a => a.id === g.accountId);
          const generatesYields = g.yields || acc?.type === 'SAVINGS' || acc?.type === 'INVESTMENT';

          // Filter transactions belonging to this specific goal
          const goalTxs = state.transactions.filter(
            tx => tx.destinationGoalId === g.id || (tx.note && tx.note.includes(g.name))
          ).sort((a, b) => b.date - a.date);

          if (actionType !== 'view') {
            const isDeposit = actionType === 'deposit';
            return (
              <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
                  letterSpacing: -0.3, marginBottom: 16,
                }}>
                  {isDeposit ? `Abonar a: ${g.name}` : `Retirar de: ${g.name}`}
                </Text>

                {/* Amount input */}
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
                  marginBottom: 8,
                }}>CANTIDAD A {isDeposit ? 'ABONAR' : 'RETIRAR'}</Text>
                <TextInput
                  value={amountInput}
                  onChangeText={(v) => setAmountInput(v.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  placeholderTextColor={t.textMuted}
                  keyboardType="decimal-pad"
                  autoFocus
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 1, borderColor: t.border,
                    backgroundColor: t.surfaceAlt,
                    color: t.text, fontSize: 16,
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontVariant: ['tabular-nums'],
                    marginBottom: 20,
                  }}
                />

                {/* Account Picker */}
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
                  marginBottom: 10,
                }}>
                  {isDeposit ? '¿DE QUÉ CUENTA HACER EL ABONO?' : '¿A QUÉ CUENTA ENVIAR EL RETIRO?'}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -20, marginBottom: 24 }}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 4 }}
                >
                  {state.accounts.map(acc => {
                    const selected = selectedAccountId === acc.id;
                    const bgSelected = softFor(t, acc.color);
                    const colorTheme = colorFor(t, acc.color);
                    const bal = computeAccountBalance(acc, state.transactions);
                    const avail = acc.type === 'CREDIT_CARD' ? Math.max(0, (acc.limit || 0) - Math.abs(bal)) : bal;

                    return (
                      <Pressable
                        key={acc.id}
                        onPress={() => setSelectedAccountId(acc.id)}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14,
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? colorTheme : t.border,
                          backgroundColor: selected ? bgSelected : t.surfaceAlt,
                          alignItems: 'flex-start',
                          minWidth: 130,
                          justifyContent: 'center',
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Icon name={acc.icon} size={12} color={selected ? colorTheme : t.textMuted} />
                          <Text numberOfLines={1} style={{
                            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11,
                            color: selected ? colorTheme : t.text,
                          }}>{acc.name}</Text>
                        </View>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12,
                          color: selected ? colorTheme : t.text,
                          fontVariant: ['tabular-nums'],
                        }}>
                          {fmtMXN(avail)}
                        </Text>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 8,
                          color: selected ? colorTheme : t.textMuted,
                          marginTop: 1,
                        }}>
                          {acc.type === 'CREDIT_CARD' ? 'Crédito disp.' : 'Saldo disp.'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={() => handleActionConfirm(isDeposit)}
                    style={({ pressed }) => [{
                      flex: 1, paddingVertical: 14, borderRadius: 16,
                      backgroundColor: isDeposit ? t.indigo : t.rose, alignItems: 'center',
                      opacity: pressed ? 0.85 : 1,
                    }]}
                  >
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#fff',
                    }}>
                      Confirmar {isDeposit ? 'Abono' : 'Retiro'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setActionType('view');
                      setAmountInput('');
                    }}
                    style={({ pressed }) => [{
                      flex: 1, paddingVertical: 14, borderRadius: 16,
                      backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border,
                      alignItems: 'center',
                      opacity: pressed ? 0.75 : 1,
                    }]}
                  >
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                    }}>
                      Cancelar
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }

          return (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 14, backgroundColor: soft,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={g.icon} size={22} color={c} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
                    letterSpacing: -0.3,
                  }}>{g.name}</Text>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
                    marginTop: 2,
                  }}>
                    Ahorrado en: {acc?.name}
                  </Text>
                </View>
                {generatesYields && (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    backgroundColor: softFor(t, 'green'), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                  }}>
                    <Icon name="trending" size={12} color={t.green} />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.green }}>
                      {g.yields && g.yieldRate && g.yieldRate > 0 ? `${g.yieldRate}% Rendimiento` : 'Genera rendimiento'}
                    </Text>
                  </View>
                )}
              </View>

              {g.completed && (
                <View style={{
                  backgroundColor: softFor(t, 'yellow'),
                  padding: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colorFor(t, 'yellow') + '33',
                  marginBottom: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <View style={{
                    width: 40, height: 40, borderRadius: 12,
                    backgroundColor: colorFor(t, 'yellow'),
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Icon name="award" size={20} color="#181A26" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: colorFor(t, 'yellow') }}>
                      ¡Meta Lograda! 🏆
                    </Text>
                    <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.text, marginTop: 2, lineHeight: 15 }}>
                      Esta meta fue completada el {new Date(g.completedDate || Date.now()).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}. El dinero fue debitado de tu cuenta como un gasto registrado.
                    </Text>
                  </View>
                </View>
              )}

              {/* Circular Progress & Milestones */}
              <View style={{ alignItems: 'center', marginVertical: 8 }}>
                <View style={{ width: 90, height: 90, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                  <Svg width={90} height={90} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
                    {/* Background Ring */}
                    <Circle
                      cx={50}
                      cy={50}
                      r={42}
                      stroke={soft}
                      strokeWidth={8}
                      fill="transparent"
                    />
                    {/* Foreground Ring */}
                    <Circle
                      cx={50}
                      cy={50}
                      r={42}
                      stroke={c}
                      strokeWidth={8}
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={(2 * Math.PI * 42) - ((2 * Math.PI * 42) * Math.min(100, pct)) / 100}
                      strokeLinecap="round"
                    />
                  </Svg>
                  {/* Center Text */}
                  <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: t.text }}>
                      {pct.toFixed(0)}%
                    </Text>
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 7, color: t.textMuted, marginTop: -2 }}>
                      COMPLETO
                    </Text>
                  </View>
                </View>

                {/* Milestone Text Box */}
                <View style={{ 
                  marginTop: 8, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10,
                  backgroundColor: soft, borderWidth: 1, borderColor: c + '22',
                  flexDirection: 'row', alignItems: 'center', gap: 6
                }}>
                  <Icon name={pct >= 100 ? 'award' : 'sparkles'} size={11} color={c} />
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: c }}>
                    {pct >= 100 
                      ? '¡META COMPLETADA! 🏆' 
                      : pct >= 75 
                        ? '¡Casi al final, mantén el ritmo! 🚀' 
                        : pct >= 50 
                          ? '¡Mitad de camino alcanzado! 🎉' 
                          : pct >= 25 
                            ? '¡Hito de 25% completado! 🌟' 
                            : '¡Comenzando tu camino! 🏁'}
                  </Text>
                </View>
              </View>

              {/* Progress Detail */}
              <View style={{ marginBottom: 12, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted }}>
                    Progreso
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.text, fontVariant: ['tabular-nums'] }}>
                    {fmtMXN(g.current)} de {fmtMXN(g.target)}
                  </Text>
                </View>
              </View>

              {/* Proyecciones de rendimiento */}
              {g.yields && g.yieldRate && g.yieldRate > 0 ? (() => {
                const currentVal = g.current / 100;
                const targetVal = g.target / 100;
                const rateVal = g.yieldRate;
                const estMonthlyTarget = (targetVal * rateVal) / 100 / 12;
                const estMonthlyCurrent = (currentVal * rateVal) / 100 / 12;
                const estYearlyTarget = (targetVal * rateVal) / 100;
                const estYearlyCurrent = (currentVal * rateVal) / 100;

                function fmtVal(val: number) {
                  return '$' + val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }

                return (
                  <View style={{
                    backgroundColor: softFor(t, 'green'),
                    padding: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: t.green + '33',
                    marginBottom: 14,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Icon name="trending" size={14} color={t.green} />
                      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.green }}>
                        Proyecciones ({rateVal}% anual)
                      </Text>
                    </View>
                    <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, color: t.text, lineHeight: 14 }}>
                      • Rendimiento sobre saldo actual: <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: t.green }}>{fmtVal(estMonthlyCurrent)}/mes</Text> ({fmtVal(estYearlyCurrent)}/año)
                    </Text>
                    <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, color: t.text, lineHeight: 14, marginTop: 3 }}>
                      • Al alcanzar la meta: <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: t.green }}>{fmtVal(estMonthlyTarget)}/mes</Text> ({fmtVal(estYearlyTarget)}/año)
                    </Text>
                  </View>
                );
              })() : null}

              {/* Tracker / Historial de Movimientos de la Meta */}
              <View style={{ marginBottom: 18 }}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text,
                  marginBottom: 8, letterSpacing: -0.2,
                }}>Historial de movimientos</Text>
                
                {goalTxs.length === 0 ? (
                  <View style={{ padding: 16, backgroundColor: t.surfaceAlt, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted }}>
                      Aún no hay movimientos en esta meta.
                    </Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: t.surfaceAlt, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: t.border }}>
                    {goalTxs.map((tx, idx) => {
                      const isRealloc = tx.note?.toLowerCase().includes('reubicación');
                      const isWithdraw = !isRealloc && (tx.note?.toLowerCase().includes('retiro') || (tx.accountId === g.accountId && !tx.destinationGoalId));
                      const sign = isRealloc ? '⇅ ' : isWithdraw ? '-' : '+';
                      const amtColor = isRealloc ? t.indigo : isWithdraw ? t.rose : t.green;
                      const dateObj = new Date(tx.date);
                      const dateStr = `${dateObj.getDate()} de ${MONTHS[dateObj.getMonth()]}`;
                      
                      return (
                        <View
                          key={tx.id}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 10,
                            paddingHorizontal: 14, paddingVertical: 10,
                            borderBottomWidth: idx < goalTxs.length - 1 ? 1 : 0,
                            borderBottomColor: t.border,
                          }}
                        >
                          <View style={{
                            width: 28, height: 28, borderRadius: 9,
                            backgroundColor: softFor(t, isRealloc ? 'indigo' : isWithdraw ? 'rose' : 'green'),
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Icon name={isRealloc ? 'transfer' : isWithdraw ? 'arrow-up' : 'arrow-down'} size={14} color={isRealloc ? t.indigo : isWithdraw ? t.rose : t.green} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text numberOfLines={1} style={{
                              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.text,
                            }}>
                              {isRealloc ? 'Cambio de cuenta' : isWithdraw ? 'Retiro de ahorro' : 'Abono de ahorro'}
                            </Text>
                            <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10, color: t.textMuted, marginTop: 1 }}>
                              {isRealloc 
                                ? `De ${state.accounts.find(a => a.id === tx.accountId)?.name || 'cuenta'} a ${state.accounts.find(a => a.id === tx.destinationAccountId)?.name || 'cuenta'} · ${dateStr}` 
                                : dateStr}
                            </Text>
                          </View>
                          <Text style={{
                            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: amtColor,
                          }}>
                            {sign}{fmtMXN(tx.amount)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={{ gap: 10 }}>
                {g.completed ? (
                  <>
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          'Eliminar del historial',
                          `¿Deseas eliminar la meta "${g.name}" de tu historial?\n\nEsto no alterará la transacción de gasto que fue registrada en tu contabilidad.`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Eliminar del Historial',
                              style: 'destructive',
                              onPress: () => {
                                dispatch({ type: 'DELETE_GOAL', id: g.id });
                                setSelectedGoal(null);
                                Alert.alert('Meta eliminada', 'La meta ha sido removida de tu historial.');
                              }
                            }
                          ]
                        );
                      }}
                      style={({ pressed }) => [{
                        paddingVertical: 14, borderRadius: 16,
                        backgroundColor: 'rgba(244, 63, 94, 0.1)', borderWidth: 1, borderColor: t.rose,
                        alignItems: 'center',
                        opacity: pressed ? 0.85 : 1,
                      }]}
                    >
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.rose,
                      }}>
                        Eliminar del Historial
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    {g.current >= g.target && (
                      <Pressable
                        onPress={() => handleGoalAchieved(g)}
                        style={({ pressed }) => [{
                          paddingVertical: 15,
                          borderRadius: 16,
                          backgroundColor: t.green,
                          alignItems: 'center',
                          shadowColor: t.green,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.25,
                          shadowRadius: 10,
                          elevation: 4,
                          opacity: pressed ? 0.85 : 1,
                        }]}
                      >
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#fff',
                        }}>
                          ¡Logrado! Registrar Gasto 🏆
                        </Text>
                      </Pressable>
                    )}

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Pressable
                        onPress={() => setActionType('deposit')}
                        style={({ pressed }) => [{
                          flex: 1, paddingVertical: 14, borderRadius: 16,
                          backgroundColor: t.indigo, alignItems: 'center',
                          opacity: pressed ? 0.85 : 1,
                        }]}
                      >
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#fff',
                        }}>Abonar Ahorro</Text>
                      </Pressable>
                      
                      <Pressable
                        onPress={() => setActionType('withdraw')}
                        style={({ pressed }) => [{
                          flex: 1, paddingVertical: 14, borderRadius: 16,
                          backgroundColor: 'transparent', borderWidth: 1, borderColor: t.rose,
                          alignItems: 'center',
                          opacity: pressed ? 0.85 : 1,
                        }]}
                      >
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.rose,
                        }}>Retirar</Text>
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={() => {
                        setSelectedGoal(null);
                        navigate({ screen: 'add-goal', id: g.id });
                      }}
                      style={({ pressed }) => [{
                        paddingVertical: 14, borderRadius: 16,
                        backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border,
                        alignItems: 'center',
                        opacity: pressed ? 0.75 : 1,
                      }]}
                    >
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                      }}>Editar Meta</Text>
                    </Pressable>
                  </>
                )}

                <Pressable
                  onPress={() => setSelectedGoal(null)}
                  style={({ pressed }) => [{
                    paddingVertical: 14, borderRadius: 16,
                    alignItems: 'center',
                    opacity: pressed ? 0.75 : 1,
                  }]}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.textMuted,
                  }}>Cerrar</Text>
                </Pressable>
              </View>
            </ScrollView>
          );
        })()}
      </Sheet>
    </View>
  );
}
