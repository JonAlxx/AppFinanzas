import { Account, Category, Recurring, Transaction, MonthPoint } from './types';
import { catById } from './catalog';


const DEBIT_TYPES: Account['type'][] = ['BANK', 'DEBIT_CARD', 'SAVINGS', 'INVESTMENT', 'DIGITAL_WALLET'];
const CASH_TYPES: Account['type'][] = ['CASH'];
const CREDIT_TYPES: Account['type'][] = ['CREDIT_CARD'];

export function isDebitAccount(acc: Account): boolean {
  return DEBIT_TYPES.includes(acc.type);
}

export function isCashAccount(acc: Account): boolean {
  return CASH_TYPES.includes(acc.type);
}

export function isCreditAccount(acc: Account): boolean {
  return CREDIT_TYPES.includes(acc.type);
}

export function isLiquidAccount(acc: Account): boolean {
  return isDebitAccount(acc) || isCashAccount(acc);
}

export function getCardTypeForAccount(acc: Account): string {
  if (acc.type === 'BANK' || acc.type === 'DEBIT_CARD') return 'debit';
  if (acc.type === 'CASH') return 'cash';
  if (acc.type === 'CREDIT_CARD') return 'credit';
  if (acc.type === 'SAVINGS') return 'savings';
  if (acc.type === 'INVESTMENT') return 'investment';
  if (acc.type === 'DIGITAL_WALLET') return 'vouchers';
  return 'debit';
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

export function calculateStatementBalance(account: Account, txs: Transaction[]): number {
  if (account.type !== 'CREDIT_CARD') return 0;
  const bal = computeAccountBalance(account, txs);
  return bal < 0 ? Math.abs(bal) : 0;
}

export function calculateCurrentCycleExpenses(account: Account, txs: Transaction[]): number {
  if (account.type !== 'CREDIT_CARD') return 0;

  const bal = computeAccountBalance(account, txs);
  if (bal >= 0) return 0; // Debt is $0 or positive balance

  const cardDebt = Math.abs(bal);

  // Sum total remaining installments of all active MSI/MCI purchases on this account
  let totalRemainingInstallments = 0;
  for (const t of txs) {
    if (t.accountId === account.id && t.type === 'EXPENSE' && !t.isEarlySettled) {
      const totalMonths = t.msiMonths || t.mciMonths;
      if (totalMonths && totalMonths > 0) {
        const monthlyCents = Math.round(t.amount / totalMonths);
        let paymentsCount = 0;
        for (const p of txs) {
          if (p.date >= t.date) {
            if ((p.type === 'INCOME' && p.accountId === account.id && p.categoryId === 'cat-debt') ||
                (p.type === 'TRANSFER' && p.destinationAccountId === account.id)) {
              paymentsCount++;
            }
          }
        }
        const elapsed = Math.min(totalMonths, paymentsCount);
        if (elapsed < totalMonths) {
          const paid = Math.min(t.amount, monthlyCents * elapsed);
          totalRemainingInstallments += Math.max(0, t.amount - paid);
        }
      }
    }
  }

  // Single purchases remaining on the card = cardDebt - totalRemainingInstallments
  return Math.max(0, cardDebt - totalRemainingInstallments);
}

export interface CardCutoffInstallmentItem {
  tx: Transaction;
  installmentIndex: number;
  totalMonths: number;
  monthlyCents: number;
  isMci: boolean;
  mciRate?: number;
}

export interface CardCutoffProjection {
  account: Account;
  cutoffDateMs: number;
  singleExpensesCents: number;
  singleExpensesList: Transaction[];
  activeInstallments: CardCutoffInstallmentItem[];
  periodObligationCents: number;
  totalCardDebtCents: number;
  isPastOrCurrentCutoff: boolean;
}

export function getCardCutoffProjection(
  account: Account,
  txs: Transaction[],
  viewYear: number,
  viewMonth: number
): CardCutoffProjection | null {
  if (account.type !== 'CREDIT_CARD') return null;

  const sd = Math.min(28, Math.max(1, account.statementDay || 1));
  const cutoffDate = new Date(viewYear, viewMonth, sd, 23, 59, 59, 999);
  const cutoffDateMs = cutoffDate.getTime();

  const prevCutoffDate = new Date(viewYear, viewMonth - 1, sd, 0, 0, 0, 0);
  const prevCutoffDateMs = prevCutoffDate.getTime();

  // Current balance & debt of the card
  const curBal = computeAccountBalance(account, txs);
  const actualCardDebt = curBal < 0 ? Math.abs(curBal) : 0;

  // Find active installment purchases for this target cutoff date (viewYear, viewMonth)
  const activeInstallments: CardCutoffInstallmentItem[] = [];
  let installmentsMonthlySum = 0;

  for (const t of txs) {
    if (t.accountId !== account.id || t.type !== 'EXPENSE' || t.isEarlySettled) continue;
    const totalMonths = t.msiMonths || t.mciMonths;
    if (!totalMonths || totalMonths <= 0) continue;

    // Calculate first cutoff year/month for transaction t
    const txDate = new Date(t.date);
    let firstCutoffYear = txDate.getFullYear();
    let firstCutoffMonth = txDate.getMonth();

    const sameMonthCut = new Date(firstCutoffYear, firstCutoffMonth, sd, 23, 59, 59, 999);
    if (t.date > sameMonthCut.getTime()) {
      firstCutoffMonth += 1;
      if (firstCutoffMonth > 11) {
        firstCutoffMonth = 0;
        firstCutoffYear += 1;
      }
    }

    // Determine 1-based installment index for viewYear, viewMonth
    const installmentIndex = (viewYear - firstCutoffYear) * 12 + (viewMonth - firstCutoffMonth) + 1;

    // If installmentIndex is within [1, totalMonths], it is active in this cutoff!
    if (installmentIndex >= 1 && installmentIndex <= totalMonths) {
      const monthlyCents = Math.round(t.amount / totalMonths);
      installmentsMonthlySum += monthlyCents;
      activeInstallments.push({
        tx: t,
        installmentIndex,
        totalMonths,
        monthlyCents,
        isMci: !!t.mciMonths,
        mciRate: t.mciInterestRate,
      });
    }
  }

  // Find single purchases made in this cutoff cycle
  const singleExpensesList: Transaction[] = [];
  let singleExpensesCents = 0;

  for (const t of txs) {
    if (t.accountId !== account.id || t.type !== 'EXPENSE') continue;
    const isInstallment = (t.msiMonths && t.msiMonths > 0) || (t.mciMonths && t.mciMonths > 0);
    if (isInstallment) continue;

    // Check if single purchase date falls in this cycle (between prevCutoffDateMs and cutoffDateMs)
    if (t.date >= prevCutoffDateMs && t.date <= cutoffDateMs) {
      singleExpensesList.push(t);
      singleExpensesCents += t.amount;
    }
  }

  // Calculate total remaining installments on the card
  let totalRemainingInstallmentsOnCard = 0;
  for (const t of txs) {
    if (t.accountId !== account.id || t.type !== 'EXPENSE' || t.isEarlySettled) continue;
    const totalMonths = t.msiMonths || t.mciMonths;
    if (!totalMonths || totalMonths <= 0) continue;

    const monthlyCents = Math.round(t.amount / totalMonths);
    const txDate = new Date(t.date);
    let firstCutoffYear = txDate.getFullYear();
    let firstCutoffMonth = txDate.getMonth();

    const sameMonthCut = new Date(firstCutoffYear, firstCutoffMonth, sd, 23, 59, 59, 999);
    if (t.date > sameMonthCut.getTime()) {
      firstCutoffMonth += 1;
      if (firstCutoffMonth > 11) {
        firstCutoffMonth = 0;
        firstCutoffYear += 1;
      }
    }

    const installmentIndex = (viewYear - firstCutoffYear) * 12 + (viewMonth - firstCutoffMonth) + 1;
    if (installmentIndex <= totalMonths) {
      const remainingMonths = Math.max(1, totalMonths - installmentIndex + 1);
      totalRemainingInstallmentsOnCard += Math.round(monthlyCents * remainingMonths);
    }
  }

  // Net single purchases remaining unpaid on the card
  const netSingleExpensesCents = Math.max(0, actualCardDebt - totalRemainingInstallmentsOnCard);
  const grossObligation = netSingleExpensesCents + installmentsMonthlySum;
  const periodObligationCents = curBal >= 0 ? 0 : Math.min(actualCardDebt, grossObligation);
  const totalCardDebtCents = curBal >= 0 ? 0 : actualCardDebt;

  return {
    account,
    cutoffDateMs,
    singleExpensesCents: netSingleExpensesCents,
    singleExpensesList,
    activeInstallments,
    periodObligationCents,
    totalCardDebtCents,
    isPastOrCurrentCutoff: cutoffDateMs <= Date.now(),
  };
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
    if (t.type === 'INCOME') {
      if (t.categoryId === 'cat-debt') continue; // Exclude credit card abonos (debt payments) from income totals
      income += t.amount;
    }
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

export function expenseByCategory(txs: Transaction[], range = 30, customCategories: Category[] = []): CategorySpend[] {
  const since = Date.now() - range * 86400000;
  const map: Record<string, number> = {};
  for (const t of txs) {
    if (t.type !== 'EXPENSE') continue;
    if (t.date < since) continue;
    if (!t.categoryId) continue;
    map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
  }
  return Object.entries(map)
    .map(([id, amt]) => ({ id, amount: amt, category: catById(id, customCategories) }))
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
      if (type === 'INCOME' && t.categoryId === 'cat-debt') continue; // Exclude credit card abonos from daily income series
      if (t.date >= d.getTime() && t.date < next) sum += t.amount;
    }
    series.push({ date: d.getTime(), amount: sum });
  }
  return series;
}

