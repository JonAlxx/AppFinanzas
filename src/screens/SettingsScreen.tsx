import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { DEFAULT_CATEGORIES } from '../data/catalog';
import { exportAppStateJSON, exportTransactionsCSV } from '../data/export';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';
import { triggerImmediateTestNotification } from '../utils/notifications';

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
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showAdminSheet, setShowAdminSheet] = useState(false);
  const [adminAmount, setAdminAmount] = useState('500');
  const [adminNote, setAdminNote] = useState('Prueba de nómina');
  const [adminIsIncome, setAdminIsIncome] = useState(true);

  const isAdmin = state.profile?.phone === '12345678123';

  const totalCategories = DEFAULT_CATEGORIES.length + state.customCategories.length;
  const customCount = state.customCategories.length;
  const currentCurrency = CURRENCY_OPTIONS.find(c => c.code === state.currency) || CURRENCY_OPTIONS[0];

  async function handleImport() {
    Alert.alert(
      'Importar datos',
      'Esto reemplazará todos tus datos actuales con la información de la copia de seguridad. ¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          style: 'default',
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
              });
              if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
              }
              const asset = result.assets[0];
              const fileContent = await (FileSystem as any).readAsStringAsync(asset.uri, { encoding: 'utf8' });
              const data = JSON.parse(fileContent);

              // Validar formato básico
              if (!data || typeof data !== 'object' || !Array.isArray(data.accounts) || !Array.isArray(data.transactions)) {
                Alert.alert('Error', 'El archivo seleccionado no es una copia de seguridad válida de esta aplicación.');
                return;
              }

              // Importar datos
              dispatch({ type: 'IMPORT_STATE', state: data });
              Alert.alert('Éxito', 'Toda tu información ha sido restaurada con éxito.');
            } catch (e: any) {
              Alert.alert('Error al importar', e?.message || 'Asegúrate de haber seleccionado un archivo JSON de copia de seguridad válido.');
            }
          }
        }
      ]
    );
  }

  function handleReset() {
    Alert.alert(
      'Borrar todos los datos',
      'Esto borra TODOS tus movimientos, cuentas, recurrentes y configuración. Esta acción no se puede deshacer. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo', style: 'destructive',
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
        <Pressable
          onPress={() => navigate('profile')}
          style={({ pressed }) => [pressed && { opacity: 0.8 }]}
        >
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <LinearGradient
              colors={[t.indigo, t.violet]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{
                width: 56, height: 56, borderRadius: 28,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: '#fff',
              }}>
                {(state.profile?.name || '').trim()
                  ? (state.profile?.name || '').trim().split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
                  : 'U'}
              </Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: t.text,
              }}>{state.profile?.name || 'Tu perfil'}</Text>
              <Text style={{
                fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                marginTop: 2,
              }}>{state.profile?.email || 'Finanzas Personales'}</Text>
            </View>
            <Icon name="chevron-right" size={18} color={t.textMuted} />
          </Card>
        </Pressable>

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
            icon="bell" color="orange" title="Alertas en el celular (Android)"
            value={
              (state.pushNotificationsEnabled ?? true)
                ? `Activo · ${state.notificationDaysBefore ?? 3}d antes · ${
                    state.notificationFrequency === 'once'
                      ? `${(state.notificationHour ?? 9) % 12 === 0 ? 12 : (state.notificationHour ?? 9) % 12}:${String(state.notificationMinute ?? 0).padStart(2, '0')} ${(state.notificationHour ?? 9) >= 12 ? 'PM' : 'AM'}`
                      : `${(state.notificationHour ?? 9) % 12 === 0 ? 12 : (state.notificationHour ?? 9) % 12}:${String(state.notificationMinute ?? 0).padStart(2, '0')} ${(state.notificationHour ?? 9) >= 12 ? 'PM' : 'AM'} y ${(state.notificationHour2 ?? 21) % 12 === 0 ? 12 : (state.notificationHour2 ?? 21) % 12}:${String(state.notificationMinute2 ?? 0).padStart(2, '0')} ${(state.notificationHour2 ?? 21) >= 12 ? 'PM' : 'AM'}`
                  }`
                : 'Desactivado'
            }
            onPress={() => navigate('notification-settings')}
          />
          {isAdmin ? (
            <>
              <Divider />
              <Row
                icon="shield" color="indigo" title="Opciones de Administrador"
                value="Panel de pruebas de notificaciones"
                onPress={() => setShowAdminSheet(true)}
              />
            </>
          ) : null}
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
            value={exporting ? 'Exportando…' : 'Exportar movimientos o respaldo'}
            onPress={() => setShowExportSheet(true)}
          />
          <Divider />
          <Row
            icon="wallet" color="indigo" title="Importar datos"
            value="Restaurar copia de seguridad (JSON)"
            onPress={handleImport}
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
          <Icon name="trash" size={18} color={t.rose} />
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.rose,
          }}>Borrar todos los datos</Text>
        </Pressable>

        <Text style={{
          textAlign: 'center', marginTop: 14,
          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textSubtle,
        }}>Finanzas Personales · v1.0.12</Text>
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

      {/* Export options sheet */}
      <Sheet open={showExportSheet} onClose={() => setShowExportSheet(false)} height="35%">
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            letterSpacing: -0.3, marginBottom: 16,
          }}>Exportar datos</Text>
          
          <View style={{ gap: 10 }}>
            <Pressable
              onPress={async () => {
                setShowExportSheet(false);
                if (exporting) return;
                setExporting(true);
                try {
                  const res = await exportTransactionsCSV(state.transactions, state.accounts, state.customCategories);
                  if (!res.ok) {
                    Alert.alert('No se pudo exportar', res.error);
                  }
                } finally {
                  setExporting(false);
                }
              }}
              style={({ pressed }) => [{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 14, borderRadius: 16, backgroundColor: t.surfaceAlt,
                borderWidth: 1, borderColor: t.border,
                opacity: pressed ? 0.75 : 1,
              }]}
            >
              <View style={{
                width: 38, height: 38, borderRadius: 11, backgroundColor: softFor(t, 'green'),
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="list" size={18} color={colorFor(t, 'green')} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text }}>
                  Exportar movimientos (CSV)
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                  Ideal para Excel o Google Sheets
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={async () => {
                setShowExportSheet(false);
                if (exporting) return;
                setExporting(true);
                try {
                  const res = await exportAppStateJSON(state);
                  if (!res.ok) {
                    Alert.alert('No se pudo exportar', res.error);
                  }
                } finally {
                  setExporting(false);
                }
              }}
              style={({ pressed }) => [{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 14, borderRadius: 16, backgroundColor: t.surfaceAlt,
                borderWidth: 1, borderColor: t.border,
                opacity: pressed ? 0.75 : 1,
              }]}
            >
              <View style={{
                width: 38, height: 38, borderRadius: 11, backgroundColor: softFor(t, 'blue'),
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="wallet" size={18} color={colorFor(t, 'blue')} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text }}>
                  Respaldo completo de la app (JSON)
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                  Para transferir a otro celular
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </Sheet>

      {/* Admin Panel Sheet */}
      <Sheet open={showAdminSheet} onClose={() => setShowAdminSheet(false)} height="65%">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            letterSpacing: -0.3, marginBottom: 10,
          }}>Panel de Administrador</Text>
          <Text style={{
            fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
            marginBottom: 16, lineHeight: 16,
          }}>
            Prueba de inmediato el funcionamiento de las notificaciones nativas en el dispositivo. Al presionar el botón, se disparará una alerta de prueba en 2 segundos.
          </Text>

          {/* Type Selector (Ingreso / Gasto) */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
            letterSpacing: 0.3, marginBottom: 6,
          }}>TIPO DE MOVIMIENTO</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
            <Pressable
              onPress={() => setAdminIsIncome(true)}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 10,
                backgroundColor: adminIsIncome ? softFor(t, 'green') : t.surfaceAlt,
                borderWidth: 1, borderColor: adminIsIncome ? t.green : t.border,
                alignItems: 'center',
              }}
            >
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                color: adminIsIncome ? t.green : t.text,
              }}>Ingreso</Text>
            </Pressable>
            <Pressable
              onPress={() => setAdminIsIncome(false)}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 10,
                backgroundColor: !adminIsIncome ? softFor(t, 'rose') : t.surfaceAlt,
                borderWidth: 1, borderColor: !adminIsIncome ? t.rose : t.border,
                alignItems: 'center',
              }}
            >
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                color: !adminIsIncome ? t.rose : t.text,
              }}>Gasto</Text>
            </Pressable>
          </View>

          {/* Amount input */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
            letterSpacing: 0.3, marginBottom: 6,
          }}>MONTO A NOTIFICAR</Text>
          <TextInput
            value={adminAmount}
            onChangeText={(v) => setAdminAmount(v.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="500"
            placeholderTextColor={t.textMuted}
            style={{
              paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
              backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border,
              color: t.text, fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold',
              marginBottom: 14,
            }}
          />

          {/* Note input */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
            letterSpacing: 0.3, marginBottom: 6,
          }}>CONCEPTO / NOTA</Text>
          <TextInput
            value={adminNote}
            onChangeText={setAdminNote}
            placeholder="Ej. Nómina quincenal"
            placeholderTextColor={t.textMuted}
            style={{
              paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
              backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border,
              color: t.text, fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold',
              marginBottom: 20,
            }}
          />

          {/* Test Button */}
          <Pressable
            onPress={async () => {
              const amountVal = parseFloat(adminAmount) || 0;
              if (amountVal <= 0) {
                Alert.alert('Monto inválido', 'Por favor ingresa un monto mayor a 0.');
                return;
              }
              try {
                await triggerImmediateTestNotification(amountVal, adminNote, adminIsIncome);
                Alert.alert(
                  'Prueba programada',
                  'La alerta de prueba se disparará exactamente en 2 segundos. Bloquea tu pantalla o sal al inicio para verla.',
                  [{ text: 'Entendido' }]
                );
              } catch (e: any) {
                if (e.message === 'expo-notifications_not_installed') {
                  Alert.alert(
                    'Librería no instalada',
                    'La librería "expo-notifications" no está instalada en el proyecto todavía. Debes completar la instalación en el código para poder disparar alertas nativas en tu celular.',
                    [{ text: 'Aceptar' }]
                  );
                } else {
                  Alert.alert('Error al probar', e?.message || 'Ocurrió un error inesperado al programar la alerta.');
                }
              }
            }}
            style={({ pressed }) => [{
              paddingVertical: 14,
              borderRadius: 16,
              backgroundColor: t.indigo,
              alignItems: 'center',
              opacity: pressed ? 0.85 : 1,
            }]}
          >
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold',
              fontSize: 14,
              color: '#fff',
            }}>
              Probar Notificación (2s)
            </Text>
          </Pressable>
        </ScrollView>
      </Sheet>
    </View>
  );
}
