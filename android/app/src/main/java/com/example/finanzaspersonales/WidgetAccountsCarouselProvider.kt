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
        val cardIndex = prefs.getInt("cardIndex", 0)

        val active = WidgetAccountsCarouselLogic.resolveActiveAccount(jsonStr, cardIndex)
        val name = active.name
        val type = active.type
        val masked = active.masked
        val balance = active.balance
        val icon = active.iconKey
        val balanceLabel = active.balanceLabel
        val network = active.network
        val color = active.color
        val counterText = active.counterText

        val palette = WidgetTheme.palette(prefs)
        val balanceHidden = prefs.getString("balanceHidden", "false") == "true"

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_accounts_carousel_layout)
            // El fondo del Widget_Tarjeta depende únicamente del color de cuenta, nunca del tema.
            views.setInt(R.id.widget_accounts_container, "setBackgroundResource", WidgetTheme.cardBackground(color))
            views.setTextViewText(R.id.widget_account_name, name)
            views.setTextViewText(R.id.widget_account_type, type)
            views.setTextViewText(R.id.widget_account_balance_label, balanceLabel)
            views.setTextViewText(R.id.widget_account_network, network)
            views.setTextViewText(R.id.widget_card_number, masked)
            views.setTextViewText(R.id.widget_account_balance, balance)
            views.setTextViewText(R.id.widget_card_counter, counterText)

            // Elementos de texto secundario (que no dependen del color de cuenta) sí siguen la paleta de tema.
            views.setTextColor(R.id.widget_account_type, palette.muted)
            views.setTextColor(R.id.widget_card_counter, palette.text)
            views.setTextColor(R.id.widget_account_network, palette.text)

            // Ícono de tipo de cuenta vectorial en vez de emoji, tintado por la paleta activa.
            views.setImageViewResource(R.id.widget_account_type_icon, WidgetIcons.forKey(icon))
            WidgetTheme.tintImage(views, R.id.widget_account_type_icon, palette.text)

            // Control_Ojo sincronizado con balanceHidden global (no hay estado independiente por widget).
            views.setImageViewResource(R.id.widget_eye_btn, WidgetTheme.eyeIcon(balanceHidden))
            WidgetTheme.tintImage(views, R.id.widget_eye_btn, palette.text)
            views.setOnClickPendingIntent(R.id.widget_eye_btn, WidgetActions.toggleBalancePendingIntent(context, 402))

            // Click Prev Card Arrow
            val prevIntent = Intent(context, WidgetAccountsCarouselProvider::class.java).apply {
                action = ACTION_PREV_CARD
            }
            val pendingPrev = PendingIntent.getBroadcast(
                context,
                302,
                prevIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
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
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
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
