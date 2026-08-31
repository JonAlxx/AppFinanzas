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
  statementDay?: number;
  paymentDay?: number;
  customBrandName?: string;
  customBrandColor?: string;
  statementBalance?: number;
  interestRate?: number;
  statementMinimumPayment?: number;
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
  msiMonths?: number; // For Meses Sin Intereses
  mciMonths?: number; // For Meses Con Intereses
  mciInterestRate?: number; // For Meses Con Intereses (%)
  mciBaseAmount?: number; // Base amount before interest (in cents)
  isEarlySettled?: boolean; // True if the installment purchase was settled early / paid off completely
  settledByTxId?: string; // Optional payment transaction ID that triggered early settlement
  transferPairId?: string; // Optional linked pair ID for paired payment transactions
}

export interface Budget {
  id: string;
  categoryId: string;
  limit: number; // cents
  period?: 'monthly' | 'weekly' | 'biweekly' | 'custom';
  rollover?: number; // cents
  prevLeftoverProcessed?: boolean;
  customType?: 'range' | 'duration'; // 'range' (day range) or 'duration' (days/weeks)
  customStartDay?: number; // 1-31
  customEndDay?: number; // 1-31
  customDurationValue?: number; // e.g. 3, 14
  customDurationUnit?: 'days' | 'weeks';
  customStartDate?: number; // ms timestamp
  customWeekStartDay?: number; // 0-6 (0=Sun, 1=Mon, ..., 6=Sat)
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
  categoryId?: string | null;
  completed?: boolean;
  completedDate?: number;
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

export type RecurringFrequency = 'monthly' | 'weekly' | 'biweekly' | 'yearly' | 'once';

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
  biweeklyDay1?: number; // for custom biweekly: 1-31
  biweeklyDay2?: number; // for custom biweekly: 1-31
  autoCreditCardId?: string; // linked credit card account id for auto statement payments
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
  hiddenCards?: string[];
  pushNotificationsEnabled?: boolean;
  notificationDaysBefore?: number;
  notificationHour?: number;
  notificationMinute?: number;
  notificationHour2?: number;
  notificationMinute2?: number;
  notificationFrequency?: 'once' | 'twice' | string;
  customBrands?: { id: string; name: string; color: string }[];
}

export interface MonthPoint {
  month: string;
  income: number;
  expense: number;
}


