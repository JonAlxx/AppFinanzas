import { Budget, Transaction } from '../data/types';

// Helper to get the last day of a given month
export function getLastDayOfMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

// Helper to get period start and end bounds
export function getPeriodBounds(
  period: 'weekly' | 'biweekly' | 'monthly' | 'custom' | undefined,
  nowMs = Date.now(),
  customDay1?: number,
  customDay2?: number,
  customType?: 'range' | 'duration',
  customStartDay?: number,
  customEndDay?: number,
  customDurationValue?: number,
  customDurationUnit?: 'days' | 'weeks',
  customStartDate?: number,
  customWeekStartDay?: number
) {
  const p = period || 'monthly';
  const now = new Date(nowMs);
  
  let currentStart = 0;
  let currentEnd = 0;
  let prevStart = 0;
  let prevEnd = 0;
  let daysRemaining = 0;
  let periodLabel = '';
  
  if (p === 'weekly') {
    const startDay = customWeekStartDay !== undefined ? customWeekStartDay : 1; // Default to Monday (1)
    const currentDay = now.getDay();
    let diff = currentDay - startDay;
    if (diff < 0) diff += 7;
    
    const currStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
    currStart.setHours(0, 0, 0, 0);
    currentStart = currStart.getTime();
    
    const currEnd = new Date(currStart);
    currEnd.setDate(currEnd.getDate() + 7);
    currentEnd = currEnd.getTime();
    
    // Previous week
    const prevStartObj = new Date(currStart);
    prevStartObj.setDate(prevStartObj.getDate() - 7);
    prevStart = prevStartObj.getTime();
    prevEnd = currentStart;
    
    daysRemaining = Math.max(1, Math.ceil((currentEnd - nowMs) / 86400000));
    
    const WEEKDAYS_FULL = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    periodLabel = startDay === 1 ? 'Esta semana' : `Semana (inicia ${WEEKDAYS_FULL[startDay]})`;
  } else if (p === 'biweekly') {
    // 1. Check budget's own custom biweekly days first
    // 2. Check active recurring rule days second
    // 3. Default to 15 and 30 third (which acts as dynamic end-of-month)
    let d1 = 15;
    let d2 = 30;
    
    if (customStartDay !== undefined && customEndDay !== undefined) {
      d1 = Math.min(customStartDay, customEndDay);
      d2 = Math.max(customStartDay, customEndDay);
    } else if (customDay1 !== undefined && customDay2 !== undefined) {
      d1 = Math.min(customDay1, customDay2);
      d2 = Math.max(customDay1, customDay2);
    }
    
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();
    
    // If d2 is 30 or 31, or if it represents the end of the month, treat it dynamically
    const getActualD2 = (y: number, m: number) => {
      const lastDay = getLastDayOfMonth(y, m);
      return d2 >= 28 ? lastDay : d2;
    };
    
    const actualD2ThisMonth = getActualD2(year, month);
    
    const p1Start = new Date(year, month, d1);
    p1Start.setHours(0, 0, 0, 0);
    
    const p2Start = new Date(year, month, actualD2ThisMonth);
    p2Start.setHours(0, 0, 0, 0);
    
    if (date < d1) {
      // We are before d1. The current period started at d2 of last month and ends at d1 of this month.
      const prevMonthD2 = getActualD2(year, month - 1);
      const start = new Date(year, month - 1, prevMonthD2);
      start.setHours(0, 0, 0, 0);
      currentStart = start.getTime();
      currentEnd = p1Start.getTime();
      
      const prev = new Date(year, month - 1, d1);
      prev.setHours(0, 0, 0, 0);
      prevStart = prev.getTime();
      prevEnd = currentStart;
    } else if (date < actualD2ThisMonth) {
      // We are between d1 and d2. Current period is d1 to d2 of this month.
      currentStart = p1Start.getTime();
      currentEnd = p2Start.getTime();
      
      const prevMonthD2 = getActualD2(year, month - 1);
      const prev = new Date(year, month - 1, prevMonthD2);
      prev.setHours(0, 0, 0, 0);
      prevStart = prev.getTime();
      prevEnd = currentStart;
    } else {
      // We are on or after d2. Current period is d2 of this month to d1 of next month.
      currentStart = p2Start.getTime();
      
      const nextP1Start = new Date(year, month + 1, d1);
      nextP1Start.setHours(0, 0, 0, 0);
      currentEnd = nextP1Start.getTime();
      
      prevStart = p1Start.getTime();
      prevEnd = currentStart;
    }
    
    daysRemaining = Math.max(1, Math.ceil((currentEnd - nowMs) / 86400000));
    periodLabel = 'Esta quincena';
  } else if (p === 'custom') {
    if (customType === 'duration') {
      const val = customDurationValue ?? 3;
      const unit = customDurationUnit || 'days';
      const startDate = customStartDate || nowMs;
      
      const durationMs = val * (unit === 'weeks' ? 7 * 86400000 : 86400000);
      
      if (nowMs < startDate) {
        currentStart = startDate;
        currentEnd = startDate + durationMs;
        prevStart = startDate - durationMs;
        prevEnd = startDate;
      } else {
        const periodsCount = Math.floor((nowMs - startDate) / durationMs);
        currentStart = startDate + periodsCount * durationMs;
        currentEnd = currentStart + durationMs;
        prevStart = currentStart - durationMs;
        prevEnd = currentStart;
      }
      
      daysRemaining = Math.max(1, Math.ceil((currentEnd - nowMs) / 86400000));
      const unitStr = unit === 'weeks' ? (val === 1 ? 'semana' : 'semanas') : (val === 1 ? 'día' : 'días');
      periodLabel = `Cada ${val} ${unitStr}`;
    } else {
      // Range-based (e.g. Day 10 to Day 25)
      const d1 = customStartDay !== undefined ? customStartDay : 10;
      const d2 = customEndDay !== undefined ? customEndDay : 25;
      
      const minDay = Math.min(d1, d2);
      const maxDay = Math.max(d1, d2);
      
      const year = now.getFullYear();
      const month = now.getMonth();
      const date = now.getDate();
      
      const p1Start = new Date(year, month, minDay);
      p1Start.setHours(0, 0, 0, 0);
      
      const p2Start = new Date(year, month, maxDay);
      p2Start.setHours(0, 0, 0, 0);
      
      if (date < minDay) {
        // Before minDay: current started at maxDay of last month, ends at minDay of this month
        const start = new Date(year, month - 1, maxDay);
        start.setHours(0, 0, 0, 0);
        currentStart = start.getTime();
        currentEnd = p1Start.getTime();
        
        const prev = new Date(year, month - 1, minDay);
        prev.setHours(0, 0, 0, 0);
        prevStart = prev.getTime();
        prevEnd = currentStart;
      } else if (date < maxDay) {
        // Between minDay and maxDay: current is minDay to maxDay of this month
        currentStart = p1Start.getTime();
        currentEnd = p2Start.getTime();
        
        const prev = new Date(year, month - 1, maxDay);
        prev.setHours(0, 0, 0, 0);
        prevStart = prev.getTime();
        prevEnd = currentStart;
      } else {
        // On or after maxDay: current is maxDay of this month to minDay of next month
        currentStart = p2Start.getTime();
        
        const nextP1Start = new Date(year, month + 1, minDay);
        nextP1Start.setHours(0, 0, 0, 0);
        currentEnd = nextP1Start.getTime();
        
        prevStart = p1Start.getTime();
        prevEnd = currentStart;
      }
      
      daysRemaining = Math.max(1, Math.ceil((currentEnd - nowMs) / 86400000));
      periodLabel = `Quincena del ${minDay} al ${maxDay}`;
    }
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
export function spentInPeriod(txs: Transaction[], categoryId: string, startMs: number, endMs: number) {
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
