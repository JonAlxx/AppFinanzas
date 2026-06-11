import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';
import { SavingsGoal } from '../data/types';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
import { Icon, IconName } from '../icons/Icon';

const COLORS = ['rose', 'indigo', 'green', 'orange', 'teal', 'violet', 'blue', 'yellow'];
const ICONS: IconName[] = ['target', 'smartphone', 'car', 'home', 'gift', 'briefcase', 'plane', 'piggy', 'wallet', 'sparkles'];

interface AddGoalScreenProps {
  editingId?: string;
}

export function AddGoalScreen({ editingId }: AddGoalScreenProps) {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { back } = useNavigation();

  const editing = editingId ? state.goals.find(g => g.id === editingId) : undefined;

  const [name, setName] = useState(editing?.name || '');
  const [target, setTarget] = useState(editing?.target ? (editing.target / 100).toString() : '');
  const [current, setCurrent] = useState(editing?.current ? (editing.current / 100).toString() : '');
  const [accountId, setAccountId] = useState(editing?.accountId || state.accounts[0]?.id || '');
  const [color, setColor] = useState(editing?.color || 'rose');
  const [icon, setIcon] = useState<IconName>(editing?.icon as IconName || 'target');
  const [yields, setYields] = useState(editing?.yields || false);
  const [yieldRate, setYieldRate] = useState(editing?.yieldRate ? editing.yieldRate.toString() : '');

  // Deadline selection state
  const [hasDeadline, setHasDeadline] = useState(editing?.deadline !== null && editing?.deadline !== undefined);
  const [months, setMonths] = useState(() => {
    if (editing?.deadline) {
      const diffMs = editing.deadline - Date.now();
      const diffMonths = Math.round(diffMs / (30 * 86400000));
      return diffMonths > 0 ? diffMonths.toString() : '3';
    }
    return '3';
  });

  function save() {
    if (!name.trim()) {
      Alert.alert('Nombre faltante', 'Por favor ingresa un nombre para la meta.');
      return;
    }
    const targetVal = parseFloat(target) || 0;
    if (targetVal <= 0) {
      Alert.alert('Meta inválida', 'Por favor ingresa un objetivo de ahorro mayor a cero.');
      return;
    }
    const currentVal = parseFloat(current) || 0;
    if (currentVal < 0) {
      Alert.alert('Ahorro inválido', 'El monto ahorrado actual no puede ser negativo.');
      return;
    }

    if (!accountId) {
      Alert.alert('Cuenta faltante', 'Por favor selecciona una cuenta donde guardarás este ahorro.');
      return;
    }

    let deadlineVal: number | null = null;
    if (hasDeadline) {
      const monthsNum = parseFloat(months) || 1;
      deadlineVal = Date.now() + Math.round(monthsNum * 30 * 86400000);
    }

    const selectedAcc = state.accounts.find(acc => acc.id === accountId);
    const showYieldsOption = selectedAcc?.type !== 'CASH' && selectedAcc?.type !== 'DIGITAL_WALLET';

    const goalObj: SavingsGoal = {
      id: editing?.id || 'goal-' + Date.now(),
      name: name.trim(),
      target: Math.round(targetVal * 100),
      current: Math.round(currentVal * 100),
      accountId,
      deadline: deadlineVal,
      color,
      icon,
      yields: showYieldsOption ? yields : false,
      yieldRate: showYieldsOption && yields ? parseFloat(yieldRate) || 0 : 0,
    };

    dispatch({
      type: editing ? 'UPDATE_GOAL' : 'ADD_GOAL',
      goal: goalObj,
    });
    back();
  }

  function confirmDelete() {
    if (!editing) return;
    Alert.alert(
      'Eliminar Meta',
      `¿Seguro que quieres eliminar la meta "${editing.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: () => {
            dispatch({ type: 'DELETE_GOAL', id: editing.id });
            back();
          },
        },
      ]
    );
  }

  const selectedAcc = state.accounts.find(acc => acc.id === accountId);
  const showYieldsOption = selectedAcc?.type !== 'CASH' && selectedAcc?.type !== 'DIGITAL_WALLET';

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        leftIcon="x"
        onLeft={back}
        title={editing ? 'Editar meta' : 'Nueva meta'}
        rightIcon={editing ? 'trash' : null}
        onRight={editing ? confirmDelete : undefined}
        large={false}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card padding={16} style={{ marginTop: 10 }}>
          {/* Goal Name */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            marginBottom: 8,
          }}>NOMBRE DE LA META</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej. Celular, Viaje, Fondo de Emergencia"
            placeholderTextColor={t.textMuted}
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1, borderBottomColor: t.border,
              color: t.text, fontSize: 15,
              fontFamily: 'PlusJakartaSans_600SemiBold',
              marginBottom: 20,
            }}
          />

          {/* Target Amount */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            marginBottom: 8,
          }}>OBJETIVO DE AHORRO (META)</Text>
          <TextInput
            value={target}
            onChangeText={setTarget}
            placeholder="0.00"
            placeholderTextColor={t.textMuted}
            keyboardType="decimal-pad"
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1, borderBottomColor: t.border,
              color: t.text, fontSize: 15,
              fontFamily: 'PlusJakartaSans_600SemiBold',
              fontVariant: ['tabular-nums'],
              marginBottom: 20,
            }}
          />

          {/* Current Saved Amount */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            marginBottom: 8,
          }}>MONTO YA AHORRADO (OPCIONAL)</Text>
          <TextInput
            value={current}
            onChangeText={setCurrent}
            placeholder="0.00"
            placeholderTextColor={t.textMuted}
            keyboardType="decimal-pad"
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1, borderBottomColor: t.border,
              color: t.text, fontSize: 15,
              fontFamily: 'PlusJakartaSans_600SemiBold',
              fontVariant: ['tabular-nums'],
              marginBottom: 20,
            }}
          />

          {/* Account Picker */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            marginBottom: 10,
          }}>¿DÓNDE SE GUARDARÁN ESTOS AHORROS?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16, marginBottom: 20 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 4 }}
          >
            {state.accounts.map(acc => {
              const selected = accountId === acc.id;
              const bgSelected = softFor(t, acc.color);
              const colorTheme = colorFor(t, acc.color);
              return (
                <Pressable
                  key={acc.id}
                  onPress={() => {
                    setAccountId(acc.id);
                    if (acc.type === 'CASH' || acc.type === 'DIGITAL_WALLET') {
                      setYields(false);
                    } else if (acc.type === 'SAVINGS' || acc.type === 'INVESTMENT') {
                      setYields(true);
                    }
                  }}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? colorTheme : t.border,
                    backgroundColor: selected ? bgSelected : t.surfaceAlt,
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    height: 48,
                  }}
                >
                  <Icon name={acc.icon} size={16} color={selected ? colorTheme : t.textMuted} />
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                    color: selected ? colorTheme : t.text,
                  }}>{acc.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Yields Section */}
          {showYieldsOption && (
            <View style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 20, paddingVertical: 4,
            }}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text,
                }}>¿Esta cuenta genera rendimientos?</Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted,
                  marginTop: 2,
                }}>
                  Muestra una etiqueta indicativa si el banco o cuenta te paga rendimientos por tener el dinero ahí.
                </Text>
              </View>
              <Pressable
                onPress={() => setYields(!yields)}
                style={{
                  width: 44, height: 26, borderRadius: 13,
                  backgroundColor: yields ? t.green : t.border,
                  padding: 2,
                  justifyContent: 'center',
                }}
              >
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: '#fff',
                  transform: [{ translateX: yields ? 18 : 0 }],
                }} />
              </Pressable>
            </View>
          )}

          {showYieldsOption && yields && (() => {
            const targetVal = parseFloat(target) || 0;
            const currentVal = parseFloat(current) || 0;
            const rateVal = parseFloat(yieldRate) || 0;
            const estMonthlyTarget = (targetVal * rateVal) / 100 / 12;
            const estMonthlyCurrent = (currentVal * rateVal) / 100 / 12;
            const estYearlyTarget = (targetVal * rateVal) / 100;
            const estYearlyCurrent = (currentVal * rateVal) / 100;

            function fmtVal(val: number) {
              return '$' + val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }

            return (
              <View style={{ marginBottom: 20 }}>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                  marginBottom: 8,
                }}>TASA DE RENDIMIENTO ANUAL (%)</Text>
                <TextInput
                  value={yieldRate}
                  onChangeText={(v) => setYieldRate(v.replace(/[^0-9.]/g, ''))}
                  placeholder="Ej. 12 o 5.5"
                  placeholderTextColor={t.textMuted}
                  keyboardType="decimal-pad"
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1, borderBottomColor: t.border,
                    color: t.text, fontSize: 15,
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontVariant: ['tabular-nums'],
                    marginBottom: 12,
                  }}
                />

                <View style={{
                  backgroundColor: softFor(t, 'green'),
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: t.green + '33',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Icon name="trending" size={16} color={t.green} />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.green }}>
                      Rendimiento Estimado
                    </Text>
                  </View>
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.text, lineHeight: 16 }}>
                    • Con el saldo actual ({fmtVal(currentVal)}): <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: t.green }}>{fmtVal(estMonthlyCurrent)}/mes</Text> ({fmtVal(estYearlyCurrent)}/año)
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.text, lineHeight: 16, marginTop: 4 }}>
                    • Al alcanzar la meta ({fmtVal(targetVal)}): <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: t.green }}>{fmtVal(estMonthlyTarget)}/mes</Text> ({fmtVal(estYearlyTarget)}/año)
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* Deadline settings */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 14, paddingVertical: 4,
          }}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text,
              }}>Establecer fecha límite</Text>
              <Text style={{
                fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted,
                marginTop: 2,
              }}>
                Define cuántos meses tienes para lograr el objetivo.
              </Text>
            </View>
            <Pressable
              onPress={() => setHasDeadline(!hasDeadline)}
              style={{
                width: 44, height: 26, borderRadius: 13,
                backgroundColor: hasDeadline ? t.indigo : t.border,
                padding: 2,
                justifyContent: 'center',
              }}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 11,
                backgroundColor: '#fff',
                transform: [{ translateX: hasDeadline ? 18 : 0 }],
              }} />
            </Pressable>
          </View>

          {hasDeadline && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                marginBottom: 8,
              }}>PLAZO EN MESES</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {['1', '3', '6', '12'].map(m => {
                  const selected = months === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setMonths(m)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
                        borderWidth: 1, borderColor: selected ? t.indigo : t.border,
                        backgroundColor: selected ? softFor(t, 'indigo') : 'transparent',
                      }}
                    >
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                        color: selected ? t.indigo : t.text,
                      }}>
                        {m === '12' ? '1 año' : `${m} meses`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                value={months}
                onChangeText={(v) => setMonths(v.replace(/[^0-9.]/g, ''))}
                placeholder="Plazo personalizado (meses)"
                placeholderTextColor={t.textMuted}
                keyboardType="numeric"
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1, borderBottomColor: t.border,
                  color: t.text, fontSize: 14,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontVariant: ['tabular-nums'],
                }}
              />
            </View>
          )}

          {/* Color Picker */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            marginTop: 10, marginBottom: 10,
          }}>COLOR DE LA META</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            {COLORS.map(cName => {
              const cValue = colorFor(t, cName);
              const selected = color === cName;
              return (
                <Pressable
                  key={cName}
                  onPress={() => setColor(cName)}
                  style={{
                    width: 38, height: 38, borderRadius: 19,
                    backgroundColor: cValue,
                    borderWidth: selected ? 3 : 0,
                    borderColor: '#fff',
                    alignItems: 'center', justifyContent: 'center',
                    ...(selected && {
                      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
                    }),
                  }}
                >
                  {selected && <Icon name="check" size={16} color="#fff" strokeWidth={3} />}
                </Pressable>
              );
            })}
          </View>

          {/* Icon Picker */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
            marginBottom: 10,
          }}>ÍCONO DE LA META</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            {ICONS.map(iName => {
              const selected = icon === iName;
              const activeColor = colorFor(t, color);
              const activeBg = softFor(t, color);
              return (
                <Pressable
                  key={iName}
                  onPress={() => setIcon(iName)}
                  style={{
                    width: 44, height: 44, borderRadius: 12,
                    backgroundColor: selected ? activeBg : t.surfaceAlt,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? activeColor : t.border,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon name={iName} size={20} color={selected ? activeColor : t.textMuted} />
                </Pressable>
              );
            })}
          </View>

          {/* Save Button */}
          <Pressable
            onPress={save}
            style={({ pressed }) => [{
              marginTop: 10,
              paddingVertical: 14,
              borderRadius: 16,
              backgroundColor: colorFor(t, color),
              alignItems: 'center',
              opacity: pressed ? 0.85 : 1,
            }]}
          >
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold',
              fontSize: 14,
              color: '#fff',
            }}>
              Guardar Meta
            </Text>
          </Pressable>
        </Card>
      </ScrollView>
    </View>
  );
}
