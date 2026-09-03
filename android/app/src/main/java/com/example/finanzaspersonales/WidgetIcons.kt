package com.example.finanzaspersonales

/**
 * Centraliza el mapeo de "claves de ícono" (strings cortos enviados desde JS) hacia
 * drawables vectoriales (@drawable), reemplazando los emojis embebidos en texto.
 *
 * Responsabilidad separada de WidgetTheme: WidgetIcons resuelve QUÉ dibujo mostrar
 * (semántica de dominio), mientras que WidgetTheme resuelve QUÉ color aplicar (tema).
 */
object WidgetIcons {
    fun forKey(key: String): Int = when (key) {
        "credit" -> R.drawable.ic_widget_card
        "cash" -> R.drawable.ic_widget_cash
        "bank" -> R.drawable.ic_widget_bank
        "income" -> R.drawable.ic_widget_briefcase
        "expense" -> R.drawable.ic_widget_cart
        "calendar" -> R.drawable.ic_widget_calendar
        "bell" -> R.drawable.ic_widget_bell
        "category" -> R.drawable.ic_widget_tag
        else -> R.drawable.ic_widget_tag
    }
}
