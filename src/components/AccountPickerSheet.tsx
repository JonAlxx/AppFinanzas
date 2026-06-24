import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Account, Transaction, SavingsGoal } from '../data/types';
import { fmtMXN } from '../data/format';
import { computeAccountBalance } from '../data/selectors';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';
import { Icon } from '../icons/Icon';
import { AccountBadge } from './Badges';
import { Sheet } from './Sheet';

export interface AccountPickerSheetProps {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  transactions: Transaction[];
  selected: string | null | undefined;
  onSelect: (id: string) => void;
  title: string;
  goals?: SavingsGoal[];
  selectedGoalId?: string | null;
  onSelectGoal?: (id: string) => void;
}

export function AccountPickerSheet({
  open, onClose, accounts, transactions, selected, onSelect, title,
  goals, selectedGoalId, onSelectGoal,
}: AccountPickerSheetProps) {
  const { t } = useTheme();
  return (
    <Sheet open={open} onClose={onClose} height="65%">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 }}>
        <Text style={{
          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
          letterSpacing: -0.3, marginBottom: 14,
        }}>{title}</Text>
        
        {accounts.map(a => {
          const bal = computeAccountBalance(a, transactions);
          const isSelected = selected === a.id && !selectedGoalId;
          return (
            <Pressable
              key={a.id}
              onPress={() => onSelect(a.id)}
              style={({ pressed }) => [{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
                backgroundColor: isSelected ? softFor(t, 'indigo') : 'transparent',
                marginBottom: 6,
                opacity: pressed ? 0.7 : 1,
              }]}
            >
              <AccountBadge acc={a} />
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                }}>{a.name}</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                  marginTop: 2,
                }}>{fmtMXN(bal)}</Text>
              </View>
              {isSelected ? (
                <View style={{
                  width: 22, height: 22, borderRadius: 11, backgroundColor: t.indigo,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="check" size={14} color="#fff" strokeWidth={3} />
                </View>
              ) : null}
            </Pressable>
          );
        })}

        {goals && goals.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <View style={{
              height: 1, backgroundColor: t.border, marginBottom: 14,
            }} />
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
              marginBottom: 10, letterSpacing: 0.3,
            }}>ENVIAR DIRECTO A UNA META</Text>
            
            {goals.map(g => {
              const isSelected = selectedGoalId === g.id;
              const bgSelected = softFor(t, g.color);
              const colorTheme = colorFor(t, g.color);
              return (
                <Pressable
                  key={g.id}
                  onPress={() => onSelectGoal && onSelectGoal(g.id)}
                  style={({ pressed }) => [{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
                    backgroundColor: isSelected ? bgSelected : 'transparent',
                    marginBottom: 6,
                    opacity: pressed ? 0.7 : 1,
                  }]}
                >
                  <View style={{
                    width: 32, height: 32, borderRadius: 10,
                    backgroundColor: softFor(t, g.color),
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={g.icon} size={16} color={colorFor(t, g.color)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: isSelected ? colorTheme : t.text,
                    }}>{g.name}</Text>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: isSelected ? colorTheme : t.textMuted,
                      marginTop: 2,
                    }}>
                      Meta de ahorro · En: {accounts.find(a => a.id === g.accountId)?.name}
                    </Text>
                  </View>
                  {isSelected ? (
                    <View style={{
                      width: 22, height: 22, borderRadius: 11, backgroundColor: colorTheme,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name="check" size={14} color="#fff" strokeWidth={3} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
}
