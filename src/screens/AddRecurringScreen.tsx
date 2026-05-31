import React, { useMemo, useRef, useState } from 'react';
import {
  Alert, Animated, Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { allCategories, catById, SUBSCRIPTION_BRANDS } from '../data/catalog';
import { Recurring, RecurringFrequency } from '../data/types';
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
import { SubscriptionBadge } from '../components/SubscriptionBadge';
import { Icon } from '../icons/Icon';

type Kind = 'SUBSCRIPTION' | 'EXPENSE' | 'INCOME';

interface KindOpt { id: Kind; label: string; color: string; }
const KIND_OPTIONS: KindOpt[] = [
  { id: 'SUBSCRIPTION', label: 'Suscripción', color: 'violet' },
  { id: 'EXPENSE', label: 'Gasto', color: 'rose' },
  { id: 'INCOME', label: 'Ingreso fijo', color: 'green' },
];

const FREQ_OPTIONS: { id: RecurringFrequency; label: string }[] = [
  { id: 'monthly', label: 'Mensual' },
  { id: 'biweekly', label: 'Quincenal' },
  { id: 'weekly', label: 'Semanal' },
  { id: 'yearly', label: 'Anual' },
];

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const SUB_IDS = Object.keys(SUBSCRIPTION_BRANDS);

function formatAmountDisplay(amount: string) {
  const hasDecimal = amount.includes('.');
  if (hasDecimal) {
    const [intPart, decPart = ''] = amount.split('.');
    const intNum = parseInt(intPart, 10) || 0;
    return { whole: intNum.toLocaleString('es-MX'), cents: decPart, hasDecimal: true };
  }
  return { whole: (parseFloat(amount) || 0).toLocaleString('es-MX'), cents: '', hasDecimal: false };
}

export interface AddRecurringScreenProps {
  editingId?: string;
}

export function AddRecurringScreen({ editingId }: AddRecurringScreenProps) {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { navigate, back } = useNavigation();

  const editing = editingId ? state.recurring.find(r => r.id === editingId) : undefined;

  const [kind, setKind] = useState<Kind>(() => {
    if (!editing) return 'SUBSCRIPTION';
    if (editing.type === 'INCOME') return 'INCOME';
    if (editing.subscriptionBrand) return 'SUBSCRIPTION';
    return 'EXPENSE';
  });
  const [amount, setAmount] = useState<string>(
    editing ? (editing.amount / 100).toFixed(2) : '0'
  );
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId || null);
  const [accountId, setAccountId] = useState<string>(editing?.accountId || state.accounts[0]?.id || '');
  const [subBrand, setSubBrand] = useState<string | null>(editing?.subscriptionBrand || null);
  const [note, setNote] = useState<string>(editing?.note || '');
  const [frequency, setFrequency] = useState<RecurringFrequency>(editing?.frequency || 'monthly');
  const [dayOfMonth, setDayOfMonth] = useState<number>(editing?.dayOfMonth || new Date().getDate());
  const [dayOfWeek, setDayOfWeek] = useState<number>(editing?.dayOfWeek ?? new Date().getDay());

  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCatSheet, setShowCatSheet] = useState(false);
  const [showDayMonthSheet, setShowDayMonthSheet] = useState(false);

  const shake = useRef(new Animated.Value(0)).current;

  const txType: 'INCOME' | 'EXPENSE' = kind === 'INCOME' ? 'INCOME' : 'EXPENSE';
  const cats = useMemo(
    () => allCategories(state.customCategories).filter(c => c.type === txType),
    [state.customCategories, txType]
  );
  const cat = categoryId ? catById(categoryId, state.customCategories) : undefined;
  const acc = state.accounts.find(a => a.id === accountId);
  const amtNum = parseFloat(amount) || 0;
  const isSubscription = kind === 'SUBSCRIPTION';
  const canSave = amtNum > 0 && !!accountId && (isSubscription ? !!subBrand : !!categoryId);

  const accentColor = kind === 'INCOME' ? t.green : kind === 'SUBSCRIPTION' ? t.violet : t.rose;

  function press(k: NumpadKey) {
    if (k === 'back') setAmount(prev => prev.length <= 1 ? '0' : prev.slice(0, -1));
    else if (k === '.') { if (!amount.includes('.')) setAmount(prev => prev + '.'); }
    else setAmount(prev => prev === '0' ? k : prev + k);
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
    // Compute startDate: first occurrence from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate = today.getTime();
    if (frequency === 'monthly' || frequency === 'yearly') {
      // start on dayOfMonth this month if not passed, otherwise next month
      const candidate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
      if (candidate.getTime() < today.getTime()) {
        candidate.setMonth(candidate.getMonth() + 1);
      }
      startDate = candidate.getTime();
    } else if (frequency === 'weekly' || frequency === 'biweekly') {
      const diff = (dayOfWeek - today.getDay() + 7) % 7;
      startDate = today.getTime() + diff * 86400000;
    }

    const rule: Recurring = {
      id: editing?.id || ('rec-' + Date.now()),
      type: txType,
      amount: Math.round(amtNum * 100),
      accountId,
      categoryId: isSubscription ? null : categoryId,
      note: note || null,
      frequency,
      dayOfMonth: (frequency === 'monthly' || frequency === 'yearly') ? dayOfMonth : undefined,
      dayOfWeek: (frequency === 'weekly' || frequency === 'biweekly') ? dayOfWeek : undefined,
      startDate,
      lastGenerated: editing?.lastGenerated || null,
      active: editing?.active ?? true,
      subscriptionBrand: isSubscription ? subBrand : null,
    };
    dispatch({ type: editing ? 'UPDATE_RECURRING' : 'ADD_RECURRING', rule });
    back();
  }

  const display = formatAmountDisplay(amount);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        leftIcon="x"
        onLeft={back}
        title={editingId ? 'Editar recurrente' : 'Nuevo recurrente'}
        rightIcon={editingId ? 'trash' : null}
        onRight={editingId ? () => {
          Alert.alert(
            'Eliminar recurrente',
            '¿Seguro que quieres eliminar este recurrente? No afecta los movimientos ya generados.',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Eliminar', style: 'destructive',
                onPress: () => {
                  dispatch({ type: 'DELETE_RECURRING', id: editingId });
                  back();
                },
              },
            ],
          );
        } : undefined}
        large={false}
      />

      {/* Kind segment */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={{
          flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14,
          backgroundColor: t.surface,
          shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
        }}>
          {KIND_OPTIONS.map(k => {
            const active = kind === k.id;
            const c = colorFor(t, k.color);
            return (
              <Pressable
                key={k.id}
                onPress={() => {
                  setKind(k.id);
                  setCategoryId(null);
                  if (k.id !== 'SUBSCRIPTION') setSubBrand(null);
                }}
                style={{
                  flex: 1, paddingVertical: 10, paddingHorizontal: 4,
                  borderRadius: 10,
                  backgroundColor: active ? c : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                  color: active ? '#fff' : t.textMuted,
                }}>{k.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Amount */}
      <Animated.View style={{
        paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
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
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: t.textMuted,
          }}>$</Text>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 42, color: accentColor,
            letterSpacing: -2,
            fontVariant: ['tabular-nums'],
          }}>{display.whole}</Text>
          {display.hasDecimal ? (
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 42, color: accentColor,
              letterSpacing: -2,
              fontVariant: ['tabular-nums'],
            }}>.{display.cents}</Text>
          ) : (
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: t.textSubtle,
            }}>.00</Text>
          )}
        </View>
      </Animated.View>

      <View style={{
        flex: 1, minHeight: 0,
        backgroundColor: t.surface,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 16, paddingTop: 14,
      }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Subscription brand picker */}
          {isSubscription ? (
            <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <Icon name="rotate" size={18} color={t.textMuted} />
                <Text style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: t.textMuted,
                }}>Servicio</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -16 }}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 4 }}
              >
                {SUB_IDS.map(id => {
                  const b = SUBSCRIPTION_BRANDS[id];
                  const selected = subBrand === id;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => setSubBrand(id)}
                      style={({ pressed }) => [{
                        height: 56, paddingHorizontal: 14, borderRadius: 12,
                        backgroundColor: b.bg,
                        alignItems: 'center', justifyContent: 'center',
                        minWidth: 80,
                        opacity: pressed ? 0.85 : 1,
                        ...(selected && {
                          shadowColor: b.bg, shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
                        }),
                      }]}
                    >
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_800ExtraBold',
                        fontSize: b.monogram.length > 2 ? 16 : 22,
                        color: b.text, letterSpacing: -0.4,
                      }}>{b.monogram}</Text>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9,
                        color: b.text, opacity: 0.85, marginTop: 2,
                      }}>{b.short}</Text>
                      {selected ? (
                        <View style={{
                          position: 'absolute', top: -6, right: -6,
                          width: 22, height: 22, borderRadius: 11,
                          backgroundColor: t.indigo,
                          alignItems: 'center', justifyContent: 'center',
                          borderWidth: 2, borderColor: t.surface,
                        }}>
                          <Icon name="check" size={12} color="#fff" strokeWidth={3} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
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
          )}

          <FormRow icon="wallet" label="Cuenta" onPress={() => setShowAccountPicker(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AccountBadge acc={acc} size={28} radius={9} />
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
              }}>{acc?.name || 'Elegir'}</Text>
            </View>
          </FormRow>

          {/* Frequency */}
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <Icon name="rotate" size={18} color={t.textMuted} />
              <Text style={{
                fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: t.textMuted,
              }}>Frecuencia</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {FREQ_OPTIONS.map(f => {
                const active = frequency === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setFrequency(f.id)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                      borderWidth: active ? 1.5 : 1,
                      borderColor: active ? t.indigo : t.border,
                      backgroundColor: active ? softFor(t, 'indigo') : 'transparent',
                    }}
                  >
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                      color: active ? t.indigo : t.text,
                    }}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Day picker */}
          {(frequency === 'monthly' || frequency === 'yearly') ? (
            <FormRow icon="calendar" label="Día del mes" onPress={() => setShowDayMonthSheet(true)}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
              }}>Día {dayOfMonth}</Text>
            </FormRow>
          ) : (
            <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <Icon name="calendar" size={18} color={t.textMuted} />
                <Text style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: t.textMuted,
                }}>Día de la semana</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {DAYS_OF_WEEK.map((d, i) => {
                  const active = dayOfWeek === i;
                  return (
                    <Pressable
                      key={i}
                      onPress={() => setDayOfWeek(i)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                        borderWidth: active ? 1.5 : 1,
                        borderColor: active ? t.indigo : t.border,
                        backgroundColor: active ? softFor(t, 'indigo') : 'transparent',
                      }}
                    >
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                        color: active ? t.indigo : t.text,
                      }}>{d}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <FormRow icon="note" label="Nota" stack>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Ej. Renta departamento"
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
                  shadowColor: accentColor, shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
                }),
              }]}
            >
              {canSave ? (
                <LinearGradient
                  colors={[accentColor, accentColor + 'cc' as any]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ paddingVertical: 15, alignItems: 'center' }}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff',
                  }}>{editingId ? 'Guardar cambios' : 'Crear recurrente'}</Text>
                </LinearGradient>
              ) : (
                <View style={{
                  paddingVertical: 15, alignItems: 'center',
                  backgroundColor: t.border,
                }}>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff',
                  }}>{editingId ? 'Guardar cambios' : 'Crear recurrente'}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </View>

      <Numpad onPress={press} />

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

      <Sheet open={showDayMonthSheet} onClose={() => setShowDayMonthSheet(false)} height="60%">
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            letterSpacing: -0.3, marginBottom: 14,
          }}>Día del mes</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
              const selected = dayOfMonth === d;
              return (
                <View key={d} style={{ width: '14.2857%', padding: 4 }}>
                  <Pressable
                    onPress={() => { setDayOfMonth(d); setShowDayMonthSheet(false); }}
                    style={({ pressed }) => [{
                      height: 44, borderRadius: 12,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: selected ? t.indigo : 'transparent',
                      borderWidth: selected ? 0 : 1,
                      borderColor: t.border,
                      opacity: pressed ? 0.7 : 1,
                    }]}
                  >
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14,
                      color: selected ? '#fff' : t.text,
                      fontVariant: ['tabular-nums'],
                    }}>{d}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </Sheet>
    </View>
  );
}
