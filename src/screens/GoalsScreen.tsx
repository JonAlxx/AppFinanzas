import React, { useState, useMemo } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { fmtMXN } from '../data/format';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';
import { SavingsGoal } from '../data/types';

import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { Sheet } from '../components/Sheet';
import { Icon } from '../icons/Icon';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function GoalsScreen() {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { goals, balanceHidden } = state;
  const { back, navigate } = useNavigation();

  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [amountInput, setAmountInput] = useState('');

  const total = goals.reduce((s, g) => s + g.current, 0);
  const target = goals.reduce((s, g) => s + g.target, 0);
  const totalPct = target > 0 ? (total / target) * 100 : 0;

  function handleProgressUpdate(isWithdraw: boolean) {
    if (!selectedGoal) return;
    const num = parseFloat(amountInput) || 0;
    if (num <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto mayor a cero.');
      return;
    }
    
    const centsVal = Math.round(num * 100);
    let newCurrent = selectedGoal.current;
    
    if (isWithdraw) {
      if (centsVal > newCurrent) {
        Alert.alert('Monto excedido', 'No puedes retirar más de lo que has ahorrado.');
        return;
      }
      newCurrent = newCurrent - centsVal;
    } else {
      newCurrent = Math.min(selectedGoal.target, newCurrent + centsVal);
    }
    
    const updatedGoal = { ...selectedGoal, current: newCurrent };
    dispatch({ type: 'UPDATE_GOAL', goal: updatedGoal });
    setAmountInput('');
    setSelectedGoal(updatedGoal);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        leftIcon="chevron-left"
        onLeft={back}
        title="Metas de ahorro"
        rightIcon="plus"
        onRight={() => navigate('add-goal')}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{
          borderRadius: 22, overflow: 'hidden',
          shadowColor: t.rose, shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
        }}>
          <LinearGradient
            colors={[t.rose, t.violet]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ padding: 22 }}
          >
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.85)',
              letterSpacing: 0.3,
            }}>AHORRADO EN METAS</Text>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 30, color: '#fff',
              letterSpacing: -1, marginTop: 4,
              fontVariant: ['tabular-nums'],
            }}>{balanceHidden ? '••••' : fmtMXN(total)}</Text>
            <Text style={{
              fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.85)',
              marginTop: 2,
            }}>de {fmtMXN(target)} totales</Text>
            <View style={{
              marginTop: 14, height: 6, borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden',
            }}>
              <View style={{
                height: '100%',
                width: `${Math.min(100, totalPct)}%`,
                backgroundColor: '#fff', borderRadius: 3,
              }} />
            </View>
          </LinearGradient>
        </View>

        <View style={{ marginTop: 18, gap: 12 }}>
          {goals.length === 0 ? (
            <EmptyState
              icon="target"
              color="rose"
              title="Sin metas de ahorro"
              message="Define metas para ahorrar hacia algo que quieras: viaje, fondo de emergencia, artículo especial."
              action="Agregar meta"
              onAction={() => navigate('add-goal')}
            />
          ) : null}
          {goals.map(g => {
            const pct = (g.current / g.target) * 100;
            const c = colorFor(t, g.color);
            const soft = softFor(t, g.color);
            const daysLeft = g.deadline ? Math.ceil((g.deadline - Date.now()) / 86400000) : null;
            const acc = state.accounts.find(a => a.id === g.accountId);
            const generatesYields = g.yields || acc?.type === 'SAVINGS' || acc?.type === 'INVESTMENT';

            return (
              <Card key={g.id} onPress={() => setSelectedGoal(g)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 50, height: 50, borderRadius: 16, backgroundColor: soft,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={g.icon} size={24} color={c} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: t.text,
                      letterSpacing: -0.3,
                    }}>{g.name}</Text>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                      marginTop: 2,
                    }}>{daysLeft != null ? `${daysLeft} días restantes` : 'Sin fecha límite'}</Text>
                  </View>
                  <View style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
                    backgroundColor: soft,
                  }}>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: c,
                    }}>{pct.toFixed(0)}%</Text>
                  </View>
                </View>
                <View style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
                  marginTop: 14, marginBottom: 8,
                }}>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 19, color: t.text,
                    letterSpacing: -0.4,
                    fontVariant: ['tabular-nums'],
                  }}>{balanceHidden ? '••••' : fmtMXN(g.current)}</Text>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                    fontVariant: ['tabular-nums'],
                  }}>de {fmtMXN(g.target)}</Text>
                </View>
                <ProgressBar pct={pct} color={g.color} height={8} />
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: c, marginTop: 8,
                }}>{pct.toFixed(0)}% completado · faltan {fmtMXN(g.target - g.current)}</Text>

                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  marginTop: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
                  backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border,
                }}>
                  <Icon name="wallet" size={14} color={t.textMuted} />
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.textMuted,
                  }}>
                    Guardado en: <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: t.text }}>{acc?.name || 'Cuentas generales'}</Text>
                  </Text>
                  {generatesYields && (
                    <View style={{
                      marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: softFor(t, 'green'), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                    }}>
                      <Icon name="trending" size={12} color={t.green} />
                      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.green }}>
                        {g.yields && g.yieldRate && g.yieldRate > 0 ? `${g.yieldRate}%` : 'Rendimiento'}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>

      {/* Goal Detail & Contribution Sheet */}
      <Sheet open={selectedGoal !== null} onClose={() => setSelectedGoal(null)} height="65%">
        {selectedGoal && (() => {
          const g = selectedGoal;
          const pct = (g.current / g.target) * 100;
          const c = colorFor(t, g.color);
          const soft = softFor(t, g.color);
          const acc = state.accounts.find(a => a.id === g.accountId);
          const generatesYields = g.yields || acc?.type === 'SAVINGS' || acc?.type === 'INVESTMENT';

          return (
            <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 14, backgroundColor: soft,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={g.icon} size={22} color={c} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
                    letterSpacing: -0.3,
                  }}>{g.name}</Text>
                  <Text numberOfLines={1} style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
                    marginTop: 2,
                  }}>
                    Ahorrado en: {acc?.name}
                  </Text>
                </View>
                {generatesYields && (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    backgroundColor: softFor(t, 'green'), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                  }}>
                    <Icon name="trending" size={12} color={t.green} />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.green }}>
                      {g.yields && g.yieldRate && g.yieldRate > 0 ? `${g.yieldRate}% Rendimiento` : 'Genera rendimiento'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Progress Detail */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text }}>
                    {fmtMXN(g.current)} de {fmtMXN(g.target)}
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: c }}>
                    {pct.toFixed(0)}%
                  </Text>
                </View>
                <ProgressBar pct={pct} color={g.color} height={10} />
              </View>

              {/* Proyecciones de rendimiento */}
              {g.yields && g.yieldRate && g.yieldRate > 0 ? (() => {
                const currentVal = g.current / 100;
                const targetVal = g.target / 100;
                const rateVal = g.yieldRate;
                const estMonthlyTarget = (targetVal * rateVal) / 100 / 12;
                const estMonthlyCurrent = (currentVal * rateVal) / 100 / 12;
                const estYearlyTarget = (targetVal * rateVal) / 100;
                const estYearlyCurrent = (currentVal * rateVal) / 100;

                function fmtVal(val: number) {
                  return '$' + val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }

                return (
                  <View style={{
                    backgroundColor: softFor(t, 'green'),
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: t.green + '33',
                    marginBottom: 20,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Icon name="trending" size={16} color={t.green} />
                      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.green }}>
                        Proyecciones ({rateVal}% anual)
                      </Text>
                    </View>
                    <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.text, lineHeight: 16 }}>
                      • Rendimiento sobre saldo actual: <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: t.green }}>{fmtVal(estMonthlyCurrent)}/mes</Text> ({fmtVal(estYearlyCurrent)}/año)
                    </Text>
                    <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.text, lineHeight: 16, marginTop: 4 }}>
                      • Al alcanzar la meta: <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: t.green }}>{fmtVal(estMonthlyTarget)}/mes</Text> ({fmtVal(estYearlyTarget)}/año)
                    </Text>
                  </View>
                );
              })() : null}

              {/* Amount input */}
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: t.textMuted,
                marginBottom: 8,
              }}>MONTO A REGISTRAR</Text>
              <TextInput
                value={amountInput}
                onChangeText={(v) => setAmountInput(v.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                placeholderTextColor={t.textMuted}
                keyboardType="decimal-pad"
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1, borderColor: t.border,
                  backgroundColor: t.surfaceAlt,
                  color: t.text, fontSize: 16,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontVariant: ['tabular-nums'],
                  marginBottom: 20,
                }}
              />

              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={() => handleProgressUpdate(false)}
                    style={({ pressed }) => [{
                      flex: 1, paddingVertical: 14, borderRadius: 16,
                      backgroundColor: t.indigo, alignItems: 'center',
                      opacity: pressed ? 0.85 : 1,
                    }]}
                  >
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#fff',
                    }}>Abonar Ahorro</Text>
                  </Pressable>
                  
                  <Pressable
                    onPress={() => handleProgressUpdate(true)}
                    style={({ pressed }) => [{
                      flex: 1, paddingVertical: 14, borderRadius: 16,
                      backgroundColor: 'transparent', borderWidth: 1, borderColor: t.rose,
                      alignItems: 'center',
                      opacity: pressed ? 0.85 : 1,
                    }]}
                  >
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.rose,
                    }}>Retirar</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => {
                    setSelectedGoal(null);
                    navigate({ screen: 'add-goal', id: g.id });
                  }}
                  style={({ pressed }) => [{
                    paddingVertical: 14, borderRadius: 16,
                    backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border,
                    alignItems: 'center',
                    opacity: pressed ? 0.75 : 1,
                  }]}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                  }}>Editar Meta</Text>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedGoal(null)}
                  style={({ pressed }) => [{
                    paddingVertical: 14, borderRadius: 16,
                    alignItems: 'center',
                    opacity: pressed ? 0.75 : 1,
                  }]}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.textMuted,
                  }}>Cerrar</Text>
                </Pressable>
              </View>
            </View>
          );
        })()}
      </Sheet>
    </View>
  );
}
