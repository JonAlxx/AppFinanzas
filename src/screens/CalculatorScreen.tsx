import React, { useState, useMemo } from 'react';
import {
  Alert, Pressable, ScrollView, Text, TextInput, View, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { fmtMXN } from '../data/format';
import { computeAccountBalance } from '../data/selectors';
import { colorFor, softFor } from '../theme/theme';
import { allCategories, catById } from '../data/catalog';

import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionTitle } from '../components/SectionTitle';
import { Sheet } from '../components/Sheet';
import { Icon } from '../icons/Icon';
import { BankCard } from '../components/BankCard';

interface SimulatedItem {
  id: string;
  note: string;
  amount: number; // in cents
  type: 'EXPENSE' | 'INCOME';
  accountId: string;
  categoryId: string | null;
  date: number; // timestamp of simulation date
}

const MONTHS_SPANISH = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function fmtSimDate(ms: number): string {
  const now = new Date();
  const d = new Date(ms);
  const sameYear = d.getFullYear() === now.getFullYear();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  
  if (targetDate === today) return 'Hoy';
  if (targetDate === today + 86400000) return 'Mañana';
  if (targetDate === today - 86400000) return 'Ayer';
  
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const base = `${d.getDate()} ${months[d.getMonth()]}`;
  return sameYear ? base : `${base} ${d.getFullYear()}`;
}

