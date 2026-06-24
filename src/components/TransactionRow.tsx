import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Account, Category, Transaction, SavingsGoal } from '../data/types';
import { catById } from '../data/catalog';
import { fmtMXN, fmtTime } from '../data/format';
import { useTheme } from '../theme/ThemeContext';
import { softFor } from '../theme/theme';
import { Icon } from '../icons/Icon';
import { CategoryBadge } from './Badges';

export interface TransactionRowProps {
  tx: Transaction;
  accounts: Account[];
  goals?: SavingsGoal[];
  customCategories?: Category[];
  divider?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function TransactionRow({ tx, accounts, goals = [], customCategories = [], divider, onPress, onLongPress }: TransactionRowProps) {
  const { t } = useTheme();
  const cat = tx.categoryId ? catById(tx.categoryId, customCategories) : undefined;
  const acc = accounts.find(a => a.id === tx.accountId);
  const dest = tx.destinationAccountId ? accounts.find(a => a.id === tx.destinationAccountId) : undefined;
  const destGoal = tx.destinationGoalId ? goals.find(g => g.id === tx.destinationGoalId) : undefined;
  const isTransfer = tx.type === 'TRANSFER';
  const isIncome = tx.type === 'INCOME';
  const sign = isIncome ? '+' : isTransfer ? '' : '-';
  const amtColor = isIncome ? t.green : isTransfer ? t.indigo : t.text;
  const subtitle = isTransfer
    ? `${acc?.name} → ${destGoal ? `Meta: ${destGoal.name}` : dest?.name}`
    : `${cat?.name || 'Sin categoría'} · ${acc?.name}`;

  const Wrapper = onPress || onLongPress ? Pressable : View;
  const wrapperProps: any = {};
  if (onPress) wrapperProps.onPress = onPress;
  if (onLongPress) wrapperProps.onLongPress = onLongPress;

  return (
    <Wrapper {...wrapperProps as any} style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, paddingVertical: 12,
      borderBottomWidth: divider ? 1 : 0,
      borderBottomColor: t.border,
    }}>
      {isTransfer ? (
        <View style={{
          width: 44, height: 44, borderRadius: 14,
          backgroundColor: softFor(t, 'indigo'),
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="transfer" size={20} color={t.indigo} strokeWidth={2.2} />
        </View>
      ) : (
        <CategoryBadge cat={cat} />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{
          fontFamily: 'PlusJakartaSans_700Bold',
          fontSize: 14, color: t.text,
        }}>{tx.note || (isTransfer ? 'Transferencia' : cat?.name || 'Sin categoría')}</Text>
        <Text numberOfLines={1} style={{
          fontFamily: 'PlusJakartaSans_500Medium',
          fontSize: 12, color: t.textMuted, marginTop: 2,
        }}>{subtitle}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{
          fontFamily: 'PlusJakartaSans_800ExtraBold',
          fontSize: 14, color: amtColor,
          letterSpacing: -0.2,
          fontVariant: ['tabular-nums'],
        }}>{sign}{fmtMXN(tx.amount).replace('-', '')}</Text>
        <Text style={{
          fontFamily: 'PlusJakartaSans_500Medium',
          fontSize: 11, color: t.textMuted, marginTop: 2,
        }}>{fmtTime(tx.date)}</Text>
      </View>
    </Wrapper>
  );
}
