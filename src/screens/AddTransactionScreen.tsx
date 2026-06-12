import React, { useMemo, useRef, useState } from 'react';
import {
  Animated, Pressable, ScrollView, Text, TextInput, View, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { allCategories, catById } from '../data/catalog';
import { dayLabel, fmtMXN } from '../data/format';
import { TransactionType } from '../data/types';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';
import { computeAccountBalance } from '../data/selectors';

import { AccountBadge, CategoryBadge } from '../components/Badges';
import { AccountPickerSheet } from '../components/AccountPickerSheet';
import { FormRow } from '../components/FormRow';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { Sheet } from '../components/Sheet';
import { Icon } from '../icons/Icon';

export interface AddTransactionScreenProps {
  initialType?: TransactionType;
  editingId?: string;
}

const TYPE_OPTIONS: { id: TransactionType; label: string; color: string }[] = [
  { id: 'INCOME', label: 'Ingreso', color: 'green' },
  { id: 'EXPENSE', label: 'Gasto', color: 'rose' },
  { id: 'TRANSFER', label: 'Transferir', color: 'indigo' },
];

function formatAmountDisplay(amount: string): { whole: string; cents: string; hasDecimal: boolean } {
  const num = parseFloat(amount) || 0;
  const hasDecimal = amount.includes('.');
  if (hasDecimal) {
    const [intPart, decPart = ''] = amount.split('.');
    const intNum = parseInt(intPart, 10) || 0;
    return {
      whole: intNum.toLocaleString('es-MX'),
      cents: decPart,
      hasDecimal: true,
    };
  }
  return {
    whole: num.toLocaleString('es-MX'),
    cents: '',
    hasDecimal: false,
  };
}

export function AddTransactionScreen({ initialType = 'EXPENSE', editingId }: AddTransactionScreenProps) {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { navigate, back } = useNavigation();

  const editingTx = editingId ? state.transactions.find(x => x.id === editingId) : undefined;

  const [type, setType] = useState<TransactionType>(editingTx?.type || initialType);
  const [amount, setAmount] = useState<string>(
    editingTx ? (editingTx.amount / 100).toFixed(2) : '0'
  );
  const [categoryId, setCategoryId] = useState<string | null>(editingTx?.categoryId || null);
  const [accountId, setAccountId] = useState<string>(editingTx?.accountId || state.accounts[0]?.id);
  const [destAccountId, setDestAccountId] = useState<string>(editingTx?.destinationAccountId || state.accounts[1]?.id || '');
  const [targetGoalId, setTargetGoalId] = useState<string | null>(editingTx?.destinationGoalId || null);
  const [note, setNote] = useState<string>(editingTx?.note || '');
  const [date] = useState<number>(editingTx?.date || Date.now());
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showDestPicker, setShowDestPicker] = useState(false);
  const [showCatSheet, setShowCatSheet] = useState(false);

  const shake = useRef(new Animated.Value(0)).current;
  const amountInputRef = useRef<any>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  const cats = useMemo(
    () => allCategories(state.customCategories).filter(c => c.type === (type === 'INCOME' ? 'INCOME' : 'EXPENSE')),
    [state.customCategories, type]
  );
  const cat = categoryId ? catById(categoryId, state.customCategories) : undefined;
  const acc = state.accounts.find(a => a.id === accountId);
  const dest = state.accounts.find(a => a.id === destAccountId);
  const amtNum = parseFloat(amount) || 0;
  const canSave = amtNum > 0 && !!accountId && (type === 'TRANSFER' ? destAccountId && (targetGoalId ? true : destAccountId !== accountId) : !!categoryId);

  const typeColor = type === 'INCOME' ? t.green : type === 'EXPENSE' ? t.rose : t.indigo;

  // Removed custom numpad press handler

  function triggerShake() {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  function save() {
    if (!canSave) { triggerShake(); return; }
    const tx = {
      id: editingId || ('t' + Date.now()),
      type,
      amount: Math.round(amtNum * 100),
      date,
      accountId,
      categoryId: type === 'TRANSFER' ? null : categoryId,
      destinationAccountId: type === 'TRANSFER' ? destAccountId : null,
      note: note || null,
      destinationGoalId: type === 'TRANSFER' ? targetGoalId : null,
    };
    dispatch({ type: editingId ? 'UPDATE_TX' : 'ADD_TX', tx });

    back();
  }

  const display = formatAmountDisplay(amount);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        leftIcon="x"
        onLeft={back}
        title={editingId ? 'Editar movimiento' : 'Nuevo movimiento'}
        rightIcon={null}
        large={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TextInput
        ref={amountInputRef}
        value={amount === '0' ? '' : amount}
        onChangeText={(v) => {
          const clean = v.replace(/[^0-9.]/g, '');
          const parts = clean.split('.');
          if (parts.length > 2) return;
          setAmount(clean || '0');
        }}
        keyboardType="decimal-pad"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
        }}
      />

      {/* Amount display (Touch to edit) */}
      <Pressable
        onPress={() => amountInputRef.current?.focus()}
        style={{
          paddingHorizontal: 24, paddingTop: 10, paddingBottom: 6,
          alignItems: 'center',
        }}
      >
        <Animated.View style={{ alignItems: 'center', transform: [{ translateX: shake }] }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
            letterSpacing: 0.4,
          }}>MONTO</Text>
          <View style={{
            flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4,
            marginTop: 6,
          }}>
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: t.textMuted,
            }}>$</Text>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 48, color: typeColor,
              letterSpacing: -2,
              fontVariant: ['tabular-nums'],
            }}>{display.whole}</Text>
            {display.hasDecimal ? (
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 48, color: typeColor,
                letterSpacing: -2,
                fontVariant: ['tabular-nums'],
              }}>.{display.cents}</Text>
            ) : (
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: t.textSubtle,
              }}>.00</Text>
            )}
          </View>
        </Animated.View>
      </Pressable>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Type segment */}
        <View style={{ paddingBottom: 12, marginTop: 4 }}>
          <View style={{
            flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14,
            backgroundColor: t.surface,
            shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
          }}>
            {TYPE_OPTIONS.map(tt => {
              const active = type === tt.id;
              const c = colorFor(t, tt.color);
              return (
                <Pressable
                  key={tt.id}
                  onPress={() => { setType(tt.id); setCategoryId(null); }}
                  style={{
                    flex: 1, paddingVertical: 10, paddingHorizontal: 8,
                    borderRadius: 10,
                    backgroundColor: active ? c : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13,
                    color: active ? '#fff' : t.textMuted,
                  }}>{tt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Card padding={16}>

          {type !== 'TRANSFER' ? (
            <FormRow icon="tag" label="Categoría" onPress={() => setShowCatSheet(true)}>
              {cat ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <CategoryBadge cat={cat} size={28} radius={9} iconSize={14} />
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                  }}>{cat.name}</Text>
                </View>
              ) : (
                <Text style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: t.textMuted,
                }}>Seleccionar</Text>
              )}
            </FormRow>
          ) : null}

          <FormRow
            icon="wallet"
            label={type === 'TRANSFER' ? 'Desde' : 'Cuenta'}
            onPress={() => setShowAccountPicker(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AccountBadge acc={acc} size={28} radius={9} />
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
              }}>{acc?.name}</Text>
            </View>
          </FormRow>

          {type === 'TRANSFER' ? (
            <FormRow icon="arrow-up-right" label="Hacia" onPress={() => setShowDestPicker(true)}>
              {targetGoalId && state.goals.find(g => g.id === targetGoalId) ? (() => {
                const g = state.goals.find(x => x.id === targetGoalId)!;
                const gAcc = state.accounts.find(a => a.id === g.accountId);
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{
                      width: 28, height: 28, borderRadius: 9,
                      backgroundColor: softFor(t, g.color),
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={g.icon} size={15} color={colorFor(t, g.color)} />
                    </View>
                    <Text numberOfLines={1} style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                    }}>
                      Meta: {g.name} <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', color: t.textMuted }}>({gAcc?.name})</Text>
                    </Text>
                  </View>
                );
              })() : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AccountBadge acc={dest} size={28} radius={9} />
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                  }}>{dest?.name}</Text>
                </View>
              )}
            </FormRow>
          ) : null}

          <FormRow icon="calendar" label="Fecha">
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
              textTransform: 'capitalize',
            }}>{dayLabel(date)}</Text>
          </FormRow>

          {/* Nota (Opcional) */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            marginBottom: 4, marginTop: 14,
          }}>NOTA (OPCIONAL)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Agrega un detalle..."
            placeholderTextColor={t.textMuted}
            style={{
              paddingVertical: 10,
              borderBottomWidth: 1, borderBottomColor: t.border,
              color: t.text, fontSize: 14,
              fontFamily: 'PlusJakartaSans_500Medium',
              marginBottom: 20,
            }}
          />

          <View style={{ marginTop: 10 }}>
            <Pressable
              onPress={save}
              disabled={!canSave}
              style={({ pressed }) => [{
                borderRadius: 16, overflow: 'hidden',
                opacity: pressed ? 0.9 : 1,
                ...(canSave && {
                  shadowColor: typeColor, shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
                }),
              }]}
            >
              {canSave ? (
                <LinearGradient
                  colors={[typeColor, typeColor + 'cc' as any]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ paddingVertical: 15, alignItems: 'center' }}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff',
                    letterSpacing: -0.2,
                  }}>{editingId ? 'Guardar cambios' : 'Guardar movimiento'}</Text>
                </LinearGradient>
              ) : (
                <View style={{
                  paddingVertical: 15, alignItems: 'center',
                  backgroundColor: t.border,
                }}>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff',
                    letterSpacing: -0.2,
                  }}>{editingId ? 'Guardar cambios' : 'Guardar movimiento'}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </Card>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Sheets */}
      <Sheet open={showCatSheet} onClose={() => setShowCatSheet(false)} height="80%">
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            letterSpacing: -0.3, marginBottom: 14,
          }}>Elige una categoría</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 20 }}>
              {cats.map(c => (
                <View key={c.id} style={{ width: '25%', padding: 6 }}>
                  <Pressable
                    onPress={() => { setCategoryId(c.id); setShowCatSheet(false); }}
                    style={({ pressed }) => [{
                      paddingVertical: 10, paddingHorizontal: 4, borderRadius: 14,
                      alignItems: 'center', gap: 6,
                      backgroundColor: categoryId === c.id ? softFor(t, c.color) : 'transparent',
                      opacity: pressed ? 0.7 : 1,
                    }]}
                  >
                    <CategoryBadge cat={c} size={44} radius={14} />
                    <Text numberOfLines={2} style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.text,
                      textAlign: 'center', lineHeight: 13,
                    }}>{c.name}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Sheet>

      <AccountPickerSheet
        open={showAccountPicker}
        onClose={() => setShowAccountPicker(false)}
        accounts={state.accounts}
        transactions={state.transactions}
        selected={accountId}
        onSelect={(id) => { setAccountId(id); setShowAccountPicker(false); }}
        title="Elige cuenta"
      />
      <Sheet open={showDestPicker} onClose={() => setShowDestPicker(false)} height="75%">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 30 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            letterSpacing: -0.3, marginBottom: 14,
          }}>¿Hacia dónde transfieres?</Text>

          {/* Section: Accounts */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            letterSpacing: 0.2, marginBottom: 8, marginTop: 4,
          }}>CUENTAS</Text>
          
          {state.accounts.filter(a => a.id !== accountId).map(a => {
            const bal = computeAccountBalance(a, state.transactions);
            const isSelected = !targetGoalId && destAccountId === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => {
                  setDestAccountId(a.id);
                  setTargetGoalId(null);
                  setShowDestPicker(false);
                }}
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

          {/* Section: Savings Goals */}
          {state.goals.length > 0 ? (
            <>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                letterSpacing: 0.2, marginBottom: 8, marginTop: 16,
              }}>METAS DE AHORRO</Text>
              
              {state.goals.map(g => {
                const isSelected = targetGoalId === g.id;
                const acc = state.accounts.find(a => a.id === g.accountId);
                const gColor = colorFor(t, g.color);
                const gSoft = softFor(t, g.color);
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => {
                      setTargetGoalId(g.id);
                      setDestAccountId(g.accountId);
                      setShowDestPicker(false);
                    }}
                    style={({ pressed }) => [{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
                      backgroundColor: isSelected ? softFor(t, 'indigo') : 'transparent',
                      marginBottom: 6,
                      opacity: pressed ? 0.7 : 1,
                    }]}
                  >
                    <View style={{
                      width: 38, height: 38, borderRadius: 11, backgroundColor: gSoft,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={g.icon} size={20} color={gColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                      }}>{g.name}</Text>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                        marginTop: 2,
                      }}>
                        Ahorro en: {acc?.name || 'Cuenta'} · Meta: {fmtMXN(g.target)}
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
            </>
          ) : null}
        </ScrollView>
      </Sheet>
    </View>
  );
}
