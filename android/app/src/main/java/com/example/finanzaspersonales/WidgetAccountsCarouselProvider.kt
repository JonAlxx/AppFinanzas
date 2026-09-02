package com.example.finanzaspersonales

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class WidgetAccountsCarouselProvider : AppWidgetProvider() {

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val action = intent.action
        if (action == ACTION_NEXT_CARD || action == ACTION_PREV_CARD) {
            val prefs = context.getSharedPreferences("FinanzasWidgetPrefs", Context.MODE_PRIVATE)
            val jsonStr = prefs.getString("accountsJson", "[]") ?: "[]"
            try {
                val jsonArray = org.json.JSONArray(jsonStr)
                val totalCards = jsonArray.length()
                if (totalCards > 0) {
                    val currentIndex = prefs.getInt("cardIndex", 0)
                    val nextIndex = if (action == ACTION_NEXT_CARD) {
                        (currentIndex + 1) % totalCards
                    } else {
                        (currentIndex - 1 + totalCards) % totalCards
                    }
                    prefs.edit().putInt("cardIndex", nextIndex).apply()

                    val appWidgetManager = AppWidgetManager.getInstance(context)
                    val componentName = ComponentName(context, WidgetAccountsCarouselProvider::class.java)
                    val ids = appWidgetManager.getAppWidgetIds(componentName)
                    onUpdate(context, appWidgetManager, ids)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("FinanzasWidgetPrefs", Context.MODE_PRIVATE)
        val jsonStr = prefs.getString("accountsJson", "[]") ?: "[]"

        var name = prefs.getString("mainAccountName", "Cuenta Principal") ?: "Cuenta Principal"
        var type = prefs.getString("mainAccountType", "Débito") ?: "Débito"
        var masked = prefs.getString("mainAccountMasked", "**** **** **** 0000") ?: "**** **** **** 0000"
        var balance = prefs.getString("mainAccountBalance", "$0.00") ?: "$0.00"
        var counterText = "1/1"

        try {
            val jsonArray = org.json.JSONArray(jsonStr)
            val total = jsonArray.length()
            if (total > 0) {
                val idx = prefs.getInt("cardIndex", 0) % total
                val obj = jsonArray.getJSONObject(idx)
                name = obj.optString("title", name)
                masked = obj.optString("subtitle", masked)
                balance = obj.optString("value", balance)
                type = if (masked.contains("Crédito")) "Crédito" else "Débito"
                counterText = "${idx + 1}/$total"
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_accounts_carousel_layout)
            views.setTextViewText(R.id.widget_account_name, name)
            views.setTextViewText(R.id.widget_account_type, type)
            views.setTextViewText(R.id.widget_card_number, masked)
            views.setTextViewText(R.id.widget_account_balance, balance)
            views.setTextViewText(R.id.widget_card_counter, counterText)

            // Click Prev Card Arrow
            val prevIntent = Intent(context, WidgetAccountsCarouselProvider::class.java).apply {
                action = ACTION_PREV_CARD
            }
            val pendingPrev = PendingIntent.getBroadcast(
                context,
                302,
                prevIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_prev_card, pendingPrev)

            // Click Next Card Arrow
            val nextIntent = Intent(context, WidgetAccountsCarouselProvider::class.java).apply {
                action = ACTION_NEXT_CARD
            }
            val pendingNext = PendingIntent.getBroadcast(
                context,
                301,
                nextIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_next_card, pendingNext)

            // Open App when clicking container body
            val openAppIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingOpenApp = PendingIntent.getActivity(
                context,
                202,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_accounts_container, pendingOpenApp)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }

    companion object {
        const val ACTION_NEXT_CARD = "com.example.finanzaspersonales.ACTION_NEXT_CARD"
        const val ACTION_PREV_CARD = "com.example.finanzaspersonales.ACTION_PREV_CARD"
    }
}
