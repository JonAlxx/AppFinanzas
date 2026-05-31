import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { catById } from '../data/catalog';
import { dayLabel } from '../data/format';
import { TransactionType } from '../data/types';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';

import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { TransactionRow } from '../components/TransactionRow';
import { Icon } from '../icons/Icon';

type Filter = 'ALL' | TransactionType;

const FILTERS: { id: Filter; label: string; color?: string }[] = [
  { id: 'ALL', label: 'Todos' },
  { id: 'INCOME', label: 'Ingresos', color: 'green' },
  { id: 'EXPENSE', label: 'Gastos', color: 'rose' },
  { id: 'TRANSFER', label: 'Transfers', color: 'indigo' },
];

export function TransactionsScreen() {
  const { t } = useTheme();
  const { state } = useAppState();
  const { navigate } = useNavigation();

  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let txs = [...state.transactions].sort((a, b) => b.date - a.date);
    if (filter !== 'ALL') txs = txs.filter(tx => tx.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      txs = txs.filter(tx => {
        const cat = tx.categoryId ? catById(tx.categoryId, state.customCategories) : null;
        return (tx.note || '').toLowerCase().includes(q)
          || (cat?.name || '').toLowerCase().includes(q);
      });
    }
    return txs;
  }, [state.transactions, filter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; txs: typeof filtered }>();
    for (const tx of filtered) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, { label: dayLabel(tx.date), txs: [] });
      map.get(key)!.txs.push(tx);
    }
    return Array.from(map.values());
  }, [filtered]);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader subtitle="Tus" title="Movimientos" rightIcon={null} />

      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ position: 'relative' }}>
          <View style={{ position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 }}>
            <Icon name="search" size={18} color={t.textMuted} />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar..."
            placeholderTextColor={t.textMuted}
            style={{
              paddingVertical: 12, paddingLeft: 42, paddingRight: 14,
              borderRadius: 14, borderWidth: 1, borderColor: t.border,
              backgroundColor: t.surface, color: t.text,
              fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium',
            }}
          />
        </View>
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={{ marginTop: 12 }}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
        >
          {FILTERS.map(f => (
            <Chip
              key={f.id}
              active={filter === f.id}
              onPress={() => setFilter(f.id)}
              color={f.color}
            >{f.label}</Chip>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {grouped.length === 0 ? (
          <EmptyState
            icon="list"
            title="Sin movimientos"
            message="Cuando agregues ingresos o gastos los verás aquí."
            action="Agregar movimiento"
            onAction={() => navigate('add-transaction')}
          />
        ) : grouped.map((day, i) => (
          <View key={i} style={{ marginBottom: 14 }}>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11,
              color: t.textMuted, letterSpacing: 0.6,
              paddingHorizontal: 4, paddingTop: 6, paddingBottom: 8,
              textTransform: 'uppercase',
            }}>{day.label}</Text>
            <Card padding={4}>
              {day.txs.map((tx, j) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  accounts={state.accounts}
                  customCategories={state.customCategories}
                  divider={j < day.txs.length - 1}
                  onPress={() => navigate({ screen: 'transaction-detail', id: tx.id })}
                />
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
