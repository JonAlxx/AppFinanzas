import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View, Modal, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { fmtMXN, fmtShort } from '../data/format';
import { monthlySeries, CategorySpend } from '../data/selectors';
import { catById } from '../data/catalog';
import { Category } from '../data/types';
import { useAppState } from '../state/AppStateContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';
import { useNavigation } from '../navigation/NavigationContext';

import { CategoryBadge } from '../components/Badges';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { DonutChart } from '../components/DonutChart';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { Icon } from '../icons/Icon';
import { TransactionRow } from '../components/TransactionRow';

const MONTHS_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const MONTHS_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
];
const DAYS_OF_WEEK = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function Legend({ dot, label }: { dot: string; label: string }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <Text style={{
        fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.textMuted,
      }}>{label}</Text>
    </View>
  );
}

export function ReportsScreen() {
  const { t } = useTheme();
  const { state } = useAppState();
  const { navigate } = useNavigation();

  const [rangeType, setRangeType] = useState<'preset' | 'custom'>('preset');
  const [range, setRange] = useState(30);
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Category detail modal state
  const [selectedCategory, setSelectedCategory] = useState<CategorySpend | null>(null);
  const [showCategoryDetail, setShowCategoryDetail] = useState(false);

  // Carousel states
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = screenWidth - 32;

  // Selected bar chart point index
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  const onScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / (cardWidth + 16));
    setActiveCardIndex(index);
  };

  // Calendar modal local states
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

  const handleConfirm = () => {
    if (tempStart) {
      setCustomStart(tempStart);
      setCustomEnd(tempEnd || tempStart);
      setRangeType('custom');
      setSelectedPointIndex(null); // Clear selected bar!
      setShowCalendar(false);
    }
  };

  const getCustomRangeLabel = () => {
    if (!customStart || !customEnd) return 'Personalizado 📅';
    const sDay = customStart.getDate();
    const sMonth = MONTHS_SHORT[customStart.getMonth()];
    if (customStart.toDateString() === customEnd.toDateString()) {
      return `${sDay} ${sMonth} 📅`;
    }
    const eDay = customEnd.getDate();
    const eMonth = MONTHS_SHORT[customEnd.getMonth()];
    if (customStart.getMonth() === customEnd.getMonth()) {
      return `${sDay} - ${eDay} ${sMonth} 📅`;
    }
    return `${sDay} ${sMonth} - ${eDay} ${eMonth} 📅`;
  };

  // Dynamic chart points based on selected range and granularity
  const chartPoints = useMemo(() => {
    let diffDays = range;
    if (rangeType === 'custom' && customStart && customEnd) {
      diffDays = Math.ceil((customEnd.getTime() - customStart.getTime()) / 86400000) + 1;
    }

    const points: { label: string; income: number; expense: number; dateRange?: [number, number] }[] = [];
    const NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

    if (diffDays <= 8) {
      // Daily view: Show each day individually
      let startTs = Date.now() - (diffDays - 1) * 86400000;
      if (rangeType === 'custom' && customStart) {
        const s = new Date(customStart);
        s.setHours(0, 0, 0, 0);
        startTs = s.getTime();
      }

      for (let i = 0; i < diffDays; i++) {
        const dayDate = new Date(startTs + i * 86400000);
        const dayStart = new Date(dayDate).setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayDate).setHours(23, 59, 59, 999);
        
        let inc = 0, exp = 0;
        for (const t of state.transactions) {
          if (t.date >= dayStart && t.date <= dayEnd) {
            if (t.type === 'INCOME' && t.categoryId !== 'cat-debt') inc += t.amount;
            if (t.type === 'EXPENSE') exp += t.amount;
          }
        }
        points.push({
          label: WEEKDAYS[dayDate.getDay()],
          income: inc,
          expense: exp,
          dateRange: [dayStart, dayEnd]
        });
      }
    } else if (diffDays <= 31) {
      // Weekly view: Group into 4 weeks
      let startTs = Date.now() - 30 * 86400000;
      if (rangeType === 'custom' && customStart && customEnd) {
        startTs = customStart.getTime();
      }
      const segmentDays = Math.ceil(diffDays / 4);

      for (let i = 0; i < 4; i++) {
        const weekStart = startTs + i * segmentDays * 86400000;
        const weekEnd = Math.min(
          startTs + (i + 1) * segmentDays * 86400000 - 1,
          rangeType === 'custom' && customEnd ? customEnd.getTime() : Date.now()
        );
        
        let inc = 0, exp = 0;
        for (const t of state.transactions) {
          if (t.date >= weekStart && t.date <= weekEnd) {
            if (t.type === 'INCOME' && t.categoryId !== 'cat-debt') inc += t.amount;
            if (t.type === 'EXPENSE') exp += t.amount;
          }
        }
        
        points.push({
          label: `Sem ${i + 1}`,
          income: inc,
          expense: exp,
          dateRange: [weekStart, weekEnd]
        });
      }
    } else {
      // Monthly view: Group by months
      let start = new Date();
      start.setMonth(start.getMonth() - 5); // Default 6 months
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      let endTs = Date.now();

      if (rangeType === 'custom' && customStart && customEnd) {
        start = new Date(customStart);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        endTs = customEnd.getTime();
      }

      const cur = new Date(start);
      while (cur.getTime() <= endTs) {
        const mStart = new Date(cur.getFullYear(), cur.getMonth(), 1).getTime();
        const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

        let inc = 0, exp = 0;
        for (const t of state.transactions) {
          if (t.date >= mStart && t.date <= mEnd) {
            if (t.type === 'INCOME' && t.categoryId !== 'cat-debt') inc += t.amount;
            if (t.type === 'EXPENSE') exp += t.amount;
          }
        }

        points.push({
          label: NAMES[cur.getMonth()],
          income: inc,
          expense: exp,
          dateRange: [mStart, mEnd]
        });

        cur.setMonth(cur.getMonth() + 1);
      }
    }

    return points;
  }, [state.transactions, range, rangeType, customStart, customEnd]);

  // Filter transactions based on selected range (and sub-filter on clicked bar)
  const filteredTxs = useMemo(() => {
    let since = 0;
    let until = Date.now();

    if (rangeType === 'preset') {
      since = Date.now() - range * 86400000;
    } else if (customStart) {
      const s = new Date(customStart);
      s.setHours(0, 0, 0, 0);
      since = s.getTime();

      const u = new Date(customEnd || customStart);
      u.setHours(23, 59, 59, 999);
      until = u.getTime();
    }

    // Restrict date boundaries if a bar chart is selected
    if (selectedPointIndex !== null && chartPoints[selectedPointIndex]) {
      const pt = chartPoints[selectedPointIndex];
      if (pt.dateRange) {
        since = pt.dateRange[0];
        until = pt.dateRange[1];
      }
    }

    return state.transactions.filter(t => t.date >= since && t.date <= until);
  }, [state.transactions, rangeType, range, customStart, customEnd, selectedPointIndex, chartPoints]);

  // Expenses by category
  const cats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of filteredTxs) {
      if (t.type !== 'EXPENSE') continue;
      if (!t.categoryId) continue;
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    }
    return Object.entries(map)
      .map(([id, amt]) => ({ id, amount: amt, category: catById(id, state.customCategories) }))
      .filter(c => c.category?.type === 'EXPENSE')
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTxs, state.customCategories]);

  // Incomes by category
  const incomeCats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of filteredTxs) {
      if (t.type !== 'INCOME') continue;
      if (!t.categoryId) continue;
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    }
    return Object.entries(map)
      .map(([id, amt]) => ({ id, amount: amt, category: catById(id, state.customCategories) }))
      .filter(c => c.category?.type === 'INCOME')
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTxs, state.customCategories]);

  // Filtered transactions of selected category
  const categoryTxs = useMemo(() => {
    if (!selectedCategory) return [];
    return filteredTxs.filter(t => t.categoryId === selectedCategory.id && t.type === selectedCategory.category?.type);
  }, [filteredTxs, selectedCategory]);

  const totalExp = cats.reduce((s, c) => s + c.amount, 0);
  const totalInc = incomeCats.reduce((s, c) => s + c.amount, 0);
  const diffDays = rangeType === 'custom' && customStart && customEnd
    ? Math.ceil((customEnd.getTime() - customStart.getTime()) / 86400000) + 1
    : range;

  const maxVal = Math.max(...chartPoints.flatMap(pt => [pt.income, pt.expense]), 1);

  // MÓDULO B: Inteligencia Financiera y Proyección de Fin de Mes
  const intelligence = useMemo(() => {
    // 1. Proyección de Fin de Mes (Cash Flow Forecast)
    // Obtener balance disponible en cuentas líquidas (Efectivo y Débito)
    const liquidAccounts = state.accounts.filter(a => a.type !== 'CREDIT_CARD');
    const currentLiquidBalance = liquidAccounts.reduce((sum, acc) => {
      let bal = acc.initial;
      for (const t of state.transactions) {
        if (t.type === 'INCOME' && t.accountId === acc.id) bal += t.amount;
        if (t.type === 'EXPENSE' && t.accountId === acc.id) bal -= t.amount;
        if (t.type === 'TRANSFER') {
          if (t.accountId === acc.id) bal -= t.amount;
          if (t.destinationAccountId === acc.id) bal += t.amount;
        }
      }
      return sum + bal;
    }, 0);

    // Calcular días restantes en el mes actual
    const now = new Date();
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = totalDaysInMonth - now.getDate();

    // Sumar cobros/pagos recurrentes pendientes que vencen en lo que resta del mes
    const endOfMonthTs = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    let pendingRecurringExpenses = 0;
    let pendingRecurringIncomes = 0;

    for (const rule of state.recurring) {
      if (!rule.active) continue;
      // Estimar fecha de vencimiento siguiente
      const nextDue = rule.startDate; // Simplificación o estimación aproximada en el mes
      if (nextDue > Date.now() && nextDue <= endOfMonthTs) {
        if (rule.type === 'EXPENSE') pendingRecurringExpenses += rule.amount;
        if (rule.type === 'INCOME') pendingRecurringIncomes += rule.amount;
      }
    }

    // Estimar gasto promedio diario del mes actual
    const startOfMonthTs = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
    const monthTxs = state.transactions.filter(t => t.date >= startOfMonthTs && t.date <= Date.now());
    const monthExpenses = monthTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const daysPassed = Math.max(1, now.getDate());
    const dailySpendRate = monthExpenses / daysPassed;

    // Proyección de gastos discrecionales restantes
    const projectedDiscretionarySpend = dailySpendRate * daysRemaining;

    // Balance proyectado al cierre de mes
    const projectedBalance = currentLiquidBalance + pendingRecurringIncomes - pendingRecurringExpenses - projectedDiscretionarySpend;

    // 2. Diagnóstico de Presupuestos y Capacidad de "Darle un gusto"
    const totalBudgetLimit = state.budgets.reduce((sum, b) => sum + b.limit, 0);
    let totalSpentInBudgets = 0;
    
    for (const b of state.budgets) {
      const spent = state.transactions
        .filter(t => t.type === 'EXPENSE' && t.categoryId === b.categoryId && t.date >= startOfMonthTs)
        .reduce((sum, t) => sum + t.amount, 0);
      totalSpentInBudgets += spent;
    }

    const budgetRatio = totalBudgetLimit > 0 ? totalSpentInBudgets / totalBudgetLimit : 0;
    
    // Decidir si puede darse un gusto (ej. compras de ocio/caprichos)
    // Criterio: Balance proyectado positivo, y ha consumido menos del 85% de su presupuesto total
    let luxuryStatus: 'green' | 'yellow' | 'red' = 'green';
    let luxuryMessage = '';
    let luxurySub = '';

    if (projectedBalance <= 0 || budgetRatio >= 1.0) {
      luxuryStatus = 'red';
      luxuryMessage = '🚨 ALERTA: Momento de frenar gastos';
      luxurySub = 'Tu proyección de fin de mes es negativa o excediste tus presupuestos. Evita gastos innecesarios por ahora.';
    } else if (budgetRatio >= 0.8 || projectedBalance < currentLiquidBalance * 0.2) {
      luxuryStatus = 'yellow';
      luxuryMessage = '⚠️ PRECAUCIÓN: Procede con cuidado';
      luxurySub = 'Tienes poco margen libre. Si deseas darte un gusto, asegúrate de que sea menor a ' + fmtMXN(Math.max(0, projectedBalance * 0.1));
    } else {
      luxuryStatus = 'green';
      luxuryMessage = '🎉 ¡Buen camino! Tienes margen libre';
      luxurySub = 'Tus finanzas están sanas. Tienes un presupuesto estimado libre de ' + fmtMXN(Math.max(0, projectedBalance * 0.3)) + ' para gustos o caprichos.';
    }

    // 3. Consejos Inteligentes (Tips Contextuales)
    const tips: { id: string; icon: string; title: string; desc: string; color: string; nav?: any }[] = [];
    
    // Tip 1: Presupuesto Individual más consumido
    let worstBudgetCategory: Category | null = null;
    let worstRatio = 0;
    let worstSpent = 0;
    let worstLimit = 0;

    for (const b of state.budgets) {
      const spent = state.transactions
        .filter(t => t.type === 'EXPENSE' && t.categoryId === b.categoryId && t.date >= startOfMonthTs)
        .reduce((sum, t) => sum + t.amount, 0);
      const ratio = b.limit > 0 ? spent / b.limit : 0;
      if (ratio > worstRatio) {
        worstRatio = ratio;
        worstSpent = spent;
        worstLimit = b.limit;
        worstBudgetCategory = catById(b.categoryId, state.customCategories) || null;
      }
    }

    if (worstBudgetCategory && worstRatio >= 0.75) {
      const roundedPct = Math.round(worstRatio * 100);
      tips.push({
        id: 'tip-budget',
        icon: 'alert',
        title: `Presupuesto de ${worstBudgetCategory.name} al ${roundedPct}%`,
        desc: `Has consumido ${fmtMXN(worstSpent)} de tu límite de ${fmtMXN(worstLimit)}. Te sugerimos limitar esta categoría a máximo ${fmtMXN(Math.round((worstLimit - worstSpent) / Math.max(1, daysRemaining)))} diarios.`,
        color: worstRatio >= 1.0 ? 'rose' : 'orange',
        nav: { screen: 'budgets' },
      });
    }

    // Tip 2: Intereses de tarjeta de crédito
    const highInterestCards = state.accounts.filter(a => a.type === 'CREDIT_CARD' && (a.interestRate || 0) > 40);
    if (highInterestCards.length > 0) {
      const card = highInterestCards[0];
      tips.push({
        id: 'tip-interest',
        icon: 'trending-up',
        title: `Evita intereses en tu tarjeta ${card.name}`,
        desc: `Tiene una tasa anual registrada del ${card.interestRate}%. Liquidar el "saldo al corte" antes de tu fecha límite te ahorrará recargos costosos.`,
        color: 'rose',
        nav: { screen: 'account-detail', id: card.id },
      });
    }

    // Tip 3: Consejo de ahorro general
    if (projectedBalance > 0 && currentLiquidBalance > 0) {
      const potentialSavings = Math.round(projectedBalance * 0.5);
      tips.push({
        id: 'tip-savings',
        icon: 'target',
        title: 'Potencia tu Meta de Ahorro',
        desc: `Si mantienes tu ritmo de gasto actual, podrías mandar hasta ${fmtMXN(potentialSavings)} a tus metas de ahorro al terminar el mes.`,
        color: 'green',
        nav: { screen: 'goals' },
      });
    }

    return {
      currentLiquidBalance,
      daysRemaining,
      projectedBalance,
      budgetRatio,
      luxuryStatus,
      luxuryMessage,
      luxurySub,
      tips,
    };
  }, [state.accounts, state.transactions, state.budgets, state.recurring, state.customCategories]);

  const yAxisLabels = useMemo(() => {
    return [maxVal, maxVal * 0.66, maxVal * 0.33, 0];
  }, [maxVal]);

  const formatYLabel = (val: number) => {
    if (val === 0) return '$0';
    return fmtShort(val);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader subtitle="Tu" title="Análisis" rightIcon={null} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip active={rangeType === 'preset' && range === 7} onPress={() => { setRangeType('preset'); setRange(7); setSelectedPointIndex(null); }}>7 días</Chip>
          <Chip active={rangeType === 'preset' && range === 30} onPress={() => { setRangeType('preset'); setRange(30); setSelectedPointIndex(null); }}>30 días</Chip>
          <Chip active={rangeType === 'preset' && range === 90} onPress={() => { setRangeType('preset'); setRange(90); setSelectedPointIndex(null); }}>90 días</Chip>
          <Chip 
            active={rangeType === 'custom'} 
            onPress={() => {
              setTempStart(customStart);
              setTempEnd(customEnd);
              setCalendarMonth(customStart || new Date());
              setShowCalendar(true);
            }}
          >
            {getCustomRangeLabel()}
          </Chip>
        </View>

        {/* Dynamic / Interactive Bar Chart with Y-Axis and Grid Lines */}
        <Card>
          <View>
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12.5, color: t.text,
            }}>
              {selectedPointIndex !== null && chartPoints[selectedPointIndex]
                ? `Filtrado por: ${chartPoints[selectedPointIndex].label.toUpperCase()} (Toca de nuevo para limpiar)`
                : `Ingreso vs Gasto · ${diffDays <= 8 ? `${diffDays} días` : diffDays <= 31 ? 'Semanas' : 'Meses'}`}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
              <Legend dot={t.green} label="Ingresos" />
              <Legend dot={t.rose} label="Gastos" />
            </View>
          </View>

          {/* Tooltip: Exact dollar details when a bar is selected */}
          {selectedPointIndex !== null && chartPoints[selectedPointIndex] && (() => {
            const pt = chartPoints[selectedPointIndex];
            return (
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                backgroundColor: t.surfaceAlt, 
                borderRadius: 16, 
                paddingVertical: 12,
                marginTop: 12,
                borderWidth: 1,
                borderColor: t.border
              }}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.textMuted, letterSpacing: 0.2 }}>INGRESOS</Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.green, marginTop: 4, fontVariant: ['tabular-nums'] }}>{fmtMXN(pt.income)}</Text>
                </View>
                <View style={{ width: 1.5, backgroundColor: t.border, height: 26 }} />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.textMuted, letterSpacing: 0.2 }}>GASTOS</Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.rose, marginTop: 4, fontVariant: ['tabular-nums'] }}>{fmtMXN(pt.expense)}</Text>
                </View>
              </View>
            );
          })()}

          {/* Main Chart Row: Y-Axis + Bars Container */}
          <View style={{ flexDirection: 'row', marginTop: 20 }}>
            {/* Y-Axis Column (Dollar Values) */}
            <View style={{ 
              width: 48, 
              height: 110, 
              justifyContent: 'space-between', 
              alignItems: 'flex-end', 
              paddingRight: 10,
              paddingVertical: 1 // align text with grid lines
            }}>
              {yAxisLabels.map((val, idx) => (
                <Text key={idx} style={{ 
                  fontFamily: 'PlusJakartaSans_600SemiBold', 
                  fontSize: 9.5, 
                  color: t.textMuted 
                }}>
                  {formatYLabel(val)}
                </Text>
              ))}
            </View>

            {/* Chart Area with Grid Lines and Bars */}
            <View style={{ 
              flex: 1, 
              height: 110, 
              position: 'relative',
              borderLeftWidth: 2,
              borderBottomWidth: 2,
              borderLeftColor: '#3E435E',
              borderBottomColor: '#3E435E',
            }}>
              {/* Background Horizontal Grid Lines */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' }}>
                {[0, 1, 2, 3].map((idx) => (
                  <View 
                    key={idx} 
                    style={{ 
                      height: 1, 
                      backgroundColor: idx === 3 ? 'transparent' : t.border + '15' as any, 
                      width: '100%' 
                    }} 
                  />
                ))}
              </View>

              {/* Bars Row */}
              <View style={{
                flexDirection: 'row', alignItems: 'flex-end',
                gap: 8, height: 108, width: '100%',
                paddingLeft: 4,
                paddingRight: 4,
              }}>
                {chartPoints.map((pt, i) => {
                  const maxBarHeight = 92;
                  const hi = Math.max(2, (pt.income / maxVal) * maxBarHeight);
                  const he = Math.max(2, (pt.expense / maxVal) * maxBarHeight);
                  const isSelected = selectedPointIndex === i;
                  const anySelected = selectedPointIndex !== null;
                  const barOpacity = anySelected ? (isSelected ? 1 : 0.35) : 1;

                  return (
                    <Pressable 
                      key={i} 
                      onPress={() => {
                        setSelectedPointIndex(selectedPointIndex === i ? null : i);
                      }}
                      style={{ 
                        flex: 1, 
                        alignItems: 'center', 
                        height: 108,
                        justifyContent: 'flex-end',
                        opacity: barOpacity,
                        backgroundColor: isSelected ? t.indigo + '15' : 'transparent',
                        borderRadius: 6,
                      }}
                    >
                      <View style={{
                        flexDirection: 'row', alignItems: 'flex-end', gap: 3,
                        height: 108, width: '100%', justifyContent: 'center',
                        paddingBottom: 2
                      }}>
                        <View style={{ width: '42%', height: hi, borderTopLeftRadius: 4, borderTopRightRadius: 4, overflow: 'hidden' }}>
                          <LinearGradient
                            colors={[t.green, t.green + '80' as any]}
                            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                            style={{ flex: 1 }}
                          />
                        </View>
                        <View style={{ width: '42%', height: he, borderTopLeftRadius: 4, borderTopRightRadius: 4, overflow: 'hidden' }}>
                          <LinearGradient
                            colors={[t.rose, t.rose + '80' as any]}
                            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                            style={{ flex: 1 }}
                          />
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* X-Axis Labels Row (Aligned with Chart Area) */}
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            {/* Left Pad matching Y-Axis column width + border offset */}
            <View style={{ width: 50 }} />
            
            {/* X-Axis Labels */}
            <View style={{ flex: 1, flexDirection: 'row', gap: 8, paddingLeft: 4, paddingRight: 4 }}>
              {chartPoints.map((pt, i) => {
                const isSelected = selectedPointIndex === i;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{
                      fontFamily: isSelected ? 'PlusJakartaSans_800ExtraBold' : 'PlusJakartaSans_600SemiBold', 
                      fontSize: 9.5, 
                      color: isSelected ? t.indigo : t.textMuted,
                      textTransform: 'uppercase',
                    }}>{pt.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Card>

        {/* Carousel ScrollView for Gastos and Ingresos */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 14 }}
          snapToInterval={cardWidth + 16}
          decelerationRate="fast"
          snapToAlignment="center"
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 5 }}
        >
          {/* GASTOS CARD */}
          <Card style={{ width: cardWidth, marginTop: 0, marginRight: 16 }}>
            <Text style={{
              fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
            }}>Gasto por categoría</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
              <DonutChart
                segments={cats.map(c => ({
                  value: c.amount,
                  color: colorFor(t, c.category?.color || 'indigo'),
                }))}
                total={totalExp}
                centerLabel={fmtShort(totalExp)}
                centerSub="total"
              />
              <View style={{ flex: 1, gap: 8 }}>
                {cats.slice(0, 4).map(c => {
                  const pct = totalExp > 0 ? (c.amount / totalExp) * 100 : 0;
                  return (
                    <Pressable 
                      key={c.id} 
                      onPress={() => {
                        setSelectedCategory(c);
                        setShowCategoryDetail(true);
                      }}
                      style={({ pressed }) => ({
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        gap: 8,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <View style={{
                        width: 8, height: 8, borderRadius: 4,
                        backgroundColor: colorFor(t, c.category?.color || 'indigo'),
                      }} />
                      <Text numberOfLines={1} style={{
                        flex: 1,
                        fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.text,
                      }}>{c.category?.name}</Text>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                        fontVariant: ['tabular-nums'],
                      }}>{pct.toFixed(0)}%</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {cats.length > 0 ? (
              <View style={{
                marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: t.border,
                gap: 12,
              }}>
                {cats.slice(0, 6).map(c => (
                  <Pressable 
                    key={c.id} 
                    onPress={() => {
                      setSelectedCategory(c);
                      setShowCategoryDetail(true);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <CategoryBadge cat={c.category} size={36} radius={11} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text,
                        }}>{c.category?.name}</Text>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text,
                          fontVariant: ['tabular-nums'],
                        }}>{fmtMXN(c.amount)}</Text>
                      </View>
                      <ProgressBar pct={(c.amount / cats[0].amount) * 100} color={c.category?.color} height={5} />
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={{
                fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: t.textMuted,
                textAlign: 'center', marginTop: 24, marginBottom: 12,
              }}>
                No hay gastos en este periodo.
              </Text>
            )}
          </Card>

          {/* INGRESOS CARD */}
          <Card style={{ width: cardWidth, marginTop: 0 }}>
            <Text style={{
              fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
            }}>Ingreso por categoría</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
              <DonutChart
                segments={incomeCats.map(c => ({
                  value: c.amount,
                  color: colorFor(t, c.category?.color || 'green'),
                }))}
                total={totalInc}
                centerLabel={fmtShort(totalInc)}
                centerSub="total"
              />
              <View style={{ flex: 1, gap: 8 }}>
                {incomeCats.slice(0, 4).map(c => {
                  const pct = totalInc > 0 ? (c.amount / totalInc) * 100 : 0;
                  return (
                    <Pressable 
                      key={c.id} 
                      onPress={() => {
                        setSelectedCategory(c);
                        setShowCategoryDetail(true);
                      }}
                      style={({ pressed }) => ({
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        gap: 8,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <View style={{
                        width: 8, height: 8, borderRadius: 4,
                        backgroundColor: colorFor(t, c.category?.color || 'green'),
                      }} />
                      <Text numberOfLines={1} style={{
                        flex: 1,
                        fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.text,
                      }}>{c.category?.name}</Text>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                        fontVariant: ['tabular-nums'],
                      }}>{pct.toFixed(0)}%</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {incomeCats.length > 0 ? (
              <View style={{
                marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: t.border,
                gap: 12,
              }}>
                {incomeCats.slice(0, 6).map(c => (
                  <Pressable 
                    key={c.id} 
                    onPress={() => {
                      setSelectedCategory(c);
                      setShowCategoryDetail(true);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <CategoryBadge cat={c.category} size={36} radius={11} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text,
                        }}>{c.category?.name}</Text>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text,
                          fontVariant: ['tabular-nums'],
                        }}>{fmtMXN(c.amount)}</Text>
                      </View>
                      <ProgressBar pct={(c.amount / incomeCats[0].amount) * 100} color={c.category?.color || 'green'} height={5} />
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={{
                fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: t.textMuted,
                textAlign: 'center', marginTop: 24, marginBottom: 12,
              }}>
                No hay ingresos en este periodo.
              </Text>
            )}
          </Card>
        </ScrollView>

        {/* Carousel Pagination Dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8, marginBottom: 14 }}>
          <View style={{ width: activeCardIndex === 0 ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: activeCardIndex === 0 ? t.indigo : t.border }} />
          <View style={{ width: activeCardIndex === 1 ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: activeCardIndex === 1 ? t.indigo : t.border }} />
        </View>



        {/* MÓDULO B: Consejos Financieros Inteligentes (Tips) */}
        {intelligence.tips.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text, letterSpacing: -0.2, marginBottom: 10, paddingLeft: 4 }}>
              Consejos Inteligentes 💡
            </Text>
            <View style={{ gap: 10 }}>
              {intelligence.tips.map((tip) => (
                <Card 
                  key={tip.id} 
                  padding={12} 
                  style={{ marginTop: 0, borderWidth: 1, borderColor: t.border }}
                  onPress={tip.nav ? () => navigate(tip.nav) : undefined}
                >
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{ 
                      width: 28, height: 28, borderRadius: 9, 
                      backgroundColor: softFor(t, tip.color), 
                      alignItems: 'center', justifyContent: 'center' 
                    }}>
                      <Icon 
                        name={tip.icon} 
                        size={14} 
                        color={colorFor(t, tip.color)} 
                        strokeWidth={2.5} 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text }}>
                        {tip.title}
                      </Text>
                      <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.textMuted, marginTop: 4, lineHeight: 15 }}>
                        {tip.desc}
                      </Text>
                    </View>
                    {tip.nav && (
                      <View style={{ alignSelf: 'center', opacity: 0.5, paddingLeft: 4 }}>
                        <Icon name="chevron-right" size={14} color={t.textMuted} />
                      </View>
                    )}
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

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
                  : `Solo el ${tempStart.getDate()} de ${MONTHS_FULL[tempStart.getMonth()]}`)
                : 'Selecciona una fecha de inicio'}
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
                
                const isSingle = isStart && (!tempEnd || tempStart.toDateString() === tempEnd.toDateString());
                
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
                      borderTopLeftRadius: isStart || (!tempEnd && isStart) ? 20 : (inRange ? 0 : 0),
                      borderBottomLeftRadius: isStart || (!tempEnd && isStart) ? 20 : (inRange ? 0 : 0),
                      borderTopRightRadius: isEnd || (!tempEnd && isStart) ? 20 : (inRange ? 0 : 0),
                      borderBottomRightRadius: isEnd || (!tempEnd && isStart) ? 20 : (inRange ? 0 : 0),
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
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable 
                onPress={() => {
                  setTempStart(new Date());
                  setTempEnd(null);
                  setCalendarMonth(new Date());
                }}
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#242736' }}
              >
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#fff' }}>Hoy</Text>
              </Pressable>
              
              <Pressable 
                onPress={() => {
                  setTempStart(null);
                  setTempEnd(null);
                }}
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#242736' }}
              >
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#fff' }}>Limpiar</Text>
              </Pressable>

              <View style={{ flex: 1 }} />

              <Pressable 
                onPress={() => setShowCalendar(false)}
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 }}
              >
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.textMuted }}>Cancelar</Text>
              </Pressable>

              <Pressable 
                onPress={handleConfirm}
                disabled={!tempStart}
                style={{ 
                  paddingVertical: 10, 
                  paddingHorizontal: 18, 
                  borderRadius: 12, 
                  backgroundColor: tempStart ? t.indigo : '#242736',
                  opacity: tempStart ? 1 : 0.5
                }}
              >
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#fff' }}>Aplicar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Category Detail Modal */}
      <Modal visible={showCategoryDetail} transparent animationType="slide" onRequestClose={() => setShowCategoryDetail(false)}>
        <Pressable 
          style={{ flex: 1, backgroundColor: 'rgba(10, 12, 22, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
          onPress={() => setShowCategoryDetail(false)}
        >
          <Pressable 
            style={{ 
              width: '100%', 
              height: '70%', 
              backgroundColor: t.surface, 
              borderRadius: 24, 
              padding: 20, 
              borderWidth: 1, 
              borderColor: t.border, 
              shadowColor: '#000', 
              shadowOffset: { width: 0, height: 10 }, 
              shadowOpacity: 0.2, 
              shadowRadius: 20, 
              elevation: 10 
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedCategory && (
              <View style={{ flex: 1 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <CategoryBadge cat={selectedCategory.category} size={40} radius={12} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text }}>
                      {selectedCategory.category?.name}
                    </Text>
                    <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted }}>
                      {rangeType === 'custom' ? getCustomRangeLabel().replace(' 📅', '') : `Últimos ${range} días`}
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: t.border, marginBottom: 10 }} />

                {/* Transaction List */}
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  {categoryTxs.length > 0 ? (
                    categoryTxs.map((tx, idx) => (
                      <TransactionRow 
                        key={tx.id} 
                        tx={tx} 
                        accounts={state.accounts} 
                        customCategories={state.customCategories}
                        divider={idx < categoryTxs.length - 1}
                        onPress={() => {
                          setShowCategoryDetail(false);
                          navigate({ screen: 'transaction-detail', id: tx.id });
                        }}
                      />
                    ))
                  ) : (
                    <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: t.textMuted, textAlign: 'center', marginVertical: 32 }}>
                      No hay movimientos registrados en esta categoría para el período.
                    </Text>
                  )}
                </ScrollView>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: t.border, marginVertical: 12 }} />

                {/* Footer / Total Summary */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.textMuted }}>
                    {selectedCategory.category?.type === 'INCOME' ? 'Total recibido:' : 'Total gastado:'}
                  </Text>
                  <Text style={{ 
                    fontFamily: 'PlusJakartaSans_800ExtraBold', 
                    fontSize: 18, 
                    color: selectedCategory.category?.type === 'INCOME' ? t.green : t.rose 
                  }}>
                    {fmtMXN(selectedCategory.amount)}
                  </Text>
                </View>

                {/* Close Button */}
                <Pressable 
                  onPress={() => setShowCategoryDetail(false)}
                  style={{ 
                    backgroundColor: t.indigo, 
                    paddingVertical: 12, 
                    borderRadius: 14, 
                    alignItems: 'center' 
                  }}
                >
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#fff' }}>
                    Cerrar
                  </Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

