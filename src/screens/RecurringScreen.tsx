import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { catById, subscriptionBrandFor } from '../data/catalog';
import { fmtMXN } from '../data/format';
import { calculateStatementBalance, nextDueAfter } from '../data/selectors';
import { Recurring, RecurringFrequency } from '../data/types';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';

import { CategoryBadge } from '../components/Badges';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionTitle } from '../components/SectionTitle';
import { SubscriptionBadge } from '../components/SubscriptionBadge';
import { Icon } from '../icons/Icon';

const FREQ_LABEL: Record<RecurringFrequency, string> = {
  once: 'Una sola vez',
  monthly: 'Mensual',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  yearly: 'Anual',
};

function fmtNextDate(ms: number | null): string {
  if (ms == null) return '—';
  const now = new Date();
  const d = new Date(ms);
  const sameYear = d.getFullYear() === now.getFullYear();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ms === today) return 'Hoy';
  if (ms === today + 86400000) return 'Mañana';
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const base = `${d.getDate()} ${months[d.getMonth()]}`;
  return sameYear ? base : `${base} ${d.getFullYear()}`;
}

function RecurringRow({ rule }: { rule: Recurring }) {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { navigate } = useNavigation();
  const cat = rule.categoryId ? catById(rule.categoryId, state.customCategories) : undefined;
  const brand = subscriptionBrandFor(rule.subscriptionBrand);
  const next = nextDueAfter(rule, Date.now());
  const isIncome = rule.type === 'INCOME';

  const linkedCcAcc = rule.autoCreditCardId ? state.accounts.find(a => a.id === rule.autoCreditCardId) : undefined;
  const displayAmount = linkedCcAcc ? calculateStatementBalance(linkedCcAcc, state.transactions) : rule.amount;

  return (
    <Pressable
      onPress={() => {
        if (linkedCcAcc) {
          navigate({ screen: 'account-detail', id: linkedCcAcc.id });
        } else {
          navigate({ screen: 'add-recurring', id: rule.id });
        }
      }}
      style={({ pressed }) => [{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        opacity: pressed ? 0.8 : 1,
      }]}
    >
      {brand ? (
        <SubscriptionBadge brandId={rule.subscriptionBrand} size={44} />
      ) : (
        <CategoryBadge cat={cat} />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={{
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text, flexShrink: 1,
          }}>{rule.note || brand?.name || cat?.name || (isIncome ? 'Ingreso fijo' : 'Recurrente')}</Text>
          {linkedCcAcc ? (
            <View style={{
              paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
              backgroundColor: softFor(t, 'indigo'),
            }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: t.indigo,
              }}>⚡ Dinámico</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={{
          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
          marginTop: 2,
        }}>{FREQ_LABEL[rule.frequency]} · {fmtNextDate(next)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={{
          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14,
          color: isIncome ? t.green : (linkedCcAcc && displayAmount === 0 ? t.green : t.text),
          fontVariant: ['tabular-nums'],
        }}>{isIncome ? '+' : '-'}{fmtMXN(displayAmount).replace('-', '')}</Text>
        {!linkedCcAcc ? (
          <Pressable
            onPress={(e) => {
              dispatch({ type: 'TOGGLE_RECURRING_ACTIVE', id: rule.id });
            }}
            hitSlop={6}
            style={{
              width: 36, height: 20, borderRadius: 10,
              backgroundColor: rule.active ? t.green : t.border,
              justifyContent: 'center',
            }}
          >
            <View style={{
              width: 16, height: 16, borderRadius: 8,
              backgroundColor: '#fff',
              position: 'absolute', top: 2, left: rule.active ? 18 : 2,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2, shadowRadius: 2, elevation: 1,
            }} />
          </Pressable>
        ) : (
          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: t.indigo }}>
            TDC ➔
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export function RecurringScreen() {
  const { t } = useTheme();
  const { state } = useAppState();
  const { navigate, back } = useNavigation();

  const { subs, income } = useMemo(() => {
    const subs = state.recurring.filter(r => r.type === 'EXPENSE');
    const income = state.recurring.filter(r => r.type === 'INCOME');
    return { subs, income };
  }, [state.recurring]);

  const monthlyOut = useMemo(() => {
    return subs.filter(r => r.active).reduce((s, r) => {
      let multiplier = 0;
      if (r.frequency === 'monthly') multiplier = 1;
      else if (r.frequency === 'biweekly') multiplier = 2;
      else if (r.frequency === 'weekly') multiplier = 4;
      else if (r.frequency === 'yearly') multiplier = 1 / 12;

      let ruleAmt = r.amount;
      if (r.autoCreditCardId) {
        const cc = state.accounts.find(a => a.id === r.autoCreditCardId);
        if (cc) {
          ruleAmt = calculateStatementBalance(cc, state.transactions);
        }
      }

      return s + ruleAmt * multiplier;
    }, 0);
  }, [subs, state.accounts, state.transactions]);

  const monthlyIn = useMemo(() => {
    return income.filter(r => r.active).reduce((s, r) => {
      let multiplier = 0;
      if (r.frequency === 'monthly') multiplier = 1;
      else if (r.frequency === 'biweekly') multiplier = 2;
      else if (r.frequency === 'weekly') multiplier = 4;
      else if (r.frequency === 'yearly') multiplier = 1 / 12;
      return s + r.amount * multiplier;
    }, 0);
  }, [income]);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        leftIcon="chevron-left"
        onLeft={back}
        title="Recurrentes"
        rightIcon="plus"
        onRight={() => navigate('add-recurring')}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {state.recurring.length === 0 ? (
          <EmptyState
            icon="rotate"
            title="Sin recurrentes"
            message="Agrega tus suscripciones e ingresos fijos para que la app los registre cada mes automáticamente."
            action="Agregar recurrente"
            onAction={() => navigate('add-recurring')}
          />
        ) : (
          <>
            {/* Resumen */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Card padding={14} style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="arrow-down" size={14} color={t.green} strokeWidth={2.5} />
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
                  }}>INGRESO MES</Text>
                </View>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 17, color: t.text,
                  marginTop: 4, fontVariant: ['tabular-nums'],
                }}>{fmtMXN(monthlyIn)}</Text>
              </Card>
              <Card padding={14} style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="arrow-up" size={14} color={t.rose} strokeWidth={2.5} />
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted,
                  }}>GASTO MES</Text>
                </View>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 17, color: t.text,
                  marginTop: 4, fontVariant: ['tabular-nums'],
                }}>{fmtMXN(monthlyOut)}</Text>
              </Card>
            </View>

            {subs.length > 0 ? (
              <View style={{ marginTop: 18 }}>
                <SectionTitle title="Suscripciones y gastos" />
                <Card padding={4} style={{ marginTop: 12 }}>
                  {subs.map((r, i) => (
                    <View key={r.id}>
                      <RecurringRow rule={r} />
                      {i < subs.length - 1 ? (
                        <View style={{ height: 1, backgroundColor: t.border, marginHorizontal: 14 }} />
                      ) : null}
                    </View>
                  ))}
                </Card>
              </View>
            ) : null}

            {income.length > 0 ? (
              <View style={{ marginTop: 18 }}>
                <SectionTitle title="Ingresos fijos" />
                <Card padding={4} style={{ marginTop: 12 }}>
                  {income.map((r, i) => (
                    <View key={r.id}>
                      <RecurringRow rule={r} />
                      {i < income.length - 1 ? (
                        <View style={{ height: 1, backgroundColor: t.border, marginHorizontal: 14 }} />
                      ) : null}
                    </View>
                  ))}
                </Card>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
