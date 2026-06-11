import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: string | number;
}

export function Sheet({ open, onClose, children, height = '88%' }: SheetProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(slide, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      slide.setValue(0);
      fade.setValue(0);
    }
  }, [open, slide, fade]);

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1 }}>
        <Animated.View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.45)',
          opacity: fade,
        }}>
          <Pressable onPress={onClose} style={{ flex: 1 }} />
        </Animated.View>

        <Animated.View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: height as any,
          backgroundColor: t.surface,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.15, shadowRadius: 30, elevation: 24,
          paddingBottom: insets.bottom,
          transform: [{
            translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }),
          }],
          opacity: slide,
        }}>
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.border }} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
