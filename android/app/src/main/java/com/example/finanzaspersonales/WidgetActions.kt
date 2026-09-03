package com.example.finanzaspersonales

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * Centraliza la construcción de PendingIntents reutilizados por varios Providers,
 * evitando duplicar la construcción del Intent del Deep_Link_Toggle en cada uno.
 */
object WidgetActions {
    private const val TOGGLE_URI = "finanzasapp://toggle-balance-hidden"

    /**
     * PendingIntent que dispara el Deep_Link_Toggle hacia la app (finanzasapp://toggle-balance-hidden).
     * No invierte ningún valor localmente: solo notifica a la app para que invierta
     * state.balanceHidden y resincronice los Widgets.
     */
    fun toggleBalancePendingIntent(context: Context, requestCode: Int): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(TOGGLE_URI), context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
