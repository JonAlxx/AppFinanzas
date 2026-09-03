package com.example.finanzaspersonales

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class WidgetExpensesProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val prefs = context.getSharedPreferences("FinanzasWidgetPrefs", Context.MODE_PRIVATE)
        val palette = WidgetTheme.palette(prefs)
        val todayText = prefs.getString("todayText", "$0.00") ?: "$0.00"
        val weeklyText = prefs.getString("weeklyText", "$0.00") ?: "$0.00"
        val balanceHidden = prefs.getString("balanceHidden", "false") == "true"

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_expenses_layout)
            WidgetTheme.surface(views, R.id.widget_expenses_container, palette)
            WidgetTheme.panel(views, R.id.widget_today_panel, palette)
            WidgetTheme.panel(views, R.id.widget_week_panel, palette)

            views.setTextViewText(R.id.widget_today_text, WidgetTheme.maskIf(balanceHidden, todayText))
            views.setTextViewText(R.id.widget_weekly_text, WidgetTheme.maskIf(balanceHidden, weeklyText))
            views.setTextColor(R.id.widget_expenses_title, palette.text)
            views.setTextColor(R.id.widget_today_label, palette.muted)
            views.setTextColor(R.id.widget_week_label, palette.muted)

            views.setImageViewResource(R.id.widget_eye_btn, WidgetTheme.eyeIcon(balanceHidden))
            WidgetTheme.tintImage(views, R.id.widget_eye_btn, palette.text)
            views.setOnClickPendingIntent(R.id.widget_eye_btn, WidgetActions.toggleBalancePendingIntent(context, 408))

            // Intent for main container tap
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                104,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_expenses_container, pendingIntent)

            // Deep link intent for + Registrar Gasto button
            val addIntent = Intent(Intent.ACTION_VIEW, Uri.parse("finanzasapp://add-transaction"), context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("action", "ADD_TRANSACTION")
            }
            val addPendingIntent = PendingIntent.getActivity(
                context,
                105,
                addIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_expenses_add_btn, addPendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE == intent.action) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = android.content.ComponentName(context, WidgetExpensesProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            onUpdate(context, appWidgetManager, appWidgetIds)
        }
    }
}
