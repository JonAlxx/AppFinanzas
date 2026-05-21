// Symbol per supported currency
const CURRENCY_SYMBOLS: Record<string, string> = {
  MXN: '$',
  USD: 'US$',
  EUR: '€',
  COP: '$',
  ARS: '$',
  CLP: '$',
  GBP: '£',
  BRL: 'R$',
};

let CURRENT_CURRENCY = 'MXN';

export function setCurrency(code: string) {
  CURRENT_CURRENCY = code;
}

export function getCurrency(): string {
  return CURRENT_CURRENCY;
}

export const fmtMXN = (cents: number): string => {
  const v = cents / 100;
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  const sym = CURRENCY_SYMBOLS[CURRENT_CURRENCY] || '$';
  return sign + sym + abs.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const fmtShort = (cents: number): string => {
  const v = cents / 100;
  if (Math.abs(v) >= 1000) return '$' + (v / 1000).toFixed(1) + 'k';
  return '$' + v.toFixed(0);
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_NARROW = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export const fmtDate = (ms: number): string => {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]}`;
};

export const fmtDateLong = (ms: number): string => {
  const d = new Date(ms);
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES_LARGOS[d.getMonth()]}`;
};

export const fmtTime = (ms: number): string => {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export const dayNarrow = (ms: number): string => {
  const d = new Date(ms);
  return DIAS_NARROW[d.getDay()];
};

export const monthShort = (ms: number): string => MESES[new Date(ms).getMonth()];

export const sameDay = (a: number, b: number): boolean => {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
};

export const dayLabel = (ms: number): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yest = today - 86400000;
  if (ms >= today) return 'Hoy';
  if (ms >= yest) return 'Ayer';
  return fmtDateLong(ms);
};
