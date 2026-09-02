package com.example.finanzaspersonales

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class WidgetCategoryExpensesProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("FinanzasWidgetPrefs", Context.MODE_PRIVATE)
        val palette = WidgetTheme.palette(prefs)
        val total = prefs.getString("categoryTotal", "$0.00") ?: "$0.00"
        val line1 = prefs.getString("catLine1", "🟢 Comida (34%): $4,311.40") ?: "🟢 Comida (34%): $4,311.40"
        val line2 = prefs.getString("catLine2", "🟠 Transporte (22%): $2,789.60") ?: "🟠 Transporte (22%): $2,789.60"

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_category_expenses_layout)
            WidgetTheme.surface(views, R.id.widget_cat_expenses_container, palette)
            WidgetTheme.panel(views, R.id.widget_cat_total_panel, palette)
            views.setTextViewText(R.id.widget_cat_total_val, total)
            views.setTextViewText(R.id.widget_cat_comida_pct, line1)
            views.setTextViewText(R.id.widget_cat_transporte_pct, line2)
            views.setTextColor(R.id.widget_cat_total_val, palette.text)
            views.setTextColor(R.id.widget_cat_comida_pct, palette.text)
            views.setTextColor(R.id.widget_cat_transporte_pct, palette.muted)

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(context, 205, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_cat_expenses_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
