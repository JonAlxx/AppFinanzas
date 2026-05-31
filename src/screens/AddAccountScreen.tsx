import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
  { id: 'DIGITAL_WALLET', label: 'Cartera', icon: 'wallet' },
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
  const [balance, setBalance] = useState(editing ? (editing.initial / 100).toFixed(2) : '');
  const [color, setColor] = useState(editing?.color || 'indigo');
  const [icon, setIcon] = useState<IconName>((editing?.icon as IconName) || 'card');
  const [brand, setBrand] = useState<string | null>(editing?.brand || null);
  const [last4, setLast4] = useState(editing?.last4 || '');
  const [network, setNetwork] = useState<NetworkType | null>(editing?.network || null);

  const accColor = colorFor(t, color);
  const balanceNum = parseFloat(balance) || 0;
  const isCardLike = type === 'DEBIT_CARD' || type === 'CREDIT_CARD';

  function save() {
    if (!name) return;
    const newAcc: Account = {
      id: editing?.id || ('acc-' + Date.now()),
      name,
      type,
      initial: Math.round(balanceNum * 100),
      color,
      icon,
    };
    if (brand) {
      newAcc.brand = brand;
      if (isCardLike && last4) newAcc.last4 = last4;
      if (isCardLike && network) newAcc.network = network;
    }
    // preserve limit if editing
    if (editing?.limit) newAcc.limit = editing.limit;

    dispatch({ type: editing ? 'UPDATE_ACC' : 'ADD_ACC', acc: newAcc });
    back();
  }

  // Preview account object for BankCard rendering
  const previewAcc: Account = {
    id: 'preview',
    name: name || 'Nombre de cuenta',
    type,
    initial: Math.round(balanceNum * 100),
    color,
    icon,
    ...(brand && {
      brand,
      ...(isCardLike && last4 && { last4 }),
      ...(isCardLike && network && { network }),
    }),
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        leftIcon="x"
        onLeft={back}
        title={editing ? 'Editar cuenta' : 'Nueva cuenta'}
        rightIcon={null}
        large={false}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Preview */}
        <View style={{ marginBottom: 18 }}>
          {brand ? (
            <BankCard acc={previewAcc} balance={Math.round(balanceNum * 100)} />
          ) : (
            <View style={{
              borderRadius: 22, overflow: 'hidden',
              shadowColor: accColor, shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
            }}>
              <LinearGradient
                colors={[accColor, accColor + 'cc' as any]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ padding: 22 }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 14,
                    backgroundColor: 'rgba(255,255,255,0.22)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={icon} size={22} color="#fff" />
                  </View>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: 'rgba(255,255,255,0.8)',
                  }}>{TYPES.find(x => x.id === type)?.label.toUpperCase()}</Text>
                </View>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: 'rgba(255,255,255,0.8)',
                  letterSpacing: 0.3, marginTop: 18,
                }}>SALDO</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24, color: '#fff',
                  letterSpacing: -0.6, marginTop: 2,
                  fontVariant: ['tabular-nums'],
                }}>${balanceNum.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#fff', opacity: 0.9,
                  marginTop: 8,
                }}>{name || 'Nombre de cuenta'}</Text>
              </LinearGradient>
            </View>
          )}
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
                      style={{ height: 28, width: 70, resizeMode: 'contain' }}
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
    </View>
  );
}
