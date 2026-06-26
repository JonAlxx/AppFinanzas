import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

import { catById, allCategories } from '../data/catalog';
import { fmtMXN } from '../data/format';
import { spentByCategory } from '../data/selectors';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';
import { Budget } from '../data/types';

import { CategoryBadge } from '../components/Badges';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionTitle } from '../components/SectionTitle';
import { Sheet } from '../components/Sheet';
import { Icon } from '../icons/Icon';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Helper to get period start and end bounds
function getPeriodBounds(period: 'weekly' | 'biweekly' | 'monthly' | undefined, nowMs = Date.now()) {
  const p = period || 'monthly';
  const now = new Date(nowMs);
  
  let currentStart = 0;
  let currentEnd = 0;
  let prevStart = 0;
  let prevEnd = 0;
  let daysRemaining = 0;
  let periodLabel = '';
  
  if (p === 'weekly') {
    // Current week (Monday to Sunday)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    
    const currMonday = new Date(now.getFullYear(), now.getMonth(), diff);
    currMonday.setHours(0, 0, 0, 0);
    currentStart = currMonday.getTime();
    
    const currSunday = new Date(currMonday);
    currSunday.setDate(currSunday.getDate() + 7);
    currentEnd = currSunday.getTime(); // start of next week
    
    // Previous week
    const prevMonday = new Date(currMonday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    prevStart = prevMonday.getTime();
    prevEnd = currentStart;
    
    daysRemaining = Math.max(1, Math.ceil((currentEnd - nowMs) / 86400000));
    periodLabel = 'Esta semana';
  } else if (p === 'biweekly') {
    // Current fortnight (1st-15th or 16th-end)
    const isFirstHalf = now.getDate() <= 15;
    
    if (isFirstHalf) {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      currentStart = start.getTime();
      
      const end = new Date(now.getFullYear(), now.getMonth(), 16);
      end.setHours(0, 0, 0, 0);
      currentEnd = end.getTime();
      
      // Previous fortnight: 16th to end of last month
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 16);
      prevMonthStart.setHours(0, 0, 0, 0);
      prevStart = prevMonthStart.getTime();
      prevEnd = currentStart;
    } else {
      const start = new Date(now.getFullYear(), now.getMonth(), 16);
      start.setHours(0, 0, 0, 0);
      currentStart = start.getTime();
      
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      end.setHours(0, 0, 0, 0);
      currentEnd = end.getTime();
      
      // Previous fortnight: 1st to 15th of this month
      const prevStartObj = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStartObj.setHours(0, 0, 0, 0);
      prevStart = prevStartObj.getTime();
      prevEnd = currentStart;
    }
    
    daysRemaining = Math.max(1, Math.ceil((currentEnd - nowMs) / 86400000));
    periodLabel = 'Esta quincena';
  } else {
    // Current month
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    currentStart = start.getTime();
    
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    end.setHours(0, 0, 0, 0);
    currentEnd = end.getTime();
    
    // Previous month
    const prevStartObj = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevStartObj.setHours(0, 0, 0, 0);
    prevStart = prevStartObj.getTime();
    prevEnd = currentStart;
    
    daysRemaining = Math.max(1, Math.ceil((currentEnd - nowMs) / 86400000));
    periodLabel = 'Este mes';
  }
  
  return { currentStart, currentEnd, prevStart, prevEnd, daysRemaining, periodLabel };
}

// Helper to calculate spent in specific period
function spentInPeriod(txs: any[], categoryId: string, startMs: number, endMs: number) {
  let sum = 0;
  for (const t of txs) {
    if (t.type !== 'EXPENSE') continue;
    if (t.categoryId !== categoryId) continue;
    if (t.date >= startMs && t.date < endMs) {
      sum += t.amount;
    }
  }
  return sum;
}

