import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { AppNotification, AppState, Recurring } from '../data/types';
import { calculateStatementBalance, materializeRecurring, upcomingPayments } from '../data/selectors';
import { Action, initialState, reducer } from './reducer';
import { saveState } from './persistence';
import { scheduleRecurringNotifications, scheduleCreditCardNotifications } from '../utils/notifications';

interface AppStateContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({
  initial,
  children,
}: { initial?: AppState; children: React.ReactNode }) {
  // Normalize persisted state (older versions might lack some fields)
  const seed: AppState = initial
    ? {
        ...initial,
        transactions: (initial.transactions ?? []).filter(
          (tx, index, self) => self.findIndex(t => t.id === tx.id) === index
        ),
        recurring: initial.recurring ?? [],
        customCategories: initial.customCategories ?? [],
        currency: initial.currency ?? 'MXN',
        biometricLock: initial.biometricLock ?? false,
        profile: initial.profile ?? {
          name: 'Tu Perfil',
          email: 'Finanzas Personales',
          phone: '',
        },
        cardOrder: initial.cardOrder ?? ['debit', 'cash', 'credit'],
      }
    : initialState(false);
  const [state, dispatch] = useReducer(reducer, seed);
  const materializedRef = useRef(false);

  // Auto-sync linked recurring rules for credit card accounts
  useEffect(() => {
    const creditCards = state.accounts.filter(a => a.type === 'CREDIT_CARD' && a.paymentDay);
    for (const cc of creditCards) {
      const exists = state.recurring.some(r => r.autoCreditCardId === cc.id);
      if (!exists) {
        const statementBal = calculateStatementBalance(cc, state.transactions);
        const recRule: Recurring = {
          id: 'rec-cc-' + cc.id,
          type: 'EXPENSE',
          amount: statementBal,
          accountId: cc.id,
          categoryId: 'cat-debt',
          note: `Pago de Tarjeta ${cc.name}`,
          frequency: 'monthly',
          dayOfMonth: cc.paymentDay,
          startDate: Date.now(),
          active: true,
          autoCreditCardId: cc.id,
        };
        dispatch({ type: 'ADD_RECURRING', rule: recRule });
      }
    }
  }, [state.accounts, state.recurring, state.transactions]);

  // Auto-materialization of recurring rules is disabled because the user requested manual confirmation.
  /*
  useEffect(() => {
    if (materializedRef.current) return;
    materializedRef.current = true;
    if (state.recurring.length === 0) return;
    const { newTxs, updatedRules } = materializeRecurring(state.recurring);
    if (newTxs.length > 0) {
      dispatch({ type: 'APPLY_MATERIALIZATION', newTxs, updatedRules });
    }
  }, [state.recurring]);
  */

  // Generate notifications for upcoming recurring payments (within 7 days)
  useEffect(() => {
    if (state.recurring.length === 0) return;
    
    const upcoming = upcomingPayments(state.recurring, 7, 10);
    const newNotifications: AppNotification[] = [];
    
    for (const p of upcoming) {
      const notificationId = `recurring-${p.rule.id}-${p.date}`;
      const exists = state.notifications.some(n => n.id === notificationId);
      if (!exists) {
        const isIncome = p.rule.type === 'INCOME';
        const d = new Date(p.date);
        const dateStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
        const amountStr = (p.rule.amount / 100).toLocaleString('es-MX', { 
          style: 'currency', 
          currency: state.currency || 'MXN' 
        });
        
        newNotifications.push({
          id: notificationId,
          type: isIncome ? 'income' : 'budget',
          title: isIncome ? 'Próximo ingreso programado' : 'Próximo pago programado',
          body: isIncome 
            ? `Tu ingreso "${p.rule.note || 'Sueldo'}" por ${amountStr} está programado para el ${dateStr}.`
            : `Tu pago "${p.rule.note || 'Servicio'}" por ${amountStr} vencerá el ${dateStr}.`,
          date: Date.now(),
          read: false,
          accent: isIncome ? 'green' : 'rose',
        });
      }
    }
    
    if (newNotifications.length > 0) {
      dispatch({ type: 'ADD_NOTIFICATIONS', notifications: newNotifications });
    }
  }, [state.recurring, state.notifications, state.currency]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Sync and schedule native notifications globally whenever state changes
  useEffect(() => {
    scheduleRecurringNotifications(
      state.recurring,
      state.transactions,
      state.accounts,
      state.pushNotificationsEnabled ?? true,
      state.notificationDaysBefore ?? 3,
      state.notificationHour ?? 9,
      state.notificationMinute ?? 0,
      state.notificationHour2 ?? 21,
      state.notificationMinute2 ?? 0,
      state.notificationFrequency ?? 'twice'
    );
    
    scheduleCreditCardNotifications(
      state.accounts,
      state.transactions,
      state.pushNotificationsEnabled ?? true,
      state.notificationDaysBefore ?? 3,
      state.notificationHour ?? 9,
      state.notificationMinute ?? 0,
      state.notificationHour2 ?? 21,
      state.notificationMinute2 ?? 0,
      state.notificationFrequency ?? 'twice'
    );
  }, [
    state.recurring,
    state.transactions,
    state.accounts,
    state.pushNotificationsEnabled,
    state.notificationDaysBefore,
    state.notificationHour,
    state.notificationMinute,
    state.notificationHour2,
    state.notificationMinute2,
    state.notificationFrequency,
  ]);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
