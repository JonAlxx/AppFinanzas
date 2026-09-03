package com.example.finanzaspersonales

import android.content.SharedPreferences
import android.graphics.Color
import android.widget.RemoteViews

data class WidgetPalette(
    val surface: Int,
    val panel: Int,
    val text: Int,
    val muted: Int,
    val subtle: Int,
    val accent: Int
)

object WidgetTheme {
    fun palette(prefs: SharedPreferences): WidgetPalette {
        val dark = prefs.getString("themeMode", "dark") == "dark"
        return if (dark) {
            WidgetPalette(
                R.drawable.widget_surface_dark,
                R.drawable.widget_panel_dark,
                Color.parseColor("#F8FAFC"),
                Color.parseColor("#94A3B8"),
                Color.parseColor("#64748B"),
                Color.parseColor("#818CF8")
            )
        } else {
            WidgetPalette(
                R.drawable.widget_surface_light,
                R.drawable.widget_panel_light,
                Color.parseColor("#0F172A"),
                Color.parseColor("#64748B"),
                Color.parseColor("#94A3B8"),
                Color.parseColor("#4F46E5")
            )
        }
    }

    fun surface(views: RemoteViews, containerId: Int, palette: WidgetPalette) {
        views.setInt(containerId, "setBackgroundResource", palette.surface)
    }

    fun panel(views: RemoteViews, panelId: Int, palette: WidgetPalette) {
        views.setInt(panelId, "setBackgroundResource", palette.panel)
    }

    fun cardBackground(color: String): Int {
        val normalized = color.lowercase()
        return when {
            normalized.contains("green") || normalized.contains("teal") || normalized.contains("10b981") || normalized.contains("0ea5") -> R.drawable.widget_card_green
            normalized.contains("rose") || normalized.contains("pink") || normalized.contains("red") || normalized.contains("f43f") || normalized.contains("e306") -> R.drawable.widget_card_rose
            normalized.contains("orange") || normalized.contains("yellow") || normalized.contains("f973") || normalized.contains("f59e") -> R.drawable.widget_card_orange
            normalized.contains("blue") || normalized.contains("2563") || normalized.contains("0ea5e9") -> R.drawable.widget_card_blue
            else -> R.drawable.widget_card_indigo
        }
    }

    /**
     * Resuelve el drawable del Control_Ojo según el estado sincronizado de balanceHidden.
     * Es una función pura: depende únicamente del booleano de entrada.
     */
    fun eyeIcon(hidden: Boolean): Int {
        return if (hidden) R.drawable.ic_widget_eye_off else R.drawable.ic_widget_eye
    }

    /**
     * Aplica un tintado dinámico a un ImageView vectorial (Icono_Vectorial) según la paleta activa,
     * evitando que cada Provider repita `setInt(id, "setColorFilter", color)` de forma inconsistente.
     */
    fun tintImage(views: RemoteViews, imageViewId: Int, color: Int) {
        views.setInt(imageViewId, "setColorFilter", color)
    }

    // Coincide con montos monetarios (con o sin signo, separador de miles y decimales),
    // preservando explícitamente los porcentajes (un porcentaje no es un Monto_Sensible).
    private val AMOUNT_TOKEN = Regex("\\$?-?\\d{1,3}(,\\d{3})*(\\.\\d{1,2})?%?")

    /**
     * Sustituye cada Monto_Sensible del texto por el Patrón_Enmascarado ('••••'), preservando
     * el resto del texto (incluidos los porcentajes). Réplica en Kotlin de maskAmounts en
     * widgetSync.ts, necesaria porque el Control_Ojo alterna balanceHidden nativamente
     * (sin round-trip a JS), por lo que cada Provider debe poder enmascarar el valor real
     * que ya tiene persistido en FinanzasWidgetPrefs.
     */
    fun maskAmounts(text: String): String {
        if (text.isEmpty()) return text
        return AMOUNT_TOKEN.replace(text) { m -> if (m.value.endsWith("%")) m.value else "••••" }
    }

    /** Aplica maskAmounts solo si hidden es verdadero; si no, devuelve el texto original. */
    fun maskIf(hidden: Boolean, text: String): String {
        return if (hidden) maskAmounts(text) else text
    }
}
