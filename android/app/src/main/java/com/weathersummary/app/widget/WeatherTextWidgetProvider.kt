package com.weathersummary.app.widget

import android.content.Context
import android.widget.RemoteViews
import com.weathersummary.app.R
import com.weathersummary.app.prefs.Settings

/** Sentence-only widget. */
class WeatherTextWidgetProvider : WeatherWidgetBase() {

    override fun layoutRes(context: Context): Int = WeatherWidgetBase.styledLayout(
        context,
        R.layout.widget_weather_text_dark_solid,
        R.layout.widget_weather_text_dark_glass,
        R.layout.widget_weather_text_light_solid,
        R.layout.widget_weather_text_light_glass,
    )

    override fun buildViews(context: Context): RemoteViews {
        val views = RemoteViews(context.packageName, layoutRes(context))

        views.setTextColor(R.id.widget_summary, WeatherWidgetBase.fg(context))
        views.setTextViewText(
            R.id.widget_summary,
            Settings.cachedSummary.ifBlank { context.getString(R.string.summary_unavailable) }
        )
        views.setOnClickPendingIntent(R.id.widget_summary, openAppPendingIntent(context))
        return views
    }
}