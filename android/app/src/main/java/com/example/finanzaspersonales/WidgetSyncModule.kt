package com.example.finanzaspersonales

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetSyncModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WidgetSyncModule"

    @ReactMethod
    fun updateWidgetData(availableText: String, cutoffText: String, todayText: String, weeklyText: String) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences("FinanzasWidgetPrefs", Context.MODE_PRIVATE)

        prefs.edit()
            .putString("availableText", availableText)
            .putString("cutoffText", cutoffText)
            .putString("todayText", todayText)
            .putString("weeklyText", weeklyText)
            .apply()

        // Notify all 9 Widget Providers to update immediately
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val providers = arrayOf(
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

        for (provider in providers) {
            val componentName = ComponentName(context, provider)
            val ids = appWidgetManager.getAppWidgetIds(componentName)
            val intent = Intent(context, provider).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            }
            context.sendBroadcast(intent)
        }
    }
}
