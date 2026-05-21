import { Account, Brand, Category } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Comida', type: 'EXPENSE', icon: 'utensils', color: 'orange' },
  { id: 'cat-groceries', name: 'Súper', type: 'EXPENSE', icon: 'cart', color: 'green' },
  { id: 'cat-transport', name: 'Transporte', type: 'EXPENSE', icon: 'car', color: 'blue' },
  { id: 'cat-housing', name: 'Hogar', type: 'EXPENSE', icon: 'home', color: 'teal' },
  { id: 'cat-bills', name: 'Servicios', type: 'EXPENSE', icon: 'bolt', color: 'yellow' },
  { id: 'cat-entertainment', name: 'Ocio', type: 'EXPENSE', icon: 'sparkles', color: 'violet' },
  { id: 'cat-health', name: 'Salud', type: 'EXPENSE', icon: 'heart', color: 'rose' },
  { id: 'cat-shopping', name: 'Compras', type: 'EXPENSE', icon: 'bag', color: 'indigo' },
  { id: 'cat-subscriptions', name: 'Suscripciones', type: 'EXPENSE', icon: 'rotate', color: 'violet' },
  { id: 'cat-education', name: 'Educación', type: 'EXPENSE', icon: 'book', color: 'blue' },
  { id: 'cat-rent', name: 'Renta', type: 'EXPENSE', icon: 'home', color: 'teal' },
  { id: 'cat-mortgage', name: 'Hipoteca', type: 'EXPENSE', icon: 'home', color: 'indigo' },
  { id: 'cat-maintenance', name: 'Mantenimiento', type: 'EXPENSE', icon: 'cog', color: 'orange' },
  { id: 'cat-water', name: 'Agua', type: 'EXPENSE', icon: 'bolt', color: 'blue' },
  { id: 'cat-electricity', name: 'Luz', type: 'EXPENSE', icon: 'bolt', color: 'yellow' },
  { id: 'cat-gas', name: 'Gas', type: 'EXPENSE', icon: 'flame', color: 'orange' },
  { id: 'cat-internet', name: 'Internet', type: 'EXPENSE', icon: 'globe', color: 'teal' },
  { id: 'cat-phone', name: 'Telefonia', type: 'EXPENSE', icon: 'bell', color: 'indigo' },
  { id: 'cat-insurance', name: 'Seguros', type: 'EXPENSE', icon: 'shield', color: 'blue' },
  { id: 'cat-taxes', name: 'Impuestos', type: 'EXPENSE', icon: 'briefcase', color: 'rose' },
  { id: 'cat-pets', name: 'Mascotas', type: 'EXPENSE', icon: 'heart', color: 'orange' },
  { id: 'cat-beauty', name: 'Belleza', type: 'EXPENSE', icon: 'sparkles', color: 'rose' },
  { id: 'cat-fitness', name: 'Gimnasio', type: 'EXPENSE', icon: 'target', color: 'green' },
  { id: 'cat-travel', name: 'Viajes', type: 'EXPENSE', icon: 'plane', color: 'blue' },
  { id: 'cat-fuel', name: 'Gasolina', type: 'EXPENSE', icon: 'car', color: 'orange' },
  { id: 'cat-parking', name: 'Estacionamiento', type: 'EXPENSE', icon: 'pin', color: 'indigo' },
  { id: 'cat-delivery', name: 'Delivery', type: 'EXPENSE', icon: 'bag', color: 'rose' },
  { id: 'cat-debt', name: 'Deudas', type: 'EXPENSE', icon: 'card', color: 'rose' },
  { id: 'cat-fees', name: 'Comisiones', type: 'EXPENSE', icon: 'cash', color: 'yellow' },
  { id: 'cat-donations', name: 'Donaciones', type: 'EXPENSE', icon: 'gift', color: 'green' },
  { id: 'cat-other-exp', name: 'Otros', type: 'EXPENSE', icon: 'more', color: 'indigo' },
  { id: 'cat-salary', name: 'Sueldo', type: 'INCOME', icon: 'briefcase', color: 'green' },
  { id: 'cat-freelance', name: 'Freelance', type: 'INCOME', icon: 'laptop', color: 'indigo' },
  { id: 'cat-gift', name: 'Regalo', type: 'INCOME', icon: 'gift', color: 'rose' },
  { id: 'cat-interest', name: 'Intereses', type: 'INCOME', icon: 'trending', color: 'teal' },
  { id: 'cat-business', name: 'Negocio', type: 'INCOME', icon: 'briefcase', color: 'blue' },
  { id: 'cat-sales', name: 'Ventas', type: 'INCOME', icon: 'bag', color: 'green' },
  { id: 'cat-rent-income', name: 'Rentas', type: 'INCOME', icon: 'home', color: 'teal' },
  { id: 'cat-investments', name: 'Inversiones', type: 'INCOME', icon: 'trending', color: 'violet' },
  { id: 'cat-refund', name: 'Reembolso', type: 'INCOME', icon: 'rotate', color: 'blue' },
  { id: 'cat-bonus', name: 'Bono', type: 'INCOME', icon: 'sparkles', color: 'yellow' },
  { id: 'cat-other-inc', name: 'Otros', type: 'INCOME', icon: 'plus', color: 'green' },
];

