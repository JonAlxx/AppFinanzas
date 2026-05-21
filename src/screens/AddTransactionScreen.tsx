import React, { useMemo, useRef, useState } from 'react';
import {
  Animated, Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { allCategories, catById } from '../data/catalog';
import { dayLabel } from '../data/format';
import { TransactionType } from '../data/types';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';

import { AccountBadge, CategoryBadge } from '../components/Badges';
import { AccountPickerSheet } from '../components/AccountPickerSheet';
import { FormRow } from '../components/FormRow';
import { Numpad, NumpadKey } from '../components/Numpad';
import { ScreenHeader } from '../components/ScreenHeader';
import { Sheet } from '../components/Sheet';

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
  const [note, setNote] = useState<string>(editingTx?.note || '');
  const [date] = useState<number>(editingTx?.date || Date.now());
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showDestPicker, setShowDestPicker] = useState(false);
  const [showCatSheet, setShowCatSheet] = useState(false);

  const shake = useRef(new Animated.Value(0)).current;

  const cats = useMemo(
    () => allCategories(state.customCategories).filter(c => c.type === (type === 'INCOME' ? 'INCOME' : 'EXPENSE')),
    [state.customCategories, type]
  );
  const cat = categoryId ? catById(categoryId, state.customCategories) : undefined;
  const acc = state.accounts.find(a => a.id === accountId);
  const dest = state.accounts.find(a => a.id === destAccountId);
  const amtNum = parseFloat(amount) || 0;
  const canSave = amtNum > 0 && (type === 'TRANSFER' ? destAccountId && destAccountId !== accountId : !!categoryId);

  const typeColor = type === 'INCOME' ? t.green : type === 'EXPENSE' ? t.rose : t.indigo;

  function press(k: NumpadKey) {
    if (k === 'back') {
      setAmount(prev => prev.length <= 1 ? '0' : prev.slice(0, -1));
    } else if (k === '.') {
      if (!amount.includes('.')) setAmount(prev => prev + '.');
    } else {
      setAmount(prev => prev === '0' ? k : prev + k);
    }
  }

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
    };
    dispatch({ type: editingId ? 'UPDATE_TX' : 'ADD_TX', tx });
    navigate('dashboard');
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

      {/* Type segment */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
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

      {/* Amount display */}
      <Animated.View style={{
        paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8,
        alignItems: 'center',
        transform: [{ translateX: shake }],
      }}>
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

      {/* Form panel */}
      <View style={{
        flex: 1, minHeight: 0,
        backgroundColor: t.surface,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 16, paddingTop: 18,
        shadowColor: '#0F172A', shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 4,
      }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AccountBadge acc={dest} size={28} radius={9} />
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                }}>{dest?.name}</Text>
              </View>
            </FormRow>
          ) : null}

          <FormRow icon="calendar" label="Fecha">
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
              textTransform: 'capitalize',
            }}>{dayLabel(date)}</Text>
          </FormRow>

          <FormRow icon="note" label="Nota" stack>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Agrega un detalle..."
              placeholderTextColor={t.textMuted}
              style={{
                paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
                borderWidth: 1, borderColor: t.border,
                backgroundColor: t.bg, color: t.text,
                fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14,
              }}
            />
          </FormRow>

          <View style={{ marginTop: 18 }}>
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
        </ScrollView>
      </View>

      {/* Numpad pinned at bottom */}
      <Numpad onPress={press} />

      {/* Sheets */}
      <Sheet open={showCatSheet} onClose={() => setShowCatSheet(false)} height="70%">
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            letterSpacing: -0.3, marginBottom: 14,
          }}>Elige una categoría</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
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
      <AccountPickerSheet
        open={showDestPicker}
        onClose={() => setShowDestPicker(false)}
        accounts={state.accounts.filter(a => a.id !== accountId)}
        transactions={state.transactions}
        selected={destAccountId}
        onSelect={(id) => { setDestAccountId(id); setShowDestPicker(false); }}
        title="Hacia cuenta"
      />
    </View>
  );
}
