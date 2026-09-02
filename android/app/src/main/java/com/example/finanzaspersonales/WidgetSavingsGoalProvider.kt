package com.example.finanzaspersonales

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class WidgetSavingsGoalProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("FinanzasWidgetPrefs", Context.MODE_PRIVATE)
        val name = prefs.getString("goalName", "Viaje a Cancún 🌴") ?: "Viaje a Cancún 🌴"
        val amount = prefs.getString("goalAmount", "$20,450 / $30,000") ?: "$20,450 / $30,000"
        val pct = prefs.getString("goalPercentage", "68%") ?: "68%"
        val date = prefs.getString("goalDate", "📅 Límite: 30 nov 2025") ?: "📅 Límite: 30 nov 2025"

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_savings_goal_layout)
            views.setTextViewText(R.id.widget_goal_name, name)
            views.setTextViewText(R.id.widget_goal_amount, amount)
            views.setTextViewText(R.id.widget_goal_percentage, pct)
            views.setTextViewText(R.id.widget_goal_date, date)

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(context, 204, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_savings_goal_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