// Back-compat alias
export const CATEGORIES = DEFAULT_CATEGORIES;

export const catById = (id: string | null | undefined, customCats: Category[] = []): Category | undefined => {
  if (!id) return undefined;
  return DEFAULT_CATEGORIES.find(c => c.id === id) || customCats.find(c => c.id === id);
};

export const allCategories = (customCats: Category[] = []): Category[] => {
  return [...DEFAULT_CATEGORIES, ...customCats];
};

export const isCustomCategory = (id: string): boolean => {
  return !DEFAULT_CATEGORIES.find(c => c.id === id);
};

// Curated icon set for custom category picker
export const CATEGORY_ICON_OPTIONS: string[] = [
  'utensils', 'cart', 'car', 'home', 'bolt', 'sparkles', 'heart', 'bag',
  'rotate', 'book', 'briefcase', 'laptop', 'gift', 'trending', 'target',
  'plane', 'shield', 'piggy', 'cash', 'card', 'wallet', 'bell',
  'flame', 'lightbulb', 'globe', 'tag', 'pin',
];

export const CATEGORY_COLOR_OPTIONS: string[] = [
  'indigo', 'violet', 'green', 'rose', 'orange', 'blue', 'teal', 'yellow',
];

export const BRANDS: Record<string, Brand> = {
  bbva:        { logo: require('../../assets/brands/bbva.png'),        bg: '#004481', text: '#FFFFFF', short: 'BBVA', name: 'BBVA' },
  banamex:     { bg: '#0B3A75', text: '#FFFFFF', short: 'Banamex', name: 'Banamex' },
  santander:   { bg: '#EC0000', text: '#FFFFFF', short: 'Santander', name: 'Santander' },
  hsbc:        { bg: '#DB0011', text: '#FFFFFF', short: 'HSBC', name: 'HSBC' },
  banorte:     { bg: '#D71920', text: '#FFFFFF', short: 'Banorte', name: 'Banorte' },
  scotiabank:  { bg: '#E31837', text: '#FFFFFF', short: 'Scotia', name: 'Scotiabank' },
  inbursa:     { bg: '#003A70', text: '#FFFFFF', short: 'Inbursa', name: 'Inbursa' },
  banregio:    { bg: '#F58220', text: '#FFFFFF', short: 'Banregio', name: 'Banregio' },
  afirme:      { bg: '#009639', text: '#FFFFFF', short: 'Afirme', name: 'Afirme' },
  banbajio:    { bg: '#E1251B', text: '#FFFFFF', short: 'BanBajio', name: 'BanBajio' },
  mifel:       { bg: '#005EB8', text: '#FFFFFF', short: 'Mifel', name: 'Banca Mifel' },
  multiva:     { bg: '#253746', text: '#FFFFFF', short: 'Multiva', name: 'Banco Multiva' },
  invex:       { bg: '#002D72', text: '#FFFFFF', short: 'Invex', name: 'Invex' },
  americanexpress: { bg: '#006FCF', text: '#FFFFFF', short: 'Amex', name: 'American Express' },
  nu:          { logo: require('../../assets/brands/nu.png'),          bg: '#820AD1', text: '#FFFFFF', short: 'Nu',   name: 'Nu' },
  azteca:      { logo: require('../../assets/brands/azteca.png'),      bg: '#006B3F', text: '#FFFFFF', short: 'Azteca', name: 'Banco Azteca' },
  bancoppel:   { bg: '#F6D30A', text: '#1F2937', short: 'BanCoppel', name: 'BanCoppel' },
  bienestar:   { bg: '#006341', text: '#FFFFFF', short: 'Bienestar', name: 'Banco del Bienestar' },
  albo:        { bg: '#00A3E0', text: '#FFFFFF', short: 'Albo', name: 'Albo' },
  hey:         { bg: '#3DDC84', text: '#0F172A', short: 'Hey', name: 'Hey Banco' },
  spin:        { bg: '#EF3340', text: '#FFFFFF', short: 'Spin', name: 'Spin by OXXO' },
  uala:        { bg: '#FF5A00', text: '#FFFFFF', short: 'Uala', name: 'Uala' },
  vexi:        { bg: '#00B388', text: '#FFFFFF', short: 'Vexi', name: 'Vexi' },
  mercadopago: { logo: require('../../assets/brands/mercadopago.png'), bg: '#00B1EA', text: '#FFFFFF', short: 'MP',   name: 'Mercado Pago' },
  rappi:       { logo: require('../../assets/brands/rappi.png'),       bg: '#FF441F', text: '#FFFFFF', short: 'Rappi', name: 'RappiCard' },
  stori:       { logo: require('../../assets/brands/stori.png'),       bg: '#003C36', text: '#FFFFFF', short: 'Stori', name: 'Stori' },
  klar:        { logo: require('../../assets/brands/klar.png'),        bg: '#0C0C0C', text: '#FFFFFF', short: 'Klar', name: 'Klar' },
  plata:       { logo: require('../../assets/brands/plata.png'),       bg: '#FF4F00', text: '#FFFFFF', short: 'Plata', name: 'Plata' },
  didi:        { bg: '#FF7A00', text: '#FFFFFF', short: 'DiDi', name: 'DiDi Card' },
  clip:        { bg: '#6544E9', text: '#FFFFFF', short: 'Clip', name: 'Clip' },
  paypal:      { bg: '#003087', text: '#FFFFFF', short: 'PayPal', name: 'PayPal' },
  wise:        { bg: '#9FE870', text: '#163300', short: 'Wise', name: 'Wise' },
  revolut:     { bg: '#191C1F', text: '#FFFFFF', short: 'Revolut', name: 'Revolut' },
  cash:        { bg: '#10B981', text: '#FFFFFF', short: 'Efectivo', name: 'Efectivo' },
};

