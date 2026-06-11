import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';

import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';

export function ProfileScreen() {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { back } = useNavigation();

  const [name, setName] = useState(state.profile?.name || '');
  const [email, setEmail] = useState(state.profile?.email || '');
  const [phone, setPhone] = useState(state.profile?.phone || '');

  const canSave = name.trim().length > 0 && email.trim().length > 0;
  const initials = name.trim()
    ? name.trim().split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  function save() {
    if (!canSave) return;
    dispatch({
      type: 'UPDATE_PROFILE',
      profile: {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      },
    });
    back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        leftIcon="chevron-left"
        onLeft={back}
        title="Mi perfil"
        rightIcon={null}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Preview Avatar */}
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <LinearGradient
            colors={[t.indigo, t.violet]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{
              width: 84, height: 84, borderRadius: 42,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: t.indigo, shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
            }}
          >
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 30, color: '#fff',
              letterSpacing: -0.5,
            }}>{initials}</Text>
          </LinearGradient>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            marginTop: 14, letterSpacing: -0.3,
          }}>{name.trim() || 'Tu perfil'}</Text>
          <Text style={{
            fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
            marginTop: 2,
          }}>{email.trim() || 'Finanzas Personales'}</Text>
        </View>

        {/* Form Fields */}
        <Card padding={16}>
          <View style={{ gap: 18 }}>
            <View>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
                letterSpacing: 0.4, marginBottom: 4,
              }}>NOMBRE COMPLETO</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej. Luis Pérez"
                placeholderTextColor={t.textSubtle}
                style={{
                  paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border,
                  color: t.text, fontSize: 15,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                }}
              />
            </View>

            <View>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
                letterSpacing: 0.4, marginBottom: 4,
              }}>CORREO ELECTRÓNICO</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Ej. luis@ejemplo.com"
                placeholderTextColor={t.textSubtle}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border,
                  color: t.text, fontSize: 15,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                }}
              />
            </View>

            <View>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
                letterSpacing: 0.4, marginBottom: 4,
              }}>TELÉFONO MÓVIL</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Ej. +52 55 1234 5678"
                placeholderTextColor={t.textSubtle}
                keyboardType="phone-pad"
                style={{
                  paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border,
                  color: t.text, fontSize: 15,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                }}
              />
            </View>
          </View>
        </Card>

        {/* Save button */}
        <Pressable
          onPress={save}
          disabled={!canSave}
          style={({ pressed }) => [{
            marginTop: 20, borderRadius: 16, overflow: 'hidden',
            opacity: pressed ? 0.9 : 1,
            ...(canSave && {
              shadowColor: t.indigo, shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35, shadowRadius: 20, elevation: 8,
            }),
          }]}
        >
          {canSave ? (
            <LinearGradient
              colors={[t.indigo, t.indigo + 'cc' as any]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 15, alignItems: 'center' }}
            >
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff',
                letterSpacing: -0.2,
              }}>Guardar cambios</Text>
            </LinearGradient>
          ) : (
            <View style={{
              paddingVertical: 15, alignItems: 'center',
              backgroundColor: t.border,
            }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff',
                letterSpacing: -0.2,
              }}>Guardar cambios</Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
