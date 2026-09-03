package com.example.finanzaspersonales

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetSyncModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WidgetSyncModule"

    @ReactMethod
    fun updateFullWidgetDataWithLists(
        themeMode: String,
        balanceHidden: String,
        availableText: String, availableVariation: String, cutoffText: String, todayText: String, weeklyText: String,
        mainAccountName: String, mainAccountType: String, mainAccountMasked: String, mainAccountBalance: String,
        budgetDaysLeft: String, budgetLine1: String, budgetLine2: String,
        goalName: String, goalAmount: String, goalPercentage: String, goalDate: String,
        categoryTotal: String, catLine1: String, catLine2: String,
        paymentLine1: String, paymentLine2: String,
        recentTx1Name: String, recentTx1Val: String, recentTx1Meta: String,
        recentTx2Name: String, recentTx2Val: String, recentTx2Meta: String,
        accountsJson: String, recentTxsJson: String, budgetsJson: String, paymentsJson: String
    ) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences("FinanzasWidgetPrefs", Context.MODE_PRIVATE)

        prefs.edit()
            .putString("themeMode", themeMode)
            .putString("balanceHidden", balanceHidden)
            .putString("availableText", availableText)
            .putString("availableVariation", availableVariation)
            .putString("cutoffText", cutoffText)
            .putString("todayText", todayText)
            .putString("weeklyText", weeklyText)
            .putString("mainAccountName", mainAccountName)
            .putString("mainAccountType", mainAccountType)
            .putString("mainAccountMasked", mainAccountMasked)
            .putString("mainAccountBalance", mainAccountBalance)
            .putString("budgetDaysLeft", budgetDaysLeft)
            .putString("budgetLine1", budgetLine1)
            .putString("budgetLine2", budgetLine2)
            .putString("goalName", goalName)
            .putString("goalAmount", goalAmount)
            .putString("goalPercentage", goalPercentage)
            .putString("goalDate", goalDate)
            .putString("categoryTotal", categoryTotal)
            .putString("catLine1", catLine1)
            .putString("catLine2", catLine2)
            .putString("paymentLine1", paymentLine1)
            .putString("paymentLine2", paymentLine2)
            .putString("recentTx1Name", recentTx1Name)
            .putString("recentTx1Val", recentTx1Val)
            .putString("recentTx1Meta", recentTx1Meta)
            .putString("recentTx2Name", recentTx2Name)
            .putString("recentTx2Val", recentTx2Val)
            .putString("recentTx2Meta", recentTx2Meta)
            .putString("accountsJson", accountsJson)
            .putString("recentTxsJson", recentTxsJson)
            .putString("budgetsJson", budgetsJson)
            .putString("paymentsJson", paymentsJson)
            .apply()

        val appWidgetManager = AppWidgetManager.getInstance(context)
        val providers = arrayOf(
            WidgetTotalBalanceProvider::class.java,
            WidgetAccountsCarouselProvider::class.java,
            WidgetMonthlyBudgetProvider::class.java,
            WidgetSavingsGoalProvider::class.java,
            WidgetCategoryExpensesProvider::class.java,
            WidgetUpcomingPaymentsProvider::class.java,
            WidgetRecentTransactionsProvider::class.java,
            WidgetCalendarProvider::class.java,
            WidgetExpensesProvider::class.java
        )

        for (provider in providers) {
            val componentName = ComponentName(context, provider)
            val ids = appWidgetManager.getAppWidgetIds(componentName)
            val intent = Intent(context, provider).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            }
            context.sendBroadcast(intent)
        }
    }

    @ReactMethod
    fun updateFullWidgetDataWithTheme(
        themeMode: String,
        availableText: String, cutoffText: String, todayText: String, weeklyText: String,
        mainAccountName: String, mainAccountType: String, mainAccountMasked: String, mainAccountBalance: String,
        budgetDaysLeft: String, budgetLine1: String, budgetLine2: String,
        goalName: String, goalAmount: String, goalPercentage: String, goalDate: String,
        catLine1: String, catLine2: String,
        paymentLine1: String, paymentLine2: String,
        recentTx1Name: String, recentTx1Val: String, recentTx2Name: String, recentTx2Val: String
    ) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences("FinanzasWidgetPrefs", Context.MODE_PRIVATE)

        prefs.edit()
            .putString("themeMode", themeMode)
            .putString("availableText", availableText)
            .putString("cutoffText", cutoffText)
            .putString("todayText", todayText)
            .putString("weeklyText", weeklyText)
            .putString("mainAccountName", mainAccountName)
            .putString("mainAccountType", mainAccountType)
            .putString("mainAccountMasked", mainAccountMasked)
            .putString("mainAccountBalance", mainAccountBalance)
            .putString("budgetDaysLeft", budgetDaysLeft)
            .putString("budgetLine1", budgetLine1)
            .putString("budgetLine2", budgetLine2)
            .putString("goalName", goalName)
            .putString("goalAmount", goalAmount)
            .putString("goalPercentage", goalPercentage)
            .putString("goalDate", goalDate)
            .putString("catLine1", catLine1)
            .putString("catLine2", catLine2)
            .putString("paymentLine1", paymentLine1)
            .putString("paymentLine2", paymentLine2)
            .putString("recentTx1Name", recentTx1Name)
            .putString("recentTx1Val", recentTx1Val)
            .putString("recentTx2Name", recentTx2Name)
            .putString("recentTx2Val", recentTx2Val)
            .apply()

        // Notify all 9 Widget Providers to update immediately
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val providers = arrayOf(
            WidgetTotalBalanceProvider::class.java,
            WidgetAccountsCarouselProvider::class.java,
            WidgetMonthlyBudgetProvider::class.java,
            WidgetSavingsGoalProvider::class.java,
            WidgetCategoryExpensesProvider::class.java,
            WidgetUpcomingPaymentsProvider::class.java,
            WidgetRecentTransactionsProvider::class.java,
            WidgetCalendarProvider::class.java,
            WidgetExpensesProvider::class.java
        )

        for (provider in providers) {
            val componentName = ComponentName(context, provider)
            val ids = appWidgetManager.getAppWidgetIds(componentName)
            val intent = Intent(context, provider).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            }
            context.sendBroadcast(intent)
        }
    }
}