export interface BalanceSummary { debit: number; cash: number; credit: number; total: number }

export function computeBalanceSummary(accounts: Account[], txs: Transaction[]): BalanceSummary {
  let debit = 0;
  let cash = 0;
  let credit = 0;
  for (const acc of accounts) {
    const bal = computeAccountBalance(acc, txs);
    if (isCreditAccount(acc)) {
      credit += bal;
    } else if (isCashAccount(acc)) {
      cash += bal;
    } else {
      debit += bal;
    }
  }
  return { debit, cash, credit, total: debit + cash + credit };
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
    case 'once': {
      return day === start;
    }
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
      const dom1 = rule.biweeklyDay1 ?? rule.dayOfMonth ?? new Date(start).getDate();
      const dom2 = rule.biweeklyDay2 ?? (dom1 > 15 ? dom1 - 15 : dom1 + 15);
      const maxDom = daysInMonth(d.getFullYear(), d.getMonth());
      const effDom1 = Math.min(dom1, maxDom);
      const effDom2 = Math.min(dom2, maxDom);
      return d.getDate() === effDom1 || d.getDate() === effDom2;
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
  if (rule.frequency === 'once' && rule.lastGenerated) return null;
  const horizon = 365 * 86400000; // search up to 1 year ahead
  const startAfterLastGen = rule.lastGenerated ? startOfDay(rule.lastGenerated) + 86400000 : startOfDay(rule.startDate);
  const start = startOfDay(Math.max(fromMs, startAfterLastGen));
  const end = start + horizon;
  for (let cur = start; cur <= end; cur += 86400000) {
    if (ruleOccursOnDate(rule, cur)) return cur;
  }
  return null;
}


