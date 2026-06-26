import { Account, AppNotification, AppState, Budget, Category, Recurring, SavingsGoal, Transaction, UserProfile } from '../data/types';
import { SEED_ACCOUNTS, SEED_BUDGETS, SEED_GOALS, SEED_NOTIFICATIONS, SEED_TRANSACTIONS } from '../data/seed';

export type Action =
  | { type: 'ADD_TX'; tx: Transaction }
  | { type: 'UPDATE_TX'; tx: Transaction }
  | { type: 'DELETE_TX'; id: string }
  | { type: 'ADD_ACC'; acc: Account }
  | { type: 'UPDATE_ACC'; acc: Account }
  | { type: 'DELETE_ACC'; id: string }
  | { type: 'ADD_RECURRING'; rule: Recurring }
  | { type: 'UPDATE_RECURRING'; rule: Recurring }
  | { type: 'DELETE_RECURRING'; id: string }
  | { type: 'TOGGLE_RECURRING_ACTIVE'; id: string }
  | { type: 'ADD_BUDGET'; budget: Budget }
  | { type: 'UPDATE_BUDGET'; budget: Budget }
  | { type: 'DELETE_BUDGET'; id: string }
  | { type: 'APPLY_MATERIALIZATION'; newTxs: Transaction[]; updatedRules: Recurring[] }
  | { type: 'ADD_GOAL'; goal: SavingsGoal }
  | { type: 'UPDATE_GOAL'; goal: SavingsGoal }
  | { type: 'DELETE_GOAL'; id: string }
  | { type: 'ADD_CATEGORY'; cat: Category }
  | { type: 'UPDATE_CATEGORY'; cat: Category }
  | { type: 'DELETE_CATEGORY'; id: string }
  | { type: 'SET_CURRENCY'; currency: string }
  | { type: 'SET_BIOMETRIC_LOCK'; enabled: boolean }
  | { type: 'TOGGLE_THEME' }
  | { type: 'SET_THEME'; dark: boolean }
  | { type: 'TOGGLE_HIDE' }
  | { type: 'TOGGLE_CARD_VISIBILITY'; cardType: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'UPDATE_PROFILE'; profile: UserProfile }
  | { type: 'SET_CARD_ORDER'; order: string[] }
  | { type: 'ADD_NOTIFICATIONS'; notifications: AppNotification[] }
  | { type: 'IMPORT_STATE'; state: AppState }
  | { type: 'TOGGLE_PUSH_NOTIFICATIONS' }
  | { type: 'UPDATE_NOTIFICATION_SETTINGS'; daysBefore: number; hour: number; minute: number; hour2: number; minute2: number; frequency: 'once' | 'twice' | string }
  | { type: 'ADD_CUSTOM_BRAND'; brand: { id: string; name: string; color: string } }
  | { type: 'UPDATE_CUSTOM_BRAND'; brand: { id: string; name: string; color: string } }
  | { type: 'DELETE_CUSTOM_BRAND'; id: string }
  | { type: 'RESET' };

