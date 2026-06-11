import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Account } from '../data/types';
import { brandFor, labelType } from '../data/catalog';
import { fmtMXN } from '../data/format';
import { useTheme } from '../theme/ThemeContext';
import { colorFor } from '../theme/theme';
import { Icon } from '../icons/Icon';

export interface BankCardProps {
  acc: Account;
  balance: number;
  onPress?: () => void;
  compact?: boolean;
}

function NetworkMark({ network }: { network?: string }) {
  if (network === 'visa' || network === 'mastercard') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#EB001B', marginRight: -8, opacity: 0.95 }} />
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#F79E1B', opacity: 0.95 }} />
      </View>
    );
  }
  return null;
}

export function BankCard({ acc, balance, onPress, compact }: BankCardProps) {
  const { t } = useTheme();
  const brand = acc.brand ? brandFor(acc.brand) : undefined;
  const isCC = acc.type === 'CREDIT_CARD';

  const Wrapper = onPress ? Pressable : View;
  const wrapperProps = onPress ? { onPress } : {};

  if (!brand) {
    const c = colorFor(t, acc.color);
    return (
      <Wrapper {...wrapperProps as any} style={{
        borderRadius: 22, overflow: 'hidden',
        shadowColor: c, shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45, shadowRadius: 24, elevation: 8,
      }}>
        <LinearGradient
          colors={[c, c + 'cc' as any]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ padding: 18, position: 'relative', overflow: 'hidden' }}
        >
          <View style={{ position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <View style={{ position: 'absolute', bottom: -50, left: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{
              width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.22)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={acc.icon} size={20} color="#fff" />
            </View>
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: 'rgba(255,255,255,0.85)',
              letterSpacing: 0.4,
            }}>{labelType(acc.type).toUpperCase()}</Text>
          </View>
          <View style={{ marginTop: 18 }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.4 }}>
              {isCC ? 'DISPONIBLE' : 'SALDO'}
            </Text>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: '#fff',
              letterSpacing: -0.6, marginTop: 2,
              fontVariant: ['tabular-nums'],
            }}>{isCC && acc.limit ? fmtMXN(acc.limit - Math.abs(balance)) : (isCC ? fmtMXN(Math.abs(balance)) : fmtMXN(balance))}</Text>
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#fff', opacity: 0.95, marginTop: 4 }}>{acc.name}</Text>
          </View>
        </LinearGradient>
      </Wrapper>
    );
  }

  return (
    <Wrapper {...wrapperProps as any} style={{
      borderRadius: 22, overflow: 'hidden',
      backgroundColor: brand.bg,
      shadowColor: brand.bg, shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.6, shadowRadius: 24, elevation: 10,
      minHeight: compact ? undefined : 168,
    }}>
      <View style={{ position: 'absolute', top: -60, right: -30, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)' }} />
      <View style={{ position: 'absolute', bottom: -50, left: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.04)' }} />

      <View style={{ padding: 18, paddingBottom: 16, flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ minHeight: 28, justifyContent: 'center' }}>
            {brand.logo ? (
              <Image source={brand.logo} style={{ height: 28, width: 110, resizeMode: 'contain' }} />
            ) : (
              <Text numberOfLines={1} style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 21,
                color: brand.text, letterSpacing: -0.6,
                includeFontPadding: false,
              }}>{brand.short}</Text>
            )}
          </View>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.18)',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
          }}>
            <Icon name={acc.icon} size={11} color={brand.text} strokeWidth={2.5} />
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: brand.text,
              letterSpacing: 0.3,
            }}>{labelType(acc.type).toUpperCase()}</Text>
          </View>
        </View>

        <View style={{ marginTop: 18 }}>
          <LinearGradient
            colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.25)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ width: 30, height: 22, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
          />
        </View>

        <View style={{ marginTop: 'auto', paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: 'rgba(255,255,255,0.78)',
              letterSpacing: 0.4,
            }}>{isCC ? 'DISPONIBLE' : 'SALDO'}</Text>
            <Text numberOfLines={1} style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: brand.text,
              letterSpacing: -0.6, marginTop: 2,
              fontVariant: ['tabular-nums'],
            }}>{isCC && acc.limit ? fmtMXN(acc.limit - Math.abs(balance)) : (isCC ? fmtMXN(Math.abs(balance)) : fmtMXN(balance))}</Text>
            <Text style={{
              fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'rgba(255,255,255,0.85)',
              letterSpacing: 0.4, marginTop: 4,
            }}>{acc.last4 ? `•• •• •• ${acc.last4}` : acc.name}</Text>
          </View>
          {acc.network ? <NetworkMark network={acc.network} /> : null}
        </View>
      </View>
    </Wrapper>
  );
}
