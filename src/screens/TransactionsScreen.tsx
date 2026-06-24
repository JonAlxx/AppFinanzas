import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, Text, TextInput, View, Alert, Pressable } from 'react-native';

import { catById } from '../data/catalog';
import { dayLabel, fmtMXN } from '../data/format';
import { TransactionType } from '../data/types';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { softFor } from '../theme/theme';

import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { TransactionRow } from '../components/TransactionRow';
import { Icon } from '../icons/Icon';
import { Sheet } from '../components/Sheet';

type Filter = 'ALL' | TransactionType;

const FILTERS: { id: Filter; label: string; color?: string }[] = [
  { id: 'ALL', label: 'Todos' },
  { id: 'INCOME', label: 'Ingresos', color: 'green' },
  { id: 'EXPENSE', label: 'Gastos', color: 'rose' },
  { id: 'TRANSFER', label: 'Transfers', color: 'indigo' },
];

export function TransactionsScreen() {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { navigate } = useNavigation();

  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const [activeTx, setActiveTx] = useState<any>(null);

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

      <FlatList
        data={grouped}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item: day }) => (
          <View style={{ marginBottom: 14 }}>
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
                  goals={state.goals}
                  customCategories={state.customCategories}
                  divider={j < day.txs.length - 1}
                  onPress={() => navigate({ screen: 'transaction-detail', id: tx.id })}
                  onLongPress={() => setActiveTx(tx)}
                />
              ))}
            </Card>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="list"
            title="Sin movimientos"
            message="Cuando agregues ingresos o gastos los verás aquí."
            action="Agregar movimiento"
            onAction={() => navigate('add-transaction')}
          />
        }
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Quick Actions Context Menu Sheet */}
      <Sheet open={activeTx !== null} onClose={() => setActiveTx(null)} height="38%">
        {activeTx && (() => {
          const cat = activeTx.categoryId ? catById(activeTx.categoryId, state.customCategories) : undefined;
          const isIncome = activeTx.type === 'INCOME';
          const isTransfer = activeTx.type === 'TRANSFER';
          const amtColor = isIncome ? t.green : isTransfer ? t.indigo : t.text;
          const sign = isIncome ? '+' : isTransfer ? '' : '-';
          
          return (
            <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
                letterSpacing: -0.3, marginBottom: 16,
              }}>Acciones Rápidas</Text>
              
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                padding: 16, borderRadius: 18, backgroundColor: t.surfaceAlt,
                borderWidth: 1, borderColor: t.border, marginBottom: 20,
              }}>
                <View style={{
                  width: 46, height: 46, borderRadius: 14,
                  backgroundColor: softFor(t, isIncome ? 'green' : isTransfer ? 'indigo' : 'rose'),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={isTransfer ? 'transfer' : isIncome ? 'arrow-down' : 'arrow-up'} size={22} color={isIncome ? t.green : isTransfer ? t.indigo : t.rose} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: t.text,
                  }}>{activeTx.note || (isTransfer ? 'Transferencia' : cat?.name || 'Sin categoría')}</Text>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
                    marginTop: 2,
                  }}>
                    {isTransfer ? 'Transferencia de cuenta' : cat?.name || 'Gasto'}
                  </Text>
                </View>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16,
                  color: amtColor,
                  fontVariant: ['tabular-nums'],
                }}>
                  {sign}{fmtMXN(activeTx.amount).replace('-', '')}
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                <Pressable
                  onPress={() => {
                    const tx = activeTx;
                    setActiveTx(null);
                    navigate({ screen: 'add-transaction', id: tx.id, type: tx.type });
                  }}
                  style={({ pressed }) => [{
                    paddingVertical: 14,
                    borderRadius: 16,
                    backgroundColor: t.indigo,
                    alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center', gap: 8,
                    opacity: pressed ? 0.85 : 1,
                  }]}
                >
                  <Icon name="edit" size={18} color="#fff" strokeWidth={2.5} />
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold',
                    fontSize: 14,
                    color: '#fff',
                  }}>
                    Editar Movimiento
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const txId = activeTx.id;
                    setActiveTx(null);
                    Alert.alert(
                      'Eliminar Movimiento',
                      '¿Estás seguro de que deseas eliminar este movimiento permanentemente?',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Eliminar',
                          style: 'destructive',
                          onPress: () => {
                            dispatch({ type: 'DELETE_TX', id: txId });
                          },
                        },
                      ]
                    );
                  }}
                  style={({ pressed }) => [{
                    paddingVertical: 14,
                    borderRadius: 16,
                    backgroundColor: 'transparent',
                    borderWidth: 1, borderColor: t.rose,
                    alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center', gap: 8,
                    opacity: pressed ? 0.75 : 1,
                  }]}
                >
                  <Icon name="trash" size={18} color={t.rose} strokeWidth={2.5} />
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold',
                    fontSize: 14,
                    color: t.rose,
                  }}>
                    Eliminar Movimiento
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })()}
      </Sheet>
    </View>
  );
}
