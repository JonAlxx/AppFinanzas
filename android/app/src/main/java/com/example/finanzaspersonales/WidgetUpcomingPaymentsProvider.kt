package com.example.finanzaspersonales

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class WidgetUpcomingPaymentsProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("FinanzasWidgetPrefs", Context.MODE_PRIVATE)
        val palette = WidgetTheme.palette(prefs)
        val payment1 = prefs.getString("paymentLine1", "Sin pagos próximos") ?: "Sin pagos próximos"
        val payment2 = prefs.getString("paymentLine2", "") ?: ""
        val balanceHidden = prefs.getString("balanceHidden", "false") == "true"
        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_upcoming_payments_layout)
            WidgetTheme.surface(views, R.id.widget_upcoming_container, palette)
            WidgetTheme.panel(views, R.id.widget_upcoming_payment1, palette)
            WidgetTheme.panel(views, R.id.widget_upcoming_payment2, palette)
            views.setTextViewText(R.id.widget_upcoming_payment1, payment1)
            views.setTextViewText(R.id.widget_upcoming_payment2, payment2)
            views.setTextColor(R.id.widget_upcoming_title, palette.text)
            views.setTextColor(R.id.widget_upcoming_payment1, palette.text)
            views.setTextColor(R.id.widget_upcoming_payment2, palette.muted)

            views.setImageViewResource(R.id.widget_eye_btn, WidgetTheme.eyeIcon(balanceHidden))
            WidgetTheme.tintImage(views, R.id.widget_eye_btn, palette.text)
            views.setOnClickPendingIntent(R.id.widget_eye_btn, WidgetActions.toggleBalancePendingIntent(context, 406))

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(context, 206, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_upcoming_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