export function initialState(dark = false): AppState {
  return {
    accounts: SEED_ACCOUNTS,
    transactions: SEED_TRANSACTIONS,
    budgets: SEED_BUDGETS,
    goals: SEED_GOALS,
    notifications: SEED_NOTIFICATIONS,
    recurring: [],
    customCategories: [],
    currency: 'MXN',
    biometricLock: false,
    dark,
    balanceHidden: false,
    profile: {
      name: 'Tu Perfil',
      email: 'Finanzas Personales',
      phone: '',
    },
    cardOrder: ['debit', 'cash', 'credit'],
    hiddenCards: [],
    pushNotificationsEnabled: true,
    notificationDaysBefore: 3,
    notificationHour: 9,
    notificationMinute: 0,
    notificationHour2: 21,
    notificationMinute2: 0,
    notificationFrequency: 'twice',
    customBrands: [],
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_TX': {
      if (state.transactions.some(t => t.id === action.tx.id)) {
        return state;
      }
      let newGoals = state.goals;
      if ((action.tx.type === 'TRANSFER' || action.tx.type === 'INCOME') && action.tx.destinationGoalId) {
        newGoals = state.goals.map(g =>
          g.id === action.tx.destinationGoalId
            ? { ...g, current: g.current + action.tx.amount }
            : g
        );
      }
      return { ...state, transactions: [action.tx, ...state.transactions], goals: newGoals };
    }
    case 'UPDATE_TX': {
      const oldTx = state.transactions.find(t => t.id === action.tx.id);
      let newGoals = state.goals;
      if (oldTx && (oldTx.type === 'TRANSFER' || oldTx.type === 'INCOME') && oldTx.destinationGoalId) {
        newGoals = newGoals.map(g =>
          g.id === oldTx.destinationGoalId
            ? { ...g, current: Math.max(0, g.current - oldTx.amount) }
            : g
        );
      }
      if ((action.tx.type === 'TRANSFER' || action.tx.type === 'INCOME') && action.tx.destinationGoalId) {
        newGoals = newGoals.map(g =>
          g.id === action.tx.destinationGoalId
            ? { ...g, current: g.current + action.tx.amount }
            : g
        );
      }
      return {
        ...state,
        transactions: state.transactions.map(t => t.id === action.tx.id ? action.tx : t),
        goals: newGoals,
      };
    }
    case 'DELETE_TX': {
      const oldTx = state.transactions.find(t => t.id === action.id);
      let newGoals = state.goals;
      if (oldTx && (oldTx.type === 'TRANSFER' || oldTx.type === 'INCOME') && oldTx.destinationGoalId) {
        newGoals = state.goals.map(g =>
          g.id === oldTx.destinationGoalId
            ? { ...g, current: Math.max(0, g.current - oldTx.amount) }
            : g
        );
      }

      // Rollback recurring payment state if the deleted transaction was materialized from a rule
      let updatedRecurring = state.recurring;
      if (action.id.startsWith('tx-rec-')) {
        const rule = state.recurring.find(r => action.id.startsWith(`tx-rec-${r.id}-`));
        if (rule) {
          const remainingTxs = state.transactions.filter(
            t => t.id !== action.id && t.id.startsWith(`tx-rec-${rule.id}-`)
          );
          const maxDate = remainingTxs.length > 0 ? Math.max(...remainingTxs.map(t => t.date)) : null;
          updatedRecurring = state.recurring.map(r =>
            r.id === rule.id
              ? { ...r, lastGenerated: maxDate, active: r.frequency === 'once' ? true : r.active }
              : r
          );
        }
      }

      return {
        ...state,
        transactions: state.transactions.filter(t => t.id !== action.id),
        goals: newGoals,
        recurring: updatedRecurring,
      };
    }
    case 'ADD_ACC':
      return { ...state, accounts: [...state.accounts, action.acc] };
    case 'UPDATE_ACC':
      return { ...state, accounts: state.accounts.map(a => a.id === action.acc.id ? action.acc : a) };
    case 'DELETE_ACC':
      return {
        ...state,
        accounts: state.accounts.filter(a => a.id !== action.id),
        transactions: state.transactions.filter(t => t.accountId !== action.id && t.destinationAccountId !== action.id),
        recurring: state.recurring.filter(r => r.accountId !== action.id),
      };
    case 'ADD_RECURRING':
      return { ...state, recurring: [...state.recurring, action.rule] };
    case 'UPDATE_RECURRING':
      return { ...state, recurring: state.recurring.map(r => r.id === action.rule.id ? action.rule : r) };
    case 'DELETE_RECURRING':
      return { ...state, recurring: state.recurring.filter(r => r.id !== action.id) };
    case 'TOGGLE_RECURRING_ACTIVE':
      return { ...state, recurring: state.recurring.map(r => r.id === action.id ? { ...r, active: !r.active } : r) };
    case 'ADD_GOAL':
      return { ...state, goals: [...state.goals, action.goal] };
    case 'UPDATE_GOAL':
      return { ...state, goals: state.goals.map(g => g.id === action.goal.id ? action.goal : g) };
    case 'DELETE_GOAL':
      return { ...state, goals: state.goals.filter(g => g.id !== action.id) };
    case 'ADD_BUDGET':
      return { ...state, budgets: [...state.budgets, action.budget] };
    case 'UPDATE_BUDGET':
      return { ...state, budgets: state.budgets.map(b => b.id === action.budget.id ? action.budget : b) };
    case 'DELETE_BUDGET':
      return { ...state, budgets: state.budgets.filter(b => b.id !== action.id) };
    case 'APPLY_MATERIALIZATION': {
      const uniqueNewTxs = action.newTxs.filter(
        newTx => !state.transactions.some(existingTx => existingTx.id === newTx.id)
      );
      const txIds = action.newTxs.map(tx => tx.id);
      const updatedNotifications = state.notifications.map(n => {
        const expectedTxId = n.id.replace('recurring-', 'tx-rec-');
        if (txIds.includes(expectedTxId)) {
          return { ...n, read: true };
        }
        return n;
      });
      return {
        ...state,
        transactions: [...uniqueNewTxs, ...state.transactions],
        recurring: action.updatedRules,
        notifications: updatedNotifications,
      };
    }
    case 'ADD_CATEGORY':
      return { ...state, customCategories: [...state.customCategories, action.cat] };
    case 'UPDATE_CATEGORY':
      return { ...state, customCategories: state.customCategories.map(c => c.id === action.cat.id ? action.cat : c) };
    case 'DELETE_CATEGORY':
      return { ...state, customCategories: state.customCategories.filter(c => c.id !== action.id) };
    case 'SET_CURRENCY':
      return { ...state, currency: action.currency };
    case 'SET_BIOMETRIC_LOCK':
      return { ...state, biometricLock: action.enabled };
    case 'TOGGLE_THEME':
      return { ...state, dark: !state.dark };
    case 'SET_THEME':
      return { ...state, dark: action.dark };
    case 'TOGGLE_HIDE':
      return { ...state, balanceHidden: !state.balanceHidden };
    case 'TOGGLE_CARD_VISIBILITY': {
      const hiddenCards = state.hiddenCards || [];
      const updated = hiddenCards.includes(action.cardType)
        ? hiddenCards.filter(c => c !== action.cardType)
        : [...hiddenCards, action.cardType];
      return { ...state, hiddenCards: updated };
    }
    case 'MARK_ALL_READ':
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };
    case 'UPDATE_PROFILE':
      return { ...state, profile: action.profile };
    case 'SET_CARD_ORDER':
      return { ...state, cardOrder: action.order };
    case 'ADD_NOTIFICATIONS': {
      const filtered = action.notifications.filter(
        newN => !state.notifications.some(existingN => existingN.id === newN.id)
      );
      if (filtered.length === 0) return state;
      return {
        ...state,
        notifications: [...filtered, ...state.notifications],
      };
    }
    case 'IMPORT_STATE': {
      return {
        ...action.state,
        recurring: action.state.recurring ?? [],
        customCategories: action.state.customCategories ?? [],
        currency: action.state.currency ?? 'MXN',
        biometricLock: action.state.biometricLock ?? false,
        dark: action.state.dark ?? state.dark,
        balanceHidden: action.state.balanceHidden ?? false,
        profile: action.state.profile ?? state.profile,
        cardOrder: action.state.cardOrder ?? ['debit', 'cash', 'credit'],
        hiddenCards: action.state.hiddenCards ?? [],
        pushNotificationsEnabled: action.state.pushNotificationsEnabled ?? true,
        notificationDaysBefore: action.state.notificationDaysBefore ?? 3,
        notificationHour: action.state.notificationHour ?? 9,
        notificationMinute: action.state.notificationMinute ?? 0,
        notificationHour2: action.state.notificationHour2 ?? 21,
        notificationMinute2: action.state.notificationMinute2 ?? 0,
        notificationFrequency: action.state.notificationFrequency ?? 'twice',
        customBrands: action.state.customBrands ?? [],
      };
    }
    case 'TOGGLE_PUSH_NOTIFICATIONS':
      return { ...state, pushNotificationsEnabled: !(state.pushNotificationsEnabled ?? true) };
    case 'UPDATE_NOTIFICATION_SETTINGS':
      return {
        ...state,
        notificationDaysBefore: action.daysBefore,
        notificationHour: action.hour,
        notificationMinute: action.minute,
        notificationHour2: action.hour2,
        notificationMinute2: action.minute2,
        notificationFrequency: action.frequency,
      };
    case 'ADD_CUSTOM_BRAND':
      return {
        ...state,
        customBrands: [...(state.customBrands || []), action.brand],
      };
    case 'UPDATE_CUSTOM_BRAND':
      return {
        ...state,
        customBrands: (state.customBrands || []).map(b => b.id === action.brand.id ? action.brand : b),
      };
    case 'DELETE_CUSTOM_BRAND':
      return {
        ...state,
        customBrands: (state.customBrands || []).filter(b => b.id !== action.id),
      };
    case 'RESET':
      return initialState(state.dark);
    default:
      return state;
  }
}
