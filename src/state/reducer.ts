import { Account, AppNotification, AppState, Category, Recurring, SavingsGoal, Transaction, UserProfile } from '../data/types';
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
  | { type: 'MARK_ALL_READ' }
  | { type: 'UPDATE_PROFILE'; profile: UserProfile }
  | { type: 'SET_CARD_ORDER'; order: string[] }
  | { type: 'ADD_NOTIFICATIONS'; notifications: AppNotification[] }
  | { type: 'IMPORT_STATE'; state: AppState }
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
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_TX': {
      if (state.transactions.some(t => t.id === action.tx.id)) {
        return state;
      }
      let newGoals = state.goals;
      if (action.tx.type === 'TRANSFER' && action.tx.destinationGoalId) {
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
      if (oldTx && oldTx.type === 'TRANSFER' && oldTx.destinationGoalId) {
        newGoals = newGoals.map(g =>
          g.id === oldTx.destinationGoalId
            ? { ...g, current: Math.max(0, g.current - oldTx.amount) }
            : g
        );
      }
      if (action.tx.type === 'TRANSFER' && action.tx.destinationGoalId) {
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
      if (oldTx && oldTx.type === 'TRANSFER' && oldTx.destinationGoalId) {
        newGoals = state.goals.map(g =>
          g.id === oldTx.destinationGoalId
            ? { ...g, current: Math.max(0, g.current - oldTx.amount) }
            : g
        );
      }
      return {
        ...state,
        transactions: state.transactions.filter(t => t.id !== action.id),
        goals: newGoals,
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
      };
    }
    case 'RESET':
      return initialState(state.dark);
    default:
      return state;
  }
}
