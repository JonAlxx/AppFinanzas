import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { DEFAULT_CATEGORIES, isCustomCategory } from '../data/catalog';
import { Category } from '../data/types';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { softFor } from '../theme/theme';

import { CategoryBadge } from '../components/Badges';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionTitle } from '../components/SectionTitle';
import { Icon } from '../icons/Icon';

function CategoryRow({
  cat, custom, onPress, onDelete,
}: {
  cat: Category;
  custom: boolean;
  onPress: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!custom}
      style={({ pressed }) => [{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        opacity: pressed && custom ? 0.7 : 1,
      }]}
    >
      <CategoryBadge cat={cat} size={40} radius={12} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{
          fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
        }}>{cat.name}</Text>
        <Text style={{
          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted,
          marginTop: 2,
        }}>{custom ? 'Personalizada' : 'Por defecto'}</Text>
      </View>
      {custom ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            style={{
              width: 32, height: 32, borderRadius: 10,
              backgroundColor: softFor(t, 'rose'),
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="trash" size={14} color={t.rose} />
          </Pressable>
          <View style={{
            width: 32, height: 32, borderRadius: 10,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="chevron-right" size={16} color={t.textMuted} />
          </View>
        </View>
      ) : (
        <View style={{
          paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
          backgroundColor: t.surfaceAlt,
        }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.textMuted,
          }}>SISTEMA</Text>
        </View>
      )}
    </Pressable>
  );
}

export function CategoriesScreen() {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { navigate, back } = useNavigation();

  const all: Category[] = [...DEFAULT_CATEGORIES, ...state.customCategories];

  const expenseCats = all.filter(c => c.type === 'EXPENSE');
  const incomeCats = all.filter(c => c.type === 'INCOME');

  function handleDelete(cat: Category) {
    // Check if in use
    const inUse = state.transactions.some(tx => tx.categoryId === cat.id)
      || state.budgets.some(b => b.categoryId === cat.id)
      || state.recurring.some(r => r.categoryId === cat.id);
    if (inUse) {
      Alert.alert(
        'Categoría en uso',
        `"${cat.name}" se usa en movimientos, presupuestos o recurrentes. Elimina primero esos registros o cambia su categoría.`,
        [{ text: 'OK' }],
      );
      return;
    }
    Alert.alert(
      'Eliminar categoría',
      `¿Eliminar "${cat.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: () => dispatch({ type: 'DELETE_CATEGORY', id: cat.id }),
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        leftIcon="chevron-left"
        onLeft={back}
        title="Categorías"
        rightIcon="plus"
        onRight={() => navigate('add-category')}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{
          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: t.textMuted,
          paddingHorizontal: 4, marginBottom: 14,
        }}>Personaliza las categorías que aparecen al registrar movimientos. Las del sistema son fijas.</Text>

        <SectionTitle title="Gastos" />
        <Card padding={4} style={{ marginTop: 10 }}>
          {expenseCats.map((c, i) => {
            const custom = isCustomCategory(c.id);
            return (
              <View key={c.id}>
                <CategoryRow
                  cat={c}
                  custom={custom}
                  onPress={() => navigate({ screen: 'add-category', id: c.id })}
                  onDelete={() => handleDelete(c)}
                />
                {i < expenseCats.length - 1 ? (
                  <View style={{ height: 1, backgroundColor: t.border, marginHorizontal: 14 }} />
                ) : null}
              </View>
            );
          })}
        </Card>

        <View style={{ marginTop: 18 }}>
          <SectionTitle title="Ingresos" />
          <Card padding={4} style={{ marginTop: 10 }}>
            {incomeCats.map((c, i) => {
              const custom = isCustomCategory(c.id);
              return (
                <View key={c.id}>
                  <CategoryRow
                    cat={c}
                    custom={custom}
                    onPress={() => navigate({ screen: 'add-category', id: c.id })}
                    onDelete={() => handleDelete(c)}
                  />
                  {i < incomeCats.length - 1 ? (
                    <View style={{ height: 1, backgroundColor: t.border, marginHorizontal: 14 }} />
                  ) : null}
                </View>
              );
            })}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