export const brandFor = (id: string | undefined): Brand | undefined =>
  id ? BRANDS[id] : undefined;

export interface SubscriptionBrand {
  bg: string;
  text: string;
  short: string;
  name: string;
  monogram: string; // 1-3 chars displayed when no logo
}

export const SUBSCRIPTION_BRANDS: Record<string, SubscriptionBrand> = {
  netflix:     { bg: '#E50914', text: '#FFFFFF', short: 'Netflix',     name: 'Netflix',          monogram: 'N' },
  spotify:     { bg: '#1DB954', text: '#FFFFFF', short: 'Spotify',     name: 'Spotify',          monogram: 'S' },
  disney:      { bg: '#113CCF', text: '#FFFFFF', short: 'Disney+',     name: 'Disney+',          monogram: 'D+' },
  hbomax:      { bg: '#9B26B6', text: '#FFFFFF', short: 'Max',         name: 'HBO Max',          monogram: 'M' },
  prime:       { bg: '#00A8E1', text: '#FFFFFF', short: 'Prime',       name: 'Amazon Prime',     monogram: 'P' },
  youtube:     { bg: '#FF0000', text: '#FFFFFF', short: 'YT Premium',  name: 'YouTube Premium',  monogram: 'YT' },
  apple:       { bg: '#000000', text: '#FFFFFF', short: 'Apple One',   name: 'Apple One',        monogram: 'A' },
  microsoft:   { bg: '#0078D4', text: '#FFFFFF', short: 'MS 365',      name: 'Microsoft 365',    monogram: '365' },
  vix:         { bg: '#F5C418', text: '#000000', short: 'ViX',         name: 'ViX',              monogram: 'V' },
  paramount:   { bg: '#0064FF', text: '#FFFFFF', short: 'Paramount+',  name: 'Paramount+',       monogram: 'P+' },
  crunchyroll: { bg: '#F47521', text: '#FFFFFF', short: 'Crunchyroll', name: 'Crunchyroll',      monogram: 'CR' },
  icloud:      { bg: '#0071E3', text: '#FFFFFF', short: 'iCloud+',     name: 'iCloud+',          monogram: 'iC' },
  gym:         { bg: '#F97316', text: '#FFFFFF', short: 'Gym',         name: 'Gimnasio',         monogram: 'GYM' },
  internet:    { bg: '#0EA5A4', text: '#FFFFFF', short: 'Internet',    name: 'Internet',         monogram: 'NET' },
  phone:       { bg: '#4F46E5', text: '#FFFFFF', short: 'Telefonía',   name: 'Telefonía celular', monogram: 'TEL' },
  youtube_music: { bg: '#FF0000', text: '#FFFFFF', short: 'YT Music',  name: 'YouTube Music',    monogram: 'YM' },
  apple_music: { bg: '#FA243C', text: '#FFFFFF', short: 'Apple Music', name: 'Apple Music',      monogram: 'AM' },
  apple_tv:    { bg: '#111111', text: '#FFFFFF', short: 'Apple TV+',   name: 'Apple TV+',        monogram: 'TV+' },
  xbox:        { bg: '#107C10', text: '#FFFFFF', short: 'Xbox',        name: 'Xbox Game Pass',   monogram: 'X' },
  playstation: { bg: '#003791', text: '#FFFFFF', short: 'PS Plus',     name: 'PlayStation Plus', monogram: 'PS' },
  nintendo:    { bg: '#E60012', text: '#FFFFFF', short: 'Nintendo',    name: 'Nintendo Switch Online', monogram: 'NS' },
  starplus:    { bg: '#1F1147', text: '#FFFFFF', short: 'Star+',       name: 'Star+',            monogram: 'S+' },
  mubi:        { bg: '#001489', text: '#FFFFFF', short: 'MUBI',        name: 'MUBI',             monogram: 'M' },
  deezer:      { bg: '#A238FF', text: '#FFFFFF', short: 'Deezer',      name: 'Deezer',           monogram: 'D' },
  tidal:       { bg: '#000000', text: '#FFFFFF', short: 'TIDAL',       name: 'TIDAL',            monogram: 'T' },
  soundcloud:  { bg: '#FF5500', text: '#FFFFFF', short: 'SoundCloud',  name: 'SoundCloud',       monogram: 'SC' },
  audible:     { bg: '#F8991C', text: '#111827', short: 'Audible',     name: 'Audible',          monogram: 'A' },
  kindle:      { bg: '#1F2937', text: '#FFFFFF', short: 'Kindle',      name: 'Kindle Unlimited', monogram: 'K' },
  google_one:  { bg: '#4285F4', text: '#FFFFFF', short: 'Google One',  name: 'Google One',       monogram: 'G1' },
  dropbox:     { bg: '#0061FF', text: '#FFFFFF', short: 'Dropbox',     name: 'Dropbox',          monogram: 'DB' },
  canva:       { bg: '#00C4CC', text: '#FFFFFF', short: 'Canva',       name: 'Canva Pro',        monogram: 'C' },
  notion:      { bg: '#000000', text: '#FFFFFF', short: 'Notion',      name: 'Notion',           monogram: 'N' },
  chatgpt:     { bg: '#10A37F', text: '#FFFFFF', short: 'ChatGPT',     name: 'ChatGPT Plus',     monogram: 'AI' },
  adobe:       { bg: '#FF0000', text: '#FFFFFF', short: 'Adobe',       name: 'Adobe Creative Cloud', monogram: 'A' },
  figma:       { bg: '#A259FF', text: '#FFFFFF', short: 'Figma',       name: 'Figma',            monogram: 'F' },
  github:      { bg: '#181717', text: '#FFFFFF', short: 'GitHub',      name: 'GitHub Copilot',   monogram: 'GH' },
  uber:        { bg: '#000000', text: '#FFFFFF', short: 'Uber',        name: 'Uber One',         monogram: 'U' },
  didi:        { bg: '#FF7A00', text: '#FFFFFF', short: 'DiDi',        name: 'DiDi Club',        monogram: 'DD' },
  rappi_prime: { bg: '#FF441F', text: '#FFFFFF', short: 'Rappi Pro',   name: 'Rappi Pro',        monogram: 'RP' },
  mercadolibre:{ bg: '#FFE600', text: '#2D3277', short: 'Meli+',       name: 'Mercado Libre Nivel 6', monogram: 'ML' },
  amazon:      { bg: '#232F3E', text: '#FFFFFF', short: 'Amazon',      name: 'Amazon',           monogram: 'AZ' },
  walmart:     { bg: '#0071CE', text: '#FFFFFF', short: 'Walmart',     name: 'Walmart Pass',     monogram: 'W' },
  telmex:      { bg: '#00529B', text: '#FFFFFF', short: 'Telmex',      name: 'Telmex',           monogram: 'TX' },
  izzi:        { bg: '#00A3E0', text: '#FFFFFF', short: 'izzi',        name: 'izzi',             monogram: 'I' },
  totalplay:   { bg: '#5E2CED', text: '#FFFFFF', short: 'Totalplay',   name: 'Totalplay',        monogram: 'TP' },
  megacable:   { bg: '#0057B8', text: '#FFFFFF', short: 'Megacable',   name: 'Megacable',        monogram: 'MC' },
  telcel:      { bg: '#0057B8', text: '#FFFFFF', short: 'Telcel',      name: 'Telcel',           monogram: 'TC' },
  att:         { bg: '#00A8E0', text: '#FFFFFF', short: 'AT&T',        name: 'AT&T',             monogram: 'AT' },
  movistar:    { bg: '#019DF4', text: '#FFFFFF', short: 'Movistar',    name: 'Movistar',         monogram: 'MV' },
};

export const subscriptionBrandFor = (id: string | null | undefined): SubscriptionBrand | undefined =>
  id ? SUBSCRIPTION_BRANDS[id] : undefined;

export function labelType(type: Account['type']): string {
  return ({
    CASH: 'Efectivo',
    BANK: 'Banco',
    DEBIT_CARD: 'Débito',
    CREDIT_CARD: 'Crédito',
    SAVINGS: 'Ahorro',
    INVESTMENT: 'Inversión',
    DIGITAL_WALLET: 'Digital',
  } as Record<string, string>)[type] || type;
}
