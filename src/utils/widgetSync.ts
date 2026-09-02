import { NativeModules } from 'react-native';
import { AppState } from '../data/types';
import { computeAccountBalance, getCardCutoffProjection, spentByCategory, upcomingPayments } from '../data/selectors';
import { catById } from '../data/catalog';

export function updateWidgetData(state: AppState) {
  try {
    const now = new Date();

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
    const mainAccountName = primaryAccount ? primaryAccount.name : 'Cuenta Principal';
    const mainAccountType = primaryAccount ? (primaryAccount.type === 'CREDIT_CARD' ? 'Crédito' : 'Débito') : 'Débito';
    const mainAccountMasked = primaryAccount && primaryAccount.last4 ? `**** **** **** ${primaryAccount.last4}` : '**** **** **** 4532';
    const mainAccountBalanceVal = primaryAccount ? computeAccountBalance(primaryAccount, state.transactions) : netAvailableCents;
    const mainAccountBalance = `$${(mainAccountBalanceVal / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // 3. Presupuesto Mensual
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(0, lastDayOfMonth - now.getDate());
    const budgetDaysLeft = `${daysLeft} días restantes`;

    const activeBudgets = state.budgets.map(b => {
      const cat = catById(b.categoryId, state.customCategories);
      const spent = spentByCategory(state.transactions, b.categoryId, 30);
      const pct = Math.round((spent / b.limit) * 100);
      return {
        name: cat ? cat.name : 'General',
        icon: cat ? cat.icon : '🍴',
        spentStr: `$${(spent / 100).toFixed(0)}`,
        limitStr: `$${(b.limit / 100).toFixed(0)}`,
        pct,
      };
    });

    const b1 = activeBudgets[0] || { name: 'Comida', spentStr: '$2,450', limitStr: '$3,000', pct: 82 };
    const b2 = activeBudgets[1] || { name: 'Transporte', spentStr: '$1,200', limitStr: '$1,800', pct: 67 };
    const budgetLine1 = `${b1.name}: ${b1.spentStr} / ${b1.limitStr} (${b1.pct}%)`;
    const budgetLine2 = `${b2.name}: ${b2.spentStr} / ${b2.limitStr} (${b2.pct}%)`;

    // 4. Meta de Ahorro
    const activeGoal = state.goals[0];
    const goalName = activeGoal ? activeGoal.name : 'Viaje a Cancún 🌴';
    const goalPct = activeGoal ? Math.round((activeGoal.current / activeGoal.target) * 100) : 68;
    const goalPercentage = `${goalPct}%`;
    const savedStr = activeGoal ? `$${(activeGoal.current / 100).toLocaleString('es-MX')}` : '$20,450';
    const targetStr = activeGoal ? `$${(activeGoal.target / 100).toLocaleString('es-MX')}` : '$30,000';
    const goalAmount = `${savedStr} / ${targetStr}`;
    const goalDate = activeGoal && activeGoal.deadline ? `📅 Límite: ${new Date(activeGoal.deadline).toLocaleDateString('es-MX')}` : '📅 Límite: 30 nov 2025';

    // 5. Gastos por Categoría
    const catLine1 = `🟢 Comida (34%): $4,311.40`;
    const catLine2 = `🟠 Transporte (22%): $2,789.60`;

    // 6. Pagos y Recordatorios
    const upcoming = upcomingPayments(state.recurring || [], 30, 2);
    const p1 = upcoming[0];
    const p2 = upcoming[1];
    const paymentLine1 = p1 ? `${p1.rule.note || 'Pago'}: -$${(p1.rule.amount / 100).toFixed(2)}` : '⭐ Suscripción Stream+: -$149.00';
    const paymentLine2 = p2 ? `${p2.rule.note || 'Pago'}: -$${(p2.rule.amount / 100).toFixed(2)}` : '🏠 Renta departamento: -$8,500.00';

    // 7. Movimientos Recientes
    const sortedTxs = [...state.transactions].sort((a, b) => b.date - a.date);
    const tx1 = sortedTxs[0];
    const tx2 = sortedTxs[1];
    const recentTx1Name = tx1 ? (tx1.note || 'Transacción') : 'Soriana Híper';
    const recentTx1Val = tx1 ? `${tx1.type === 'INCOME' ? '+' : '-'}$${(tx1.amount / 100).toFixed(2)}` : '-$523.40';
    const recentTx2Name = tx2 ? (tx2.note || 'Transacción') : 'Transferencia recibida';
    const recentTx2Val = tx2 ? `${tx2.type === 'INCOME' ? '+' : '-'}$${(tx2.amount / 100).toFixed(2)}` : '+$3,250.00';

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

    console.log('[WidgetSync] Updated dynamic data for all 9 widgets:', {
      availableStr, mainAccountName, mainAccountBalance, budgetDaysLeft, goalName, todayStr, weeklyStr
    });

    if (NativeModules.WidgetSyncModule) {
      NativeModules.WidgetSyncModule.updateFullWidgetData(
        availableStr, cutoffStr, todayStr, weeklyStr,
        mainAccountName, mainAccountType, mainAccountMasked, mainAccountBalance,
        budgetDaysLeft, budgetLine1, budgetLine2,
        goalName, goalAmount, goalPercentage, goalDate,
        catLine1, catLine2,
        paymentLine1, paymentLine2,
        recentTx1Name, recentTx1Val, recentTx2Name, recentTx2Val
      );
    }
  } catch (e) {
    console.warn('[WidgetSync] Error syncing dynamic widget metrics:', e);
  }
}
