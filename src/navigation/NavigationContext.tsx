import React, { createContext, useContext, useState } from 'react';
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
    setHistory(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  };

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
