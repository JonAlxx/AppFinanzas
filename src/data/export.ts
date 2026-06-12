import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Account, AppState, Category, Transaction } from './types';
import { catById } from './catalog';

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function transactionsToCSV(
  transactions: Transaction[],
  accounts: Account[],
  customCategories: Category[] = [],
): string {
  const accMap = new Map(accounts.map(a => [a.id, a]));
  const header = ['Fecha', 'Hora', 'Tipo', 'Monto', 'Categoría', 'Cuenta', 'Cuenta destino', 'Nota'];
  const rows: string[] = [header.map(csvEscape).join(',')];
  const sorted = [...transactions].sort((a, b) => a.date - b.date);
  for (const tx of sorted) {
    const d = new Date(tx.date);
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const cat = tx.categoryId ? catById(tx.categoryId, customCategories) : undefined;
    const acc = accMap.get(tx.accountId);
    const dest = tx.destinationAccountId ? accMap.get(tx.destinationAccountId) : undefined;
    const monto = (tx.amount / 100).toFixed(2);
    rows.push([
      fecha, hora, tx.type, monto,
      cat?.name || '',
      acc?.name || '',
      dest?.name || '',
      tx.note || '',
    ].map(csvEscape).join(','));
  }
  return rows.join('\n');
}

export async function exportTransactionsCSV(
  transactions: Transaction[],
  accounts: Account[],
  customCategories: Category[] = [],
): Promise<{ ok: true; uri: string } | { ok: false; error: string }> {
  try {
    if (transactions.length === 0) {
      return { ok: false, error: 'No hay movimientos para exportar todavía.' };
    }
    const csv = transactionsToCSV(transactions, accounts, customCategories);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `finanzas-movimientos-${stamp}.csv`;
    const docDir = (FileSystem as any).documentDirectory as string | null;
    if (!docDir) {
      return { 
        ok: false, 
        error: 'No se pudo acceder al almacenamiento. Si estás usando un APK de desarrollo, necesitas recompilar la app (npx expo run:android) para incluir los nuevos módulos nativos.' 
      };
    }
    const uri = docDir + filename;
    await (FileSystem as any).writeAsStringAsync(uri, csv, { encoding: 'utf8' });
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Exportar movimientos' });
    }
    return { ok: true, uri };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Error desconocido al exportar' };
  }
}

export async function exportAppStateJSON(
  state: AppState,
): Promise<{ ok: true; uri: string } | { ok: false; error: string }> {
  try {
    const json = JSON.stringify(state, null, 2);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `finanzas-respaldo-${stamp}.json`;
    const docDir = (FileSystem as any).documentDirectory as string | null;
    if (!docDir) {
      return { 
        ok: false, 
        error: 'No se pudo acceder al almacenamiento. Si estás usando un APK de desarrollo, necesitas recompilar la app (npx expo run:android) para incluir los nuevos módulos nativos.' 
      };
    }
    const uri = docDir + filename;
    await (FileSystem as any).writeAsStringAsync(uri, json, { encoding: 'utf8' });
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Exportar respaldo completo' });
    }
    return { ok: true, uri };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Error desconocido al exportar respaldo' };
  }
}
