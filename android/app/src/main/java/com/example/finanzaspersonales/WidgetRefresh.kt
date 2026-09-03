package com.example.finanzaspersonales

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent

/**
 * Centraliza la notificación ACTION_APPWIDGET_UPDATE a los 9 Providers, evitando duplicar
 * la misma lista/lógica en WidgetSyncModule y en WidgetEyeToggleReceiver.
 */
object WidgetRefresh {
    private val PROVIDERS = arrayOf(
        WidgetTotalBalanceProvider::class.java,
        WidgetAccountsCarouselProvider::class.java,
        WidgetMonthlyBudgetProvider::class.java,
        WidgetSavingsGoalProvider::class.java,
        WidgetCategoryExpensesProvider::class.java,
        WidgetUpcomingPaymentsProvider::class.java,
        WidgetRecentTransactionsProvider::class.java,
        WidgetCalendarProvider::class.java,
        WidgetExpensesProvider::class.java
    )

    fun notifyAll(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        for (provider in PROVIDERS) {
            val componentName = ComponentName(context, provider)
            val ids = appWidgetManager.getAppWidgetIds(componentName)
            if (ids.isEmpty()) continue
            val intent = Intent(context, provider).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            }
            context.sendBroadcast(intent)
        }
    }
}
