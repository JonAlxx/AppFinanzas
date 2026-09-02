package com.example.finanzaspersonales

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.graphics.Color

class WidgetRecentTransactionsProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("FinanzasWidgetPrefs", Context.MODE_PRIVATE)
        val palette = WidgetTheme.palette(prefs)
        val name1 = prefs.getString("recentTx1Name", "Soriana Híper") ?: "Soriana Híper"
        val val1 = prefs.getString("recentTx1Val", "-$523.40") ?: "-$523.40"
        val meta1 = prefs.getString("recentTx1Meta", "") ?: ""
        val name2 = prefs.getString("recentTx2Name", "Transferencia recibida") ?: "Transferencia recibida"
        val val2 = prefs.getString("recentTx2Val", "+$3,250.00") ?: "+$3,250.00"
        val meta2 = prefs.getString("recentTx2Meta", "") ?: ""

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_recent_transactions_layout)
            WidgetTheme.surface(views, R.id.widget_recent_tx_container, palette)
            WidgetTheme.panel(views, R.id.widget_recent_icon_panel, palette)
            views.setTextViewText(R.id.widget_recent_tx1_name, name1)
            views.setTextViewText(R.id.widget_recent_tx1_val, val1)
            views.setTextViewText(R.id.widget_recent_tx1_meta, meta1)
            views.setTextViewText(R.id.widget_recent_tx2_name, name2)
            views.setTextViewText(R.id.widget_recent_tx2_val, val2)
            views.setTextViewText(R.id.widget_recent_tx2_meta, meta2)
            views.setTextColor(R.id.widget_recent_tx1_name, palette.text)
            views.setTextColor(R.id.widget_recent_tx2_name, palette.text)
            views.setTextColor(R.id.widget_recent_tx1_meta, palette.muted)
            views.setTextColor(R.id.widget_recent_tx2_meta, palette.muted)
            views.setTextColor(R.id.widget_recent_tx1_val, Color.parseColor(if (val1.startsWith("+")) "#10B981" else "#F43F5E"))
            views.setTextColor(R.id.widget_recent_tx2_val, Color.parseColor(if (val2.startsWith("+")) "#10B981" else "#F43F5E"))

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(context, 207, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_recent_tx_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