export interface UpcomingPayment { rule: Recurring; date: number }

export function upcomingPayments(rules: Recurring[], days = 60, limit = 20): UpcomingPayment[] {
  const today = startOfDay(Date.now());
  const horizon = today + days * 86400000;
  const all: UpcomingPayment[] = [];
  for (const r of rules) {
    if (!r.active) continue;
    if (r.frequency === 'once' && r.lastGenerated) continue;
    const afterLastGenerated = r.lastGenerated ? startOfDay(r.lastGenerated) + 86400000 : startOfDay(r.startDate);
    const from = Math.max(today, afterLastGenerated);
    const due = dueDatesBetween(r, from, horizon);
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
    if (r.frequency === 'once' && r.lastGenerated) { updatedRules.push(r); continue; }
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
        categoryId: r.categoryId || null,
        note: r.note,
      });
      lastGen = d;
    }
    const isOnce = r.frequency === 'once';
    updatedRules.push({
      ...r,
      lastGenerated: lastGen,
      active: isOnce && lastGen ? false : r.active,
    });
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
      if (t.type === 'INCOME') {
        if (t.categoryId === 'cat-debt') continue; // Exclude credit card abonos from monthly income totals
        inc += t.amount;
      }
      if (t.type === 'EXPENSE') exp += t.amount;
    }
    out.push({ month: NAMES[d.getMonth()], income: inc, expense: exp });
  }
  return out;
}
