import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { CATEGORY_COLOR_OPTIONS, CATEGORY_ICON_OPTIONS, isCustomCategory } from '../data/catalog';
import { Category, CategoryType } from '../data/types';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';

import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { Icon } from '../icons/Icon';

export interface AddCategoryScreenProps {
  editingId?: string;
}

export function AddCategoryScreen({ editingId }: AddCategoryScreenProps) {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { back } = useNavigation();

  const editing = editingId ? state.customCategories.find(c => c.id === editingId) : undefined;
  const editingIsCustom = editingId ? isCustomCategory(editingId) : true;

  const [name, setName] = useState(editing?.name || '');
  const [type, setType] = useState<CategoryType>(editing?.type || 'EXPENSE');
  const [icon, setIcon] = useState(editing?.icon || 'tag');
  const [color, setColor] = useState(editing?.color || 'indigo');

  if (editingId && !editingIsCustom) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader leftIcon="chevron-left" onLeft={back} title="Categoría del sistema" rightIcon={null} />
        <View style={{ padding: 32, alignItems: 'center' }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: t.textMuted, textAlign: 'center',
          }}>Las categorías del sistema no se pueden editar.</Text>
        </View>
      </View>
    );
  }

  function save() {
    if (!name.trim()) return;
    const cat: Category = {
      id: editing?.id || ('cat-custom-' + Date.now()),
      name: name.trim(),
      type,
      icon,
      color,
    };
    dispatch({ type: editing ? 'UPDATE_CATEGORY' : 'ADD_CATEGORY', cat });
    back();
  }

  const accentColor = colorFor(t, color);
  const accentSoft = softFor(t, color);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        leftIcon="x"
        onLeft={back}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
        rightIcon={null}
        large={false}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Preview */}
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 24, backgroundColor: accentSoft,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={icon} size={42} color={accentColor} strokeWidth={2.2} />
          </View>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            marginTop: 10, letterSpacing: -0.3,
          }}>{name || 'Tu categoría'}</Text>
        </View>

        <Card padding={16}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            marginBottom: 8,
          }}>NOMBRE</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej. Mascotas"
            placeholderTextColor={t.textMuted}
            style={{
              paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border,
              color: t.text, fontSize: 15,
              fontFamily: 'PlusJakartaSans_600SemiBold',
            }}
          />

          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            marginTop: 18, marginBottom: 8,
          }}>TIPO</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { id: 'EXPENSE' as CategoryType, label: 'Gasto', c: 'rose' },
              { id: 'INCOME' as CategoryType, label: 'Ingreso', c: 'green' },
            ].map(opt => {
              const active = type === opt.id;
              const ac = colorFor(t, opt.c);
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setType(opt.id)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 12,
                    borderWidth: active ? 1.5 : 1,
                    borderColor: active ? ac : t.border,
                    backgroundColor: active ? softFor(t, opt.c) : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13,
                    color: active ? ac : t.text,
                  }}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            marginTop: 18, marginBottom: 8,
          }}>ÍCONO</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {CATEGORY_ICON_OPTIONS.map(ic => {
              const selected = icon === ic;
              return (
                <View key={ic} style={{ width: '14.2857%', padding: 4 }}>
                  <Pressable
                    onPress={() => setIcon(ic)}
                    style={({ pressed }) => [{
                      aspectRatio: 1, borderRadius: 12,
                      backgroundColor: selected ? accentSoft : t.surfaceAlt,
                      borderWidth: selected ? 2 : 0,
                      borderColor: accentColor,
                      alignItems: 'center', justifyContent: 'center',
                      opacity: pressed ? 0.7 : 1,
                    }]}
                  >
                    <Icon name={ic} size={20} color={selected ? accentColor : t.textMuted} strokeWidth={2.2} />
                  </Pressable>
                </View>
              );
            })}
          </View>

          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            marginTop: 18, marginBottom: 8,
          }}>COLOR</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {CATEGORY_COLOR_OPTIONS.map(c => {
              const cVal = colorFor(t, c);
              const selected = color === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: cVal,
                    ...(selected && {
                      borderWidth: 3,
                      borderColor: t.surface,
                    }),
                  }}
                />
              );
            })}
          </View>
        </Card>

        <Pressable
          onPress={save}
          disabled={!name.trim()}
          style={({ pressed }) => [{
            marginTop: 18, borderRadius: 16, overflow: 'hidden',
            opacity: pressed ? 0.9 : 1,
            ...(name.trim() && {
              shadowColor: accentColor, shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
            }),
          }]}
        >
          {name.trim() ? (
            <LinearGradient
              colors={[accentColor, accentColor + 'cc' as any]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 15, alignItems: 'center' }}
            >
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff',
              }}>{editing ? 'Guardar cambios' : 'Crear categoría'}</Text>
            </LinearGradient>
          ) : (
            <View style={{
              paddingVertical: 15, alignItems: 'center',
              backgroundColor: t.border,
            }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff',
              }}>{editing ? 'Guardar cambios' : 'Crear categoría'}</Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
