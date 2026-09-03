package com.example.finanzaspersonales

import android.app.PendingIntent
import android.content.Context
import android.content.Intent

/**
 * Centraliza la construcción de PendingIntents reutilizados por varios Providers,
 * evitando duplicar la construcción del Intent del Control_Ojo en cada uno.
 */
object WidgetActions {

    /**
     * PendingIntent que alterna balanceHidden localmente en FinanzasWidgetPrefs mediante
     * WidgetEyeToggleReceiver, SIN abrir MainActivity. Usa getBroadcast (no getActivity),
     * igual que el mecanismo ya usado por las flechas de navegación del carrusel de cuentas.
     */
    fun toggleBalancePendingIntent(context: Context, requestCode: Int): PendingIntent {
        val intent = Intent(context, WidgetEyeToggleReceiver::class.java).apply {
            action = WidgetEyeToggleReceiver.ACTION_TOGGLE_EYE
        }
        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
