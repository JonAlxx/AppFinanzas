export type ThemeName = 'light' | 'dark';

export interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  indigo: string;
  indigoSoft: string;
  violet: string;
  green: string;
  greenSoft: string;
  rose: string;
  roseSoft: string;
  orange: string;
  orangeSoft: string;
  blue: string;
  blueSoft: string;
  yellow: string;
  yellowSoft: string;
  teal: string;
  tealSoft: string;
  purpleSoft: string;
  chipBg: string;
  chipText: string;
}

export const THEME: Record<ThemeName, ThemeTokens> = {
  light: {
    bg: '#F1F2F6',
    surface: '#FFFFFF',
    surfaceAlt: '#F9FAFB',
    border: '#E5E7EB',
    text: '#0F172A',
    textMuted: '#64748B',
    textSubtle: '#94A3B8',
    indigo: '#4F46E5',
    indigoSoft: '#EEF0FE',
    violet: '#7C3AED',
    green: '#10B981',
    greenSoft: '#D1FAE5',
    rose: '#F43F5E',
    roseSoft: '#FFE4E6',
    orange: '#F97316',
    orangeSoft: '#FFEDD5',
    blue: '#2563EB',
    blueSoft: '#DBEAFE',
    yellow: '#F59E0B',
    yellowSoft: '#FEF3C7',
    teal: '#0EA5A4',
    tealSoft: '#CCFBF1',
    purpleSoft: '#EDE9FE',
    chipBg: '#FFFFFF',
    chipText: '#475569',
  },
  dark: {
    bg: '#0B1020',
    surface: '#141A2E',
    surfaceAlt: '#1A2138',
    border: '#26304E',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    textSubtle: '#64748B',
    indigo: '#818CF8',
    indigoSoft: '#1E1F4A',
    violet: '#A78BFA',
    green: '#34D399',
    greenSoft: '#064E3B',
    rose: '#FB7185',
    roseSoft: '#4C1D24',
    orange: '#FB923C',
    orangeSoft: '#451A03',
    blue: '#60A5FA',
    blueSoft: '#1E3A8A',
    yellow: '#FCD34D',
    yellowSoft: '#451A03',
    teal: '#5EEAD4',
    tealSoft: '#134E4A',
    purpleSoft: '#2E1065',
    chipBg: '#1A2138',
    chipText: '#CBD5E1',
  },
};

export type ColorName =
  | 'indigo' | 'violet' | 'green' | 'rose' | 'orange'
  | 'blue' | 'yellow' | 'teal' | 'purple';

export function colorFor(t: ThemeTokens, name: string): string {
  return (t as any)[name] || name;
}

export function softFor(t: ThemeTokens, name: string): string {
  return (t as any)[name + 'Soft'] || t.indigoSoft;
}
