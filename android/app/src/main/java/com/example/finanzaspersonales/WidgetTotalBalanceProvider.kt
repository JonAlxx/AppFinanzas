package com.example.finanzaspersonales

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.graphics.Color

class WidgetTotalBalanceProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("FinanzasWidgetPrefs", Context.MODE_PRIVATE)
        val palette = WidgetTheme.palette(prefs)
        val availableText = prefs.getString("availableText", "$0.00") ?: "$0.00"
        val variation = prefs.getString("availableVariation", "▲ +$0.00 (0.0%)") ?: "▲ +$0.00 (0.0%)"
        val balanceHidden = prefs.getString("balanceHidden", "false") == "true"

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_total_balance_layout)
            WidgetTheme.surface(views, R.id.widget_total_balance_container, palette)
            views.setTextColor(R.id.widget_total_balance_title, palette.text)
            views.setTextColor(R.id.widget_total_balance_text, palette.text)
            views.setTextColor(R.id.widget_total_balance_currency, palette.muted)

            views.setTextViewText(R.id.widget_total_balance_text, WidgetTheme.maskIf(balanceHidden, availableText))
            views.setTextViewText(R.id.widget_total_balance_variation, WidgetTheme.maskIf(balanceHidden, variation))
            views.setTextColor(
                R.id.widget_total_balance_variation,
                Color.parseColor(if (variation.startsWith("▼")) "#FDA4AF" else "#86EFAC")
            )

            views.setImageViewResource(R.id.widget_eye_btn, WidgetTheme.eyeIcon(balanceHidden))
            WidgetTheme.tintImage(views, R.id.widget_eye_btn, palette.text)
            views.setOnClickPendingIntent(R.id.widget_eye_btn, WidgetActions.toggleBalancePendingIntent(context, 401))

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(context, 201, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_total_balance_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
