import React from 'react';
import { Text, View } from 'react-native';
import { SubscriptionBrand, subscriptionBrandFor } from '../data/catalog';

export interface SubscriptionBadgeProps {
  brandId?: string | null;
  size?: number;
  radius?: number;
}

export function SubscriptionBadge({ brandId, size = 44, radius = 12 }: SubscriptionBadgeProps) {
  const brand: SubscriptionBrand | undefined = subscriptionBrandFor(brandId);
  if (!brand) {
    return (
      <View style={{
        width: size, height: size, borderRadius: radius,
        backgroundColor: '#E5E7EB',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{
          fontFamily: 'PlusJakartaSans_800ExtraBold',
          fontSize: size * 0.34,
          color: '#64748B',
        }}>?</Text>
      </View>
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: radius,
      backgroundColor: brand.bg,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: brand.monogram.length > 2 ? size * 0.28 : size * 0.40,
        color: brand.text,
        letterSpacing: -0.4,
      }}>{brand.monogram}</Text>
    </View>
  );
}
