import { Account, AppState, Category, Recurring, Transaction } from '../data/types';
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
  | { type: 'ADD_CATEGORY'; cat: Category }
  | { type: 'UPDATE_CATEGORY'; cat: Category }
  | { type: 'DELETE_CATEGORY'; id: string }
  | { type: 'SET_CURRENCY'; currency: string }
  | { type: 'SET_BIOMETRIC_LOCK'; enabled: boolean }
  | { type: 'TOGGLE_THEME' }
  | { type: 'SET_THEME'; dark: boolean }
  | { type: 'TOGGLE_HIDE' }
  | { type: 'MARK_ALL_READ' }
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
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_TX':
      return { ...state, transactions: [action.tx, ...state.transactions] };
    case 'UPDATE_TX':
      return { ...state, transactions: state.transactions.map(t => t.id === action.tx.id ? action.tx : t) };
    case 'DELETE_TX':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.id) };
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
    case 'APPLY_MATERIALIZATION':
      return {
        ...state,
        transactions: [...action.newTxs, ...state.transactions],
        recurring: action.updatedRules,
      };
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
    case 'RESET':
      return initialState(state.dark);
    default:
      return state;
  }
}
