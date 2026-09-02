import { NativeModules } from 'react-native';
import { AppState } from '../data/types';
import { computeAccountBalance, getCardCutoffProjection, spentByCategory, upcomingPayments } from '../data/selectors';
import { catById } from '../data/catalog';

export function updateWidgetData(state: AppState) {
  try {
    const now = new Date();
    const themeMode = state.dark ? 'dark' : 'light';

    // 1. Saldo Total (Available Balance)
    let netAvailableCents = 0;
    for (const a of state.accounts) {
      if (a.type !== 'CREDIT_CARD') {
        netAvailableCents += computeAccountBalance(a, state.transactions);
      }
    }
    netAvailableCents = Math.max(0, netAvailableCents);
    const availableStr = `$${(netAvailableCents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
      const spent = spentByCategory(state.transactions, b.categoryId, 30);
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
    const goalDate = activeGoal && activeGoal.deadline ? `📅 Límite: ${new Date(activeGoal.deadline).toLocaleDateString('es-MX')}` : 'Sin fecha límite';

    // 5. Gastos por Categoría
    const catMap = new Map<string, number>();
    let totalExpensesThisMonth = 0;

    for (const tx of state.transactions) {
      if (tx.type === 'EXPENSE') {
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

    // 8. Gastos Hoy & Semanal
    const todayStrDate = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let todayExpensesCents = 0;
    let weeklyExpensesCents = 0;

    for (const tx of state.transactions) {
      if (tx.type === 'EXPENSE') {
        const txDateObj = new Date(tx.date);
        const txDateStr = txDateObj.toISOString().split('T')[0];

        if (txDateStr === todayStrDate) {
          todayExpensesCents += Math.abs(tx.amount);
        }
        if (txDateObj >= sevenDaysAgo && txDateObj <= now) {
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
    const accountsJson = JSON.stringify(state.accounts.map(a => ({
      title: a.name,
      subtitle: a.last4 ? `**** **** **** ${a.last4}` : (a.type === 'CREDIT_CARD' ? 'Tarjeta Crédito' : 'Cuenta Débito'),
      value: `$${(computeAccountBalance(a, state.transactions) / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      icon: a.type === 'CREDIT_CARD' ? '💳' : (a.type === 'CASH' ? '💵' : '🏦'),
      isPositive: 'true'
    })));

    const recentTxsJson = JSON.stringify(sortedTxs.slice(0, 20).map(tx => {
      const cat = catById(tx.categoryId || '', state.customCategories);
      const isInc = tx.type === 'INCOME';
      const d = new Date(tx.date);
      const dateStr = `${d.getDate()}/${d.getMonth() + 1} • ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      return {
        title: tx.note || cat?.name || 'Movimiento',
        subtitle: dateStr,
        value: `${isInc ? '+' : '-'}$${(Math.abs(tx.amount) / 100).toFixed(2)}`,
        icon: cat?.icon || (isInc ? '💼' : '🛒'),
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

    console.log('[WidgetSync] Updated dynamic data for all 9 widgets (Theme:', themeMode, ') with scrollable lists');

    if (NativeModules.WidgetSyncModule) {
      if (NativeModules.WidgetSyncModule.updateFullWidgetDataWithLists) {
        NativeModules.WidgetSyncModule.updateFullWidgetDataWithLists(
          themeMode,
          availableStr, cutoffStr, todayStr, weeklyStr,
          mainAccountName, mainAccountType, mainAccountMasked, mainAccountBalance,
          budgetDaysLeft, budgetLine1, budgetLine2,
          goalName, goalAmount, goalPercentage, goalDate,
          catLine1, catLine2,
          paymentLine1, paymentLine2,
          recentTx1Name, recentTx1Val, recentTx2Name, recentTx2Val,
          accountsJson, recentTxsJson, budgetsJson, paymentsJson
        );
      } else {
        NativeModules.WidgetSyncModule.updateFullWidgetDataWithTheme(
          themeMode,
          availableStr, cutoffStr, todayStr, weeklyStr,
          mainAccountName, mainAccountType, mainAccountMasked, mainAccountBalance,
          budgetDaysLeft, budgetLine1, budgetLine2,
          goalName, goalAmount, goalPercentage, goalDate,
          catLine1, catLine2,
          paymentLine1, paymentLine2,
          recentTx1Name, recentTx1Val, recentTx2Name, recentTx2Val
        );
      }
    }
  } catch (e) {
    console.warn('[WidgetSync] Error syncing dynamic widget metrics:', e);
  }
}
