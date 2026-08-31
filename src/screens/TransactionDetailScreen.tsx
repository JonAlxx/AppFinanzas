import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { catById } from '../data/catalog';
import { fmtDateLong, fmtMXN, fmtTime } from '../data/format';
import { computeAccountBalance } from '../data/selectors';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { softFor } from '../theme/theme';

import { CategoryBadge } from '../components/Badges';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { Icon } from '../icons/Icon';

export interface TransactionDetailScreenProps {
  txId: string;
}

export function TransactionDetailScreen({ txId }: TransactionDetailScreenProps) {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { navigate, back } = useNavigation();

  const tx = state.transactions.find(x => x.id === txId);
  if (!tx) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title="Detalle" leftIcon="chevron-left" onLeft={back} rightIcon={null} />
        <View style={{ padding: 40 }}>
          <Text style={{ color: t.textMuted, fontFamily: 'PlusJakartaSans_500Medium' }}>
            Movimiento no encontrado
          </Text>
        </View>
      </View>
    );
  }

  const cat = tx.categoryId ? catById(tx.categoryId, state.customCategories) : undefined;
  const acc = state.accounts.find(a => a.id === tx.accountId);
  const dest = tx.destinationAccountId ? state.accounts.find(a => a.id === tx.destinationAccountId) : undefined;
  const isDebtAbono = tx.type === 'INCOME' && tx.categoryId === 'cat-debt';
  const isTransfer = tx.type === 'TRANSFER';
  const isIncome = tx.type === 'INCOME' && !isDebtAbono;
  const sign = isIncome || isDebtAbono ? '+' : isTransfer ? '' : '-';
  const color = isDebtAbono ? t.textMuted : isIncome ? t.green : isTransfer ? t.indigo : t.rose;

  const totalMonths = tx.msiMonths || tx.mciMonths;
  const isMci = !!tx.mciMonths;
  const isInstallment = !!totalMonths && totalMonths > 0;

  // Calculate installment breakdown if applicable
  let installmentData = null;
  if (isInstallment && totalMonths) {
    const sd = acc?.statementDay || 1;
    const txDate = new Date(tx.date);

    let firstCutoff = new Date(txDate.getFullYear(), txDate.getMonth(), sd, 23, 59, 59, 999);
    if (tx.date > firstCutoff.getTime()) {
      firstCutoff = new Date(txDate.getFullYear(), txDate.getMonth() + 1, sd, 23, 59, 59, 999);
    }

    let cutoffsPassed = 0;
    let curCut = new Date(firstCutoff.getTime());
    const now = new Date();
    while (curCut.getTime() <= now.getTime()) {
      cutoffsPassed++;
      curCut = new Date(curCut.getFullYear(), curCut.getMonth() + 1, sd, 23, 59, 59, 999);
    }

    const totalAmount = tx.amount;
    const monthlyAmount = Math.round(totalAmount / totalMonths);

    let paymentsCount = 0;
    if (acc) {
      for (const t of state.transactions) {
        if (t.date >= tx.date) {
          if ((t.type === 'INCOME' && t.accountId === acc.id && t.categoryId === 'cat-debt') ||
              (t.type === 'TRANSFER' && t.destinationAccountId === acc.id)) {
            paymentsCount++;
          }
        }
      }
    }

    const isSettled = tx.isEarlySettled || (paymentsCount >= totalMonths);

    const elapsedMonths = isSettled 
      ? totalMonths 
      : Math.min(totalMonths, paymentsCount);

    let baseAmount = tx.mciBaseAmount || totalAmount;
    let interestAmount = Math.max(0, totalAmount - baseAmount);
    const ratePercent = tx.mciInterestRate || (isMci && baseAmount > 0 && interestAmount > 0 ? Math.round((interestAmount / baseAmount) * 100 * 10) / 10 : 0);

    const paidCents = isSettled ? totalAmount : Math.min(totalAmount, monthlyAmount * elapsedMonths);
    const remainingCents = isSettled ? 0 : Math.max(0, totalAmount - paidCents);
    const pct = isSettled ? 100 : Math.min(100, Math.round((elapsedMonths / totalMonths) * 100));

    const endDate = new Date(txDate);
    endDate.setMonth(endDate.getMonth() + totalMonths);
    const MONTHS_SPANISH = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const endDateLabel = `${MONTHS_SPANISH[endDate.getMonth()]} ${endDate.getFullYear()}`;

    // Build month-by-month schedule
    const schedule: { monthIndex: number; label: string; amount: number; isPaid: boolean; isNext: boolean }[] = [];
    for (let i = 1; i <= totalMonths; i++) {
      let instDate = new Date(txDate);
      instDate.setMonth(instDate.getMonth() + (i - 1));
      const monthLabel = `${MONTHS_SPANISH[instDate.getMonth()]} ${instDate.getFullYear()}`;
      
      const isPaid = i <= elapsedMonths;
      const isNext = !isPaid && i === elapsedMonths + 1;

      schedule.push({
        monthIndex: i,
        label: monthLabel,
        amount: monthlyAmount,
        isPaid,
        isNext,
      });
    }

    installmentData = {
      totalMonths,
      elapsedMonths,
      monthlyAmount,
      paidCents,
      remainingCents,
      pct,
      isMci,
      baseAmount,
      interestAmount,
      mciInterestRate: ratePercent,
      endDateLabel,
      schedule,
    };
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        leftIcon="chevron-left"
        onLeft={back}
        title={isInstallment ? 'Detalle de Compra a Meses' : 'Detalle del Movimiento'}
        rightIcon={null}
        large={false}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header: Icon + Concept + Category & Card Pills + Amount + Date */}
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          {isTransfer ? (
            <View style={{
              width: 64, height: 64, borderRadius: 20,
              backgroundColor: t.indigoSoft,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="transfer" size={32} color={t.indigo} />
            </View>
          ) : (isDebtAbono || (tx.type === 'EXPENSE' && tx.categoryId === 'cat-debt')) ? (
            <View style={{
              width: 64, height: 64, borderRadius: 20,
              backgroundColor: isDebtAbono ? t.blueSoft : t.roseSoft,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="card" size={32} color={isDebtAbono ? t.blue : t.rose} strokeWidth={2} />
            </View>
          ) : (
            <CategoryBadge cat={cat} size={64} radius={20} iconSize={32} />
          )}

          {/* Title / Concept */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: t.text,
            marginTop: 12, textAlign: 'center',
          }}>
            {tx.note || cat?.name || 'Compra'}
          </Text>

          {/* Metadata Badges: Category & Account Pills */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8 }}>
            {cat && (
              <View style={{
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border,
                flexDirection: 'row', alignItems: 'center', gap: 5,
              }}>
                <Icon name="tag" size={11} color={t.textMuted} />
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted }}>
                  {cat.name}
                </Text>
              </View>
            )}

            {acc && (
              <View style={{
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                backgroundColor: softFor(t, 'indigo'), borderWidth: 1, borderColor: t.indigo + '33',
                flexDirection: 'row', alignItems: 'center', gap: 5,
              }}>
                <Icon name="card" size={11} color={t.indigo} strokeWidth={2.5} />
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.indigo }}>
                  {acc.name}
                </Text>
              </View>
            )}

            {dest && (
              <View style={{
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                backgroundColor: softFor(t, 'indigo'), borderWidth: 1, borderColor: t.indigo + '33',
                flexDirection: 'row', alignItems: 'center', gap: 5,
              }}>
                <Icon name="transfer" size={11} color={t.indigo} />
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.indigo }}>
                  Hacia: {dest.name}
                </Text>
              </View>
            )}

            {isInstallment && (
              <View style={{
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                backgroundColor: isMci ? softFor(t, 'orange') : softFor(t, 'green'),
                borderWidth: 1, borderColor: (isMci ? t.orange : t.green) + '33',
              }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11, color: isMci ? t.orange : t.green }}>
                  {totalMonths} {isMci ? 'MCI' : 'MSI'}
                </Text>
              </View>
            )}
          </View>

          {/* Amount */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color,
            letterSpacing: -1.2, marginTop: 10,
            fontVariant: ['tabular-nums'],
          }}>{sign}{fmtMXN(tx.amount).replace('-', '')}</Text>

          {/* Date & Time */}
          <Text style={{
            fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: t.textMuted,
            marginTop: 6,
          }}>{fmtDateLong(tx.date)} · {fmtTime(tx.date)}</Text>
        </View>

        {/* Installment breakdown card if applicable */}
        {isInstallment && installmentData && (
          <>
            {/* Resumen del Financiamiento */}
            <Card padding={16} style={{ marginBottom: 16, backgroundColor: softFor(t, isMci ? 'orange' : 'indigo') }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="calendar" size={16} color={isMci ? t.orange : t.indigo} />
                  <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text }}>
                    Resumen del Plan ({installmentData.totalMonths} Meses)
                  </Text>
                </View>
                <View style={{
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                  backgroundColor: isMci ? t.orange : t.indigo,
                }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 10, color: '#fff' }}>
                    {isMci ? `${installmentData.mciInterestRate}% MCI` : 'MSI Sin Intereses'}
                  </Text>
                </View>
              </View>

              {/* Price vs Interest Breakdown */}
              <View style={{
                backgroundColor: t.surface, padding: 12, borderRadius: 12,
                borderWidth: 1, borderColor: t.border, marginBottom: 12,
                gap: 8,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted, flex: 1 }}>
                    Precio Original (Sin intereses)
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text, fontVariant: ['tabular-nums'], flexShrink: 0 }}>
                    {fmtMXN(installmentData.baseAmount)}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted, flex: 1 }}>
                    Intereses generados
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: isMci ? t.orange : t.green, fontVariant: ['tabular-nums'], flexShrink: 0 }}>
                    {isMci && installmentData.interestAmount > 0 ? `+${fmtMXN(installmentData.interestAmount)} (${installmentData.mciInterestRate}%)` : '$0.00 (0%)'}
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: t.border, marginVertical: 2 }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: t.text, flex: 1 }}>
                    Precio Total a Pagar
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: isMci ? t.orange : t.text, fontVariant: ['tabular-nums'], flexShrink: 0 }}>
                    {fmtMXN(tx.amount)}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <ProgressBar pct={installmentData.pct} color={isMci ? 'orange' : 'indigo'} height={8} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 4, gap: 8 }}>
                <Text numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.textMuted, flex: 1 }}>
                  {installmentData.remainingCents === 0 ? `✅ Liquidada total (${installmentData.totalMonths} de ${installmentData.totalMonths})` : (installmentData.elapsedMonths === 0 ? `0 de ${installmentData.totalMonths} pagados (Próximo 1er pago)` : `${installmentData.elapsedMonths} de ${installmentData.totalMonths} pagados`)}
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11, color: isMci ? t.orange : t.indigo, flexShrink: 0 }}>
                  {installmentData.pct}% completado
                </Text>
              </View>
            </Card>

            {/* Lista Detallada de Parcialidades Mes por Mes */}
            <Card padding={16} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text }}>
                  Lista de Parcialidades por Mes
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: t.indigo }}>
                  {fmtMXN(installmentData.monthlyAmount)} / mes
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                {installmentData.schedule.map((item) => (
                  <View
                    key={item.monthIndex}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      padding: 12, borderRadius: 12,
                      backgroundColor: item.isPaid ? softFor(t, 'green') : (item.isNext ? softFor(t, 'indigo') : t.surfaceAlt),
                      borderWidth: 1,
                      borderColor: item.isPaid ? t.green + '33' : (item.isNext ? t.indigo + '44' : t.border),
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: item.isPaid ? t.green : (item.isNext ? t.indigo : t.border),
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {item.isPaid ? (
                          <Icon name="check" size={14} color="#fff" strokeWidth={3} />
                        ) : (
                          <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11, color: item.isNext ? '#fff' : t.textMuted }}>
                            {item.monthIndex}
                          </Text>
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: t.text }}>
                          Mes {item.monthIndex} ({item.label})
                        </Text>
                        <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted, marginTop: 1 }}>
                          {item.isPaid ? 'Mensualidad pagada' : (item.isNext ? 'Próximo corte a pagar' : 'Mensualidad pendiente')}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end', flexShrink: 0, marginLeft: 8 }}>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13,
                        color: item.isPaid ? t.green : (item.isNext ? t.indigo : t.text),
                        fontVariant: ['tabular-nums'],
                      }}>
                        {fmtMXN(item.amount)}
                      </Text>
                      <View style={{
                        marginTop: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
                        backgroundColor: item.isPaid ? t.green : (item.isNext ? t.indigo : t.border + '60'),
                      }}>
                        <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 9, color: '#fff' }}>
                          {item.isPaid ? 'PAGADO' : (item.isNext ? 'PRÓXIMO' : 'PENDIENTE')}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}

        {/* Action Buttons: Edit / Delete */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Pressable
            onPress={() => navigate({ screen: 'add-transaction', id: tx.id })}
            style={({ pressed }) => [{
              flex: 1, paddingVertical: 13, borderRadius: 14,
              backgroundColor: t.surface,
              borderWidth: 1, borderColor: t.border,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: pressed ? 0.8 : 1,
            }]}
          >
            <Icon name="edit" size={16} color={t.text} />
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
            }}>Editar</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert(
                'Eliminar movimiento',
                '¿Seguro que quieres eliminar este movimiento? Esta acción no se puede deshacer.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Eliminar', style: 'destructive',
                    onPress: () => {
                      dispatch({ type: 'DELETE_TX', id: tx.id });
                      back();
                    },
                  },
                ],
              );
            }}
            style={({ pressed }) => [{
              flex: 1, paddingVertical: 13, borderRadius: 14,
              backgroundColor: softFor(t, 'rose'),
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: pressed ? 0.8 : 1,
            }]}
          >
            <Icon name="trash" size={16} color={t.rose} />
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.rose,
            }}>Eliminar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
