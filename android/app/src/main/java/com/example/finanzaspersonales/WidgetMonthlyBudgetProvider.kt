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
        val balanceHidden = prefs.getString("balanceHidden", "false") == "true"
        val daysLeft = prefs.getString("budgetDaysLeft", "-- días restantes") ?: "-- días restantes"
        val line1 = prefs.getString("budgetLine1", "Sin presupuesto definido") ?: "Sin presupuesto definido"
        val line2 = prefs.getString("budgetLine2", "") ?: ""
        var progress1 = 0
        var progress2 = 0
        try {
            val budgets = org.json.JSONArray(prefs.getString("budgetsJson", "[]"))
            if (budgets.length() > 0) progress1 = budgets.getJSONObject(0).optString("value", "0").filter { it.isDigit() }.toIntOrNull() ?: 0
            if (budgets.length() > 1) progress2 = budgets.getJSONObject(1).optString("value", "0").filter { it.isDigit() }.toIntOrNull() ?: 0
        } catch (_: Exception) { }

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_monthly_budget_layout)
            views.setTextViewText(R.id.widget_budget_days_left, daysLeft)
            views.setTextViewText(R.id.widget_budget_comida_text, line1)
            views.setTextViewText(R.id.widget_budget_transporte_text, line2)
            views.setProgressBar(R.id.widget_budget_progress1, 100, progress1.coerceIn(0, 100), false)
            views.setProgressBar(R.id.widget_budget_progress2, 100, progress2.coerceIn(0, 100), false)
            val palette = WidgetTheme.palette(prefs)
            WidgetTheme.surface(views, R.id.widget_budget_container, palette)
            WidgetTheme.panel(views, R.id.widget_budget_icon1, palette)
            WidgetTheme.panel(views, R.id.widget_budget_icon2, palette)
            views.setTextColor(R.id.widget_budget_title, palette.text)
            views.setTextColor(R.id.widget_budget_days_left, palette.accent)
            views.setTextColor(R.id.widget_budget_comida_text, palette.text)
            views.setTextColor(R.id.widget_budget_transporte_text, palette.muted)

            views.setImageViewResource(R.id.widget_eye_btn, WidgetTheme.eyeIcon(balanceHidden))
            WidgetTheme.tintImage(views, R.id.widget_eye_btn, palette.text)
            views.setOnClickPendingIntent(R.id.widget_eye_btn, WidgetActions.toggleBalancePendingIntent(context, 403))

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(context, 203, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_budget_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
