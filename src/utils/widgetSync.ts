import { NativeModules } from 'react-native';
import { AppState } from '../data/types';
import { computeAccountBalance, getCardCutoffProjection, upcomingPayments } from '../data/selectors';
import { catById, labelType } from '../data/catalog';

// Coincide con montos monetarios (con o sin signo, con separador de miles y decimales)
// pero preserva explícitamente los porcentajes, ya que un porcentaje no es un Monto_Sensible.
const AMOUNT_TOKEN = /\$?-?\d{1,3}(,\d{3})*(\.\d{1,2})?%?/g;

/**
 * Sustituye cada Monto_Sensible encontrado en el texto por el Patrón_Enmascarado ('••••'),
 * preservando el resto del texto (incluidos los porcentajes) sin alterar.
 */
export function maskAmounts(text: string): string {
  if (!text) return text;
  return text.replace(AMOUNT_TOKEN, (match) => (match.endsWith('%') ? match : '••••'));
}

/**
 * Aplica maskAmounts solo si balanceHidden es verdadero; en caso contrario devuelve
 * el texto original sin modificar.
 */
export function maskIf(hidden: boolean, text: string): string {
  return hidden ? maskAmounts(text) : text;
}

export function updateWidgetData(state: AppState) {
  try {
    const now = new Date();
    const themeMode = state.dark ? 'dark' : 'light';

    // 1. Saldo Total (Available Balance)
    let netAvailableCents = 0;
    let previousMonthBalanceCents = 0;
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
    for (const a of state.accounts) {
      if (a.type !== 'CREDIT_CARD') {
        netAvailableCents += computeAccountBalance(a, state.transactions);
        let historicalBalance = a.initial;
        for (const tx of state.transactions) {
          if (tx.date > previousMonthEnd) continue;
          if (tx.type === 'INCOME' && tx.accountId === a.id) historicalBalance += tx.amount;
          if (tx.type === 'EXPENSE' && tx.accountId === a.id) historicalBalance -= tx.amount;
          if (tx.type === 'TRANSFER') {
            if (tx.accountId === a.id) historicalBalance -= tx.amount;
            if (tx.destinationAccountId === a.id) historicalBalance += tx.amount;
          }
        }
        previousMonthBalanceCents += historicalBalance;
      }
    }
    netAvailableCents = Math.max(0, netAvailableCents);
    const availableStr = `$${(netAvailableCents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const monthlyDelta = netAvailableCents - previousMonthBalanceCents;
    const monthlyPct = previousMonthBalanceCents !== 0 ? Math.abs((monthlyDelta / previousMonthBalanceCents) * 100) : 0;
    const availableVariation = `${monthlyDelta >= 0 ? '▲' : '▼'} ${monthlyDelta >= 0 ? '+' : '-'}$${(Math.abs(monthlyDelta) / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${monthlyPct.toFixed(1)}%)`;

    // 2. Primary Account (Carrusel)
    const primaryAccount = state.accounts[0];
    const mainAccountName = primaryAccount ? primaryAccount.name : 'Sin Cuentas';
    const mainAccountType = primaryAccount ? (primaryAccount.type === 'CREDIT_CARD' ? 'Crédito' : 'Débito') : 'Débito';
    const mainAccountMasked = primaryAccount && primaryAccount.last4 ? `**** **** **** ${primaryAccount.last4}` : '**** **** **** 0000';
    const mainAccountBalanceVal = primaryAccount ? computeAccountBalance(primaryAccount, state.transactions) : 0;
    const mainAccountBalance = `$${(mainAccountBalanceVal / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // 3. Presupuesto Mensual (Mes actual dinámico)
    const currentMonthName = now.toLocaleDateString('es-MX', { month: 'long' });
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(0, lastDayOfMonth - now.getDate());
    const budgetDaysLeft = `${daysLeft} días restantes (${currentMonthName})`;

    const activeBudgets = state.budgets.map(b => {
      const cat = catById(b.categoryId, state.customCategories);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const spent = state.transactions.reduce((sum, tx) => (
        tx.type === 'EXPENSE' && tx.categoryId === b.categoryId && tx.date >= monthStart && tx.date <= now.getTime()
          ? sum + Math.abs(tx.amount)
          : sum
      ), 0);
      const pct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;
      return {
        name: cat ? cat.name : 'General',
        spentStr: `$${(spent / 100).toFixed(0)}`,
        limitStr: `$${(b.limit / 100).toFixed(0)}`,
        pct,
      };
    });

    const b1 = activeBudgets[0];
    const b2 = activeBudgets[1];
    const budgetLine1 = b1 ? `${b1.name}: ${b1.spentStr} / ${b1.limitStr} (${b1.pct}%)` : 'Sin presupuesto definido';
    const budgetLine2 = b2 ? `${b2.name}: ${b2.spentStr} / ${b2.limitStr} (${b2.pct}%)` : '';

    // 4. Meta de Ahorro
    const activeGoal = state.goals[0];
    const goalName = activeGoal ? activeGoal.name : 'Sin meta activa';
    const goalPct = activeGoal && activeGoal.target > 0 ? Math.round((activeGoal.current / activeGoal.target) * 100) : 0;
    const goalPercentage = `${goalPct}%`;
    const savedStr = activeGoal ? `$${(activeGoal.current / 100).toLocaleString('es-MX')}` : '$0';
    const targetStr = activeGoal ? `$${(activeGoal.target / 100).toLocaleString('es-MX')}` : '$0';
    const goalAmount = activeGoal ? `${savedStr} / ${targetStr}` : '$0.00';
    const goalDate = activeGoal && activeGoal.deadline ? `Límite: ${new Date(activeGoal.deadline).toLocaleDateString('es-MX')}` : 'Sin fecha límite';

    // 5. Gastos por Categoría
    const catMap = new Map<string, number>();
    let totalExpensesThisMonth = 0;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    for (const tx of state.transactions) {
      if (tx.type === 'EXPENSE' && tx.date >= monthStart && tx.date <= now.getTime()) {
        const val = Math.abs(tx.amount);
        totalExpensesThisMonth += val;
        const cId = tx.categoryId || 'other';
        catMap.set(cId, (catMap.get(cId) || 0) + val);
      }
    }

    const sortedCats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
    const topCat1 = sortedCats[0];
    const topCat2 = sortedCats[1];

    const catObj1 = topCat1 ? catById(topCat1[0], state.customCategories) : null;
    const catObj2 = topCat2 ? catById(topCat2[0], state.customCategories) : null;

    const catPct1 = topCat1 && totalExpensesThisMonth > 0 ? Math.round((topCat1[1] / totalExpensesThisMonth) * 100) : 0;
    const catPct2 = topCat2 && totalExpensesThisMonth > 0 ? Math.round((topCat2[1] / totalExpensesThisMonth) * 100) : 0;

    const catLine1 = topCat1 ? `${catObj1?.name || 'General'} (${catPct1}%): $${(topCat1[1] / 100).toFixed(2)}` : 'Sin gastos registrados';
    const catLine2 = topCat2 ? `${catObj2?.name || 'General'} (${catPct2}%): $${(topCat2[1] / 100).toFixed(2)}` : '';
    const categoryTotal = `$${(totalExpensesThisMonth / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // 6. Pagos y Recordatorios (Fechas Futuras Dinámicas a partir de HOY)
    const upcoming = upcomingPayments(state.recurring || [], 30, 2);
    const p1 = upcoming[0];
    const p2 = upcoming[1];
    const p1DateObj = p1 ? new Date(p1.date) : null;
    const p2DateObj = p2 ? new Date(p2.date) : null;
    const p1DateStr = p1DateObj ? `${p1DateObj.getDate()} ${p1DateObj.toLocaleDateString('es-MX', { month: 'short' })}` : '';
    const p2DateStr = p2DateObj ? `${p2DateObj.getDate()} ${p2DateObj.toLocaleDateString('es-MX', { month: 'short' })}` : '';
    const paymentLine1 = p1 ? `${p1DateStr} · ${p1.rule.note || 'Pago'}: -$${(p1.rule.amount / 100).toFixed(2)}` : 'Sin pagos próximos';
    const paymentLine2 = p2 ? `${p2DateStr} · ${p2.rule.note || 'Pago'}: -$${(p2.rule.amount / 100).toFixed(2)}` : '';

    // 7. Movimientos Recientes
    const sortedTxs = [...state.transactions].sort((a, b) => b.date - a.date);
    const tx1 = sortedTxs[0];
    const tx2 = sortedTxs[1];
    const recentTx1Name = tx1 ? (tx1.note || 'Transacción') : 'Sin movimientos';
    const recentTx1Val = tx1 ? `${tx1.type === 'INCOME' ? '+' : '-'}$${(Math.abs(tx1.amount) / 100).toFixed(2)}` : '$0.00';
    const recentTx2Name = tx2 ? (tx2.note || 'Transacción') : '';
    const recentTx2Val = tx2 ? `${tx2.type === 'INCOME' ? '+' : '-'}$${(Math.abs(tx2.amount) / 100).toFixed(2)}` : '';
    const recentMeta = (date?: number) => date
      ? new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '';
    const recentTx1Meta = recentMeta(tx1?.date);
    const recentTx2Meta = recentMeta(tx2?.date);

    // 8. Gastos Hoy & Semanal
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();

    let todayExpensesCents = 0;
    let weeklyExpensesCents = 0;

    for (const tx of state.transactions) {
      if (tx.type === 'EXPENSE') {
        if (tx.date >= todayStart && tx.date <= now.getTime()) {
          todayExpensesCents += Math.abs(tx.amount);
        }
        if (tx.date >= weekStart && tx.date <= now.getTime()) {
          weeklyExpensesCents += Math.abs(tx.amount);
        }
      }
    }

    const todayStr = `$${(todayExpensesCents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const weeklyStr = `$${(weeklyExpensesCents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // 9. Cutoff (Credit Card)
    let totalCutoffObligationCents = 0;
    for (const a of state.accounts) {
      if (a.type === 'CREDIT_CARD') {
        const proj = getCardCutoffProjection(a, state.transactions, now.getFullYear(), now.getMonth());
        if (proj) {
          totalCutoffObligationCents += proj.periodObligationCents;
        }
      }
    }
    const cutoffStr = `$${(totalCutoffObligationCents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Full JSON lists for scrollable widgets
    const accountsJson = JSON.stringify(state.accounts.map(a => {
      const rawBalance = computeAccountBalance(a, state.transactions);
      const displayBalance = a.type === 'CREDIT_CARD' && a.limit ? Math.max(0, a.limit + rawBalance) : rawBalance;
      return {
      title: a.name,
      subtitle: a.last4 ? `**** **** **** ${a.last4}` : (a.type === 'CREDIT_CARD' ? 'Tarjeta Crédito' : 'Cuenta Débito'),
      value: `$${(displayBalance / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      iconKey: a.type === 'CREDIT_CARD' ? 'credit' : (a.type === 'CASH' ? 'cash' : 'bank'),
      isPositive: 'true',
      type: labelType(a.type),
      balanceLabel: a.type === 'CREDIT_CARD' ? 'DISPONIBLE' : 'SALDO',
      color: a.customBrandColor || a.color || 'indigo',
      network: (a.network || '').toUpperCase(),
    };
    }));

    const recentTxsJson = JSON.stringify(sortedTxs.slice(0, 20).map(tx => {
      const cat = catById(tx.categoryId || '', state.customCategories);
      const isInc = tx.type === 'INCOME';
      const d = new Date(tx.date);
      const dateStr = `${d.getDate()}/${d.getMonth() + 1} • ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      return {
        title: tx.note || cat?.name || 'Movimiento',
        subtitle: dateStr,
        value: `${isInc ? '+' : '-'}$${(Math.abs(tx.amount) / 100).toFixed(2)}`,
        iconKey: isInc ? 'income' : 'expense',
        isPositive: isInc ? 'true' : 'false'
      };
    }));

    const budgetsJson = JSON.stringify(activeBudgets.map(b => ({
      title: b.name,
      subtitle: `${b.spentStr} / ${b.limitStr}`,
      value: `${b.pct}%`,
      icon: '📊',
      isPositive: b.pct <= 100 ? 'true' : 'false'
    })));

    const paymentsJson = JSON.stringify((state.recurring || []).map(r => ({
      title: r.note || 'Pago programado',
      subtitle: `Día ${r.dayOfMonth || 1}`,
      value: `-$${(r.amount / 100).toFixed(2)}`,
      icon: '🔔',
      isPositive: 'false'
    })));

    // Enmascarado de Montos_Sensibles: se aplica aquí (una sola vez, antes de construir el payload
    // final) para mantener una única fuente de verdad y evitar lógica de enmascarado duplicada
    // en los 9 Providers Kotlin. Los porcentajes (budgetsJson[].value) NO se enmascaran.
    const hidden = !!state.balanceHidden;
    const balanceHiddenStr = hidden ? 'true' : 'false';

    const maskedAvailableStr = maskIf(hidden, availableStr);
    const maskedAvailableVariation = maskIf(hidden, availableVariation);
    const maskedCutoffStr = maskIf(hidden, cutoffStr);
    const maskedTodayStr = maskIf(hidden, todayStr);
    const maskedWeeklyStr = maskIf(hidden, weeklyStr);
    const maskedMainAccountBalance = maskIf(hidden, mainAccountBalance);
    const maskedBudgetLine1 = maskIf(hidden, budgetLine1);
    const maskedBudgetLine2 = maskIf(hidden, budgetLine2);
    const maskedGoalAmount = maskIf(hidden, goalAmount);
    const maskedCategoryTotal = maskIf(hidden, categoryTotal);
    const maskedCatLine1 = maskIf(hidden, catLine1);
    const maskedCatLine2 = maskIf(hidden, catLine2);
    const maskedPaymentLine1 = maskIf(hidden, paymentLine1);
    const maskedPaymentLine2 = maskIf(hidden, paymentLine2);
    const maskedRecentTx1Val = maskIf(hidden, recentTx1Val);
    const maskedRecentTx2Val = maskIf(hidden, recentTx2Val);

    const maskedAccountsJson = hidden
      ? JSON.stringify(JSON.parse(accountsJson).map((it: any) => ({ ...it, value: maskAmounts(it.value) })))
      : accountsJson;
    const maskedRecentTxsJson = hidden
      ? JSON.stringify(JSON.parse(recentTxsJson).map((it: any) => ({ ...it, value: maskAmounts(it.value) })))
      : recentTxsJson;
    const maskedPaymentsJson = hidden
      ? JSON.stringify(JSON.parse(paymentsJson).map((it: any) => ({ ...it, value: maskAmounts(it.value) })))
      : paymentsJson;
    // budgetsJson[].value es un porcentaje, no un Monto_Sensible: no se enmascara.

    console.log('[WidgetSync] Updated dynamic data for all 9 widgets (Theme:', themeMode, ') with scrollable lists');

    if (NativeModules.WidgetSyncModule) {
      if (NativeModules.WidgetSyncModule.updateFullWidgetDataWithLists) {
        NativeModules.WidgetSyncModule.updateFullWidgetDataWithLists(
          themeMode,
          balanceHiddenStr,
          maskedAvailableStr, maskedAvailableVariation, maskedCutoffStr, maskedTodayStr, maskedWeeklyStr,
          mainAccountName, mainAccountType, mainAccountMasked, maskedMainAccountBalance,
          budgetDaysLeft, maskedBudgetLine1, maskedBudgetLine2,
          goalName, maskedGoalAmount, goalPercentage, goalDate,
          maskedCategoryTotal, maskedCatLine1, maskedCatLine2,
          maskedPaymentLine1, maskedPaymentLine2,
          recentTx1Name, maskedRecentTx1Val, recentTx1Meta, recentTx2Name, maskedRecentTx2Val, recentTx2Meta,
          maskedAccountsJson, maskedRecentTxsJson, budgetsJson, maskedPaymentsJson
        );
      } else {
        NativeModules.WidgetSyncModule.updateFullWidgetDataWithTheme(
          themeMode,
          maskedAvailableStr, maskedCutoffStr, maskedTodayStr, maskedWeeklyStr,
          mainAccountName, mainAccountType, mainAccountMasked, maskedMainAccountBalance,
          budgetDaysLeft, maskedBudgetLine1, maskedBudgetLine2,
          goalName, maskedGoalAmount, goalPercentage, goalDate,
          maskedCatLine1, maskedCatLine2,
          maskedPaymentLine1, maskedPaymentLine2,
          recentTx1Name, maskedRecentTx1Val, recentTx2Name, maskedRecentTx2Val
        );
      }
    }
  } catch (e) {
    console.warn('[WidgetSync] Error syncing dynamic widget metrics:', e);
  }
}