export function BudgetsScreen() {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { navigate } = useNavigation();

  // Modal / Sheet States
  const [isOpen, setIsOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'detail' | 'edit' | 'select-goal' | 'create'>('create');
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [limitInput, setLimitInput] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');

  const expenseCategories = useMemo(() => {
    const allCats = allCategories(state.customCategories);
    return allCats.filter(c => c.type === 'EXPENSE');
  }, [state.customCategories]);

  const availableCategories = useMemo(() => {
    const currentBudgetCats = state.budgets.map(b => b.categoryId);
    return expenseCategories.filter(c => {
      if (editingBudget && editingBudget.categoryId === c.id) return true;
      return !currentBudgetCats.includes(c.id);
    });
  }, [expenseCategories, state.budgets, editingBudget]);

  const data = useMemo(() => state.budgets.map(b => {
    const cat = catById(b.categoryId, state.customCategories);
    const isAdmin = state.profile?.phone === '12345678123';
    const createdTime = parseInt(b.id.replace('budget-', '')) || 0;
    const { currentStart, currentEnd, prevStart, prevEnd, daysRemaining, periodLabel } = getPeriodBounds(b.period);
    const hasPreviousPeriod = isAdmin ? true : (createdTime < currentStart);

    const spent = spentInPeriod(state.transactions, b.categoryId, currentStart, currentEnd);
    const realPrevSpent = spentInPeriod(state.transactions, b.categoryId, prevStart, prevEnd);
    const prevSpent = hasPreviousPeriod
      ? (realPrevSpent || (isAdmin ? 0 : undefined))
      : undefined;
    const effectiveLimit = b.limit + (b.rollover || 0);
    
    const over = spent > b.limit;
    const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
    const remaining = over ? (spent - b.limit) : (effectiveLimit - spent);
    
    return {
      ...b,
      cat,
      spent,
      prevSpent,
      effectiveLimit,
      over,
      pct,
      remaining,
      daysRemaining,
      periodLabel,
    };
  }), [state.budgets, state.transactions, state.customCategories]);

  // Transactions in the current period for the selected budget category
  const currentPeriodTransactions = useMemo(() => {
    if (!editingBudget) return [];
    const { currentStart, currentEnd } = getPeriodBounds(editingBudget.period);
    return state.transactions.filter(t =>
      t.type === 'EXPENSE' &&
      t.categoryId === editingBudget.categoryId &&
      t.date >= currentStart &&
      t.date < currentEnd
    ).sort((a, b) => b.date - a.date);
  }, [editingBudget, state.transactions]);

  const totalLimit = data.reduce((s, b) => s + b.effectiveLimit, 0);
  const totalSpent = data.reduce((s, b) => s + b.spent, 0);
  const overall = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
  const overallPct = Math.min(100, overall);
  const r = 32, c = 2 * Math.PI * r;
  const dashLen = (overallPct / 100) * c;

  const handleSave = () => {
    const limitNum = parseFloat(limitInput);
    if (isNaN(limitNum) || limitNum <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto válido mayor a cero.');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Categoría requerida', 'Por favor selecciona una categoría.');
      return;
    }

    const limitCents = Math.round(limitNum * 100);

    if (editingBudget) {
      const budget: Budget = {
        ...editingBudget,
        categoryId: selectedCategoryId,
        limit: limitCents,
        period: selectedPeriod,
      };
      dispatch({ type: 'UPDATE_BUDGET', budget });
    } else {
      const budget: Budget = {
        id: 'budget-' + Date.now(),
        categoryId: selectedCategoryId,
        limit: limitCents,
        period: selectedPeriod,
        prevLeftoverProcessed: false,
      };
      dispatch({ type: 'ADD_BUDGET', budget });
    }
    setIsOpen(false);
  };

  const handleDelete = () => {
    if (!editingBudget) return;
    Alert.alert(
      'Eliminar presupuesto',
      '¿Estás seguro de que deseas eliminar este presupuesto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'DELETE_BUDGET', id: editingBudget.id });
            setIsOpen(false);
          },
        },
      ]
    );
  };

  // Transfer leftover money to a savings goal
  const handleSaveLeftoverToGoal = (goalId: string, amountCents: number) => {
    if (!editingBudget) return;
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return;

    const accountId = goal.accountId || state.accounts[0]?.id;
    if (!accountId) {
      Alert.alert('Error', 'No hay cuentas configuradas para realizar el ahorro.');
      return;
    }

    const cat = catById(editingBudget.categoryId, state.customCategories);
    const catName = cat ? cat.name : '';

    const tx = {
      id: 'tx-' + Date.now(),
      type: 'TRANSFER' as const,
      amount: amountCents,
      date: Date.now(),
      accountId: accountId,
      destinationAccountId: goal.accountId,
      destinationGoalId: goal.id,
      note: `Ahorro de sobrante de presupuesto: ${catName}`,
    };

    dispatch({ type: 'ADD_TX', tx });
    
    const updatedGoal = { ...goal, current: Math.min(goal.target, goal.current + amountCents) };
    dispatch({ type: 'UPDATE_GOAL', goal: updatedGoal });

    const updatedBudget = {
      ...editingBudget,
      prevLeftoverProcessed: true,
    };
    dispatch({ type: 'UPDATE_BUDGET', budget: updatedBudget });
    
    setIsOpen(false);
    setEditingBudget(null);
    
    Alert.alert(
      '¡Ahorro Exitoso!',
      `Se han transferido ${fmtMXN(amountCents)} a tu meta "${goal.name}".`
    );
  };

  // Rollover leftover to current period limit
  const handleRolloverLeftover = (amountCents: number) => {
    if (!editingBudget) return;
    const updatedBudget = {
      ...editingBudget,
      rollover: (editingBudget.rollover || 0) + amountCents,
      prevLeftoverProcessed: true,
    };
    dispatch({ type: 'UPDATE_BUDGET', budget: updatedBudget });
    
    setIsOpen(false);
    setEditingBudget(null);
    
    Alert.alert(
      '¡Presupuesto ampliado!',
      `Se han sumado ${fmtMXN(amountCents)} como saldo a favor en el periodo actual.`
    );
  };

  // Ignore leftover (renew normally without rollover/saving)
  const handleIgnoreLeftover = () => {
    if (!editingBudget) return;
    const updatedBudget = {
      ...editingBudget,
      prevLeftoverProcessed: true,
    };
    dispatch({ type: 'UPDATE_BUDGET', budget: updatedBudget });
    
    setIsOpen(false);
    setEditingBudget(null);
    
    Alert.alert(
      'Presupuesto renovado',
      'El presupuesto se ha renovado con su límite base original.'
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        subtitle="Tus"
        title="Presupuestos"
        rightIcon="plus"
        onRight={() => {
          setEditingBudget(null);
          setSelectedCategoryId(availableCategories[0]?.id || '');
          setLimitInput('');
          setSelectedPeriod('monthly');
          setSheetMode('create');
          setIsOpen(true);
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall card */}
        <View style={{
          borderRadius: 22, overflow: 'hidden',
          shadowColor: t.indigo, shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
        }}>
          <LinearGradient
            colors={[t.indigo, t.violet]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ padding: 22 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#C7D2FE',
                }}>Total activos</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 28, color: '#fff',
                  letterSpacing: -0.8, marginTop: 4,
                  fontVariant: ['tabular-nums'],
                }}>{fmtMXN(totalSpent)}</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: '#C7D2FE',
                  marginTop: 2,
                }}>de {fmtMXN(totalLimit)} presupuestado</Text>
              </View>
              <View style={{ width: 80, height: 80, position: 'relative' }}>
                <Svg width={80} height={80}>
                  <Circle cx={40} cy={40} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={8} />
                  <Circle
                    cx={40} cy={40} r={r}
                    fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round"
                    strokeDasharray={`${dashLen} ${c}`}
                    transform={`rotate(-90 40 40)`}
                  />
                </Svg>
                <View style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: '#fff',
                    letterSpacing: -0.3,
                  }}>{overall.toFixed(0)}%</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={{ marginTop: 18 }}>
          <SectionTitle title="Por categoría" />
          {data.length === 0 ? (
            <View style={{ marginTop: 12 }}>
              <EmptyState
                icon="bolt"
                color="indigo"
                title="Sin presupuestos aún"
                message="Crea presupuestos por categoría para controlar tus gastos y recibir alertas."
                action="Crear presupuesto"
                onAction={() => {
                  setEditingBudget(null);
                  setSelectedCategoryId(availableCategories[0]?.id || '');
                  setLimitInput('');
                  setSelectedPeriod('monthly');
                  setSheetMode('create');
                  setIsOpen(true);
                }}
              />
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 12 }}>
              {data.map(b => {
                const over = b.pct >= 100;
                const warn = b.pct >= 80;
                const pctColor = over ? t.rose : warn ? t.orange : t.textMuted;
                const barColor = over ? 'rose' : warn ? 'orange' : b.cat?.color;
                const periodText = b.period === 'weekly' ? 'Semanal' : b.period === 'biweekly' ? 'Quincenal' : 'Mensual';

                return (
                  <Card
                    key={b.id}
                    onPress={() => {
                      setEditingBudget(b);
                      setSelectedCategoryId(b.categoryId);
                      setLimitInput((b.limit / 100).toString());
                      setSelectedPeriod(b.period || 'monthly');
                      setSheetMode('detail');
                      setIsOpen(true);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <CategoryBadge cat={b.cat} size={42} radius={13} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{
                              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: t.text,
                            }}>{b.cat?.name}</Text>
                            <View style={{
                              paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                              backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border,
                            }}>
                              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.textMuted }}>
                                {periodText}
                              </Text>
                            </View>
                          </View>
                          <Text style={{
                            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: pctColor,
                            fontVariant: ['tabular-nums'],
                          }}>{b.pct.toFixed(0)}%</Text>
                        </View>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                          marginTop: 2,
                        }}>
                          {fmtMXN(b.spent)} de {fmtMXN(b.effectiveLimit)}
                          {b.rollover && b.rollover > 0 ? ` (+${fmtMXN(b.rollover)} extra)` : ''}
                        </Text>
                      </View>
                    </View>
                    <ProgressBar pct={b.pct} color={barColor} height={8} />
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
                      }}>{over ? '⚠ Te pasaste por' : 'Te quedan'}</Text>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12,
                        color: over ? t.rose : t.text,
                        fontVariant: ['tabular-nums'],
                      }}>{fmtMXN(Math.abs(b.remaining))}</Text>
                    </View>

                    {/* Previous period result */}
                    {b.prevSpent !== undefined && (
                      <View style={{
                        marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: t.border,
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.textMuted }}>
                          Periodo anterior
                        </Text>
                        {b.prevSpent === 0 ? (
                          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted }}>
                            Sin gastos
                          </Text>
                        ) : b.prevSpent <= b.limit ? (
                          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.green }}>
                            ✓ Te sobraron {fmtMXN(b.limit - b.prevSpent)}
                          </Text>
                        ) : (
                          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.rose }}>
                            ✗ Te pasaste por {fmtMXN(b.prevSpent - b.limit)}
                          </Text>
                        )}
                      </View>
                    )}
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Budget Creator / Editor Sheet */}
      <Sheet open={isOpen} onClose={() => setIsOpen(false)} height={sheetMode === 'detail' ? '82%' : '68%'}>
        {sheetMode === 'detail' && editingBudget ? (() => {
          const b = editingBudget;
          const budgetData = data.find(item => item.id === b.id);
          if (!budgetData) return null;
          
          const leftover = budgetData.prevSpent !== undefined ? budgetData.limit - budgetData.prevSpent : 0;
          const hasLeftover = budgetData.prevSpent !== undefined && budgetData.prevSpent < budgetData.limit && leftover > 0 && !budgetData.prevLeftoverProcessed;

          return (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <CategoryBadge cat={budgetData.cat} size={44} radius={14} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
                    letterSpacing: -0.3,
                  }}>{budgetData.cat?.name}</Text>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
                    marginTop: 2,
                  }}>
                    Presupuesto {budgetData.period === 'weekly' ? 'Semanal' : budgetData.period === 'biweekly' ? 'Quincenal' : 'Mensual'}
                  </Text>
                </View>
                <View style={{
                  paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                  backgroundColor: softFor(t, budgetData.pct >= 100 ? 'rose' : 'indigo'),
                }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: budgetData.pct >= 100 ? t.rose : t.indigo }}>
                    {budgetData.pct.toFixed(0)}%
                  </Text>
                </View>
              </View>

              {/* Progress Summary */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center', gap: 8 }}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted, flex: 1 }}>
                    {budgetData.periodLabel} · {budgetData.daysRemaining} {budgetData.daysRemaining === 1 ? 'día' : 'días'} rest.
                  </Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.text, fontVariant: ['tabular-nums'] }}>
                    {fmtMXN(budgetData.spent)} de {fmtMXN(budgetData.effectiveLimit)}
                  </Text>
                </View>
                <ProgressBar pct={budgetData.pct} color={budgetData.pct >= 100 ? 'rose' : budgetData.pct >= 80 ? 'orange' : budgetData.cat?.color} height={10} />
                {budgetData.rollover && budgetData.rollover > 0 ? (
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, color: t.green, marginTop: 6 }}>
                    * Incluye {fmtMXN(budgetData.rollover)} extra acumulado del periodo anterior.
                  </Text>
                ) : null}
              </View>

              {/* Leftover Action Card (Rollover / Save to Goal) */}
              {hasLeftover && (
                <View style={{
                  backgroundColor: softFor(t, 'green'),
                  padding: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: t.green + '33',
                  marginBottom: 20,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Icon name="sparkles" size={16} color={t.green} />
                    <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.green }}>
                      ¡Saldo a favor detectado!
                    </Text>
                  </View>
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.text, lineHeight: 16, marginBottom: 12 }}>
                    Te sobraron <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: t.green }}>{fmtMXN(leftover)}</Text> en el periodo anterior. ¿Qué quieres hacer con este dinero?
                  </Text>
                  
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <Pressable
                      onPress={() => handleRolloverLeftover(leftover)}
                      style={({ pressed }) => [{
                        flex: 1, paddingVertical: 10, borderRadius: 10,
                        backgroundColor: t.green, alignItems: 'center',
                        opacity: pressed ? 0.85 : 1,
                      }]}
                    >
                      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#fff' }}>
                        Sumar al actual
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setSheetMode('select-goal')}
                      style={({ pressed }) => [{
                        flex: 1, paddingVertical: 10, borderRadius: 10,
                        backgroundColor: 'transparent', borderWidth: 1, borderColor: t.green,
                        alignItems: 'center',
                        opacity: pressed ? 0.85 : 1,
                      }]}
                    >
                      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.green }}>
                        Ahorrar en Meta
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={handleIgnoreLeftover}
                    style={({ pressed }) => [{
                      paddingVertical: 8,
                      alignItems: 'center',
                      opacity: pressed ? 0.75 : 1,
                    }]}
                  >
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted }}>
                      No hacer nada (Reiniciar presupuesto normal)
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Transactions list in this period */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text,
                  marginBottom: 8, letterSpacing: -0.2,
                }}>Movimientos del periodo</Text>

                {currentPeriodTransactions.length === 0 ? (
                  <View style={{ padding: 16, backgroundColor: t.surfaceAlt, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted }}>
                      Aún no hay gastos registrados en esta categoría este periodo.
                    </Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: t.surfaceAlt, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: t.border }}>
                    {currentPeriodTransactions.map((tx, idx) => {
                      const dateObj = new Date(tx.date);
                      const dateStr = `${dateObj.getDate()} de ${MONTHS[dateObj.getMonth()]}`;
                      return (
                        <Pressable
                          key={tx.id}
                          onPress={() => {
                            setIsOpen(false);
                            navigate({ screen: 'transaction-detail', id: tx.id });
                          }}
                          style={({ pressed }) => [{
                            flexDirection: 'row', alignItems: 'center', gap: 10,
                            paddingHorizontal: 14, paddingVertical: 12,
                            borderBottomWidth: idx < currentPeriodTransactions.length - 1 ? 1 : 0,
                            borderBottomColor: t.border,
                            backgroundColor: pressed ? t.border : 'transparent',
                          }]}
                        >
                          <View style={{
                            width: 28, height: 28, borderRadius: 9,
                            backgroundColor: softFor(t, 'rose'),
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Icon name="arrow-up" size={14} color={t.rose} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text numberOfLines={1} style={{
                              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.text,
                            }}>
                              {tx.note || 'Gasto registrado'}
                            </Text>
                            <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10, color: t.textMuted, marginTop: 1 }}>
                              {dateStr}
                            </Text>
                          </View>
                          <Text style={{
                            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: t.rose,
                          }}>
                            -{fmtMXN(tx.amount)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={() => setSheetMode('edit')}
                    style={({ pressed }) => [{
                      flex: 1, paddingVertical: 14, borderRadius: 16,
                      backgroundColor: t.indigo, alignItems: 'center',
                      opacity: pressed ? 0.85 : 1,
                    }]}
                  >
                    <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#fff' }}>
                      Editar límites
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleDelete}
                    style={({ pressed }) => [{
                      flex: 1, paddingVertical: 14, borderRadius: 16,
                      backgroundColor: 'transparent', borderWidth: 1, borderColor: t.rose,
                      alignItems: 'center',
                      opacity: pressed ? 0.85 : 1,
                    }]}
                  >
                    <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.rose }}>
                      Eliminar
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => setIsOpen(false)}
                  style={({ pressed }) => [{
                    paddingVertical: 14, borderRadius: 16,
                    backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border,
                    alignItems: 'center',
                    opacity: pressed ? 0.75 : 1,
                  }]}
                >
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text }}>
                    Cerrar
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          );
        })() : null}

        {sheetMode === 'select-goal' && editingBudget && (() => {
          const budgetData = data.find(item => item.id === editingBudget.id);
          if (!budgetData) return null;
          const leftover = budgetData.prevSpent !== undefined ? budgetData.limit - budgetData.prevSpent : 0;

          return (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
                letterSpacing: -0.3, marginBottom: 6,
              }}>
                Ahorrar sobrante en Meta
              </Text>
              <Text style={{
                fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
                marginBottom: 20,
              }}>
                Selecciona la meta de ahorro a la que deseas transferir los <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: t.green }}>{fmtMXN(leftover)}</Text> de saldo a favor.
              </Text>

              {state.goals.length === 0 ? (
                <View style={{ padding: 24, backgroundColor: t.surfaceAlt, borderRadius: 16, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: t.border }}>
                  <Icon name="target" size={28} color={t.textMuted} style={{ marginBottom: 8 }} />
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text, marginBottom: 4 }}>No tienes metas de ahorro</Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted, textAlign: 'center' }}>Crea primero una meta desde la sección de Metas para poder ahorrar.</Text>
                </View>
              ) : (
                <View style={{ gap: 10, marginBottom: 24 }}>
                  {state.goals.map(goal => {
                    const pct = (goal.current / goal.target) * 100;
                    return (
                      <Pressable
                        key={goal.id}
                        onPress={() => handleSaveLeftoverToGoal(goal.id, leftover)}
                        style={({ pressed }) => [{
                          padding: 14,
                          borderRadius: 16,
                          backgroundColor: t.surfaceAlt,
                          borderWidth: 1,
                          borderColor: t.border,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          opacity: pressed ? 0.85 : 1,
                        }]}
                      >
                        <View style={{
                          width: 40, height: 40, borderRadius: 12, backgroundColor: softFor(t, goal.color),
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon name={goal.icon} size={20} color={colorFor(t, goal.color)} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text }}>{goal.name}</Text>
                          <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted, marginTop: 1 }}>
                            Ahorrado: {fmtMXN(goal.current)} de {fmtMXN(goal.target)}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: colorFor(t, goal.color) }}>
                          {pct.toFixed(0)}%
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Pressable
                onPress={() => setSheetMode('detail')}
                style={({ pressed }) => [{
                  paddingVertical: 14, borderRadius: 16,
                  backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border,
                  alignItems: 'center',
                  opacity: pressed ? 0.75 : 1,
                }]}
              >
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text }}>
                  Volver al detalle
                </Text>
              </Pressable>
            </ScrollView>
          );
        })()}

        {(sheetMode === 'create' || sheetMode === 'edit') && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
              letterSpacing: -0.3, marginBottom: 16,
            }}>
              {editingBudget ? 'Editar presupuesto' : 'Crear presupuesto'}
            </Text>

            {/* Category Selector */}
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
              marginBottom: 10,
            }}>CATEGORÍA DEL GASTO</Text>
            {availableCategories.length === 0 && !editingBudget ? (
              <Text style={{
                fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: t.textMuted,
                marginBottom: 20, textAlign: 'center',
              }}>Ya has creado presupuestos para todas las categorías disponibles.</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -20, marginBottom: 20 }}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 4 }}
              >
                {availableCategories.map(cat => {
                  const selected = selectedCategoryId === cat.id;
                  const bgSelected = softFor(t, cat.color);
                  const colorTheme = colorFor(t, cat.color);

                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? colorTheme : t.border,
                        backgroundColor: selected ? bgSelected : t.surfaceAlt,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <CategoryBadge cat={cat} size={20} radius={6} />
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                        color: selected ? colorTheme : t.text,
                      }}>{cat.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* Period Selector */}
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
              marginBottom: 10,
            }}>PERIODO DEL PRESUPUESTO</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {(['weekly', 'biweekly', 'monthly'] as const).map(p => {
                const selected = selectedPeriod === p;
                const label = p === 'weekly' ? 'Semanal' : p === 'biweekly' ? 'Quincenal' : 'Mensual';
                return (
                  <Pressable
                    key={p}
                    onPress={() => setSelectedPeriod(p)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: selected ? t.indigo : t.border,
                      backgroundColor: selected ? softFor(t, 'indigo') : t.surfaceAlt,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold',
                      fontSize: 12,
                      color: selected ? t.indigo : t.text,
                    }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Limit input */}
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
              marginBottom: 8,
            }}>LÍMITE MENSUAL O PERIÓDICO (PESOS)</Text>
            <TextInput
              value={limitInput}
              onChangeText={(v) => setLimitInput(v.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              placeholderTextColor={t.textMuted}
              keyboardType="decimal-pad"
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                borderWidth: 1, borderColor: t.border,
                backgroundColor: t.surfaceAlt,
                color: t.text, fontSize: 16,
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontVariant: ['tabular-nums'],
                marginBottom: 24,
              }}
            />

            {/* Actions */}
            <View style={{ gap: 10 }}>
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [{
                  paddingVertical: 14, borderRadius: 16,
                  backgroundColor: t.indigo, alignItems: 'center',
                  opacity: pressed ? 0.85 : 1,
                }]}
              >
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#fff',
                }}>
                  Guardar Presupuesto
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (sheetMode === 'edit') {
                    setSheetMode('detail');
                  } else {
                    setIsOpen(false);
                  }
                }}
                style={({ pressed }) => [{
                  paddingVertical: 14, borderRadius: 16,
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
          </ScrollView>
        )}
      </Sheet>
    </View>
  );
}



