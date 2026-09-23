package com.weathersummary.app.widget

import android.content.Context
import android.widget.RemoteViews
import com.weathersummary.app.R
import com.weathersummary.app.data.WeatherCodes
import com.weathersummary.app.prefs.Settings

/** Current-conditions-only widget (temp, condition, icon, humidity/wind). */
class WeatherCurrentWidgetProvider : WeatherWidgetBase() {

    override fun layoutRes(context: Context): Int = WeatherWidgetBase.styledLayout(
        context,
        R.layout.widget_weather_current_dark_solid,
        R.layout.widget_weather_current_dark_glass,
        R.layout.widget_weather_current_light_solid,
        R.layout.widget_weather_current_light_glass,
    )

    override fun buildViews(context: Context): RemoteViews {
        val views = RemoteViews(context.packageName, layoutRes(context))

        val fg = WeatherWidgetBase.fg(context)
        views.setTextColor(R.id.widget_temp, fg)
        views.setTextColor(R.id.widget_condition, fg)
        views.setTextColor(R.id.widget_details, WeatherWidgetBase.dim(context))

        views.setTextViewText(R.id.widget_temp, WeatherWidgetBase.tempText())
        views.setTextViewText(
            R.id.widget_condition,
            Settings.cachedCondition.ifBlank { "Fetching\u2026" }
        )
        views.setTextViewText(R.id.widget_details, detailsText())

        val iconRes = WeatherCodes.iconRes(Settings.cachedWeatherCode, Settings.cachedIsDay)
        views.setImageViewBitmap(R.id.widget_icon, WeatherWidgetBase.tintedIcon(context, iconRes, fg))

        val open = openAppPendingIntent(context)
        views.setOnClickPendingIntent(R.id.widget_temp, open)
        views.setOnClickPendingIntent(R.id.widget_details, open)
        return views
    }

    private fun detailsText(): String {
        val parts = ArrayList<String>()
        val h = Settings.cachedHumidityPct
        if (h >= 0) parts.add("$h%")
        val w = Settings.cachedWindKmh
        if (w.isFinite()) parts.add("${Math.round(w)} km/h")
        val stale = WeatherWidgetBase.staleSuffix().removePrefix(" · ")
        if (stale.isNotBlank()) parts.add(stale)
        return parts.joinToString(" \u00b7 ")
    }
}