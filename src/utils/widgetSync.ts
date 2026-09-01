import { NativeModules } from 'react-native';
import { AppState } from '../data/types';
import { computeAccountBalance, getCardCutoffProjection } from '../data/selectors';

export function updateWidgetData(state: AppState) {
  try {
    const now = new Date();

    // 1. Calculate Available Balance (non-credit accounts)
    let netAvailableCents = 0;
    for (const a of state.accounts) {
      if (a.type !== 'CREDIT_CARD') {
        netAvailableCents += computeAccountBalance(a, state.transactions);
      }
    }
    netAvailableCents = Math.max(0, netAvailableCents);

    // 2. Calculate Total Period Obligation across CREDIT_CARD accounts
    let totalCutoffObligationCents = 0;
    for (const a of state.accounts) {
      if (a.type === 'CREDIT_CARD') {
        const proj = getCardCutoffProjection(a, state.transactions, now.getFullYear(), now.getMonth());
        if (proj) {
          totalCutoffObligationCents += proj.periodObligationCents;
        }
      }
    }

    // 3. Calculate Gastado Hoy & Gastado Semanal
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

    const availableStr = `$${(netAvailableCents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const cutoffStr = `$${(totalCutoffObligationCents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const todayStr = `$${(todayExpensesCents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const weeklyStr = `$${(weeklyExpensesCents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    console.log('[WidgetSync] Updated 5 widget metrics:', { availableStr, cutoffStr, todayStr, weeklyStr });

    if (NativeModules.WidgetSyncModule) {
      NativeModules.WidgetSyncModule.updateWidgetData(availableStr, cutoffStr, todayStr, weeklyStr);
    }
  } catch (e) {
    console.warn('[WidgetSync] Error syncing widget metrics:', e);
  }
}
