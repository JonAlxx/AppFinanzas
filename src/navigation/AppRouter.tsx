import React from 'react';
import { View } from 'react-native';
import { useNavigation } from './NavigationContext';
import { BOTTOM_TABS, SCREENS_WITH_BOTTOM_NAV } from './routes';
import { BottomBar, BottomTabId } from '../components/BottomBar';
import { DashboardScreen } from '../screens/DashboardScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { AccountsScreen } from '../screens/AccountsScreen';
import { AccountDetailScreen } from '../screens/AccountDetailScreen';
import { AddTransactionScreen } from '../screens/AddTransactionScreen';
import { AddAccountScreen } from '../screens/AddAccountScreen';
import { BudgetsScreen } from '../screens/BudgetsScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { TransactionDetailScreen } from '../screens/TransactionDetailScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { RecurringScreen } from '../screens/RecurringScreen';
import { AddRecurringScreen } from '../screens/AddRecurringScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { AddCategoryScreen } from '../screens/AddCategoryScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { SecurityScreen } from '../screens/SecurityScreen';
import { Placeholder } from '../screens/Placeholder';

export function AppRouter() {
  const { route, navigate } = useNavigation();

  const showBottomNav = SCREENS_WITH_BOTTOM_NAV.includes(route.screen);
  const currentTab: BottomTabId = (BOTTOM_TABS.includes(route.screen as any) ? route.screen : null) as BottomTabId;

  let screen: React.ReactNode = null;
  switch (route.screen) {
    case 'dashboard':
      screen = <DashboardScreen />;
      break;
    case 'transactions':
      screen = <TransactionsScreen />;
      break;
    case 'add-transaction': {
      const r = route as Extract<typeof route, { screen: 'add-transaction' }>;
      screen = <AddTransactionScreen initialType={r.type} editingId={r.id} />;
      break;
    }
    case 'transaction-detail':
      screen = <TransactionDetailScreen txId={(route as Extract<typeof route, { screen: 'transaction-detail' }>).id} />;
      break;
    case 'accounts':
      screen = <AccountsScreen initialFilter={(route as Extract<typeof route, { screen: 'accounts' }>).filter} />;
      break;
    case 'add-account': {
      const r = route as Extract<typeof route, { screen: 'add-account' }>;
      screen = <AddAccountScreen editingId={r.id} />;
      break;
    }
    case 'account-detail':
      screen = <AccountDetailScreen accountId={(route as Extract<typeof route, { screen: 'account-detail' }>).id} />;
      break;
    case 'budgets':
      screen = <BudgetsScreen />;
      break;
    case 'goals':
      screen = <GoalsScreen />;
      break;
    case 'reports':
      screen = <ReportsScreen />;
      break;
    case 'notifications':
      screen = <NotificationsScreen />;
      break;
    case 'settings':
      screen = <SettingsScreen />;
      break;
    case 'recurring':
      screen = <RecurringScreen />;
      break;
    case 'add-recurring': {
      const r = route as Extract<typeof route, { screen: 'add-recurring' }>;
      screen = <AddRecurringScreen editingId={r.id} />;
      break;
    }
    case 'calendar':
      screen = <CalendarScreen />;
      break;
    case 'categories':
      screen = <CategoriesScreen />;
      break;
    case 'add-category': {
      const r = route as Extract<typeof route, { screen: 'add-category' }>;
      screen = <AddCategoryScreen editingId={r.id} />;
      break;
    }
    case 'help':
      screen = <HelpScreen />;
      break;
    case 'security':
      screen = <SecurityScreen />;
      break;
    case 'onboarding':
      // Onboarding is rendered from App.tsx bootstrap, not as a normal route
      screen = <Placeholder title="Onboarding" />;
      break;
    default:
      screen = <Placeholder title="No encontrado" subtitle="Pantalla desconocida" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{screen}</View>
      {showBottomNav ? (
        <BottomBar
          current={currentTab}
          onChange={(id) => navigate(id)}
          onFab={() => navigate('add-transaction')}
        />
      ) : null}
    </View>
  );
}
