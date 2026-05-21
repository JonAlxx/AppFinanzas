import React, { createContext, useContext } from 'react';
import { THEME, ThemeTokens } from './theme';

export interface ThemeContextValue {
  t: ThemeTokens;
  dark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({ t: THEME.light, dark: false });

export const ThemeProvider = ({ dark, children }: { dark: boolean; children: React.ReactNode }) => {
  const t = dark ? THEME.dark : THEME.light;
  return <ThemeContext.Provider value={{ t, dark }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
