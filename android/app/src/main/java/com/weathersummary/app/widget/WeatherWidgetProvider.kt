package com.weathersummary.app.widget

import android.content.Context
import android.widget.RemoteViews
import com.weathersummary.app.R
import com.weathersummary.app.data.WeatherCodes
import com.weathersummary.app.prefs.Settings

/** Full widget: current conditions + the AI sentence. */
class WeatherWidgetProvider : WeatherWidgetBase() {

    override fun layoutRes(context: Context): Int = WeatherWidgetBase.styledLayout(
        context,
        R.layout.widget_weather_dark_solid,
        R.layout.widget_weather_dark_glass,
        R.layout.widget_weather_light_solid,
        R.layout.widget_weather_light_glass,
    )

    override fun buildViews(context: Context): RemoteViews {
        val views = RemoteViews(context.packageName, layoutRes(context))

        val fg = WeatherWidgetBase.fg(context)
        views.setTextColor(R.id.widget_temp, fg)
        views.setTextColor(R.id.widget_condition, WeatherWidgetBase.dim(context))
        views.setTextColor(R.id.widget_summary, WeatherWidgetBase.dim(context))

        views.setTextViewText(R.id.widget_temp, WeatherWidgetBase.tempText())
        views.setTextViewText(
            R.id.widget_condition,
            Settings.cachedCondition.ifBlank { "Fetching\u2026" }
        )
        views.setTextViewText(
            R.id.widget_summary,
            Settings.cachedSummary.ifBlank { context.getString(R.string.summary_unavailable) }
        )

        val iconRes = WeatherCodes.iconRes(Settings.cachedWeatherCode, Settings.cachedIsDay)
        views.setImageViewBitmap(R.id.widget_icon, WeatherWidgetBase.tintedIcon(context, iconRes, fg))

        val open = openAppPendingIntent(context)
        views.setOnClickPendingIntent(R.id.widget_summary, open)
        views.setOnClickPendingIntent(R.id.widget_temp, open)
        return views
    }
}