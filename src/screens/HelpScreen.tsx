import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';

import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { Icon } from '../icons/Icon';

interface Faq { q: string; a: string }

const FAQS: Faq[] = [
  {
    q: '¿Cómo agrego una cuenta nueva?',
    a: 'Ve a la pestaña Cuentas y toca el botón "+" arriba a la derecha. Puedes elegir el tipo (Débito, Crédito, Efectivo, Ahorro…), darle un nombre, asociarle un banco con su logo, y poner un saldo inicial.',
  },
  {
    q: '¿Cómo registro un gasto o ingreso?',
    a: 'Toca el botón flotante "+" en el centro de la barra inferior, o usa los accesos rápidos del Inicio (Ingreso / Gasto / Transferir).',
  },
  {
    q: '¿Cómo funcionan los recurrentes?',
    a: 'Crea un recurrente (Inicio → Recurrentes → "+") indicando monto, cuenta, frecuencia y día. La app generará automáticamente el movimiento cada vez que llegue la fecha, incluso si abriste la app después de la fecha programada.',
  },
  {
    q: '¿Qué diferencia hay entre "Saldo líquido" y "Tarjetas de crédito"?',
    a: 'Saldo líquido es la suma del dinero que tienes disponible en efectivo, débito, ahorros e inversiones. Tarjetas de crédito muestra cuánto debes en tus cards. Así sabes cuánto puedes gastar realmente vs cuánto debes.',
  },
  {
    q: '¿Cómo elimino un movimiento o cuenta?',
    a: 'Movimiento: tócalo desde la lista de Movimientos y usa el botón "Eliminar". Cuenta: ve al detalle de la cuenta y toca "Eliminar". Ten en cuenta que borrar una cuenta también borra sus movimientos y recurrentes asociados.',
  },
  {
    q: '¿Mis datos se sincronizan con la nube?',
    a: 'No. Por ahora todo se guarda solo en tu teléfono. Puedes exportar tus movimientos como CSV desde Ajustes → Exportar datos.',
  },
  {
    q: '¿Cómo cambio a modo oscuro?',
    a: 'Ajustes → Modo oscuro (toggle). El cambio es instantáneo.',
  },
];

function FaqRow({ faq, open, onToggle }: { faq: Faq; open: boolean; onToggle: () => void }) {
  const { t } = useTheme();
  return (
    <View style={{ paddingHorizontal: 4 }}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [{
          paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
          opacity: pressed ? 0.7 : 1,
        }]}
      >
        <Text style={{
          flex: 1,
          fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
        }}>{faq.q}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={t.textMuted} />
      </Pressable>
      {open ? (
        <Text style={{
          paddingBottom: 14, paddingRight: 30,
          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: t.textMuted,
          lineHeight: 19,
        }}>{faq.a}</Text>
      ) : null}
    </View>
  );
}

export function HelpScreen() {
  const { t } = useTheme();
  const { back } = useNavigation();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader leftIcon="chevron-left" onLeft={back} title="Ayuda" rightIcon={null} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{
          borderRadius: 22, overflow: 'hidden',
          shadowColor: t.indigo, shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
        }}>
          <LinearGradient
            colors={[t.indigo, t.violet]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ padding: 22, alignItems: 'center' }}
          >
            <View style={{
              width: 56, height: 56, borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              <Icon name="help" size={28} color="#fff" strokeWidth={2.2} />
            </View>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: '#fff',
              letterSpacing: -0.3, textAlign: 'center',
            }}>¿Cómo te ayudamos?</Text>
            <Text style={{
              fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.85)',
              marginTop: 4, textAlign: 'center', lineHeight: 19,
            }}>Aquí están las preguntas más comunes sobre cómo usar la app.</Text>
          </LinearGradient>
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: t.text,
            paddingHorizontal: 4, marginBottom: 8,
          }}>Preguntas frecuentes</Text>
          <Card padding={4}>
            {FAQS.map((f, i) => (
              <View key={i}>
                <FaqRow
                  faq={f}
                  open={openIdx === i}
                  onToggle={() => setOpenIdx(openIdx === i ? null : i)}
                />
                {i < FAQS.length - 1 ? (
                  <View style={{ height: 1, backgroundColor: t.border, marginHorizontal: 14 }} />
                ) : null}
              </View>
            ))}
          </Card>
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: t.text,
            paddingHorizontal: 4, marginBottom: 8,
          }}>Acerca de</Text>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <LinearGradient
                colors={[t.indigo, t.violet]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{
                  width: 44, height: 44, borderRadius: 13,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 20, color: '#fff',
                }}>$</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: t.text,
                }}>Finanzas Personales</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                  marginTop: 2,
                }}>Versión 1.0.12 · React Native + Expo</Text>
              </View>
            </View>
            <Text style={{
              fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: t.textMuted,
              lineHeight: 19, marginTop: 14,
            }}>App para llevar tus finanzas personales con calma. Todos los datos se guardan localmente en tu teléfono — nada se envía a internet.</Text>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
