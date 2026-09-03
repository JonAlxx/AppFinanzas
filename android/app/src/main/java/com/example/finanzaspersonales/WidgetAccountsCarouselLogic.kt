package com.example.finanzaspersonales

import org.json.JSONArray

/**
 * Datos resueltos para la cuenta activa del carrusel, listos para ser aplicados a un RemoteViews.
 */
data class ActiveAccountData(
    val name: String,
    val type: String,
    val masked: String,
    val balance: String,
    val iconKey: String,
    val balanceLabel: String,
    val network: String,
    val color: String,
    val counterText: String,
    val index: Int,
    val total: Int
)

/**
 * Lógica pura de resolución de la cuenta activa del Widget_Tarjeta, extraída de
 * WidgetAccountsCarouselProvider para permitir su verificación mediante property-based tests
 * sin depender de RemoteViews/AppWidgetManager.
 */
object WidgetAccountsCarouselLogic {

    private const val DEFAULT_NAME = "Cuenta Principal"
    private const val DEFAULT_TYPE = "Débito"
    private const val DEFAULT_MASKED = "**** **** **** 0000"
    private const val DEFAULT_BALANCE = "$0.00"
    private const val DEFAULT_ICON_KEY = "credit"
    private const val DEFAULT_BALANCE_LABEL = "SALDO"
    private const val DEFAULT_COLOR = "indigo"

    /**
     * Resuelve la cuenta activa según accountsJson y un índice arbitrario, normalizando el
     * índice al rango válido [0, total) mediante módulo. Si accountsJson está vacío o es
     * inválido, devuelve un Estado_Vacío_Legítimo consistente con los defaults ya usados
     * por el Provider antes de esta extracción.
     */
    fun resolveActiveAccount(accountsJson: String, index: Int): ActiveAccountData {
        var name = DEFAULT_NAME
        var type = DEFAULT_TYPE
        var masked = DEFAULT_MASKED
        var balance = DEFAULT_BALANCE
        var iconKey = DEFAULT_ICON_KEY
        var balanceLabel = DEFAULT_BALANCE_LABEL
        var network = ""
        var color = DEFAULT_COLOR
        var counterText = "1 / 1"
        var resolvedIndex = 0
        var total = 0

        try {
            val jsonArray = JSONArray(accountsJson)
            total = jsonArray.length()
            if (total > 0) {
                // Normaliza cualquier índice (incluyendo negativos) al rango válido [0, total)
                resolvedIndex = ((index % total) + total) % total
                val obj = jsonArray.getJSONObject(resolvedIndex)
                name = obj.optString("title", name)
                masked = obj.optString("subtitle", masked)
                balance = obj.optString("value", balance)
                type = obj.optString("type", type).uppercase()
                iconKey = obj.optString("iconKey", obj.optString("icon", iconKey))
                balanceLabel = obj.optString("balanceLabel", balanceLabel)
                network = obj.optString("network", network)
                color = obj.optString("color", color)
                counterText = "${resolvedIndex + 1} / $total"
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        return ActiveAccountData(
            name = name,
            type = type,
            masked = masked,
            balance = balance,
            iconKey = iconKey,
            balanceLabel = balanceLabel,
            network = network,
            color = color,
            counterText = counterText,
            index = resolvedIndex,
            total = total
        )
    }
}
