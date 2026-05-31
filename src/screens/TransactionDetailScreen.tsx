import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { catById } from '../data/catalog';
import { fmtDateLong, fmtMXN, fmtTime } from '../data/format';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { softFor } from '../theme/theme';

import { CategoryBadge } from '../components/Badges';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { Icon } from '../icons/Icon';

export interface TransactionDetailScreenProps {
  txId: string;
}

function DetailRow({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  const { t } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: divider ? 1 : 0, borderBottomColor: t.border,
    }}>
      <Text style={{
        fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: t.textMuted,
      }}>{label}</Text>
      <Text numberOfLines={1} style={{
        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
        maxWidth: '60%', textAlign: 'right',
      }}>{value}</Text>
    </View>
  );
}

export function TransactionDetailScreen({ txId }: TransactionDetailScreenProps) {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { navigate, back } = useNavigation();

  const tx = state.transactions.find(x => x.id === txId);
  if (!tx) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title="Detalle" leftIcon="chevron-left" onLeft={back} rightIcon={null} />
        <View style={{ padding: 40 }}>
          <Text style={{ color: t.textMuted, fontFamily: 'PlusJakartaSans_500Medium' }}>
            Movimiento no encontrado
          </Text>
        </View>
      </View>
    );
  }

  const cat = tx.categoryId ? catById(tx.categoryId, state.customCategories) : undefined;
  const acc = state.accounts.find(a => a.id === tx.accountId);
  const dest = tx.destinationAccountId ? state.accounts.find(a => a.id === tx.destinationAccountId) : undefined;
  const isIncome = tx.type === 'INCOME';
  const isTransfer = tx.type === 'TRANSFER';
  const sign = isIncome ? '+' : isTransfer ? '' : '-';
  const color = isIncome ? t.green : isTransfer ? t.indigo : t.rose;

  const detailRows: { label: string; value: string }[] = [
    { label: 'Categoría', value: cat?.name || (isTransfer ? '—' : 'Sin categoría') },
    { label: isTransfer ? 'Desde' : 'Cuenta', value: acc?.name || '—' },
  ];
  if (dest) detailRows.push({ label: 'Hacia', value: dest.name });
  if (tx.note) detailRows.push({ label: 'Nota', value: tx.note });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        leftIcon="chevron-left"
        onLeft={back}
        title="Detalle"
        rightIcon={null}
        large={false}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          {isTransfer ? (
            <View style={{
              width: 64, height: 64, borderRadius: 20,
              backgroundColor: softFor(t, 'indigo'),
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="transfer" size={32} color={t.indigo} />
            </View>
          ) : (
            <CategoryBadge cat={cat} size={64} radius={20} iconSize={32} />
          )}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.textMuted,
            textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 14,
          }}>{isIncome ? 'Ingreso' : isTransfer ? 'Transferencia' : 'Gasto'}</Text>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color,
            letterSpacing: -1.2, marginTop: 4,
            fontVariant: ['tabular-nums'],
          }}>{sign}{fmtMXN(tx.amount).replace('-', '')}</Text>
          <Text style={{
            fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14, color: t.textMuted,
            marginTop: 6,
          }}>{fmtDateLong(tx.date)} · {fmtTime(tx.date)}</Text>
        </View>

        <Card padding={4}>
          {detailRows.map((r, i) => (
            <DetailRow key={r.label} label={r.label} value={r.value} divider={i < detailRows.length - 1} />
          ))}
        </Card>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Pressable
            onPress={() => navigate({ screen: 'add-transaction', id: tx.id })}
            style={({ pressed }) => [{
              flex: 1, paddingVertical: 13, borderRadius: 14,
              backgroundColor: t.surface,
              borderWidth: 1, borderColor: t.border,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: pressed ? 0.8 : 1,
            }]}
          >
            <Icon name="edit" size={16} color={t.text} />
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
            }}>Editar</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert(
                'Eliminar movimiento',
                '¿Seguro que quieres eliminar este movimiento? Esta acción no se puede deshacer.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Eliminar', style: 'destructive',
                    onPress: () => {
                      dispatch({ type: 'DELETE_TX', id: tx.id });
                      back();
                    },
                  },
                ],
              );
            }}
            style={({ pressed }) => [{
              flex: 1, paddingVertical: 13, borderRadius: 14,
              backgroundColor: softFor(t, 'rose'),
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: pressed ? 0.8 : 1,
            }]}
          >
            <Icon name="trash" size={16} color={t.rose} />
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.rose,
            }}>Eliminar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
