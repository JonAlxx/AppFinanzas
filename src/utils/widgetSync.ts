import { AppState } from '../data/types';
import { computeAccountBalance, getCardCutoffProjection } from '../data/selectors';

export function updateWidgetData(state: AppState) {
  try {
    // 1. Calculate Available Balance (non-credit accounts)
    let netAvailableCents = 0;
    for (const a of state.accounts) {
      if (a.type !== 'CREDIT_CARD') {
        netAvailableCents += computeAccountBalance(a, state.transactions);
      }
    }
    netAvailableCents = Math.max(0, netAvailableCents);

    // 2. Calculate Total Period Obligation across CREDIT_CARD accounts
    const now = new Date();
    let totalCutoffObligationCents = 0;

    for (const a of state.accounts) {
      if (a.type === 'CREDIT_CARD') {
        const proj = getCardCutoffProjection(a, state.transactions, now.getFullYear(), now.getMonth());
        if (proj) {
          totalCutoffObligationCents += proj.periodObligationCents;
        }
      }
    }

    const availableStr = `$${(netAvailableCents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const cutoffStr = `$${(totalCutoffObligationCents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    console.log('[WidgetSync] Updated widget metrics:', { availableStr, cutoffStr });
  } catch (e) {
    console.warn('[WidgetSync] Error syncing widget metrics:', e);
  }
}
