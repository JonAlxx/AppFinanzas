import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Account, Transaction, SavingsGoal, AccountType } from '../data/types';
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
  onAddAccount?: () => void;
}

interface AccountSectionConfig {
  id: string;
  title: string;
  icon: string;
  color: string;
  types: AccountType[];
}

const SECTION_CONFIGS: AccountSectionConfig[] = [
  { id: 'cash', title: 'EFECTIVO', icon: 'cash', color: 'green', types: ['CASH'] },
  { id: 'debit', title: 'DÉBITO Y BANCOS', icon: 'card', color: 'indigo', types: ['DEBIT_CARD', 'BANK'] },
  { id: 'credit', title: 'TARJETAS DE CRÉDITO', icon: 'card', color: 'rose', types: ['CREDIT_CARD'] },
  { id: 'digital', title: 'VALES Y MONEDEROS', icon: 'wallet', color: 'orange', types: ['DIGITAL_WALLET'] },
  { id: 'savings', title: 'AHORRO E INVERSIÓN', icon: 'piggy', color: 'teal', types: ['SAVINGS', 'INVESTMENT'] },
];

export function AccountPickerSheet({
  open, onClose, accounts, transactions, selected, onSelect, title,
  goals, selectedGoalId, onSelectGoal, onAddAccount,
}: AccountPickerSheetProps) {
  const { t } = useTheme();

  // Group accounts by configured sections
  const groupedSections = useMemo(() => {
    const sections: { config: AccountSectionConfig; items: Account[] }[] = [];
    const handledAccountIds = new Set<string>();

    for (const config of SECTION_CONFIGS) {
      const items = accounts.filter(a => config.types.includes(a.type));
      if (items.length > 0) {
        sections.push({ config, items });
        items.forEach(a => handledAccountIds.add(a.id));
      }
    }

    // Fallback for any unmapped accounts
    const remaining = accounts.filter(a => !handledAccountIds.has(a.id));
    if (remaining.length > 0) {
      sections.push({
        config: { id: 'other', title: 'OTRAS CUENTAS', icon: 'wallet', color: 'blue', types: [] },
        items: remaining,
      });
    }

    return sections;
  }, [accounts]);

  return (
    <Sheet open={open} onClose={onClose} height="78%">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        {/* Header Title */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            letterSpacing: -0.3,
          }}>{title}</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [{
              width: 30, height: 30, borderRadius: 15,
              backgroundColor: t.surfaceAlt,
              alignItems: 'center', justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <Icon name="x" size={16} color={t.textMuted} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Grouped Account Sections */}
        {groupedSections.map(({ config, items }, sIdx) => {
          const sectionColor = colorFor(t, config.color);
          const sectionSoft = softFor(t, config.color);

          return (
            <View key={config.id} style={{ marginBottom: 18 }}>
              {/* Section Header */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                marginBottom: 8, marginTop: sIdx > 0 ? 4 : 0,
              }}>
                <View style={{
                  width: 24, height: 24, borderRadius: 7,
                  backgroundColor: sectionSoft,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={config.icon} size={13} color={sectionColor} strokeWidth={2.5} />
                </View>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11,
                  color: sectionColor, letterSpacing: 0.6,
                }}>
                  {config.title}
                </Text>
                <View style={{
                  paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8,
                  backgroundColor: sectionSoft, marginLeft: 2,
                }}>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10,
                    color: sectionColor,
                  }}>
                    {items.length}
                  </Text>
                </View>
                <View style={{ flex: 1, height: 1, backgroundColor: t.border, marginLeft: 4 }} />
              </View>

              {/* Section Items */}
              <View style={{ gap: 6 }}>
                {items.map(a => {
                  const bal = computeAccountBalance(a, transactions);
                  const isSelected = selected === a.id && !selectedGoalId;
                  const isCC = a.type === 'CREDIT_CARD';
                  const availableCredit = isCC && a.limit ? a.limit + bal : bal;

                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => onSelect(a.id)}
                      style={({ pressed }) => [{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
                        backgroundColor: isSelected ? softFor(t, 'indigo') : t.surfaceAlt,
                        borderWidth: 1,
                        borderColor: isSelected ? t.indigo + '50' : t.border,
                        opacity: pressed ? 0.75 : 1,
                      }]}
                    >
                      <AccountBadge acc={a} />
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                        }}>{a.name}</Text>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                          marginTop: 2, fontVariant: ['tabular-nums'],
                        }}>
                          {isCC ? `Disponible: ${fmtMXN(availableCredit)}` : fmtMXN(bal)}
                        </Text>
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
              </View>
            </View>
          );
        })}

        {/* Add New Account Button */}
        {onAddAccount && (
          <Pressable
            onPress={() => {
              onClose();
              onAddAccount();
            }}
            style={({ pressed }) => [{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
              borderWidth: 1, borderStyle: 'dashed', borderColor: t.indigo,
              backgroundColor: softFor(t, 'indigo') + '22' as any,
              marginTop: 6, marginBottom: 8,
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <View style={{
              width: 32, height: 32, borderRadius: 10,
              backgroundColor: softFor(t, 'indigo'),
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="plus" size={16} color={t.indigo} strokeWidth={3} />
            </View>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.indigo,
            }}>Agregar nueva cuenta</Text>
          </Pressable>
        )}

        {/* Section: Savings Goals */}
        {goals && goals.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <View style={{
              height: 1, backgroundColor: t.border, marginBottom: 14,
            }} />
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11, color: t.textMuted,
              marginBottom: 10, letterSpacing: 0.6,
            }}>ENVIAR DIRECTO A UNA META DE AHORRO</Text>
            
            {goals.map(g => {
              const isSelected = selectedGoalId === g.id;
              const bgSelected = softFor(t, g.color);
              const colorTheme = colorFor(t, g.color);
              const targetAcc = accounts.find(a => a.id === g.accountId);

              return (
                <Pressable
                  key={g.id}
                  onPress={() => onSelectGoal && onSelectGoal(g.id)}
                  style={({ pressed }) => [{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
                    backgroundColor: isSelected ? bgSelected : t.surfaceAlt,
                    borderWidth: 1,
                    borderColor: isSelected ? colorTheme + '50' : t.border,
                    marginBottom: 6,
                    opacity: pressed ? 0.75 : 1,
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
                      Meta de ahorro · En: {targetAcc?.name || 'Cuenta'}
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
