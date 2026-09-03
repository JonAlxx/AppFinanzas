import { Account, Recurring, Transaction } from '../data/types';
import { calculateStatementBalance } from '../data/selectors';
import { Action } from './reducer';

/**
 * Función pura que determina qué acciones (ADD_RECURRING / UPDATE_RECURRING) deben
 * despacharse para mantener la Regla_Recurrente_Automática_TDC de cada cuenta CREDIT_CARD
 * con paymentDay configurado sincronizada con el saldo de corte vigente
 * (calculateStatementBalance), sin congelar el monto al momento de su creación.
 *
 * No invoca dispatch directamente ni modifica calculateStatementBalance/getCardCutoffProjection:
 * solo lee su resultado y proyecta la acción correspondiente.
 */
export function syncAutoCreditCardRule(
  accounts: Account[],
  recurring: Recurring[],
  transactions: Transaction[]
): Action[] {
  const actions: Action[] = [];
  const creditCards = accounts.filter(a => a.type === 'CREDIT_CARD' && a.paymentDay);

  for (const cc of creditCards) {
    const linkedRule = recurring.find(r => r.autoCreditCardId === cc.id);
    const currentStatementBalance = calculateStatementBalance(cc, transactions);

    if (!linkedRule) {
      const recRule: Recurring = {
        id: 'rec-cc-' + cc.id,
        type: 'EXPENSE',
        amount: currentStatementBalance,
        accountId: cc.id,
        categoryId: 'cat-debt',
        note: `Pago de Tarjeta ${cc.name}`,
        frequency: 'monthly',
        dayOfMonth: cc.paymentDay,
        startDate: Date.now(),
        active: true,
        autoCreditCardId: cc.id,
      };
      actions.push({ type: 'ADD_RECURRING', rule: recRule });
    } else if (linkedRule.amount !== currentStatementBalance) {
      actions.push({ type: 'UPDATE_RECURRING', rule: { ...linkedRule, amount: currentStatementBalance } });
    }
  }

  return actions;
}
