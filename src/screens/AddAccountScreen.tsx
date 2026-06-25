import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { BRANDS } from '../data/catalog';
import { Account, AccountType, NetworkType } from '../data/types';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';

import { BankCard } from '../components/BankCard';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { Icon, IconName } from '../icons/Icon';

interface TypeOption { id: AccountType; label: string; icon: IconName }

const TYPES: TypeOption[] = [
  { id: 'CASH', label: 'Efectivo', icon: 'cash' },
  { id: 'DEBIT_CARD', label: 'Débito', icon: 'card' },
  { id: 'CREDIT_CARD', label: 'Crédito', icon: 'card' },
  { id: 'SAVINGS', label: 'Ahorro', icon: 'piggy' },
  { id: 'INVESTMENT', label: 'Inversión', icon: 'trending' },
  { id: 'DIGITAL_WALLET', label: 'Vales de despensa', icon: 'wallet' },
];

const COLORS = ['indigo', 'violet', 'green', 'rose', 'orange', 'blue', 'teal', 'yellow'];

const BRAND_IDS = Object.keys(BRANDS);

export interface AddAccountScreenProps {
  editingId?: string;
}

export function AddAccountScreen({ editingId }: AddAccountScreenProps) {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { navigate, back } = useNavigation();

  const editing = editingId ? state.accounts.find(a => a.id === editingId) : undefined;

  const [name, setName] = useState(editing?.name || '');
  const [type, setType] = useState<AccountType>(editing?.type || 'DEBIT_CARD');
  const [balance, setBalance] = useState(() => {
    if (!editing) return '';
    const val = editing.initial / 100;
    if (editing.type === 'CREDIT_CARD' && editing.limit) {
      const available = (editing.limit - Math.abs(editing.initial)) / 100;
      return available.toFixed(2);
    }
    return val.toFixed(2);
  });
  const [limit, setLimit] = useState(editing?.limit ? (editing.limit / 100).toFixed(2) : '');
  const [color, setColor] = useState(editing?.color || 'indigo');
  const [icon, setIcon] = useState<IconName>((editing?.icon as IconName) || 'card');
  const [brand, setBrand] = useState<string | null>(editing?.brand || null);
  const [last4, setLast4] = useState(editing?.last4 || '');
  const [network, setNetwork] = useState<NetworkType | null>(editing?.network || null);
  const [statementDay, setStatementDay] = useState(editing?.statementDay ? String(editing.statementDay) : '');
  const [paymentDay, setPaymentDay] = useState(editing?.paymentDay ? String(editing.paymentDay) : '');
  const [interestRate, setInterestRate] = useState(editing?.interestRate ? String(editing.interestRate) : '');
  const [customBrandName, setCustomBrandName] = useState(editing?.customBrandName || '');
  const [customBrandColor, setCustomBrandColor] = useState(() => {
    if (editing?.customBrandColor) {
      const found = COLORS.find(c => colorFor(t, c) === editing.customBrandColor);
      return found || 'indigo';
    }
    return 'indigo';
  });
  const [showModal, setShowModal] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalColor, setModalColor] = useState('indigo');
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const customBrands = state.customBrands || [];

  function handleLongPressCustomBrand(cb: { id: string; name: string; color: string }) {
    Alert.alert(
      'Gestionar Banco',
      `¿Qué deseas hacer con el banco "${cb.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Editar',
          onPress: () => {
            setEditingBrandId(cb.id);
            setModalName(cb.name);
            const foundColor = COLORS.find(c => colorFor(t, c) === cb.color) || 'indigo';
            setModalColor(foundColor);
            setShowModal(true);
          }
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Eliminar Banco',
              `¿Seguro que quieres eliminar "${cb.name}" de tus bancos guardados?`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: () => {
                    dispatch({ type: 'DELETE_CUSTOM_BRAND', id: cb.id });
                    if (brand === cb.id) {
                      setBrand(null);
                      setCustomBrandName('');
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  }

  const accColor = colorFor(t, color);
  const balanceNum = parseFloat(balance) || 0;
  const isCardLike = type === 'DEBIT_CARD' || type === 'CREDIT_CARD' || type === 'DIGITAL_WALLET';

  function save() {
    if (!name) return;
    const isCC = type === 'CREDIT_CARD';
    
    let finalInitial = balanceNum;
    let limitCents: number | undefined;
    
    if (isCC) {
      const limitNum = parseFloat(limit) || 0;
      const debt = Math.max(0, limitNum - balanceNum);
      finalInitial = -Math.abs(debt);
      limitCents = Math.round(limitNum * 100);
    }
    
    const newAcc: Account = {
      id: editing?.id || ('acc-' + Date.now()),
      name,
      type,
      initial: Math.round(finalInitial * 100),
      color,
      icon,
    };
    if (brand) {
      newAcc.brand = brand;
      if (brand === 'custom' || brand.startsWith('brand-custom-')) {
        newAcc.customBrandName = customBrandName || 'Banco';
        newAcc.customBrandColor = brand.startsWith('brand-custom-') ? (state.customBrands?.find(cb => cb.id === brand)?.color || colorFor(t, customBrandColor)) : colorFor(t, customBrandColor);
      }
      if (isCardLike && last4) newAcc.last4 = last4;
      if (isCardLike && network) newAcc.network = network;
    }
    
    if (isCC) {
      if (limitCents !== undefined) newAcc.limit = limitCents;
      if (statementDay) newAcc.statementDay = parseInt(statementDay);
      if (paymentDay) newAcc.paymentDay = parseInt(paymentDay);
      if (interestRate) newAcc.interestRate = parseFloat(interestRate);
    }

    dispatch({ type: editing ? 'UPDATE_ACC' : 'ADD_ACC', acc: newAcc });
    back();
  }

  // Preview account object for BankCard rendering
  const limitNum = parseFloat(limit) || 0;
  const previewInitial = type === 'CREDIT_CARD' ? -Math.max(0, limitNum - balanceNum) : balanceNum;

  const previewAcc: Account = {
    id: 'preview',
    name: name || 'Nombre de cuenta',
    type,
    initial: Math.round(previewInitial * 100),
    color,
    icon,
    ...(brand && {
      brand,
      ...((brand === 'custom' || brand.startsWith('brand-custom-')) && {
        customBrandName: customBrandName || 'Banco',
        customBrandColor: brand.startsWith('brand-custom-') ? (state.customBrands?.find(cb => cb.id === brand)?.color || colorFor(t, customBrandColor)) : colorFor(t, customBrandColor),
      }),
      ...(isCardLike && last4 && { last4 }),
      ...(isCardLike && network && { network }),
    }),
  };
  if (type === 'CREDIT_CARD') {
    previewAcc.limit = Math.round(limitNum * 100);
    if (statementDay) previewAcc.statementDay = parseInt(statementDay);
    if (paymentDay) previewAcc.paymentDay = parseInt(paymentDay);
    if (interestRate) previewAcc.interestRate = parseFloat(interestRate);
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        leftIcon="x"
        onLeft={back}
        title={editing ? 'Editar cuenta' : 'Nueva cuenta'}
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
        {/* Preview */}
        <View style={{ marginBottom: 18 }}>
          <BankCard acc={previewAcc} balance={Math.round(previewInitial * 100)} />
        </View>

        <Card padding={16}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            marginBottom: 8,
          }}>NOMBRE</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej. BBVA Débito"
            placeholderTextColor={t.textMuted}
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1, borderBottomColor: t.border,
              color: t.text, fontSize: 15,
              fontFamily: 'PlusJakartaSans_600SemiBold',
            }}
          />

          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            marginTop: 18, marginBottom: 8,
          }}>TIPO</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TYPES.map(tt => {
              const active = type === tt.id;
              return (
                <Pressable
                  key={tt.id}
                  onPress={() => { setType(tt.id); setIcon(tt.icon); }}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                    borderWidth: active ? 1.5 : 1,
                    borderColor: active ? t.indigo : t.border,
                    backgroundColor: active ? softFor(t, 'indigo') : 'transparent',
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                  }}
                >
                  <Icon name={tt.icon} size={14} color={active ? t.indigo : t.textMuted} />
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                    color: active ? t.indigo : t.text,
                  }}>{tt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Brand picker */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            marginTop: 18, marginBottom: 8,
          }}>BANCO (OPCIONAL)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 4 }}
          >
            {/* "Ninguno" chip */}
            <Pressable
              onPress={() => setBrand(null)}
              style={({ pressed }) => [{
                height: 56, paddingHorizontal: 16, borderRadius: 12,
                backgroundColor: t.surfaceAlt,
                borderWidth: brand === null ? 2 : 1,
                borderColor: brand === null ? t.indigo : t.border,
                alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.8 : 1, minWidth: 80,
              }]}
            >
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                color: brand === null ? t.indigo : t.textMuted,
              }}>Ninguno</Text>
            </Pressable>

            {BRAND_IDS.map(id => {
              const b = BRANDS[id];
              const selected = brand === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setBrand(id)}
                  style={({ pressed }) => [{
                    height: 56, paddingHorizontal: 14, borderRadius: 12,
                    backgroundColor: b.bg,
                    borderWidth: selected ? 3 : 0,
                    borderColor: '#fff',
                    alignItems: 'center', justifyContent: 'center',
                    minWidth: 90,
                    opacity: pressed ? 0.85 : 1,
                    ...(selected && {
                      shadowColor: b.bg, shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
                    }),
                  }]}
                >
                  {b.logo ? (
                    <Image
                      source={b.logo}
                      style={{ 
                        height: 32, 
                        width: 75, 
                        resizeMode: 'contain' 
                      }}
                    />
                  ) : (
                    <Text numberOfLines={1} style={{
                      fontFamily: 'PlusJakartaSans_800ExtraBold',
                      fontSize: b.short.length > 6 ? 13 : 17,
                      color: b.text,
                      letterSpacing: -0.3,
                    }}>{b.short}</Text>
                  )}
                  {selected ? (
                    <View style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: t.indigo,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 2, borderColor: t.bg,
                    }}>
                      <Icon name="check" size={12} color="#fff" strokeWidth={3} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}

            {customBrands.map(cb => {
              const selected = brand === cb.id;
              return (
                <Pressable
                  key={cb.id}
                  onPress={() => {
                    setBrand(cb.id);
                    setCustomBrandName(cb.name);
                    const foundColor = COLORS.find(c => colorFor(t, c) === cb.color) || 'indigo';
                    setCustomBrandColor(foundColor);
                  }}
                  onLongPress={() => handleLongPressCustomBrand(cb)}
                  style={({ pressed }) => [{
                    height: 56, paddingHorizontal: 16, borderRadius: 12,
                    backgroundColor: cb.color,
                    borderWidth: selected ? 3 : 0,
                    borderColor: '#fff',
                    alignItems: 'center', justifyContent: 'center',
                    minWidth: 90,
                    opacity: pressed ? 0.85 : 1,
                    ...(selected && {
                      shadowColor: cb.color, shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
                    }),
                  }]}
                >
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold',
                    fontSize: cb.name.length > 6 ? 13 : 17,
                    color: '#FFFFFF',
                    letterSpacing: -0.3,
                  }}>{cb.name}</Text>
                  {selected ? (
                    <View style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: t.indigo,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 2, borderColor: t.bg,
                    }}>
                      <Icon name="check" size={12} color="#fff" strokeWidth={3} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}

            {/* "+" (Personalizar) chip at the very end */}
            <Pressable
              onPress={() => {
                setEditingBrandId(null);
                setModalName('');
                setModalColor('indigo');
                setShowModal(true);
              }}
              style={({ pressed }) => [{
                height: 56, width: 56, borderRadius: 12,
                backgroundColor: t.surfaceAlt,
                borderWidth: 1,
                borderColor: t.border,
                alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
              }]}
            >
              <Icon name="plus" size={18} color={t.textMuted} strokeWidth={3} />
            </Pressable>
          </ScrollView>

          {/* Card-specific fields when brand is selected */}
          {brand && isCardLike ? (
            <>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                marginTop: 18, marginBottom: 8,
              }}>ÚLTIMOS 4 DÍGITOS (OPCIONAL)</Text>
              <TextInput
                value={last4}
                onChangeText={(v) => setLast4(v.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="4821"
                placeholderTextColor={t.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1, borderBottomColor: t.border,
                  color: t.text, fontSize: 15,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontVariant: ['tabular-nums'], letterSpacing: 2,
                }}
              />

              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                marginTop: 18, marginBottom: 8,
              }}>RED (OPCIONAL)</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { id: 'visa', label: 'Visa' },
                  { id: 'mastercard', label: 'Mastercard' },
                  { id: 'amex', label: 'Amex' },
                ].map(n => {
                  const active = network === n.id;
                  return (
                    <Pressable
                      key={n.id}
                      onPress={() => setNetwork(active ? null : n.id as NetworkType)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                        borderWidth: active ? 1.5 : 1,
                        borderColor: active ? t.indigo : t.border,
                        backgroundColor: active ? softFor(t, 'indigo') : 'transparent',
                      }}
                    >
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                        color: active ? t.indigo : t.text,
                      }}>{n.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {type === 'CREDIT_CARD' ? (
            <>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                marginTop: 18, marginBottom: 8,
              }}>LÍMITE DE CRÉDITO</Text>
              <TextInput
                value={limit}
                onChangeText={(v) => {
                  const clean = v.replace(/[^0-9.]/g, '');
                  const parts = clean.split('.');
                  const normalized = parts.length > 2
                    ? parts[0] + '.' + parts.slice(1).join('')
                    : clean;
                  setLimit(normalized.slice(0, 14));
                }}
                placeholder="0.00"
                placeholderTextColor={t.textMuted}
                keyboardType="decimal-pad"
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1, borderBottomColor: t.border,
                  color: t.text, fontSize: 15,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontVariant: ['tabular-nums'],
                }}
              />

              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                marginTop: 18, marginBottom: 8,
              }}>CRÉDITO DISPONIBLE</Text>
              <TextInput
                value={balance}
                onChangeText={(v) => {
                  const clean = v.replace(/[^0-9.]/g, '');
                  const parts = clean.split('.');
                  const normalized = parts.length > 2
                    ? parts[0] + '.' + parts.slice(1).join('')
                    : clean;
                  setBalance(normalized.slice(0, 14));
                }}
                placeholder="0.00"
                placeholderTextColor={t.textMuted}
                keyboardType="decimal-pad"
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1, borderBottomColor: t.border,
                  color: t.text, fontSize: 15,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontVariant: ['tabular-nums'],
                }}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                    marginBottom: 8,
                  }}>DÍA DE CORTE</Text>
                  <TextInput
                    value={statementDay}
                    onChangeText={(v) => {
                      const clean = v.replace(/[^0-9]/g, '');
                      const num = parseInt(clean);
                      if (clean === '' || (num >= 1 && num <= 31)) {
                        setStatementDay(clean);
                      }
                    }}
                    placeholder="Ej. 15"
                    placeholderTextColor={t.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1, borderBottomColor: t.border,
                      color: t.text, fontSize: 15,
                      fontFamily: 'PlusJakartaSans_600SemiBold',
                      fontVariant: ['tabular-nums'],
                    }}
                  />
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                    marginBottom: 8,
                  }}>DÍA DE PAGO</Text>
                  <TextInput
                    value={paymentDay}
                    onChangeText={(v) => {
                      const clean = v.replace(/[^0-9]/g, '');
                      const num = parseInt(clean);
                      if (clean === '' || (num >= 1 && num <= 31)) {
                        setPaymentDay(clean);
                      }
                    }}
                    placeholder="Ej. 5"
                    placeholderTextColor={t.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1, borderBottomColor: t.border,
                      color: t.text, fontSize: 15,
                      fontFamily: 'PlusJakartaSans_600SemiBold',
                      fontVariant: ['tabular-nums'],
                    }}
                  />
                </View>
              </View>

              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                marginTop: 18, marginBottom: 8,
              }}>TASA DE INTERÉS ANUAL (CAT %)</Text>
              <TextInput
                value={interestRate}
                onChangeText={(v) => {
                  const clean = v.replace(/[^0-9.]/g, '');
                  const parts = clean.split('.');
                  const normalized = parts.length > 2
                    ? parts[0] + '.' + parts.slice(1).join('')
                    : clean;
                  setInterestRate(normalized.slice(0, 5));
                }}
                placeholder="Ej. 55.0"
                placeholderTextColor={t.textMuted}
                keyboardType="decimal-pad"
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1, borderBottomColor: t.border,
                  color: t.text, fontSize: 15,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontVariant: ['tabular-nums'],
                }}
              />

              {limit ? (
                <Text style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.indigo,
                  marginTop: 10, lineHeight: 16,
                }}>
                  De tu límite de $ {parseFloat(limit) ? parseFloat(limit).toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'}, tienes $ {parseFloat(balance) ? parseFloat(balance).toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'} de crédito disponible. Esto significa que debes la diferencia (deuda): <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold' }}>$ {Math.max(0, (parseFloat(limit) || 0) - (parseFloat(balance) || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>.
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                marginTop: 18, marginBottom: 8,
              }}>SALDO INICIAL</Text>
              <TextInput
                value={balance}
                onChangeText={(v) => {
                  const clean = v.replace(/[^0-9.]/g, '');
                  const parts = clean.split('.');
                  const normalized = parts.length > 2
                    ? parts[0] + '.' + parts.slice(1).join('')
                    : clean;
                  setBalance(normalized.slice(0, 14));
                }}
                placeholder="0.00"
                placeholderTextColor={t.textMuted}
                keyboardType="decimal-pad"
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1, borderBottomColor: t.border,
                  color: t.text, fontSize: 15,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontVariant: ['tabular-nums'],
                }}
              />
            </>
          )}

          {!brand ? (
            <>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                marginTop: 18, marginBottom: 8,
              }}>COLOR</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {COLORS.map(c => {
                  const cVal = colorFor(t, c);
                  const selected = color === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setColor(c)}
                      style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: cVal,
                        ...(selected && {
                          borderWidth: 3,
                          borderColor: t.surface,
                          shadowColor: cVal, shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 1, shadowRadius: 0, elevation: 0,
                        }),
                      }}
                    />
                  );
                })}
              </View>
            </>
          ) : null}
        </Card>

        <Pressable
          onPress={save}
          disabled={!name}
          style={({ pressed }) => [{
            marginTop: 18, borderRadius: 16, overflow: 'hidden',
            opacity: pressed ? 0.9 : 1,
            ...(name && {
              shadowColor: t.indigo, shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
            }),
          }]}
        >
          {name ? (
            <LinearGradient
              colors={[t.indigo, t.violet]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 15, alignItems: 'center' }}
            >
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff',
              }}>{editing ? 'Guardar cambios' : 'Crear cuenta'}</Text>
            </LinearGradient>
          ) : (
            <View style={{
              paddingVertical: 15, alignItems: 'center',
              backgroundColor: t.border,
            }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff',
              }}>{editing ? 'Guardar cambios' : 'Crear cuenta'}</Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Brand Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center', alignItems: 'center',
          padding: 24,
        }}>
          <Card padding={22} style={{ width: '100%', maxWidth: 340, borderRadius: 24 }}>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
              marginBottom: 16,
            }}>{editingBrandId ? 'Editar Banco' : 'Crear Banco'}</Text>

            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
              marginBottom: 8,
            }}>NOMBRE DEL BANCO</Text>
            <TextInput
              value={modalName}
              onChangeText={setModalName}
              placeholder="Ej. Rhino Bank"
              placeholderTextColor={t.textMuted}
              maxLength={15}
              style={{
                paddingVertical: 10,
                borderBottomWidth: 1, borderBottomColor: t.border,
                color: t.text, fontSize: 15,
                fontFamily: 'PlusJakartaSans_600SemiBold',
                marginBottom: 20,
              }}
            />

            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
              marginBottom: 8,
            }}>COLOR DE LA TARJETA</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
              {COLORS.map(c => {
                const cVal = colorFor(t, c);
                const selected = modalColor === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setModalColor(c)}
                    style={{
                      width: 28, height: 28, borderRadius: 14,
                      backgroundColor: cVal,
                      borderWidth: selected ? 3 : 0,
                      borderColor: t.surface,
                    }}
                  />
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable
                onPress={() => {
                  setEditingBrandId(null);
                  setShowModal(false);
                }}
                style={{ paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.textMuted,
                }}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!modalName.trim()) return;
                  if (editingBrandId) {
                    const updatedBrand = {
                      id: editingBrandId,
                      name: modalName.trim(),
                      color: colorFor(t, modalColor),
                    };
                    dispatch({ type: 'UPDATE_CUSTOM_BRAND', brand: updatedBrand });
                    if (brand === editingBrandId) {
                      setCustomBrandName(updatedBrand.name);
                      setCustomBrandColor(modalColor);
                    }
                    setEditingBrandId(null);
                  } else {
                    const newId = `brand-custom-${Date.now()}`;
                    const newBrand = {
                      id: newId,
                      name: modalName.trim(),
                      color: colorFor(t, modalColor),
                    };
                    dispatch({ type: 'ADD_CUSTOM_BRAND', brand: newBrand });
                    setBrand(newId);
                    setCustomBrandName(newBrand.name);
                    setCustomBrandColor(modalColor);
                  }
                  setShowModal(false);
                }}
                disabled={!modalName.trim()}
                style={({ pressed }) => [{
                  paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
                  backgroundColor: modalName.trim() ? t.indigo : t.border,
                  opacity: pressed ? 0.85 : 1,
                }]}
              >
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#fff',
                }}>{editingBrandId ? 'Guardar' : 'Agregar'}</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}
