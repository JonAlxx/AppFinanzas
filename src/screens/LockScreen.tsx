import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';

import { useTheme } from '../theme/ThemeContext';
import { Icon } from '../icons/Icon';

export interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const { t } = useTheme();
  const [status, setStatus] = useState<'idle' | 'checking' | 'failed'>('idle');

  async function prompt() {
    setStatus('checking');
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquea Finanzas Personales',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });
      if (res.success) {
        onUnlock();
      } else {
        setStatus('failed');
      }
    } catch {
      setStatus('failed');
    }
  }

  useEffect(() => {
    prompt();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, padding: 24 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 120, height: 120, borderRadius: 36, overflow: 'hidden',
          shadowColor: t.indigo, shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.5, shadowRadius: 40, elevation: 15,
        }}>
          <LinearGradient
            colors={[t.indigo, t.violet]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="lock" size={60} color="#fff" strokeWidth={1.8} />
          </LinearGradient>
        </View>
        <Text style={{
          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: t.text,
          letterSpacing: -0.5, marginTop: 28, textAlign: 'center',
        }}>App bloqueada</Text>
        <Text style={{
          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14, color: t.textMuted,
          marginTop: 8, textAlign: 'center', lineHeight: 21, paddingHorizontal: 20,
        }}>Confirma tu identidad para acceder a tus finanzas.</Text>
      </View>

      <Pressable
        onPress={prompt}
        style={({ pressed }) => [{
          borderRadius: 16, overflow: 'hidden',
          opacity: pressed ? 0.9 : 1,
          shadowColor: t.indigo, shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.4, shadowRadius: 24, elevation: 10,
          marginBottom: 12,
        }]}
      >
        <LinearGradient
          colors={[t.indigo, t.violet]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
        >
          <Icon name="lock" size={18} color="#fff" />
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff',
          }}>{status === 'failed' ? 'Reintentar' : 'Desbloquear'}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
