import { Platform } from 'react-native';
import { Recurring, Transaction } from '../data/types';
import { dueDatesBetween } from '../data/selectors';
import { subscriptionBrandFor } from '../data/catalog';

// Dynamically load expo-notifications to prevent app crashes if the package is not installed yet
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  if (Notifications) {
    // Configure default notification behavior when app is in foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch (e) {
  console.log('expo-notifications no está instalado. Las notificaciones nativas en el celular están desactivadas. Error:', e);
}

/**
 * Requests permission for local notifications on the device.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  if (Platform.OS === 'web') return false;

  try {
    // Create the default notification channel for Android (required for showing alerts)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Alertas de Finanzas',
        importance: 4, // AndroidImportance.HIGH
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Error al solicitar permisos de notificación:', error);
    return false;
  }
}

/**
 * Schedules native local notifications for upcoming recurring transactions.
 * Starts 3 days before, firing at 9:00 AM and 9:00 PM every day until the transaction is registered (completed).
 */
export async function scheduleRecurringNotifications(
  recurring: Recurring[],
  transactions: Transaction[],
  accounts: any[],
  pushEnabled: boolean = true,
  daysBefore: number = 3,
  hour: number = 9,
  minute: number = 0,
  hour2: number = 21,
  minute2: number = 0,
  frequency: string = 'twice'
) {
  if (!Notifications) return;
  if (Platform.OS === 'web') return;

  try {
    // If native notifications are disabled in settings, cancel all scheduled notifications and exit
    if (!pushEnabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Las notificaciones nativas en el celular han sido desactivadas en los ajustes.');
      return;
    }

    // 1. First, request permissions (handles asking when needed and configures channel)
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    // 2. Cancel all previously scheduled notifications to avoid duplicates and queue pollution
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Look ahead 10 days for upcoming instances
    const lookAheadDays = 10;
    const endPeriod = todayStart.getTime() + lookAheadDays * 24 * 60 * 60 * 1000;

    let scheduledCount = 0;

    for (const rule of recurring) {
      if (!rule.active) continue;

      // Find all occurrence dates in the next 10 days
      const occurrences = dueDatesBetween(rule, now, endPeriod);

      for (const occurrenceDate of occurrences) {
        // Check if this occurrence is already "completed" (materialized as a transaction)
        const expectedTxId = `tx-rec-${rule.id}-${occurrenceDate}`;
        const isCompleted = transactions.some(t => t.id === expectedTxId);
        if (isCompleted) continue; // Skip if already registered

        const isIncome = rule.type === 'INCOME';
        const acc = accounts.find(a => a.id === rule.accountId);
        const accName = acc ? acc.name : 'tu cuenta';
        const amountFormatted = (rule.amount / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

        // Schedule notifications from configured days before down to 1
        for (let daysBeforeIdx = daysBefore; daysBeforeIdx >= 1; daysBeforeIdx--) {
          const alertDate = new Date(occurrenceDate);
          alertDate.setDate(alertDate.getDate() - daysBeforeIdx);
          alertDate.setHours(0, 0, 0, 0);

          // We schedule for custom hour slots (once: [hour], twice: [hour, hour2])
          const hourSlots = frequency === 'once' ? [hour] : [hour, hour2];

          for (const hr of hourSlots) {
            const triggerDate = new Date(alertDate.getTime());
            if (hr === hour) {
              triggerDate.setHours(hour, minute, 0, 0);
            } else {
              triggerDate.setHours(hour2, minute2, 0, 0);
            }

            // Only schedule if the trigger time is in the future
            if (triggerDate.getTime() > now) {
              const brand = subscriptionBrandFor(rule.subscriptionBrand);
              const conceptName = brand ? brand.name : (rule.note || 'tu movimiento');
              
              const daysText = daysBeforeIdx === 1 ? 'Falta 1 día' : `Faltan ${daysBeforeIdx} días`;
              
              const title = isIncome ? 'Ingreso próximo' : 'Pago próximo';
              const body = isIncome
                ? `${daysText} para tu ingreso de ${conceptName} de la cantidad de ${amountFormatted} pesos.`
                : `${daysText} para tu pago de ${conceptName} de la cantidad de ${amountFormatted} pesos.`;

              await Notifications.scheduleNotificationAsync({
                content: {
                  title,
                  body,
                  sound: true,
                  channelId: 'default',
                  data: { ruleId: rule.id, occurrenceDate },
                },
                trigger: {
                  type: 'date',
                  timestamp: triggerDate.getTime(),
                } as any,
              });
              scheduledCount++;
            }
          }
        }
      }
    }

    console.log(`Programadas ${scheduledCount} alertas de notificación locales nativas en el celular.`);
  } catch (error) {
    console.warn('Error al programar las notificaciones locales:', error);
  }
}

/**
 * Schedules native local notifications for upcoming credit card payments.
 */
export async function scheduleCreditCardNotifications(
  accounts: any[],
  transactions: Transaction[],
  pushEnabled: boolean = true,
  daysBefore: number = 3,
  hour: number = 9,
  minute: number = 0,
  hour2: number = 21,
  minute2: number = 0,
  frequency: string = 'twice'
) {
  if (!Notifications) return;
  if (Platform.OS === 'web') return;

  try {
    if (!pushEnabled) return;

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let scheduledCount = 0;

    for (const acc of accounts) {
      if (acc.type === 'CREDIT_CARD' && acc.paymentDay) {
        // We only want to alert if there's an actual statement balance to pay
        const { calculateStatementBalance } = require('../data/selectors');
        const statementBalance = calculateStatementBalance(acc, transactions);
        if (statementBalance <= 0) continue;

        // Determine the next payment date
        let paymentDate = new Date(today.getFullYear(), today.getMonth(), acc.paymentDay);
        paymentDate.setHours(0, 0, 0, 0);
        
        // If payment day already passed this month, the next one is next month
        if (paymentDate.getTime() < today.getTime()) {
          paymentDate = new Date(today.getFullYear(), today.getMonth() + 1, acc.paymentDay);
          paymentDate.setHours(0, 0, 0, 0);
        }

        const amountFormatted = (statementBalance / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

        for (let daysBeforeIdx = daysBefore; daysBeforeIdx >= 1; daysBeforeIdx--) {
          const alertDate = new Date(paymentDate);
          alertDate.setDate(alertDate.getDate() - daysBeforeIdx);
          alertDate.setHours(0, 0, 0, 0);

          const hourSlots = frequency === 'once' ? [hour] : [hour, hour2];

          for (const hr of hourSlots) {
            const triggerDate = new Date(alertDate.getTime());
            if (hr === hour) {
              triggerDate.setHours(hour, minute, 0, 0);
            } else {
              triggerDate.setHours(hour2, minute2, 0, 0);
            }

            if (triggerDate.getTime() > now && triggerDate.getTime() <= (now + 10 * 24 * 60 * 60 * 1000)) { // within 10 days
              const daysText = daysBeforeIdx === 1 ? 'Mañana' : `Faltan ${daysBeforeIdx} días`;
              const title = `Pago de Tarjeta: ${acc.name}`;
              const body = `⚠️ ${daysText} es la fecha límite de pago. Tienes un saldo al corte de ${amountFormatted} pesos.`;

              await Notifications.scheduleNotificationAsync({
                content: {
                  title,
                  body,
                  sound: true,
                  channelId: 'default',
                  data: { accountId: acc.id, paymentDate: paymentDate.getTime() },
                },
                trigger: {
                  type: 'date',
                  timestamp: triggerDate.getTime(),
                } as any,
              });
              scheduledCount++;
            }
          }
        }
      }
    }
    console.log(`Programadas ${scheduledCount} alertas para pago de tarjetas.`);
  } catch (error) {
    console.warn('Error al programar alertas de tarjetas:', error);
  }
}

/**
 * Triggers a native test notification on the device exactly 2 seconds in the future.
 */
export async function triggerImmediateTestNotification(amount: number, note: string, isIncome: boolean) {
  if (!Notifications) {
    throw new Error('expo-notifications_not_installed');
  }

  const amountFormatted = amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  const title = isIncome ? 'Ingreso próximo (Prueba)' : 'Pago próximo (Prueba)';
  const body = isIncome
    ? `Prueba: Se acerca tu ingreso de ${amountFormatted} para: ${note}.`
    : `Prueba: Se acerca tu pago de ${amountFormatted} para: ${note}.`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      channelId: 'default',
      data: { isTest: true },
    },
    trigger: {
      type: 'timeInterval',
      seconds: 2,
    },
  });
}
