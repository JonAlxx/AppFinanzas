import React, { createContext, useContext, useState, useEffect } from 'react';
import { BackHandler, Linking } from 'react-native';
import { Route, BOTTOM_TABS } from './routes';

export interface NavigationContextValue {
  route: Route;
  navigate: (r: Route | Route['screen']) => void;
  replace: (r: Route | Route['screen']) => void;
  navigateTab: (screen: Route['screen']) => void;
  back: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({
  initial = { screen: 'dashboard' },
  children,
}: { initial?: Route; children: React.ReactNode }) {
  const [history, setHistory] = useState<Route[]>([initial]);
  const route = history[history.length - 1];

  // Deep Link handler for Widget tap (+ Registrar Gasto)
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      if (url.includes('add-transaction')) {
        setHistory([{ screen: 'dashboard' }, { screen: 'add-transaction', type: 'EXPENSE' } as Route]);
      }
    };

    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener('url', event => handleUrl(event.url));
    return () => sub.remove();
  }, []);

  const navigate = (r: Route | Route['screen']) => {
    const next: Route = typeof r === 'string' ? ({ screen: r } as Route) : r;
    setHistory(prev => [...prev, next]);
  };

  const replace = (r: Route | Route['screen']) => {
    const next: Route = typeof r === 'string' ? ({ screen: r } as Route) : r;
    setHistory(prev => [...prev.slice(0, -1), next]);
  };

  // Reset history to a single tab screen (avoids stacking when switching tabs)
  const navigateTab = (screen: Route['screen']) => {
    setHistory([{ screen } as Route]);
  };

  const back = () => {
    setHistory(prev => {
      if (prev.length > 1) {
        return prev.slice(0, -1);
      }
      const current = prev[0];
      if (current && current.screen !== 'dashboard') {
        return [{ screen: 'dashboard' } as Route];
      }
      return prev;
    });
  };

  // Handle hardware back button in Android
  useEffect(() => {
    const handleBack = () => {
      if (history.length > 1) {
        back();
        return true;
      }
      if (route && route.screen !== 'dashboard') {
        back();
        return true;
      }
      return false; // Let the default system behavior take over (exit app)
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => subscription.remove();
  }, [history, route]);

  return (
    <NavigationContext.Provider value={{ route, navigate, replace, navigateTab, back }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used inside NavigationProvider');
  return ctx;
}
