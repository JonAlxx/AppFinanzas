package com.example.finanzaspersonales

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class WidgetCalendarProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("FinanzasWidgetPrefs", Context.MODE_PRIVATE)
        val isDark = prefs.getString("themeMode", "dark") == "dark"
        val palette = WidgetTheme.palette(prefs)
        val payment1 = prefs.getString("paymentLine1", "Sin pagos próximos") ?: "Sin pagos próximos"
        val payment2 = prefs.getString("paymentLine2", "") ?: ""

        val monthName = java.text.SimpleDateFormat("MMMM", java.util.Locale("es", "MX")).format(java.util.Date())
        val titleText = "📅 Calendario · ${monthName.replaceFirstChar { it.uppercase() }}"

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_calendar_layout)
            WidgetTheme.surface(views, R.id.widget_calendar_container, palette)
            views.setTextViewText(R.id.widget_calendar_title, titleText)
            views.setTextViewText(R.id.widget_calendar_event1, payment1)
            views.setTextViewText(R.id.widget_calendar_event2, payment2)

            if (!isDark) {
                views.setTextColor(R.id.widget_calendar_title, android.graphics.Color.parseColor("#0F172A"))
                views.setTextColor(R.id.widget_calendar_event1, android.graphics.Color.parseColor("#4F46E5"))
                views.setTextColor(R.id.widget_calendar_event2, android.graphics.Color.parseColor("#64748B"))
            } else {
                views.setTextColor(R.id.widget_calendar_title, android.graphics.Color.parseColor("#F8FAFC"))
                views.setTextColor(R.id.widget_calendar_event1, android.graphics.Color.parseColor("#818CF8"))
                views.setTextColor(R.id.widget_calendar_event2, android.graphics.Color.parseColor("#94A3B8"))
            }

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(context, 208, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_calendar_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
