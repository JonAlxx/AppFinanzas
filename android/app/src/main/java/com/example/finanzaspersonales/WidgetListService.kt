package com.example.finanzaspersonales

import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import org.json.JSONArray

class WidgetListService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return WidgetListFactory(this.applicationContext, intent)
    }
}

class WidgetListFactory(private val context: Context, private val intent: Intent) : RemoteViewsService.RemoteViewsFactory {

    private val itemList = mutableListOf<Map<String, String>>()
    private var itemType: String = "tx"

    override fun onCreate() {}

    override fun onDataSetChanged() {
        itemList.clear()
        val prefs = context.getSharedPreferences("FinanzasWidgetPrefs", Context.MODE_PRIVATE)
        itemType = intent.getStringExtra("itemType") ?: "tx"

        val jsonStr = when (itemType) {
            "accounts" -> prefs.getString("accountsJson", "[]")
            "budgets" -> prefs.getString("budgetsJson", "[]")
            "payments" -> prefs.getString("paymentsJson", "[]")
            else -> prefs.getString("recentTxsJson", "[]")
        } ?: "[]"

        try {
            val jsonArray = JSONArray(jsonStr)
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val map = mutableMapOf<String, String>()
                val keys = obj.keys()
                while (keys.hasNext()) {
                    val k = keys.next()
                    map[k] = obj.getString(k)
                }
                itemList.add(map)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onDestroy() {
        itemList.clear()
    }

    override fun getCount(): Int = itemList.size

    override fun getViewAt(position: Int): RemoteViews {
        if (position < 0 || position >= itemList.size) {
            return RemoteViews(context.packageName, android.R.layout.simple_list_item_1)
        }

        val item = itemList[position]
        val views = RemoteViews(context.packageName, R.layout.widget_list_item_layout)

        val title = item["title"] ?: ""
        val subtitle = item["subtitle"] ?: ""
        val valStr = item["value"] ?: ""
        val icon = item["icon"] ?: "💳"
        val isPositive = item["isPositive"] == "true"

        views.setTextViewText(R.id.widget_item_title, title)
        views.setTextViewText(R.id.widget_item_subtitle, subtitle)
        views.setTextViewText(R.id.widget_item_value, valStr)
        views.setTextViewText(R.id.widget_item_icon, icon)

        val colorHex = if (isPositive) "#10B981" else "#F43F5E"
        views.setTextColor(R.id.widget_item_value, android.graphics.Color.parseColor(colorHex))

        return views
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = position.toLong()
    override fun hasStableIds(): Boolean = true
}
