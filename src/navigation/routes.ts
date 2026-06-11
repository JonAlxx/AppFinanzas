import { TransactionType } from '../data/types';

export type Route =
  | { screen: 'onboarding' }
  | { screen: 'dashboard' }
  | { screen: 'transactions' }
  | { screen: 'add-transaction'; type?: TransactionType; id?: string }
  | { screen: 'transaction-detail'; id: string }
  | { screen: 'accounts'; filter?: 'debit' | 'cash' | 'credit' | 'liquid' }
  | { screen: 'add-account'; id?: string }
  | { screen: 'account-detail'; id: string }
  | { screen: 'budgets' }
  | { screen: 'goals' }
  | { screen: 'add-goal'; id?: string }
  | { screen: 'reports' }
  | { screen: 'notifications' }
  | { screen: 'settings' }
  | { screen: 'recurring' }
  | { screen: 'add-recurring'; id?: string }
  | { screen: 'calendar' }
  | { screen: 'categories' }
  | { screen: 'add-category'; id?: string }
  | { screen: 'help' }
  | { screen: 'security' }
  | { screen: 'profile' };

export type ScreenId = Route['screen'];

export const BOTTOM_TABS: ScreenId[] = ['dashboard', 'transactions', 'accounts', 'reports'];

export const SCREENS_WITH_BOTTOM_NAV: ScreenId[] = [
  'dashboard', 'transactions', 'accounts', 'reports', 'budgets',
  'goals', 'settings', 'notifications', 'account-detail',
  'recurring', 'calendar', 'categories', 'help', 'security', 'profile',
];
