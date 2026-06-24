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

function NetworkMark({ network, color = '#fff' }: { network?: string; color?: string }) {
  if (network === 'visa') {
    return (
      <Text style={{
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 13,
        color,
        fontStyle: 'italic',
        letterSpacing: 0.2,
      }}>VISA</Text>
    );
  }
  if (network === 'mastercard') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#EB001B', marginRight: -5, opacity: 0.95 }} />
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#F79E1B', opacity: 0.95 }} />
      </View>
    );
  }
  if (network === 'amex') {
    return (
      <View style={{
        paddingHorizontal: 5,
        paddingVertical: 2,
        backgroundColor: '#0070CD',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
      }}>
        <Text style={{
          fontFamily: 'PlusJakartaSans_800ExtraBold',
          fontSize: 8,
          color: '#fff',
          letterSpacing: 0.2,
        }}>AMEX</Text>
      </View>
    );
  }
  return null;
}

export function BankCard({ acc, balance, onPress, compact, isHidden }: BankCardProps) {
  const { t } = useTheme();
  const brand = acc.brand === 'custom' || (acc.brand && acc.brand.startsWith('brand-custom-'))
    ? { bg: acc.customBrandColor || '#1E293B', text: '#FFFFFF', short: acc.customBrandName || 'Banco', name: acc.customBrandName || 'Banco', logo: undefined }
    : (acc.brand ? brandFor(acc.brand) : undefined);
  const isCC = acc.type === 'CREDIT_CARD';

  const Wrapper = onPress ? Pressable : View;
  const wrapperProps = onPress ? { onPress } : {};

  const height = compact ? 116 : 144;
  const cardName = acc.last4 ? `•••• ${acc.last4}` : acc.name;
  const balanceText = isHidden 
    ? '••••' 
    : (isCC && acc.limit ? fmtMXN(acc.limit - Math.abs(balance)) : (isCC ? fmtMXN(Math.abs(balance)) : fmtMXN(balance)));

  // Non-branded layout
  if (!brand) {
    const c = colorFor(t, acc.color);
    return (
      <Wrapper {...wrapperProps as any} style={{
        borderRadius: 20, overflow: 'hidden',
        shadowColor: c, shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
        height,
        width: '100%',
        maxWidth: 310,
        alignSelf: 'center',
      }}>
        <LinearGradient
          colors={[c, c + 'cc' as any]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ padding: compact ? 12 : 16, flex: 1, justifyContent: 'space-between', position: 'relative' }}
        >
          {/* Decorative background shapes */}
          <View style={{ position: 'absolute', top: -60, right: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <View style={{ position: 'absolute', bottom: -50, left: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.04)' }} />

          {/* Top Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
            <View style={{
              width: compact ? 28 : 34, height: compact ? 28 : 34, borderRadius: compact ? 8 : 10,
              backgroundColor: 'rgba(255,255,255,0.22)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={acc.icon} size={compact ? 14 : 18} color="#fff" />
            </View>
            <View style={{
              paddingHorizontal: compact ? 8 : 10, paddingVertical: compact ? 2 : 4, borderRadius: 100,
              backgroundColor: 'rgba(255,255,255,0.18)',
            }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: compact ? 8 : 9, color: '#fff',
                letterSpacing: 0.4,
              }}>{labelType(acc.type).toUpperCase()}</Text>
            </View>
          </View>

          {/* Centered Content Area */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 1, marginTop: 4 }}>
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: compact ? 8 : 9, color: 'rgba(255,255,255,0.75)',
              letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 1
            }}>
              {isCC ? 'DISPONIBLE' : 'SALDO'}
            </Text>
            <Text numberOfLines={1} style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: compact ? 20 : 24, color: '#fff',
              letterSpacing: -0.5, fontVariant: ['tabular-nums'],
            }}>
              {balanceText}
            </Text>
            <Text numberOfLines={1} style={{
              fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: compact ? 10 : 12, color: 'rgba(255,255,255,0.9)',
              letterSpacing: 0.2, marginTop: 2,
            }}>
              {cardName}
            </Text>
          </View>

          {/* Floating Network Mark at the bottom right */}
          {acc.network ? (
            <View style={{ position: 'absolute', bottom: compact ? 8 : 12, right: compact ? 12 : 16, zIndex: 2 }}>
              <NetworkMark network={acc.network} color="#fff" />
            </View>
          ) : null}
        </LinearGradient>
      </Wrapper>
    );
  }

  // Branded layout
  return (
    <Wrapper {...wrapperProps as any} style={{
      borderRadius: 20, overflow: 'hidden',
      backgroundColor: brand.bg,
      shadowColor: brand.bg, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5, shadowRadius: 20, elevation: 8,
      height,
      width: '100%',
      maxWidth: 310,
      alignSelf: 'center',
    }}>
      {/* Decorative background shapes */}
      <View style={{ position: 'absolute', top: -60, right: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.05)' }} />
      <View style={{ position: 'absolute', bottom: -50, left: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.03)' }} />

      <View style={{ padding: compact ? 12 : 16, flex: 1, justifyContent: 'space-between', position: 'relative' }}>
        {/* Top Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
          <View style={{ minHeight: compact ? 20 : 28, justifyContent: 'center' }}>
            {brand.logo ? (
              <Image 
                source={brand.logo} 
                style={{ 
                  height: compact ? 20 : 28, 
                  width: compact ? 70 : 95, 
                  resizeMode: 'contain' 
                }} 
              />
            ) : (
              <Text numberOfLines={1} style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: compact ? 14 : 18,
                color: brand.text, letterSpacing: -0.5,
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
            <Icon name={acc.icon} size={compact ? 9 : 10} color={brand.text} strokeWidth={2.5} />
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: compact ? 8 : 9, color: brand.text,
              letterSpacing: 0.3,
            }}>{labelType(acc.type).toUpperCase()}</Text>
          </View>
        </View>

        {/* Centered Content Area */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 1, marginTop: 4 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: compact ? 8 : 9, color: 'rgba(255,255,255,0.72)',
            letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 1
          }}>
            {isCC ? 'DISPONIBLE' : 'SALDO'}
          </Text>
          <Text numberOfLines={1} style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: compact ? 20 : 24, color: brand.text,
            letterSpacing: -0.5, fontVariant: ['tabular-nums'],
          }}>
            {balanceText}
          </Text>
          <Text numberOfLines={1} style={{
            fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: compact ? 10 : 12, color: 'rgba(255,255,255,0.85)',
            letterSpacing: 0.2, marginTop: 2,
          }}>
            {cardName}
          </Text>
        </View>

        {/* Floating Network Mark at the bottom right */}
        {acc.network ? (
          <View style={{ position: 'absolute', bottom: compact ? 8 : 12, right: compact ? 12 : 16, zIndex: 2 }}>
            <NetworkMark network={acc.network} color={brand.text} />
          </View>
        ) : null}
      </View>
    </Wrapper>
  );
}
