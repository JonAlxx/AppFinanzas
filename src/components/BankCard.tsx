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
  isHidden?: boolean;
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

export function BankCard({ acc, balance, onPress, compact, isHidden }: BankCardProps) {
  const { t } = useTheme();
  const brand = acc.brand ? brandFor(acc.brand) : undefined;
  const isCC = acc.type === 'CREDIT_CARD';

  const Wrapper = onPress ? Pressable : View;
  const wrapperProps = onPress ? { onPress } : {};

  // Non-branded layout
  if (!brand) {
    const c = colorFor(t, acc.color);
    return (
      <Wrapper {...wrapperProps as any} style={{
        borderRadius: 22, overflow: 'hidden',
        shadowColor: c, shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45, shadowRadius: 24, elevation: 8,
        height: compact ? 130 : 168,
      }}>
        <LinearGradient
          colors={[c, c + 'cc' as any]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ padding: compact ? 14 : 18, position: 'relative', overflow: 'hidden', flex: 1, justifyContent: 'space-between' }}
        >
          <View style={{ position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <View style={{ position: 'absolute', bottom: -50, left: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{
              width: compact ? 30 : 38, height: compact ? 30 : 38, borderRadius: compact ? 9 : 12, backgroundColor: 'rgba(255,255,255,0.22)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={acc.icon} size={compact ? 16 : 20} color="#fff" />
            </View>
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: compact ? 9 : 10, color: 'rgba(255,255,255,0.85)',
              letterSpacing: 0.4,
            }}>{labelType(acc.type).toUpperCase()}</Text>
          </View>
          
          <View style={{ marginTop: compact ? 4 : 18 }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: compact ? 8 : 10, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.4 }}>
              {isCC ? 'DISPONIBLE' : 'SALDO'}
            </Text>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: compact ? 18 : 22, color: '#fff',
              letterSpacing: -0.6, marginTop: 1,
              fontVariant: ['tabular-nums'],
            }}>{isHidden ? '••••' : (isCC && acc.limit ? fmtMXN(acc.limit - Math.abs(balance)) : (isCC ? fmtMXN(Math.abs(balance)) : fmtMXN(balance)))}</Text>
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: compact ? 10 : 13, color: '#fff', opacity: 0.95, marginTop: compact ? 1 : 4 }}>{acc.name}</Text>
          </View>
        </LinearGradient>
      </Wrapper>
    );
  }

  // Branded layout
  return (
    <Wrapper {...wrapperProps as any} style={{
      borderRadius: 22, overflow: 'hidden',
      backgroundColor: brand.bg,
      shadowColor: brand.bg, shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.6, shadowRadius: 24, elevation: 10,
      height: compact ? 130 : 168,
    }}>
      <View style={{ position: 'absolute', top: -60, right: -30, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)' }} />
      <View style={{ position: 'absolute', bottom: -50, left: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.04)' }} />

      <View style={{ padding: compact ? 14 : 18, paddingBottom: compact ? 12 : 16, flex: 1, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ minHeight: compact ? 20 : 28, justifyContent: 'center' }}>
            {brand.logo ? (
              <Image source={brand.logo} style={{ height: compact ? 20 : 28, width: compact ? 80 : 110, resizeMode: 'contain' }} />
            ) : (
              <Text numberOfLines={1} style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: compact ? 16 : 21,
                color: brand.text, letterSpacing: -0.6,
                includeFontPadding: false,
              }}>{brand.short}</Text>
            )}
          </View>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: compact ? 8 : 10, paddingVertical: compact ? 2 : 4, borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.18)',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
          }}>
            <Icon name={acc.icon} size={compact ? 10 : 11} color={brand.text} strokeWidth={2.5} />
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: compact ? 8 : 10, color: brand.text,
              letterSpacing: 0.3,
            }}>{labelType(acc.type).toUpperCase()}</Text>
          </View>
        </View>

        {!compact ? (
          <View style={{ marginTop: 18 }}>
            <LinearGradient
              colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.25)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ width: 30, height: 22, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
            />
          </View>
        ) : null}

        <View style={{ marginTop: compact ? 4 : 'auto', paddingTop: compact ? 0 : 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: compact ? 8 : 10, color: 'rgba(255,255,255,0.78)',
              letterSpacing: 0.4,
            }}>{isCC ? 'DISPONIBLE' : 'SALDO'}</Text>
            <Text numberOfLines={1} style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: compact ? 18 : 22, color: brand.text,
              letterSpacing: -0.6, marginTop: 1,
              fontVariant: ['tabular-nums'],
            }}>{isHidden ? '••••' : (isCC && acc.limit ? fmtMXN(acc.limit - Math.abs(balance)) : (isCC ? fmtMXN(Math.abs(balance)) : fmtMXN(balance)))}</Text>
            <Text style={{
              fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: compact ? 10 : 12, color: 'rgba(255,255,255,0.85)',
              letterSpacing: 0.4, marginTop: compact ? 1 : 4,
            }}>{acc.last4 ? `•• •• •• ${acc.last4}` : acc.name}</Text>
          </View>
          {acc.network && !compact ? <NetworkMark network={acc.network} /> : null}
        </View>
      </View>
    </Wrapper>
  );
}
