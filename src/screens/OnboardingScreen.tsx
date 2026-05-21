import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../theme/ThemeContext';
import { colorFor } from '../theme/theme';
import { Icon, IconName } from '../icons/Icon';

interface Slide {
  icon: IconName;
  color: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'wallet', color: 'indigo',
    title: 'Lleva tus finanzas con calma',
    body: 'Una app simple para registrar lo que entra y lo que sale, sin estresarte con hojas de cálculo.',
  },
  {
    icon: 'chart', color: 'violet',
    title: 'Entiende tu dinero',
    body: 'Mira hacia dónde se va tu mes, en qué gastas más y cómo vas con tus presupuestos.',
  },
  {
    icon: 'target', color: 'rose',
    title: 'Cumple tus metas',
    body: 'Define cuánto quieres ahorrar — para un viaje, un fondo, lo que sea — y mira cómo te acercas.',
  },
];

export interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { t } = useTheme();
  const [step, setStep] = useState(0);
  const s = SLIDES[step];
  const c = colorFor(t, s.color);

  return (
    <View style={{
      flex: 1, backgroundColor: t.bg,
      paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20,
    }}>
      {/* Top bar */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 6,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <LinearGradient
            colors={[t.indigo, t.violet]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{
              width: 28, height: 28, borderRadius: 9,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#fff',
            }}>$</Text>
          </LinearGradient>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text,
            letterSpacing: -0.3,
          }}>Finanzas</Text>
        </View>
        <Pressable onPress={onComplete}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: t.textMuted,
          }}>Saltar</Text>
        </Pressable>
      </View>

      {/* Center */}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{
          width: 200, height: 200, borderRadius: 60, alignSelf: 'center',
          marginBottom: 36, overflow: 'hidden',
          shadowColor: c, shadowOffset: { width: 0, height: 30 },
          shadowOpacity: 0.5, shadowRadius: 60, elevation: 20,
        }}>
          <LinearGradient
            colors={[c, c + 'cc' as any]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' }}
          >
            <View style={{
              position: 'absolute', top: -40, left: -40, width: 120, height: 120, borderRadius: 60,
              backgroundColor: 'rgba(255,255,255,0.15)',
            }} />
            <View style={{
              position: 'absolute', bottom: -30, right: -30, width: 100, height: 100, borderRadius: 50,
              backgroundColor: 'rgba(255,255,255,0.10)',
            }} />
            <Icon name={s.icon} size={90} color="#fff" strokeWidth={1.6} />
          </LinearGradient>
        </View>
        <Text style={{
          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: t.text,
          textAlign: 'center', letterSpacing: -0.8,
        }}>{s.title}</Text>
        <Text style={{
          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 15, color: t.textMuted,
          textAlign: 'center', lineHeight: 22, marginTop: 12, paddingHorizontal: 6,
        }}>{s.body}</Text>
      </View>

      {/* Dots */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, marginBottom: 22,
      }}>
        {SLIDES.map((_, i) => (
          <View key={i} style={{
            width: i === step ? 24 : 8, height: 8, borderRadius: 4,
            backgroundColor: i === step ? t.indigo : t.border,
          }} />
        ))}
      </View>

      {/* CTA */}
      <Pressable
        onPress={() => step < SLIDES.length - 1 ? setStep(step + 1) : onComplete()}
        style={({ pressed }) => [{
          borderRadius: 16, overflow: 'hidden',
          opacity: pressed ? 0.9 : 1,
          shadowColor: t.indigo, shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.4, shadowRadius: 24, elevation: 10,
        }]}
      >
        <LinearGradient
          colors={[t.indigo, t.violet]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingVertical: 15, alignItems: 'center' }}
        >
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff',
          }}>{step < SLIDES.length - 1 ? 'Continuar' : 'Empezar'}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
