import { Account, Category, Recurring, Transaction } from './types';
import { catById } from './catalog';

const LIQUID_TYPES: Account['type'][] = ['CASH', 'BANK', 'DEBIT_CARD', 'SAVINGS', 'INVESTMENT', 'DIGITAL_WALLET'];
const CREDIT_TYPES: Account['type'][] = ['CREDIT_CARD'];

export function isLiquidAccount(acc: Account): boolean {
  return LIQUID_TYPES.includes(acc.type);
}

export function isCreditAccount(acc: Account): boolean {
  return CREDIT_TYPES.includes(acc.type);
}

export function computeAccountBalance(account: Account, txs: Transaction[]): number {
  let bal = account.initial;
  for (const t of txs) {
    if (t.type === 'INCOME' && t.accountId === account.id) bal += t.amount;
    if (t.type === 'EXPENSE' && t.accountId === account.id) bal -= t.amount;
    if (t.type === 'TRANSFER') {
      if (t.accountId === account.id) bal -= t.amount;
      if (t.destinationAccountId === account.id) bal += t.amount;
    }
  }
  return bal;
}

export interface Totals { total: number; income: number; expense: number }

export function computeTotals(accounts: Account[], txs: Transaction[], range = 30): Totals {
  const total = accounts.reduce((s, a) => s + computeAccountBalance(a, txs), 0);
  return computeTotalsForAccounts(total, accounts.map(a => a.id), txs, range);
}

export function computeTotalsForAccounts(total: number, accountIds: string[], txs: Transaction[], range = 30): Totals {
  const ids = new Set(accountIds);
  const since = Date.now() - range * 86400000;
  let income = 0, expense = 0;
  for (const t of txs) {
    if (t.date < since) continue;
    if (!ids.has(t.accountId)) continue;
    if (t.type === 'INCOME') income += t.amount;
    if (t.type === 'EXPENSE') expense += t.amount;
  }
  return { total, income, expense };
}

export function spentByCategory(txs: Transaction[], categoryId: string, range = 30): number {
  const since = Date.now() - range * 86400000;
  let s = 0;
  for (const t of txs) {
    if (t.type !== 'EXPENSE') continue;
    if (t.date < since) continue;
    if (t.categoryId === categoryId) s += t.amount;
  }
  return s;
}

export interface CategorySpend { id: string; amount: number; category?: Category }

export function expenseByCategory(txs: Transaction[], range = 30): CategorySpend[] {
  const since = Date.now() - range * 86400000;
  const map: Record<string, number> = {};
  for (const t of txs) {
    if (t.type !== 'EXPENSE') continue;
    if (t.date < since) continue;
    if (!t.categoryId) continue;
    map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
  }
  return Object.entries(map)
    .map(([id, amt]) => ({ id, amount: amt, category: catById(id) }))
    .sort((a, b) => b.amount - a.amount);
}

export interface DailyPoint { date: number; amount: number }

export function dailySeries(txs: Transaction[], days = 7, type: 'EXPENSE' | 'INCOME' = 'EXPENSE'): DailyPoint[] {
  const series: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const next = d.getTime() + 86400000;
    let sum = 0;
    for (const t of txs) {
      if (t.type !== type) continue;
      if (t.date >= d.getTime() && t.date < next) sum += t.amount;
    }
    series.push({ date: d.getTime(), amount: sum });
  }
  return series;
}

export interface MonthPoint { month: string; income: number; expense: number }

export interface BalanceSummary { liquid: number; credit: number; total: number }

export function computeBalanceSummary(accounts: Account[], txs: Transaction[]): BalanceSummary {
  let liquid = 0;
  let credit = 0;
  for (const acc of accounts) {
    const bal = computeAccountBalance(acc, txs);
    if (isCreditAccount(acc)) credit += bal;
    else if (isLiquidAccount(acc)) liquid += bal;
    else liquid += bal; // fallback
  }
  return { liquid, credit, total: liquid + credit };
}

