package com.example.finanzaspersonales

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Recibe el toque del Control_Ojo desde cualquier Widget y alterna balanceHidden
 * directamente en FinanzasWidgetPrefs, sin abrir MainActivity (a diferencia de
 * PendingIntent.getActivity, que siempre trae la app al frente).
 *
 * El valor invertido aquí es la fuente de verdad transitoria para los Widgets;
 * la próxima vez que la app JS sincronice su propio state.balanceHidden (por ejemplo,
 * al abrirla o al tocar el ojo dentro del Dashboard), widgetSync.ts sobreescribe este
 * valor con el de la app, manteniendo una única fuente de verdad final.
 */
class WidgetEyeToggleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_TOGGLE_EYE) return
        val prefs = context.getSharedPreferences("FinanzasWidgetPrefs", Context.MODE_PRIVATE)
        val current = prefs.getString("balanceHidden", "false") == "true"
        prefs.edit().putString("balanceHidden", (!current).toString()).apply()
        WidgetRefresh.notifyAll(context)
    }

    companion object {
        const val ACTION_TOGGLE_EYE = "com.example.finanzaspersonales.ACTION_TOGGLE_EYE"
    }
}
