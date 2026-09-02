package com.example.finanzaspersonales

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class WidgetMonthlyBudgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("FinanzasWidgetPrefs", Context.MODE_PRIVATE)
        val daysLeft = prefs.getString("budgetDaysLeft", "12 días restantes") ?: "12 días restantes"
        val line1 = prefs.getString("budgetLine1", "🍴 Comida: $2,450 / $3,000 (82%)") ?: "🍴 Comida: $2,450 / $3,000 (82%)"
        val line2 = prefs.getString("budgetLine2", "🚌 Transporte: $1,200 / $1,800 (67%)") ?: "🚌 Transporte: $1,200 / $1,800 (67%)"

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_monthly_budget_layout)
            views.setTextViewText(R.id.widget_budget_days_left, daysLeft)
            views.setTextViewText(R.id.widget_budget_comida_text, line1)
            views.setTextViewText(R.id.widget_budget_transporte_text, line2)

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(context, 203, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_budget_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
