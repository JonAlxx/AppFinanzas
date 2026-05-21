import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { softFor } from '../theme/theme';

import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { Icon } from '../icons/Icon';

export function SecurityScreen() {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { back } = useNavigation();

  const [hasHardware, setHasHardware] = useState<boolean>(true);
  const [enrolled, setEnrolled] = useState<boolean>(true);
  const [supportedTypes, setSupportedTypes] = useState<number[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const has = await LocalAuthentication.hasHardwareAsync();
        const ok = await LocalAuthentication.isEnrolledAsync();
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        setHasHardware(has);
        setEnrolled(ok);
        setSupportedTypes(types);
      } catch {
        setHasHardware(false);
      }
    })();
  }, []);

  const canUseBiometric = hasHardware && enrolled;

  const biometricName = (() => {
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Reconocimiento facial';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'Huella digital';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'Iris';
    return 'Biometría del dispositivo';
  })();

  async function tryEnable() {
    if (!canUseBiometric) {
      Alert.alert(
        'No disponible',
        !hasHardware
          ? 'Tu dispositivo no tiene biometría.'
          : 'No tienes huella o rostro configurado en tu dispositivo. Configúralo desde los Ajustes del sistema y vuelve a intentar.',
      );
      return;
    }
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirma tu identidad para activar el bloqueo',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });
    if (res.success) {
      dispatch({ type: 'SET_BIOMETRIC_LOCK', enabled: true });
    } else if (res.error !== 'user_cancel') {
      Alert.alert('No se pudo activar', 'La verificación falló. Intenta de nuevo.');
    }
  }

  function disable() {
    dispatch({ type: 'SET_BIOMETRIC_LOCK', enabled: false });
  }

  const enabled = state.biometricLock;

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader leftIcon="chevron-left" onLeft={back} title="Seguridad" rightIcon={null} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{
              width: 44, height: 44, borderRadius: 13,
              backgroundColor: softFor(t, enabled ? 'green' : 'rose'),
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="lock" size={22} color={enabled ? t.green : t.rose} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: t.text,
              }}>Bloqueo biométrico</Text>
              <Text style={{
                fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                marginTop: 2,
              }}>{canUseBiometric ? biometricName : 'No disponible en este dispositivo'}</Text>
            </View>
            <Pressable
              onPress={enabled ? disable : tryEnable}
              disabled={!canUseBiometric && !enabled}
              style={{
                width: 42, height: 24, borderRadius: 12,
                backgroundColor: enabled ? t.indigo : t.border,
                opacity: !canUseBiometric && !enabled ? 0.5 : 1,
              }}
            >
              <View style={{
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: '#fff',
                position: 'absolute', top: 2, left: enabled ? 20 : 2,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
              }} />
            </Pressable>
          </View>
          <Text style={{
            fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: t.textMuted,
            marginTop: 14, lineHeight: 19,
          }}>Cuando esté activado, la app pedirá tu huella o rostro cada vez que la abras para proteger tus datos financieros.</Text>
        </Card>

        {!canUseBiometric ? (
          <Card style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{
                width: 30, height: 30, borderRadius: 9,
                backgroundColor: softFor(t, 'orange'),
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="bolt" size={16} color={t.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text,
                }}>{!hasHardware ? 'Sin hardware biométrico' : 'Configura tu biometría primero'}</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                  marginTop: 4, lineHeight: 17,
                }}>{!hasHardware
                  ? 'Este dispositivo no soporta huella ni reconocimiento facial.'
                  : 'Ve a los Ajustes del sistema y configura una huella o rostro, luego regresa aquí.'}</Text>
              </View>
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}
