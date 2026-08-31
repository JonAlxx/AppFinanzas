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
  const [msiMonths, setMsiMonths] = useState<number | null>(editingTx?.msiMonths || null);
  const [mciMonths, setMciMonths] = useState<number | null>(editingTx?.mciMonths || null);
  const [mciTotalInput, setMciTotalInput] = useState<string>(
    editingTx?.mciMonths ? (editingTx.amount / 100).toFixed(2) : ''
  );

  const acc = state.accounts.find(a => a.id === accountId);
  const isMsiActive = type === 'EXPENSE' && acc?.type === 'CREDIT_CARD' && msiMonths !== null && msiMonths > 0;
  const isMciActive = type === 'EXPENSE' && acc?.type === 'CREDIT_CARD' && mciMonths !== null && mciMonths > 0;

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
  const dest = state.accounts.find(a => a.id === destAccountId);
  const amtNum = parseFloat(amount) || 0;
  const amtCents = Math.round(amtNum * 100);

  const mciTotalNum = parseFloat(mciTotalInput) || 0;
  const mciTotalCents = Math.round(mciTotalNum * 100);

  // Effective transaction amount in cents (uses total con interés when MCI is active and custom input is entered)
  const effectiveTxCents = isMciActive && mciTotalCents > 0 ? mciTotalCents : amtCents;

  const availableFunds = useMemo(() => {
    if (!acc) return 0;
    const bal = computeAccountBalance(acc, state.transactions);
    if (acc.type === 'CREDIT_CARD') {
      return (acc.limit || 0) + bal;
    }
    return bal;
  }, [acc, state.transactions]);

  const hasSufficientFunds = type === 'INCOME' || availableFunds >= effectiveTxCents;

  const canSave = amtNum > 0 && !!accountId && hasSufficientFunds && (type === 'TRANSFER' ? destAccountId && (targetGoalId ? true : destAccountId !== accountId) : !!categoryId);

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
    const isTransferToCreditCard = type === 'TRANSFER' && dest?.type === 'CREDIT_CARD';

    if (isTransferToCreditCard && !editingId) {
      // Automatically convert transfer to credit card into paired card payment transactions
      const expenseTx = {
        id: 't-exp-' + Date.now(),
        type: 'EXPENSE' as const,
        amount: Math.round(amtNum * 100),
        date,
        accountId,
        categoryId: 'cat-debt',
        note: note || `Pago de tarjeta: ${dest.name}`,
        destinationAccountId: null,
        destinationGoalId: null,
      };
      dispatch({ type: 'ADD_TX', tx: expenseTx });

      const incomeTx = {
        id: 't-inc-' + (Date.now() + 1),
        type: 'INCOME' as const,
        amount: Math.round(amtNum * 100),
        date,
        accountId: destAccountId,
        categoryId: 'cat-debt',
        note: `Abono por pago recibido`,
        destinationAccountId: null,
        destinationGoalId: null,
      };
      dispatch({ type: 'ADD_TX', tx: incomeTx });
    } else {
      const isMci = type === 'EXPENSE' && acc?.type === 'CREDIT_CARD' && isMciActive;
      const isMsi = type === 'EXPENSE' && acc?.type === 'CREDIT_CARD' && isMsiActive;
      const finalAmountCents = isMci ? (mciTotalCents > 0 ? mciTotalCents : amtCents) : amtCents;
      const mciBaseCents = isMci ? amtCents : undefined;
      const mciRate = (isMci && mciTotalCents > amtCents && amtCents > 0)
        ? Math.round(((mciTotalCents - amtCents) / amtCents) * 100 * 10) / 10
        : undefined;

      const tx = {
        id: editingId || ('t' + Date.now()),
        type,
        amount: finalAmountCents,
        date,
        accountId,
        categoryId: type === 'TRANSFER' ? null : categoryId,
        destinationAccountId: type === 'TRANSFER' ? destAccountId : null,
        note: note || null,
        destinationGoalId: (type === 'TRANSFER' || type === 'INCOME') ? targetGoalId : null,
        msiMonths: isMsi && msiMonths ? msiMonths : undefined,
        mciMonths: isMci && mciMonths ? mciMonths : undefined,
        mciBaseAmount: isMci ? mciBaseCents : undefined,
        mciInterestRate: isMci ? mciRate : undefined,
      };
      dispatch({ type: editingId ? 'UPDATE_TX' : 'ADD_TX', tx });
    }

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
        <ScrollView
           style={{ flex: 1 }}
           contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
           keyboardShouldPersistTaps="handled"
           showsVerticalScrollIndicator={false}
         >
           {/* Amount display (Touch to edit via absolute TextInput overlay) */}
           <View
             style={{
               paddingHorizontal: 24, paddingTop: 10, paddingBottom: 6,
               alignItems: 'center',
               position: 'relative',
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
                {!hasSufficientFunds && amtNum > 0 ? (
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold',
                    fontSize: 12,
                    color: t.rose,
                    textAlign: 'center',
                    marginTop: 6,
                  }}>
                    {acc?.type === 'CREDIT_CARD' ? 'Límite de crédito insuficiente' : 'Saldo insuficiente'} en {acc?.name}
                  </Text>
                ) : null}
             </Animated.View>

            {/* Hidden TextInput overlay covering the entire amount area to intercept taps natively */}
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
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.01,
                color: 'transparent',
                backgroundColor: 'transparent',
              }}
            />
          </View>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                  <CategoryBadge cat={cat} size={28} radius={9} iconSize={14} />
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                    flexShrink: 1,
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
            {type === 'INCOME' && targetGoalId && state.goals.find(g => g.id === targetGoalId) ? (() => {
              const g = state.goals.find(x => x.id === targetGoalId)!;
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                  <View style={{
                    width: 28, height: 28, borderRadius: 9,
                    backgroundColor: softFor(t, g.color),
                    alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon name={g.icon} size={15} color={colorFor(t, g.color)} />
                  </View>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                    flexShrink: 1,
                  }}>
                    Meta: {g.name}
                  </Text>
                </View>
              );
            })() : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                <AccountBadge acc={acc} size={28} radius={9} />
                <Text numberOfLines={1} style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                  flexShrink: 1,
                }}>{acc?.name}</Text>
              </View>
            )}
          </FormRow>

          {type === 'TRANSFER' ? (
            <>
              <FormRow icon="arrow-up-right" label="Hacia" onPress={() => setShowDestPicker(true)}>
                {targetGoalId && state.goals.find(g => g.id === targetGoalId) ? (() => {
                  const g = state.goals.find(x => x.id === targetGoalId)!;
                  const gAcc = state.accounts.find(a => a.id === g.accountId);
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                      <View style={{
                        width: 28, height: 28, borderRadius: 9,
                        backgroundColor: softFor(t, g.color),
                        alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon name={g.icon} size={15} color={colorFor(t, g.color)} />
                      </View>
                      <Text numberOfLines={1} style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                        flexShrink: 1,
                      }}>
                        Meta: {g.name} <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', color: t.textMuted }}>({gAcc?.name})</Text>
                      </Text>
                    </View>
                  );
                })() : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                    <AccountBadge acc={dest} size={28} radius={9} />
                    <Text numberOfLines={1} style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                      flexShrink: 1,
                    }}>{dest?.name}</Text>
                  </View>
                )}
              </FormRow>
              {dest?.type === 'CREDIT_CARD' ? (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: '#1E293B',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  marginTop: 6,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: '#334155',
                }}>
                  <Icon name="card" size={15} color={t.indigo} />
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: 11.5,
                    color: t.textMuted,
                    flex: 1,
                    lineHeight: 15,
                  }}>
                    Has seleccionado una tarjeta de crédito (TDC). Esta transferencia se registrará automáticamente como pago a tarjeta (gasto y abono).
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}

          <FormRow icon="calendar" label="Fecha">
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
              textTransform: 'capitalize',
            }}>{dayLabel(date)}</Text>
          </FormRow>

          {/* Meses Sin Intereses */}
          {type === 'EXPENSE' && acc?.type === 'CREDIT_CARD' ? (
            <View style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 16,
              backgroundColor: t.surfaceAlt,
              borderWidth: 1,
              borderColor: isMsiActive ? t.indigo + '40' : t.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 12 }}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 10,
                    backgroundColor: isMsiActive ? softFor(t, 'indigo') : t.border + '60',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="calendar" size={16} color={isMsiActive ? colorFor(t, 'indigo') : t.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13.5, color: t.text,
                    }}>
                      ¿Meses Sin Intereses (MSI)?
                    </Text>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted,
                      marginTop: 2,
                    }}>
                      {isMsiActive ? `Diferido a ${msiMonths} meses sin intereses` : 'Difiere el pago de esta compra'}
                    </Text>
                  </View>
                </View>

                {/* Switch Deslizable */}
                <Pressable
                  onPress={() => {
                    const nextActive = !isMsiActive;
                    if (nextActive) {
                      setMciMonths(null); // Desactivar MCI si se activa MSI
                      setMsiMonths(msiMonths || 3);
                    } else {
                      setMsiMonths(null);
                    }
                  }}
                  style={{
                    width: 46, height: 26, borderRadius: 13,
                    backgroundColor: isMsiActive ? t.indigo : t.border,
                    position: 'relative',
                  }}
                >
                  <View style={{
                    position: 'absolute', top: 3, left: isMsiActive ? 23 : 3,
                    width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2, shadowRadius: 3, elevation: 2,
                  }} />
                </Pressable>
              </View>

              {/* Opciones de Meses (desplegables si el switch está activado) */}
              {isMsiActive ? (
                <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.border }}>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
                    marginBottom: 8, letterSpacing: 0.3,
                  }}>SELECCIONA LOS MESES</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {[3, 6, 9, 12, 18, 24].map((m) => {
                      const active = msiMonths === m;
                      return (
                        <Pressable
                          key={m}
                          onPress={() => setMsiMonths(m)}
                          style={{
                            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                            borderWidth: active ? 1.5 : 1,
                            borderColor: active ? t.indigo : t.border,
                            backgroundColor: active ? t.indigo : t.surface,
                            minWidth: 48, alignItems: 'center',
                          }}
                        >
                          <Text style={{
                            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13,
                            color: active ? '#fff' : t.text,
                          }}>{m} MSI</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {msiMonths ? (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      backgroundColor: softFor(t, 'indigo'),
                      padding: 10, borderRadius: 10, marginTop: 12,
                    }}>
                      <Icon name="calendar" size={14} color={t.indigo} />
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11.5, color: t.indigo,
                        flex: 1, lineHeight: 15,
                      }}>
                        Pagarás {fmtMXN(amtCents > 0 ? Math.round(amtCents / msiMonths) : 0)}/mes durante {msiMonths} meses en tu saldo al corte.
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Meses Con Intereses (MCI) */}
          {type === 'EXPENSE' && acc?.type === 'CREDIT_CARD' ? (
            <View style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 16,
              backgroundColor: t.surfaceAlt,
              borderWidth: 1,
              borderColor: isMciActive ? t.orange + '50' : t.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 12 }}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 10,
                    backgroundColor: isMciActive ? softFor(t, 'orange') : t.border + '60',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="calculator" size={16} color={isMciActive ? colorFor(t, 'orange') : t.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13.5, color: t.text,
                    }}>
                      ¿Meses Con Intereses (MCI)?
                    </Text>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted,
                      marginTop: 2,
                    }}>
                      {isMciActive ? `Diferido a ${mciMonths} meses con intereses` : 'Difiere con costo de financiamiento'}
                    </Text>
                  </View>
                </View>

                {/* Switch Deslizable */}
                <Pressable
                  onPress={() => {
                    const nextActive = !isMciActive;
                    if (nextActive) {
                      setMsiMonths(null); // Desactivar MSI si se activa MCI
                      setMciMonths(mciMonths || 3);
                    } else {
                      setMciMonths(null);
                    }
                  }}
                  style={{
                    width: 46, height: 26, borderRadius: 13,
                    backgroundColor: isMciActive ? t.orange : t.border,
                    position: 'relative',
                  }}
                >
                  <View style={{
                    position: 'absolute', top: 3, left: isMciActive ? 23 : 3,
                    width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2, shadowRadius: 3, elevation: 2,
                  }} />
                </Pressable>
              </View>

              {/* Opciones de Meses e Ingreso Manual de Total con Intereses */}
              {isMciActive ? (
                <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.border }}>
                  {/* Selector de Plazo */}
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
                    marginBottom: 8, letterSpacing: 0.3,
                  }}>SELECCIONA LOS MESES</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    {[3, 6, 9, 12, 18, 24].map((m) => {
                      const active = mciMonths === m;
                      return (
                        <Pressable
                          key={m}
                          onPress={() => setMciMonths(m)}
                          style={{
                            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                            borderWidth: active ? 1.5 : 1,
                            borderColor: active ? t.orange : t.border,
                            backgroundColor: active ? t.orange : t.surface,
                            minWidth: 48, alignItems: 'center',
                          }}
                        >
                          <Text style={{
                            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13,
                            color: active ? '#fff' : t.text,
                          }}>{m} meses</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Campo de Entrada de Total con Intereses */}
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
                    marginBottom: 6, letterSpacing: 0.3,
                  }}>TOTAL A PAGAR CON INTERESES ($)</Text>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
                    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
                  }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: t.orange }}>$</Text>
                    <TextInput
                      value={mciTotalInput}
                      onChangeText={(v) => {
                        const clean = v.replace(/[^0-9.]/g, '');
                        const parts = clean.split('.');
                        if (parts.length > 2) return;
                        setMciTotalInput(clean);
                      }}
                      placeholder={amtNum > 0 ? amtNum.toFixed(2) : "Ej. 220.00"}
                      placeholderTextColor={t.textMuted}
                      keyboardType="decimal-pad"
                      style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15,
                        color: t.text, flex: 1, padding: 0,
                      }}
                    />
                  </View>

                  {/* Desglose Transparente del Total, Intereses y Mensualidad */}
                  {mciMonths ? (() => {
                    const baseCents = amtCents;
                    const finalTotalCents = effectiveTxCents;
                    const interestCents = finalTotalCents > baseCents ? finalTotalCents - baseCents : 0;
                    const monthlyCents = Math.round(finalTotalCents / mciMonths);

                    return (
                      <View style={{
                        backgroundColor: softFor(t, 'orange'),
                        padding: 12, borderRadius: 12, marginTop: 14, gap: 6,
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted }}>Monto Original:</Text>
                          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.text }}>{fmtMXN(baseCents)}</Text>
                        </View>
                        {interestCents > 0 ? (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.orange }}>Interés Cobrado:</Text>
                            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.orange }}>+{fmtMXN(interestCents)}</Text>
                          </View>
                        ) : null}
                        <View style={{ height: 1, backgroundColor: t.orange + '30', marginVertical: 2 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: t.text }}>Total de la Deuda:</Text>
                          <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.orange }}>{fmtMXN(finalTotalCents)}</Text>
                        </View>

                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4,
                          paddingTop: 6, borderTopWidth: 1, borderTopColor: t.orange + '20',
                        }}>
                          <Icon name="calendar" size={14} color={t.orange} />
                          <Text style={{
                            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11.5, color: t.orange,
                            flex: 1, lineHeight: 15,
                          }}>
                            Pagarás {fmtMXN(monthlyCents)}/mes durante {mciMonths} meses en tu saldo al corte.
                          </Text>
                        </View>
                      </View>
                    );
                  })() : null}
                </View>
              ) : null}
            </View>
          ) : null}

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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
              letterSpacing: -0.3,
            }}>Elige una categoría</Text>
            <Pressable
              onPress={() => {
                setShowCatSheet(false);
                navigate({ screen: 'add-category' });
              }}
              style={({ pressed }) => [{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: softFor(t, 'indigo'),
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              }]}
            >
              <Icon name="plus" size={18} color={colorFor(t, 'indigo')} strokeWidth={2.5} />
            </Pressable>
          </View>
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
        onSelect={(id) => { 
          setAccountId(id); 
          setTargetGoalId(null); 
          setShowAccountPicker(false); 
        }}
        title="Elige cuenta"
        goals={type === 'INCOME' ? state.goals : undefined}
        selectedGoalId={type === 'INCOME' ? targetGoalId : null}
        onSelectGoal={(goalId) => {
          const g = state.goals.find(x => x.id === goalId);
          if (g) {
            setAccountId(g.accountId);
            setTargetGoalId(g.id);
          }
          setShowAccountPicker(false);
        }}
        onAddAccount={() => navigate({ screen: 'add-account' })}
      />
      <AccountPickerSheet
        open={showDestPicker}
        onClose={() => setShowDestPicker(false)}
        accounts={state.accounts.filter(a => a.id !== accountId)}
        transactions={state.transactions}
        selected={targetGoalId ? null : destAccountId}
        onSelect={(id) => {
          setDestAccountId(id);
          setTargetGoalId(null);
          setShowDestPicker(false);
        }}
        title="¿Hacia dónde transfieres?"
        goals={state.goals}
        selectedGoalId={targetGoalId}
        onSelectGoal={(goalId) => {
          const g = state.goals.find(x => x.id === goalId);
          if (g) {
            setTargetGoalId(g.id);
            setDestAccountId(g.accountId);
          }
          setShowDestPicker(false);
        }}
      />
    </View>
  );
}
