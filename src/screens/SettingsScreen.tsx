import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { DEFAULT_CATEGORIES } from '../data/catalog';
import { exportTransactionsCSV } from '../data/export';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';

import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { Sheet } from '../components/Sheet';
import { Icon, IconName } from '../icons/Icon';

interface RowProps {
  icon: IconName;
  color: string;
  title: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  on?: boolean;
  onToggle?: () => void;
}

function Row({ icon, color, title, value, onPress, toggle, on, onToggle }: RowProps) {
  const { t } = useTheme();

  const inner = (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: 16, paddingVertical: 14,
    }}>
      <View style={{
        width: 36, height: 36, borderRadius: 11, backgroundColor: softFor(t, color),
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={18} color={colorFor(t, color)} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
        }}>{title}</Text>
        {value ? (
          <Text style={{
            fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
            marginTop: 2,
          }}>{value}</Text>
        ) : null}
      </View>
      {toggle ? (
        <Pressable onPress={onToggle} style={{
          width: 42, height: 24, borderRadius: 12,
          backgroundColor: on ? t.indigo : t.border,
          position: 'relative',
        }}>
          <View style={{
            position: 'absolute', top: 2, left: on ? 20 : 2,
            width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2, shadowRadius: 3, elevation: 2,
          }} />
        </Pressable>
      ) : onPress ? (
        <Icon name="chevron-right" size={18} color={t.textMuted} />
      ) : null}
    </View>
  );

  if (toggle) return <View>{inner}</View>;
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
        {inner}
      </Pressable>
    );
  }
  return <View>{inner}</View>;
}

function Divider() {
  const { t } = useTheme();
  return <View style={{ height: 1, backgroundColor: t.border, marginHorizontal: 16 }} />;
}

const CURRENCY_OPTIONS = [
  { code: 'MXN', name: 'Peso mexicano', symbol: '$' },
  { code: 'USD', name: 'Dólar estadounidense', symbol: 'US$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'COP', name: 'Peso colombiano', symbol: '$' },
  { code: 'ARS', name: 'Peso argentino', symbol: '$' },
  { code: 'CLP', name: 'Peso chileno', symbol: '$' },
  { code: 'BRL', name: 'Real brasileño', symbol: 'R$' },
  { code: 'GBP', name: 'Libra esterlina', symbol: '£' },
];

export function SettingsScreen() {
  const { t, dark } = useTheme();
  const { state, dispatch } = useAppState();
  const { navigate } = useNavigation();
  const [showCurrencySheet, setShowCurrencySheet] = useState(false);
  const [exporting, setExporting] = useState(false);

  const totalCategories = DEFAULT_CATEGORIES.length + state.customCategories.length;
  const customCount = state.customCategories.length;
  const currentCurrency = CURRENCY_OPTIONS.find(c => c.code === state.currency) || CURRENCY_OPTIONS[0];

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await exportTransactionsCSV(state.transactions, state.accounts, state.customCategories);
      if (!result.ok) {
        Alert.alert('No se pudo exportar', result.error);
      }
    } finally {
      setExporting(false);
    }
  }

  function handleReset() {
    Alert.alert(
      'Cerrar sesión y resetear',
      'Esto borra TODOS tus movimientos, cuentas, recurrentes y configuración. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetear', style: 'destructive',
          onPress: () => dispatch({ type: 'RESET' }),
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader subtitle="Tus" title="Ajustes" rightIcon={null} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <LinearGradient
            colors={[t.indigo, t.violet]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{
              width: 56, height: 56, borderRadius: 28,
              alignItems: 'center', justifyContent: 'center',
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: t.text,
            }}>Tu perfil</Text>
            <Text style={{
              fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
              marginTop: 2,
            }}>Toca para personalizar</Text>
          </View>
          <Icon name="edit" size={18} color={t.textMuted} />
        </Card>

        <Card style={{ marginTop: 14, padding: 4 }}>
          <Row
            icon="moon" color="indigo" title="Modo oscuro"
            toggle on={dark} onToggle={() => dispatch({ type: 'TOGGLE_THEME' })}
          />
          <Divider />
          <Row
            icon="bell" color="orange" title="Notificaciones"
            value={`${state.notifications.filter(n => !n.read).length} sin leer`}
            onPress={() => navigate('notifications')}
          />
          <Divider />
          <Row
            icon="globe" color="teal" title="Moneda"
            value={`${currentCurrency.code} — ${currentCurrency.name}`}
            onPress={() => setShowCurrencySheet(true)}
          />
          <Divider />
          <Row
            icon="tag" color="violet" title="Categorías"
            value={customCount > 0 ? `${totalCategories} (${customCount} personalizadas)` : `${totalCategories} categorías`}
            onPress={() => navigate('categories')}
          />
        </Card>

        <Card style={{ marginTop: 14, padding: 4 }}>
          <Row
            icon="lock" color="rose" title="Seguridad"
            value={state.biometricLock ? 'Bloqueo activado' : 'Sin bloqueo'}
            onPress={() => navigate('security')}
          />
          <Divider />
          <Row
            icon="send" color="green" title="Exportar datos"
            value={exporting ? 'Exportando…' : `${state.transactions.length} movimientos · CSV`}
            onPress={handleExport}
          />
          <Divider />
          <Row
            icon="help" color="blue" title="Ayuda"
            onPress={() => navigate('help')}
          />
        </Card>

        <Pressable
          onPress={handleReset}
          style={({ pressed }) => [{
            marginTop: 14, paddingVertical: 14, borderRadius: 16,
            borderWidth: 1, borderColor: t.border,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: pressed ? 0.7 : 1,
          }]}
        >
          <Icon name="logout" size={18} color={t.rose} />
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.rose,
          }}>Cerrar sesión</Text>
        </Pressable>

        <Text style={{
          textAlign: 'center', marginTop: 14,
          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textSubtle,
        }}>Finanzas Personales · v0.7</Text>
      </ScrollView>

      {/* Currency picker sheet */}
      <Sheet open={showCurrencySheet} onClose={() => setShowCurrencySheet(false)} height="65%">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            letterSpacing: -0.3, marginBottom: 14,
          }}>Elige tu moneda</Text>
          {CURRENCY_OPTIONS.map(c => {
            const selected = state.currency === c.code;
            return (
              <Pressable
                key={c.code}
                onPress={() => {
                  dispatch({ type: 'SET_CURRENCY', currency: c.code });
                  setShowCurrencySheet(false);
                }}
                style={({ pressed }) => [{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
                  backgroundColor: selected ? softFor(t, 'indigo') : 'transparent',
                  marginBottom: 6,
                  opacity: pressed ? 0.7 : 1,
                }]}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: t.surfaceAlt,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text,
                  }}>{c.symbol}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                  }}>{c.code}</Text>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                    marginTop: 2,
                  }}>{c.name}</Text>
                </View>
                {selected ? (
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
        </ScrollView>
      </Sheet>
    </View>
  );
}