// ── Recurring helpers ──────────────────────────────────────────

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Returns true if this rule has an occurrence on the given date. */
export function ruleOccursOnDate(rule: Recurring, dateMs: number): boolean {
  if (!rule.active) return false;
  const day = startOfDay(dateMs);
  const start = startOfDay(rule.startDate);
  if (day < start) return false;
  const d = new Date(day);
  switch (rule.frequency) {
    case 'monthly': {
      const dom = rule.dayOfMonth ?? new Date(start).getDate();
      const maxDom = daysInMonth(d.getFullYear(), d.getMonth());
      const effectiveDom = Math.min(dom, maxDom);
      return d.getDate() === effectiveDom;
    }
    case 'weekly': {
      const dow = rule.dayOfWeek ?? new Date(start).getDay();
      return d.getDay() === dow;
    }
    case 'biweekly': {
      const startD = new Date(start);
      if (d.getDay() !== startD.getDay()) return false;
      const diffDays = Math.floor((day - start) / 86400000);
      return diffDays % 14 === 0;
    }
    case 'yearly': {
      const dom = rule.dayOfMonth ?? new Date(start).getDate();
      const moy = rule.monthOfYear ?? new Date(start).getMonth();
      return d.getMonth() === moy && d.getDate() === dom;
    }
  }
}

/** All due dates in [fromMs..toMs] (inclusive), sorted ascending. */
export function dueDatesBetween(rule: Recurring, fromMs: number, toMs: number): number[] {
  const out: number[] = [];
  const start = startOfDay(Math.max(fromMs, rule.startDate));
  const end = startOfDay(toMs);
  for (let cur = start; cur <= end; cur += 86400000) {
    if (ruleOccursOnDate(rule, cur)) out.push(cur);
  }
  return out;
}

/** Returns the next occurrence at or after a given date. */
export function nextDueAfter(rule: Recurring, fromMs: number): number | null {
  if (!rule.active) return null;
  const horizon = 365 * 86400000; // search up to 1 year ahead
  const start = startOfDay(Math.max(fromMs, rule.startDate));
  const end = start + horizon;
  for (let cur = start; cur <= end; cur += 86400000) {
    if (ruleOccursOnDate(rule, cur)) return cur;
  }
  return null;
}

export interface UpcomingPayment { rule: Recurring; date: number }

/** Next N occurrences across all rules, sorted by date asc. */
export function upcomingPayments(rules: Recurring[], days = 60, limit = 20): UpcomingPayment[] {
  const today = startOfDay(Date.now());
  const horizon = today + days * 86400000;
  const all: UpcomingPayment[] = [];
  for (const r of rules) {
    if (!r.active) continue;
    const due = dueDatesBetween(r, today, horizon);
    for (const d of due) all.push({ rule: r, date: d });
  }
  all.sort((a, b) => a.date - b.date);
  return all.slice(0, limit);
}

/** Materialize: returns NEW transactions to add for all due rules up to today. */
export interface MaterializedResult {
  newTxs: Transaction[];
  updatedRules: Recurring[];
}

export function materializeRecurring(rules: Recurring[], now = Date.now()): MaterializedResult {
  const today = startOfDay(now);
  const newTxs: Transaction[] = [];
  const updatedRules: Recurring[] = [];
  for (const r of rules) {
    if (!r.active) { updatedRules.push(r); continue; }
    const from = r.lastGenerated ? startOfDay(r.lastGenerated) + 86400000 : startOfDay(r.startDate);
    if (from > today) { updatedRules.push(r); continue; }
    const due = dueDatesBetween(r, from, today);
    let lastGen = r.lastGenerated || null;
    for (const d of due) {
      newTxs.push({
        id: 'tx-rec-' + r.id + '-' + d,
        type: r.type,
        amount: r.amount,
        date: d,
        accountId: r.accountId,
        categoryId: r.type === 'INCOME' ? r.categoryId : r.categoryId,
        note: r.note,
      });
      lastGen = d;
    }
    updatedRules.push({ ...r, lastGenerated: lastGen });
  }
  return { newTxs, updatedRules };
}

export function monthlySeries(txs: Transaction[], months = 6): MonthPoint[] {
  const out: MonthPoint[] = [];
  const now = new Date();
  const NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
    let inc = 0, exp = 0;
    for (const t of txs) {
      if (t.date < d.getTime() || t.date >= next) continue;
      if (t.type === 'INCOME') inc += t.amount;
      if (t.type === 'EXPENSE') exp += t.amount;
    }
    out.push({ month: NAMES[d.getMonth()], income: inc, expense: exp });
  }
  return out;
}
