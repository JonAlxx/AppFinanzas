import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ScreenHeader } from '../components/ScreenHeader';
import { Icon } from '../icons/Icon';
import { useNavigation } from '../navigation/NavigationContext';

export interface PlaceholderProps {
  title: string;
  subtitle?: string;
}

export function Placeholder({ title, subtitle = 'Próximamente' }: PlaceholderProps) {
  const { t } = useTheme();
  const { back } = useNavigation();
  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title={title} leftIcon="chevron-left" onLeft={back} rightIcon={null} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{
          width: 80, height: 80, borderRadius: 24, backgroundColor: t.indigoSoft,
          alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          <Icon name="sparkles" size={36} color={t.indigo} />
        </View>
        <Text style={{
          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
          textAlign: 'center',
        }}>{subtitle}</Text>
        <Text style={{
          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: t.textMuted,
          marginTop: 6, textAlign: 'center',
        }}>Esta pantalla llegará en la siguiente fase.</Text>
      </View>
    </View>
  );
}