export function CalculatorScreen() {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { back, navigate } = useNavigation();

  // Selected base account ID
  const [selectedBaseAccountId, setSelectedBaseAccountId] = useState<string>(() => {
    return state.accounts[0]?.id || '';
  });

  // Base salary/saldo state, prefilled with the first account's balance
  const [baseSalary, setBaseSalary] = useState<string>(() => {
    const defaultAcc = state.accounts[0];
    if (defaultAcc) {
      const bal = computeAccountBalance(defaultAcc, state.transactions);
      return (bal / 100).toFixed(2);
    }
    return '0';
  });

  const [simulatedItems, setSimulatedItems] = useState<SimulatedItem[]>([]);
  const [editingSimItemId, setEditingSimItemId] = useState<string | null>(null);

  // Modal sheets states
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showRecurringPicker, setShowRecurringPicker] = useState(false);
  const [showDatePickerSheet, setShowDatePickerSheet] = useState(false);

  // New simulated item form states
  const [newItemNote, setNewItemNote] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemType, setNewItemType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Simulated Date states
  const [simYear, setSimYear] = useState<number>(() => new Date().getFullYear());
  const [simMonth, setSimMonth] = useState<number>(() => new Date().getMonth());
  const [simDay, setSimDay] = useState<number>(() => new Date().getDate());

  // Active fixed incomes in recurring rules
  const fixedIncomes = useMemo(() => {
    return state.recurring.filter(r => r.type === 'INCOME' && r.active);
  }, [state.recurring]);

  // Categories filtered by the chosen type
  const catsFiltered = useMemo(() => {
    return allCategories(state.customCategories).filter(c => c.type === newItemType);
  }, [state.customCategories, newItemType]);

  // Calculations
  const baseSalaryNum = Math.round((parseFloat(baseSalary) || 0) * 100); // in cents

  const totalSimExpenses = useMemo(() => {
    return simulatedItems
      .filter(item => item.type === 'EXPENSE')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [simulatedItems]);

  const totalSimIncomes = useMemo(() => {
    return simulatedItems
      .filter(item => item.type === 'INCOME')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [simulatedItems]);

  const netSimulatedBalance = baseSalaryNum - totalSimExpenses + totalSimIncomes;

  const selectedBaseAcc = useMemo(() => {
    return state.accounts.find(a => a.id === selectedBaseAccountId);
  }, [state.accounts, selectedBaseAccountId]);

  const isSimulationNegative = useMemo(() => {
    if (!selectedBaseAcc) return false;
    if (selectedBaseAcc.type === 'CREDIT_CARD') {
      return (selectedBaseAcc.limit || 0) + netSimulatedBalance < 0;
    }
    return netSimulatedBalance < 0;
  }, [selectedBaseAcc, netSimulatedBalance]);

  // Open the add modal sheet with defaults reset and date set to Today
  function openAddSimulation() {
    setEditingSimItemId(null);
    setNewItemNote('');
    setNewItemAmount('');
    setNewItemType('EXPENSE');
    setSimYear(new Date().getFullYear());
    setSimMonth(new Date().getMonth());
    setSimDay(new Date().getDate());

    const expenseCats = allCategories(state.customCategories).filter(c => c.type === 'EXPENSE');
    setSelectedCategoryId(expenseCats[0]?.id || null);
    setShowAddSheet(true);
  }

  // Open edit modal pre-filled with simulated item details
  function openEditSimulation(item: SimulatedItem) {
    setEditingSimItemId(item.id);
    setNewItemNote(item.note);
    setNewItemAmount((item.amount / 100).toFixed(2));
    setNewItemType(item.type);
    setSelectedCategoryId(item.categoryId);
    const d = new Date(item.date);
    setSimYear(d.getFullYear());
    setSimMonth(d.getMonth());
    setSimDay(d.getDate());
    setShowAddSheet(true);
  }

  // Add or update simulated item
  function saveSimulatedItem() {
    const amt = parseFloat(newItemAmount) || 0;
    if (amt <= 0) {
      Alert.alert('Monto inválido', 'El monto simulado debe ser mayor a 0.');
      return;
    }
    if (!newItemNote.trim()) {
      Alert.alert('Falta concepto', 'Por favor ingresa un concepto o descripción.');
      return;
    }
    
    // Automatically inherit the selected base account
    const accountId = selectedBaseAccountId || state.accounts[0]?.id || '';
    if (!accountId) {
      Alert.alert('Falta cuenta', 'Por favor selecciona una cuenta base.');
      return;
    }

    if (editingSimItemId) {
      setSimulatedItems(prev => prev.map(item => {
        if (item.id === editingSimItemId) {
          return {
            ...item,
            note: newItemNote.trim(),
            amount: Math.round(amt * 100),
            type: newItemType,
            categoryId: selectedCategoryId,
            date: new Date(simYear, simMonth, simDay).getTime(),
          };
        }
        return item;
      }));
      setEditingSimItemId(null);
    } else {
      const newItem: SimulatedItem = {
        id: 'sim-' + Date.now(),
        note: newItemNote.trim(),
        amount: Math.round(amt * 100),
        type: newItemType,
        accountId: accountId,
        categoryId: selectedCategoryId,
        date: new Date(simYear, simMonth, simDay).getTime(),
      };
      setSimulatedItems(prev => [...prev, newItem]);
    }

    setShowAddSheet(false);
  }

  // Delete simulated item
  function deleteSimulatedItem(id: string) {
    setSimulatedItems(prev => prev.filter(item => item.id !== id));
  }

  // Reset simulation
  // Resets to initial values using the first account
  function resetSimulation() {
    Alert.alert(
      'Resetear simulación',
      '¿Seguro que quieres borrar todos los cálculos y empezar de nuevo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            const firstAcc = state.accounts[0];
            if (firstAcc) {
              setSelectedBaseAccountId(firstAcc.id);
              const bal = computeAccountBalance(firstAcc, state.transactions);
              setBaseSalary((bal / 100).toFixed(2));
            } else {
              setSelectedBaseAccountId('');
              setBaseSalary('0');
            }
            setSimulatedItems([]);
          },
        },
      ]
    );
  }

  // Bulk apply simulation items as real transactions
  function applySimulationToTransactions() {
    Alert.alert(
      'Aplicar movimientos',
      `¿Deseas guardar los ${simulatedItems.length} movimientos simulados como transacciones reales en tus cuentas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            const now = new Date();
            // Start of today (00:00:00.000) or end of today.
            // Let's set it to the end of today to be safe, or just compare dates.
            // If we compare milliseconds: if the transaction date is strictly after today (at 23:59:59), or simply if the day is in the future.
            const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

            let txCount = 0;
            let recurringCount = 0;

            simulatedItems.forEach((item, idx) => {
              const isFuture = item.date > todayEnd;

              if (isFuture) {
                // Future dates are saved as one-time recurring rules so the user can confirm them when the day arrives
                const rule = {
                  id: 'rec-sim-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 6),
                  type: item.type as 'INCOME' | 'EXPENSE',
                  amount: item.amount,
                  accountId: item.accountId,
                  categoryId: item.categoryId || null,
                  note: item.note || null,
                  frequency: 'once' as const,
                  startDate: item.date,
                  active: true,
                  lastGenerated: null,
                };
                dispatch({ type: 'ADD_RECURRING', rule });
                recurringCount++;
              } else {
                // Past or today's dates are registered as real transactions immediately
                const tx = {
                  id: 'tx-sim-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 6),
                  type: item.type,
                  amount: item.amount,
                  date: item.date,
                  accountId: item.accountId,
                  categoryId: item.categoryId,
                  note: item.note,
                };
                dispatch({ type: 'ADD_TX', tx });
                txCount++;
              }
            });

            let msg = 'Se han creado las transacciones con éxito.';
            if (recurringCount > 0 && txCount > 0) {
              msg = `Se crearon ${txCount} transacciones inmediatas y ${recurringCount} programadas para el futuro (una sola vez).`;
            } else if (recurringCount > 0) {
              msg = `Se crearon ${recurringCount} transacciones programadas para el futuro (una sola vez).`;
            }

            Alert.alert('¡Movimientos guardados!', msg);
            setSimulatedItems([]);
          },
        },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        leftIcon="chevron-left"
        onLeft={back}
        title="Simulador de Nómina"
        rightIcon={simulatedItems.length > 0 || parseFloat(baseSalary) > 0 ? 'trash' : null}
        onRight={resetSimulation}
        large={false}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Helper info */}
        <Text style={{
          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: t.textMuted,
          textAlign: 'center', marginVertical: 8, paddingHorizontal: 8,
        }}>
          Simula compras y egresos sobre tu nómina sin crear movimientos reales en tus cuentas.
        </Text>

        {/* Bank cards carousel at start of simulation */}
        <View style={{ marginTop: 10 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
            letterSpacing: 0.5, marginBottom: 8, paddingHorizontal: 4,
          }}>SELECCIONA CUENTA O SALDO BASE</Text>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 12 }}
            snapToInterval={232}
            decelerationRate="fast"
          >
            {state.accounts.map(acc => {
              const bal = computeAccountBalance(acc, state.transactions);
              const isSelected = selectedBaseAccountId === acc.id;
              return (
                <View key={acc.id} style={{ width: 220, position: 'relative' }}>
                  <BankCard
                    acc={acc}
                    balance={bal}
                    onPress={() => {
                      setSelectedBaseAccountId(acc.id);
                      setBaseSalary((bal / 100).toFixed(2));
                    }}
                    compact
                  />
                  {isSelected ? (
                    <View style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 24, height: 24, borderRadius: 12,
                      backgroundColor: t.indigo,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 2, borderColor: t.surface,
                      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2, shadowRadius: 3, elevation: 4,
                    }}>
                      <Icon name="check" size={12} color="#fff" strokeWidth={3} />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Quick prefill: Nomina Fija */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Pressable
            onPress={() => setShowRecurringPicker(true)}
            style={({ pressed }) => [{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: t.border,
              backgroundColor: pressed ? t.surfaceAlt : t.surface,
            }]}
          >
            <Icon name="rotate" size={14} color={t.indigo} />
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.text,
            }}>Cargar desde Nómina Fija</Text>
          </Pressable>
        </View>

        {/* Dynamic Balance display (Layout collision proofed) */}
        <Card style={{ marginTop: 18, overflow: 'hidden' }} padding={0}>
          <LinearGradient
            colors={[t.indigo, t.violet]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ padding: 18 }}
          >
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'rgba(255, 255, 255, 0.75)' }}>
                  Ingreso base nómina
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#fff', fontVariant: ['tabular-nums'] }}>
                  {fmtMXN(baseSalaryNum)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'rgba(255, 255, 255, 0.75)' }}>
                  Simulación de gastos
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#ffb3c1', fontVariant: ['tabular-nums'] }}>
                  -{fmtMXN(totalSimExpenses).replace('-', '')}
                </Text>
              </View>

              {totalSimIncomes > 0 ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'rgba(255, 255, 255, 0.75)' }}>
                    Simulación de ingresos
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#b9fbc0', fontVariant: ['tabular-nums'] }}>
                    +{fmtMXN(totalSimIncomes)}
                  </Text>
                </View>
              ) : null}

              <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.18)', marginVertical: 4 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: '#fff', flexShrink: 1 }} numberOfLines={1}>
                  RESTANTE ESTIMADO
                </Text>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold',
                  fontSize: 20,
                  color: netSimulatedBalance >= 0 ? '#b9fbc0' : '#ffb3c1',
                  fontVariant: ['tabular-nums'],
                  flexShrink: 0,
                }}>
                  {fmtMXN(netSimulatedBalance)}
                </Text>
              </View>

              {isSimulationNegative ? (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  marginTop: 10,
                }}>
                  <Icon name="x" size={14} color="#ffb3c1" strokeWidth={3} />
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: 11,
                    color: '#ffb3c1',
                    flex: 1,
                    lineHeight: 14,
                  }}>
                    {selectedBaseAcc?.type === 'CREDIT_CARD' ? 'El cálculo supera tu límite de crédito disponible.' : 'El cálculo supera tu saldo disponible (saldo insuficiente).'}
                  </Text>
                </View>
              ) : null}
            </View>
          </LinearGradient>
        </Card>

        {/* Simulated Items list */}
        <View style={{ marginTop: 22 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <SectionTitle title="Cálculos simulados" />
            <Pressable
              onPress={openAddSimulation}
              style={({ pressed }) => [{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: softFor(t, 'indigo'),
                opacity: pressed ? 0.8 : 1,
              }]}
            >
              <Icon name="plus" size={14} color={t.indigo} strokeWidth={2.5} />
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.indigo }}>
                Agregar
              </Text>
            </Pressable>
          </View>

          {simulatedItems.length === 0 ? (
            <Card padding={24} style={{ marginTop: 12, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: t.border,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 10,
              }}>
                <Icon name="calculator" size={20} color={t.textMuted} />
              </View>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text,
                textAlign: 'center',
              }}>
                No hay conceptos agregados
              </Text>
              <Text style={{
                fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted,
                textAlign: 'center', marginTop: 4, paddingHorizontal: 16,
              }}>
                Agrega gastos o ingresos estimados para ver cuánto dinero te quedaría disponible.
              </Text>
            </Card>
          ) : (
            <Card padding={4} style={{ marginTop: 12 }}>
              {simulatedItems.map((item, idx) => {
                const isExpense = item.type === 'EXPENSE';
                const itemAcc = state.accounts.find(a => a.id === item.accountId);
                const itemCat = item.categoryId ? catById(item.categoryId, state.customCategories) : undefined;
                const accName = itemAcc?.name || 'Cuenta';
                const catName = itemCat?.name || (isExpense ? 'Gasto' : 'Ingreso');

                return (
                  <View key={item.id}>
                    <Pressable
                      onPress={() => openEditSimulation(item)}
                      style={({ pressed }) => [{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        opacity: pressed ? 0.7 : 1,
                      }]}
                    >
                      <View style={{
                        width: 32, height: 32, borderRadius: 10,
                        backgroundColor: softFor(t, isExpense ? 'rose' : 'green'),
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon
                          name={isExpense ? 'arrow-up' : 'arrow-down'}
                          size={14}
                          color={isExpense ? t.rose : t.green}
                          strokeWidth={2.5}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text,
                        }} numberOfLines={1}>
                          {item.note}
                        </Text>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted,
                          marginTop: 2,
                        }} numberOfLines={1}>
                          {accName} • {catName} • {fmtSimDate(item.date)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13,
                          color: isExpense ? t.rose : t.green,
                          fontVariant: ['tabular-nums'],
                        }}>
                          {isExpense ? '-' : '+'}{fmtMXN(item.amount).replace('-', '')}
                        </Text>
                        <Pressable
                          onPress={() => deleteSimulatedItem(item.id)}
                          hitSlop={8}
                          style={({ pressed }) => [{
                            opacity: pressed ? 0.7 : 1,
                          }]}
                        >
                          <Icon name="x" size={16} color={t.textMuted} />
                        </Pressable>
                      </View>
                    </Pressable>
                    {idx < simulatedItems.length - 1 ? (
                      <View style={{ height: 1, backgroundColor: t.border, marginHorizontal: 14 }} />
                    ) : null}
                  </View>
                );
              })}
            </Card>
          )}
        </View>

        {/* Bulk apply button to save/apply changes */}
        {simulatedItems.length > 0 ? (
          <View style={{ marginTop: 24 }}>
            <Pressable
              onPress={applySimulationToTransactions}
              disabled={isSimulationNegative}
              style={({ pressed }) => [{
                borderRadius: 16,
                overflow: 'hidden',
                opacity: isSimulationNegative ? 0.5 : (pressed ? 0.9 : 1),
                ...(!isSimulationNegative && {
                  shadowColor: t.green,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 6,
                }),
              }]}
            >
              <LinearGradient
                colors={isSimulationNegative ? [t.border, t.border] : [t.green, t.green + 'cc' as any]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              >
                <Icon name={isSimulationNegative ? "x" : "check"} size={18} color="#fff" strokeWidth={3} />
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#fff',
                }}>
                  Aplicar movimientos al historial
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {/* Keyboard avoiding sheet to ADD/EDIT simulated item */}
      <Sheet open={showAddSheet} onClose={() => setShowAddSheet(false)} height="68%">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
              letterSpacing: -0.3, marginBottom: 14,
            }}>{editingSimItemId ? 'Editar simulación' : 'Agregar simulación'}</Text>

            {/* Type picker */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <Pressable
                onPress={() => {
                  setNewItemType('EXPENSE');
                  const expenseCats = allCategories(state.customCategories).filter(c => c.type === 'EXPENSE');
                  setSelectedCategoryId(expenseCats[0]?.id || null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: newItemType === 'EXPENSE' ? t.rose : t.border,
                  backgroundColor: newItemType === 'EXPENSE' ? softFor(t, 'rose') : 'transparent',
                }}
              >
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                  color: newItemType === 'EXPENSE' ? t.rose : t.text,
                }}>Gasto (-)</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setNewItemType('INCOME');
                  const incomeCats = allCategories(state.customCategories).filter(c => c.type === 'INCOME');
                  setSelectedCategoryId(incomeCats[0]?.id || null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: newItemType === 'INCOME' ? t.green : t.border,
                  backgroundColor: newItemType === 'INCOME' ? softFor(t, 'green') : 'transparent',
                }}
              >
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                  color: newItemType === 'INCOME' ? t.green : t.text,
                }}>Ingreso (+)</Text>
              </Pressable>
            </View>

            {/* Amount input */}
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
              letterSpacing: 0.3, marginBottom: 6,
            }}>MONTO</Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderBottomWidth: 1.5,
              borderBottomColor: t.indigo,
              paddingVertical: 4,
              marginBottom: 16,
            }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: t.textMuted, marginRight: 4,
              }}>$</Text>
              <TextInput
                value={newItemAmount}
                onChangeText={(v) => {
                  const clean = v.replace(/[^0-9.]/g, '');
                  const parts = clean.split('.');
                  if (parts.length > 2) return;
                  setNewItemAmount(clean);
                }}
                placeholder="0.00"
                placeholderTextColor={t.textMuted}
                keyboardType="decimal-pad"
                style={{
                  flex: 1,
                  color: t.text,
                  fontSize: 16,
                  fontFamily: 'PlusJakartaSans_700Bold',
                }}
              />
            </View>

            {/* Concept note input */}
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
              letterSpacing: 0.3, marginBottom: 6,
            }}>CONCEPTO / DESCRIPCIÓN</Text>
            <TextInput
              value={newItemNote}
              onChangeText={setNewItemNote}
              placeholder="Ej. Dentista, Renta, Bono extra"
              placeholderTextColor={t.textMuted}
              style={{
                paddingVertical: 8,
                borderBottomWidth: 1.5,
                borderBottomColor: t.indigo,
                color: t.text,
                fontSize: 14,
                fontFamily: 'PlusJakartaSans_600SemiBold',
                marginBottom: 16,
              }}
            />

            {/* Date Selector Row */}
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
              letterSpacing: 0.3, marginBottom: 6,
            }}>FECHA DEL MOVIMIENTO</Text>
            <Pressable
              onPress={() => setShowDatePickerSheet(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                borderBottomWidth: 1.5,
                borderBottomColor: t.indigo,
                marginBottom: 20,
              }}
            >
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
              }}>
                {`${simDay} de ${MONTHS_SPANISH[simMonth]} de ${simYear}`}
              </Text>
              <Icon name="calendar" size={18} color={t.indigo} />
            </Pressable>

            {/* Inline Category Selector */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
                letterSpacing: 0.3,
              }}>CATEGORÍA</Text>
              <Pressable
                onPress={() => {
                  setShowAddSheet(false);
                  navigate({ screen: 'add-category' });
                }}
                style={({ pressed }) => [{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                  backgroundColor: softFor(t, 'indigo'),
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  opacity: pressed ? 0.7 : 1,
                }]}
              >
                <Icon name="plus" size={10} color={colorFor(t, 'indigo')} strokeWidth={3} />
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: colorFor(t, 'indigo'),
                }}>Nueva</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 24 }}
              contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
            >
              {catsFiltered.map(c => {
                const selected = selectedCategoryId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelectedCategoryId(c.id)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                      borderWidth: selected ? 1.5 : 1,
                      borderColor: selected ? t.indigo : t.border,
                      backgroundColor: selected ? softFor(t, c.color) : t.surfaceAlt,
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                    }}
                  >
                    <View style={{
                      width: 16, height: 16, borderRadius: 5,
                      backgroundColor: colorFor(t, c.color),
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={c.icon} size={10} color="#fff" />
                    </View>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11,
                      color: selected ? t.indigo : t.text,
                    }}>{c.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={saveSimulatedItem}
              style={({ pressed }) => [{
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: t.indigo,
                alignItems: 'center',
                opacity: pressed ? 0.85 : 1,
              }]}
            >
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold',
                fontSize: 14,
                color: '#fff',
              }}>
                {editingSimItemId ? 'Guardar cambios' : 'Agregar a la Simulación'}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Sheet>

      {/* Sheet to PICK base salary from recurring fixed incomes */}
      <Sheet open={showRecurringPicker} onClose={() => setShowRecurringPicker(false)} height="60%">
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20, flex: 1 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            letterSpacing: -0.3, marginBottom: 14,
          }}>Elegir de ingresos fijos</Text>

          {fixedIncomes.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.textMuted,
                textAlign: 'center',
              }}>
                No tienes ingresos fijos registrados
              </Text>
              <Text style={{
                fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted,
                textAlign: 'center', marginTop: 4, paddingHorizontal: 16,
              }}>
                Ve a Recurrentes y agrega un ingreso fijo para seleccionarlo aquí.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={{ gap: 8 }}>
                {fixedIncomes.map(income => (
                  <Pressable
                    key={income.id}
                    onPress={() => {
                      setBaseSalary((income.amount / 100).toFixed(2));
                      if (income.accountId) {
                        setSelectedBaseAccountId(income.accountId);
                      }
                      setShowRecurringPicker(false);
                    }}
                    style={({ pressed }) => [{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: t.border,
                      backgroundColor: pressed ? t.surfaceAlt : t.surface,
                    }]}
                  >
                    <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text,
                      }} numberOfLines={1}>
                        {income.note || 'Ingreso recurrente'}
                      </Text>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted,
                        marginTop: 2,
                      }}>
                        Frecuencia: {income.frequency === 'biweekly' ? 'Quincenal' : 'Mensual'}
                      </Text>
                    </View>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.green,
                      fontVariant: ['tabular-nums'],
                    }}>
                      {fmtMXN(income.amount)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </Sheet>

      {/* Date picker sub-sheet modal */}
      <Sheet open={showDatePickerSheet} onClose={() => setShowDatePickerSheet(false)} height="75%">
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, flex: 1 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            letterSpacing: -0.3, marginBottom: 12,
          }}>Fecha del movimiento</Text>

          {/* Year selector */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
            letterSpacing: 0.3, marginBottom: 8, marginTop: 4,
          }}>AÑO</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
            {[2026, 2027, 2028, 2029].map(y => {
              const selected = simYear === y;
              return (
                <Pressable
                  key={y}
                  onPress={() => setSimYear(y)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                    backgroundColor: selected ? t.indigo : t.surfaceAlt,
                    borderWidth: 1, borderColor: selected ? t.indigo : t.border,
                  }}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                    color: selected ? '#fff' : t.text,
                  }}>{y}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Month selector */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
            letterSpacing: 0.3, marginBottom: 8,
          }}>MES</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {MONTHS_SPANISH.map((m, idx) => {
              const selected = simMonth === idx;
              return (
                <Pressable
                  key={m}
                  onPress={() => setNewMonthAndFixDay(idx)}
                  style={{
                    width: '23%', paddingVertical: 8, borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: selected ? t.indigo : t.surfaceAlt,
                    borderWidth: 1, borderColor: selected ? t.indigo : t.border,
                  }}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12,
                    color: selected ? '#fff' : t.text,
                  }}>{m.substring(0, 3)}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Day selector */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
            letterSpacing: 0.3, marginBottom: 8,
          }}>DÍA</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {Array.from(
                { length: new Date(simYear, simMonth + 1, 0).getDate() },
                (_, i) => i + 1
              ).map(d => {
                const selected = simDay === d;
                return (
                  <View key={d} style={{ width: '14.2857%', padding: 4 }}>
                    <Pressable
                      onPress={() => setSimDay(d)}
                      style={{
                        height: 40, borderRadius: 10,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: selected ? t.indigo : t.surfaceAlt,
                        borderWidth: 1, borderColor: selected ? t.indigo : t.border,
                      }}
                    >
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13,
                        color: selected ? '#fff' : t.text,
                        fontVariant: ['tabular-nums'],
                      }}>{d}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <Pressable
            onPress={() => {
              const maxDays = new Date(simYear, simMonth + 1, 0).getDate();
              if (simDay > maxDays) {
                setSimDay(maxDays);
              }
              setShowDatePickerSheet(false);
            }}
            style={({ pressed }) => [{
              marginTop: 14,
              paddingVertical: 14,
              borderRadius: 16,
              backgroundColor: t.indigo,
              alignItems: 'center',
              opacity: pressed ? 0.85 : 1,
            }]}
          >
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold',
              fontSize: 14,
              color: '#fff',
            }}>
              Confirmar Fecha
            </Text>
          </Pressable>
        </View>
      </Sheet>
    </View>
  );

  // Helper to change month and cap day if it exceeds the number of days in that month
  function setNewMonthAndFixDay(idx: number) {
    setSimMonth(idx);
    const maxDays = new Date(simYear, idx + 1, 0).getDate();
    if (simDay > maxDays) {
      setSimDay(maxDays);
    }
  }
}
