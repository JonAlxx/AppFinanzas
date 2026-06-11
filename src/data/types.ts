export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type CategoryType = 'INCOME' | 'EXPENSE';

export type AccountType =
  | 'CASH'
  | 'BANK'
  | 'DEBIT_CARD'
  | 'CREDIT_CARD'
  | 'SAVINGS'
  | 'INVESTMENT'
  | 'DIGITAL_WALLET';

export type NetworkType = 'visa' | 'mastercard' | string;

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}

export interface Brand {
  logo?: any; // require() image source when a local asset exists
  bg: string;
  text: string;
  short: string;
  name: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initial: number; // cents
  color: string;
  icon: string;
  last4?: string;
  limit?: number;
  brand?: string;
  network?: NetworkType;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // cents
  date: number; // ms
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  note?: string | null;
  destinationGoalId?: string | null;
}

export interface Budget {
  id: string;
  categoryId: string;
  limit: number; // cents
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  accountId: string;
  deadline: number | null;
  color: string;
  icon: string;
  yields?: boolean;
  yieldRate?: number;
}

export type NotificationType = 'budget' | 'goal' | 'income' | 'tip';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  date: number;
  read: boolean;
  accent: string;
}

export type RecurringFrequency = 'monthly' | 'weekly' | 'biweekly' | 'yearly';

export interface Recurring {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number; // cents
  accountId: string;
  categoryId?: string | null;
  note?: string | null;
  frequency: RecurringFrequency;
  dayOfMonth?: number; // for monthly/yearly: 1-31
  monthOfYear?: number; // for yearly: 0-11
  dayOfWeek?: number; // for weekly: 0-6 (Sun-Sat)
  startDate: number; // ms; first occurrence date
  lastGenerated?: number | null; // ms; last materialized occurrence
  active: boolean;
  subscriptionBrand?: string | null; // optional id from SUBSCRIPTION_BRANDS
}

export interface UserProfile {
  name: string;
  email: string;
  phone?: string;
}

export interface AppState {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  notifications: AppNotification[];
  recurring: Recurring[];
  customCategories: Category[];
  currency: string; // 'MXN', 'USD', 'EUR', etc.
  biometricLock: boolean;
  dark: boolean;
  balanceHidden: boolean;
  profile?: UserProfile;
  cardOrder?: string[];
}

export interface MonthPoint {
  month: string;
  income: number;
  expense: number;
}


