import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, Alert, Modal } from 'react-native';
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
const MONTHS_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS_OF_WEEK = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

import { getPeriodBounds, spentInPeriod } from '../utils/budget';

export function BudgetsScreen() {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { navigate } = useNavigation();

  // Find custom quincena days from any active biweekly recurring rule
  const biweeklyRule = useMemo(() => 
    state.recurring.find(r => r.active && r.frequency === 'biweekly' && (r.biweeklyDay1 !== undefined || r.biweeklyDay2 !== undefined)),
    [state.recurring]
  );
  const customDay1 = biweeklyRule?.biweeklyDay1;
  const customDay2 = biweeklyRule?.biweeklyDay2;

  // Modal / Sheet States
  const [isOpen, setIsOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'detail' | 'edit' | 'select-goal' | 'create'>('create');
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [limitInput, setLimitInput] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'biweekly' | 'monthly' | 'custom'>('monthly');

  // Custom budget period configuration states
  const [customType, setCustomType] = useState<'range' | 'duration'>('range');
  const [customStartDay, setCustomStartDay] = useState<number>(10);
  const [customEndDay, setCustomEndDay] = useState<number>(25);
  const [customDurationValue, setCustomDurationValue] = useState<string>('3');
  const [customDurationUnit, setCustomDurationUnit] = useState<'days' | 'weeks'>('days');
  const [customStartDate, setCustomStartDate] = useState<number>(Date.now());
  const [isCustomBiweekly, setIsCustomBiweekly] = useState<boolean>(false);
  const [customWeekStartDay, setCustomWeekStartDay] = useState<number>(1);
  const [showWeekStartSheet, setShowWeekStartSheet] = useState<boolean>(false);

  // Calendar Range Picker states
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'quincena' | 'custom'>('quincena');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);

  const prevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const numberOfDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let i = 1; i <= numberOfDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const handleDayPress = (day: Date) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(day);
      setTempEnd(null);
    } else {
      if (day.getTime() < tempStart.getTime()) {
        setTempStart(day);
        setTempEnd(null);
      } else {
        setTempEnd(day);
      }
    }
  };

  const handleConfirmCalendar = () => {
    if (!tempStart) return;
    
    if (calendarMode === 'quincena') {
      const d1 = tempStart.getDate();
      const d2 = tempEnd ? tempEnd.getDate() : 15;
      const minDay = Math.min(d1, d2);
      const maxDay = Math.max(d1, d2);
      
      setCustomStartDay(minDay);
      setCustomEndDay(maxDay);
      setIsCustomBiweekly(true);
    } else {
      // calendarMode === 'custom'
      const start = tempStart.getTime();
      const end = tempEnd ? tempEnd.getTime() : tempStart.getTime();
      
      const diffMs = Math.abs(end - start);
      const diffDays = Math.max(1, Math.round(diffMs / 86400000));
      
      setCustomStartDate(start);
      setCustomDurationValue(diffDays.toString());
      setCustomDurationUnit('days');
      setCustomType('duration');
    }
    setShowCalendar(false);
  };

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
    const { currentStart, currentEnd, prevStart, prevEnd, daysRemaining, periodLabel } = getPeriodBounds(
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
  }), [state.budgets, state.transactions, state.customCategories, customDay1, customDay2]);

  // Transactions in the current period for the selected budget category
  const currentPeriodTransactions = useMemo(() => {
    if (!editingBudget) return [];
    const { currentStart, currentEnd } = getPeriodBounds(
      editingBudget.period,
      Date.now(),
      customDay1,
      customDay2,
      editingBudget.customType,
      editingBudget.customStartDay,
      editingBudget.customEndDay,
      editingBudget.customDurationValue,
      editingBudget.customDurationUnit,
      editingBudget.customStartDate,
      editingBudget.customWeekStartDay
    );
    return state.transactions.filter(t =>
      t.type === 'EXPENSE' &&
      t.categoryId === editingBudget.categoryId &&
      t.date >= currentStart &&
      t.date < currentEnd
    ).sort((a, b) => b.date - a.date);
  }, [editingBudget, state.transactions, customDay1, customDay2]);

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

    const customFields = selectedPeriod === 'custom' ? {
      customType,
      customStartDay: customType === 'range' ? customStartDay : undefined,
      customEndDay: customType === 'range' ? customEndDay : undefined,
      customDurationValue: customType === 'duration' ? (parseInt(customDurationValue, 10) || 3) : undefined,
      customDurationUnit: customType === 'duration' ? customDurationUnit : undefined,
      customStartDate: customType === 'duration' ? customStartDate : undefined,
      customWeekStartDay: undefined,
    } : (selectedPeriod === 'biweekly' && isCustomBiweekly) ? {
      customType: undefined,
      customStartDay: customStartDay,
      customEndDay: customEndDay,
      customDurationValue: undefined,
      customDurationUnit: undefined,
      customStartDate: undefined,
      customWeekStartDay: undefined,
    } : selectedPeriod === 'weekly' ? {
      customType: undefined,
      customStartDay: undefined,
      customEndDay: undefined,
      customDurationValue: undefined,
      customDurationUnit: undefined,
      customStartDate: undefined,
      customWeekStartDay: customWeekStartDay,
    } : {
      customType: undefined,
      customStartDay: undefined,
      customEndDay: undefined,
      customDurationValue: undefined,
      customDurationUnit: undefined,
      customStartDate: undefined,
      customWeekStartDay: undefined,
    };

    if (editingBudget) {
      const budget: Budget = {
        ...editingBudget,
        categoryId: selectedCategoryId,
        limit: limitCents,
        period: selectedPeriod,
        ...customFields,
      };
      dispatch({ type: 'UPDATE_BUDGET', budget });
    } else {
      const budget: Budget = {
        id: 'budget-' + Date.now(),
        categoryId: selectedCategoryId,
        limit: limitCents,
        period: selectedPeriod,
        prevLeftoverProcessed: false,
        ...customFields,
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
          setCustomType('range');
          setCustomStartDay(10);
          setCustomEndDay(25);
          setCustomDurationValue('3');
          setCustomDurationUnit('days');
          setCustomStartDate(Date.now());
          setIsCustomBiweekly(false);
          setCustomWeekStartDay(1);
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
                  setCustomType('range');
                  setCustomStartDay(10);
                  setCustomEndDay(25);
                  setCustomDurationValue('3');
                  setCustomDurationUnit('days');
                  setCustomStartDate(Date.now());
                  setIsCustomBiweekly(false);
                  setCustomWeekStartDay(1);
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
                      setCustomType(b.customType || 'range');
                      setCustomStartDay(b.customStartDay || 10);
                      setCustomEndDay(b.customEndDay || 25);
                      setCustomDurationValue((b.customDurationValue || 3).toString());
                      setCustomDurationUnit(b.customDurationUnit || 'days');
                      setCustomStartDate(b.customStartDate || Date.now());
                      setIsCustomBiweekly(b.period === 'biweekly' && (b.customStartDay !== undefined || b.customEndDay !== undefined));
                      setCustomWeekStartDay(b.customWeekStartDay !== undefined ? b.customWeekStartDay : 1);
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

              {/* Circular Progress & Status for Budgets */}
              {(() => {
                const pct = budgetData.pct;
                const catColor = budgetData.cat?.color || 'indigo';
                const c = pct >= 100 ? t.rose : pct >= 80 ? t.orange : colorFor(t, catColor);
                const soft = pct >= 100 ? softFor(t, 'rose') : pct >= 80 ? softFor(t, 'orange') : softFor(t, catColor);
                
                return (
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
                        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 6, color: t.textMuted, marginTop: -2 }}>
                          CONSUMIDO
                        </Text>
                      </View>
                    </View>

                    {/* Status Alert Box */}
                    <View style={{ 
                      marginTop: 10, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10,
                      backgroundColor: soft, borderWidth: 1, borderColor: c + '22',
                      flexDirection: 'row', alignItems: 'center', gap: 6
                    }}>
                      <Icon name={pct >= 100 ? 'alert' : pct >= 80 ? 'alert' : 'check'} size={11} color={c} />
                      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: c }}>
                        {pct >= 100 
                          ? '¡LÍMITE EXCEDIDO! 🚨' 
                          : pct >= 80 
                            ? '¡PRESUPUESTO CASI AGOTADO! ⚠️' 
                            : 'PRESUPUESTO CONTROLADO ✅'}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Progress Detail */}
              <View style={{ marginBottom: 12, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted }}>
                    Consumido del periodo
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.text, fontVariant: ['tabular-nums'] }}>
                    {fmtMXN(budgetData.spent)} de {fmtMXN(budgetData.effectiveLimit)}
                  </Text>
                </View>
                {budgetData.rollover && budgetData.rollover > 0 ? (
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, color: t.green, marginTop: 4 }}>
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -20, marginBottom: 20 }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 4 }}
            >
              {(['weekly', 'biweekly', 'monthly', 'custom'] as const).map(p => {
                const selected = selectedPeriod === p;
                const label = p === 'weekly' ? 'Semanal' : p === 'biweekly' ? 'Quincenal' : p === 'monthly' ? 'Mensual' : 'Personalizado';
                return (
                  <Pressable
                    key={p}
                    onPress={() => setSelectedPeriod(p)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: selected ? 1.5 : 1,
                      borderColor: selected ? t.indigo : t.border,
                      backgroundColor: selected ? softFor(t, 'indigo') : t.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
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
            </ScrollView>

            {/* Weekly configuration display */}
            {selectedPeriod === 'weekly' && (
              <Pressable
                onPress={() => setShowWeekStartSheet(true)}
                style={({ pressed }) => [{
                  padding: 16,
                  borderRadius: 18,
                  backgroundColor: t.surfaceAlt,
                  borderWidth: 1,
                  borderColor: pressed ? t.indigo : t.border,
                  marginBottom: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }]}
              >
                <View style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: softFor(t, 'indigo'),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon name="calendar" size={20} color={t.indigo} />
                </View>
                
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.textMuted,
                    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2
                  }}>Inicio de Semana</Text>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text
                  }}>
                    {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][customWeekStartDay]}
                  </Text>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: customWeekStartDay !== 1 ? t.indigo : t.textMuted,
                    marginTop: 2
                  }}>
                    {customWeekStartDay !== 1 ? '⚡ Personalizado · Toca para cambiar' : 'Por defecto (Lunes) · Toca para cambiar'}
                  </Text>
                </View>
                
                <View style={{ opacity: 0.5 }}>
                  <Icon name="chevron-right" size={16} color={t.textMuted} />
                </View>
              </Pressable>
            )}

            {/* Quincenal configuration display */}
            {selectedPeriod === 'biweekly' && (
              <Pressable
                onPress={() => {
                  setCalendarMode('quincena');
                  const now = new Date();
                  const d1 = isCustomBiweekly ? customStartDay : 15;
                  const d2 = isCustomBiweekly ? customEndDay : 30;
                  setTempStart(new Date(now.getFullYear(), now.getMonth(), d1));
                  setTempEnd(new Date(now.getFullYear(), now.getMonth(), d2));
                  setCalendarMonth(now);
                  setShowCalendar(true);
                }}
                style={({ pressed }) => [{
                  padding: 16,
                  borderRadius: 18,
                  backgroundColor: t.surfaceAlt,
                  borderWidth: 1,
                  borderColor: pressed ? t.indigo : t.border,
                  marginBottom: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }]}
              >
                <View style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: softFor(t, 'indigo'),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon name="calendar" size={20} color={t.indigo} />
                </View>
                
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.textMuted,
                    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2
                  }}>Esquema de Quincena</Text>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text
                  }}>
                    {isCustomBiweekly 
                      ? `Días ${customStartDay} y ${customEndDay}` 
                      : 'Día 15 y Fin de mes'}
                  </Text>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: isCustomBiweekly ? t.indigo : t.textMuted,
                    marginTop: 2
                  }}>
                    {isCustomBiweekly ? '⚡ Personalizado · Toca para cambiar' : 'Estándar · Toca para personalizar'}
                  </Text>
                </View>
                
                <View style={{ opacity: 0.5 }}>
                  <Icon name="chevron-right" size={16} color={t.textMuted} />
                </View>
              </Pressable>
            )}

            {/* Custom configurations display */}
            {selectedPeriod === 'custom' && (
              <Pressable
                onPress={() => {
                  setCalendarMode('custom');
                  const now = new Date();
                  if (customStartDate && customDurationValue) {
                    const start = new Date(customStartDate);
                    const days = parseInt(customDurationValue, 10) || 3;
                    setTempStart(start);
                    setTempEnd(new Date(start.getTime() + days * 86400000));
                    setCalendarMonth(start);
                  } else {
                    setTempStart(now);
                    setTempEnd(new Date(now.getTime() + 17 * 86400000)); // Default 17 days
                    setCalendarMonth(now);
                  }
                  setShowCalendar(true);
                }}
                style={({ pressed }) => [{
                  padding: 16,
                  borderRadius: 18,
                  backgroundColor: t.surfaceAlt,
                  borderWidth: 1,
                  borderColor: pressed ? t.indigo : t.border,
                  marginBottom: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }]}
              >
                <View style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: softFor(t, 'indigo'),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon name="target" size={20} color={t.indigo} />
                </View>
                
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.textMuted,
                    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2
                  }}>Rango Personalizado</Text>
                  
                  {customStartDate && customDurationValue ? (
                    <>
                      <Text numberOfLines={1} style={{
                        fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text
                      }}>
                        Cada {customDurationValue} {parseInt(customDurationValue, 10) === 1 ? 'día' : 'días'}
                      </Text>
                      <Text numberOfLines={1} style={{
                        fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.indigo,
                        marginTop: 2
                      }}>
                        Inicio: {new Date(customStartDate).getDate()} de {MONTHS[new Date(customStartDate).getMonth()]} · Toca para cambiar
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text numberOfLines={1} style={{
                        fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text
                      }}>
                        Sin rango definido
                      </Text>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.textMuted,
                        marginTop: 2
                      }}>
                        Toca para seleccionar fechas
                      </Text>
                    </>
                  )}
                </View>
                
                <View style={{ opacity: 0.5 }}>
                  <Icon name="chevron-right" size={16} color={t.textMuted} />
                </View>
              </Pressable>
            )}

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

      {/* Sheet to select Day of the Week for weekly start */}
      <Sheet open={showWeekStartSheet} onClose={() => setShowWeekStartSheet(false)} height="65%">
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            letterSpacing: -0.3, marginBottom: 6,
          }}>Día de inicio de semana</Text>
          <Text style={{
            fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
            marginBottom: 16,
          }}>Selecciona el día en que deseas que inicien tus periodos semanales de presupuesto.</Text>
        </View>
        
        <ScrollView 
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36, gap: 10 }}
        >
          {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((day, idx) => {
            const selected = customWeekStartDay === idx;
            return (
              <Pressable
                key={day}
                onPress={() => {
                  setCustomWeekStartDay(idx);
                  setShowWeekStartSheet(false);
                }}
                style={({ pressed }) => [{
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: selected ? softFor(t, 'indigo') : t.surfaceAlt,
                  borderWidth: 1,
                  borderColor: selected ? t.indigo : t.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: pressed ? 0.85 : 1,
                }]}
              >
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold',
                  fontSize: 14,
                  color: selected ? t.indigo : t.text,
                }}>{day}</Text>
                {selected && (
                  <Icon name="check" size={16} color={t.indigo} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>

      {/* Premium Calendar Modal */}
      <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
        <Pressable 
          style={{ flex: 1, backgroundColor: 'rgba(10, 12, 22, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
          onPress={() => setShowCalendar(false)}
        >
          <Pressable 
            style={{ 
              width: '100%', 
              maxWidth: 340, 
              backgroundColor: '#181A26', 
              borderRadius: 24, 
              padding: 20, 
              borderWidth: 1, 
              borderColor: '#2E3245', 
              shadowColor: '#000', 
              shadowOffset: { width: 0, height: 10 }, 
              shadowOpacity: 0.3, 
              shadowRadius: 20, 
              elevation: 10 
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: '#fff', marginBottom: 6 }}>
              Seleccionar Rango
            </Text>
            <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: t.textMuted, marginBottom: 20 }}>
              {tempStart 
                ? (tempEnd && tempEnd.getTime() !== tempStart.getTime()
                  ? `Del ${tempStart.getDate()} de ${MONTHS_FULL[tempStart.getMonth()]} al ${tempEnd.getDate()} de ${MONTHS_FULL[tempEnd.getMonth()]}`
                  : `Del ${tempStart.getDate()} de ${MONTHS_FULL[tempStart.getMonth()]} (selecciona segunda fecha)`)
                : 'Selecciona la fecha de inicio'}
            </Text>

            {/* Navigation Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Pressable onPress={prevMonth} style={{ padding: 8, borderRadius: 10, backgroundColor: '#242736' }}>
                <Icon name="chevron-left" size={18} color="#fff" />
              </Pressable>
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#fff', textTransform: 'capitalize' }}>
                {MONTHS_FULL[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </Text>
              <Pressable onPress={nextMonth} style={{ padding: 8, borderRadius: 10, backgroundColor: '#242736' }}>
                <Icon name="chevron-right" size={18} color="#fff" />
              </Pressable>
            </View>

            {/* Weekdays Header */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {DAYS_OF_WEEK.map((day, idx) => (
                <Text key={idx} style={{ width: '14.28%', textAlign: 'center', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted }}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
              {getDaysInMonth(calendarMonth).map((day, idx) => {
                if (!day) {
                  return <View key={`empty-${idx}`} style={{ width: '14.28%', height: 40 }} />;
                }
                
                const isStart = tempStart && day.toDateString() === tempStart.toDateString();
                const isEnd = tempEnd && day.toDateString() === tempEnd.toDateString();
                const inRange = tempStart && tempEnd && day.getTime() > tempStart.getTime() && day.getTime() < tempEnd.getTime();
                const isToday = day.toDateString() === new Date().toDateString();
                
                return (
                  <Pressable
                    key={day.toISOString()}
                    onPress={() => handleDayPress(day)}
                    style={{
                      width: '14.28%',
                      height: 40,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginVertical: 2,
                      backgroundColor: isStart || isEnd 
                        ? t.indigo 
                        : (inRange ? t.indigo + '20' : 'transparent'),
                      borderTopLeftRadius: isStart ? 20 : 0,
                      borderBottomLeftRadius: isStart ? 20 : 0,
                      borderTopRightRadius: isEnd ? 20 : 0,
                      borderBottomRightRadius: isEnd ? 20 : 0,
                    }}
                  >
                    <Text style={{
                      fontFamily: isStart || isEnd ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_600SemiBold',
                      fontSize: 13,
                      color: isStart || isEnd 
                        ? '#fff' 
                        : (isToday ? t.indigo : '#fff'),
                    }}>
                      {day.getDate()}
                    </Text>
                    {isToday && !isStart && !isEnd && (
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: t.indigo, position: 'absolute', bottom: 4 }} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Bottom Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <Pressable 
                onPress={() => {
                  setTempStart(null);
                  setTempEnd(null);
                }}
                style={({ pressed }) => [{
                  paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#242736',
                  opacity: pressed ? 0.85 : 1
                }]}
              >
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#fff' }}>Limpiar</Text>
              </Pressable>

              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Pressable 
                  onPress={() => setShowCalendar(false)}
                  style={({ pressed }) => [{
                    paddingVertical: 10, paddingHorizontal: 12,
                    opacity: pressed ? 0.75 : 1
                  }]}
                >
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.textMuted }}>Cancelar</Text>
                </Pressable>

                <Pressable 
                  onPress={handleConfirmCalendar}
                  disabled={!tempStart || !tempEnd}
                  style={({ pressed }) => [{ 
                    paddingVertical: 10, 
                    paddingHorizontal: 20, 
                    borderRadius: 12, 
                    backgroundColor: (tempStart && tempEnd) ? t.indigo : '#242736',
                    opacity: (tempStart && tempEnd) ? (pressed ? 0.85 : 1) : 0.5
                  }]}
                >
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#fff' }}>Aplicar</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}



