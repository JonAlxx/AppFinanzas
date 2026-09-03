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
        val palette = WidgetTheme.palette(prefs)
        val name = prefs.getString("goalName", "Sin meta activa") ?: "Sin meta activa"
        val amount = prefs.getString("goalAmount", "$0.00") ?: "$0.00"
        val pct = prefs.getString("goalPercentage", "0%") ?: "0%"
        val date = prefs.getString("goalDate", "Sin fecha límite") ?: "Sin fecha límite"
        val balanceHidden = prefs.getString("balanceHidden", "false") == "true"

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_savings_goal_layout)
            WidgetTheme.surface(views, R.id.widget_savings_goal_container, palette)
            WidgetTheme.panel(views, R.id.widget_goal_progress_panel, palette)
            views.setTextViewText(R.id.widget_goal_name, name)
            views.setTextViewText(R.id.widget_goal_amount, amount)
            views.setTextViewText(R.id.widget_goal_percentage, pct)
            views.setTextViewText(R.id.widget_goal_date, date)
            views.setTextColor(R.id.widget_goal_name, palette.text)
            views.setTextColor(R.id.widget_goal_percentage, palette.text)
            views.setTextColor(R.id.widget_goal_amount, palette.accent)
            views.setTextColor(R.id.widget_goal_date, palette.subtle)

            views.setImageViewResource(R.id.widget_goal_date_icon, WidgetIcons.forKey("calendar"))
            WidgetTheme.tintImage(views, R.id.widget_goal_date_icon, palette.subtle)

            views.setImageViewResource(R.id.widget_eye_btn, WidgetTheme.eyeIcon(balanceHidden))
            WidgetTheme.tintImage(views, R.id.widget_eye_btn, palette.text)
            views.setOnClickPendingIntent(R.id.widget_eye_btn, WidgetActions.toggleBalancePendingIntent(context, 404))

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(context, 204, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_savings_goal_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
