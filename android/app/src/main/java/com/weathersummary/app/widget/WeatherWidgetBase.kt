package com.weathersummary.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.PorterDuff
import android.graphics.drawable.Drawable
import android.widget.RemoteViews
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.weathersummary.app.MainActivity
import com.weathersummary.app.R
import com.weathersummary.app.prefs.Settings
import com.weathersummary.app.work.AlarmRefreshReceiver
import com.weathersummary.app.work.WeatherRefreshWorker
import java.util.concurrent.TimeUnit

/**
 * Shared logic for all three home-screen widgets (full / text-only / current-only).
 * Views come from plain XML layouts (RemoteViews cannot use Compose). Values are
 * read from the shared-preferences cache written by the refresh worker, so the
 * widgets are instant before any network call. Styling follows the app's theme
 * (dark default) and the transparency option in Settings.
 */
abstract class WeatherWidgetBase : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            appWidgetManager.updateAppWidget(id, buildViews(context))
        }
        WeatherWidgetBase.refreshNow(context)
    }

    override fun onEnabled(context: Context) {
        WeatherWidgetBase.schedule(context)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context, appWidgetManager: AppWidgetManager,
        appWidgetId: Int, newOptions: android.os.Bundle,
    ) {
        WeatherWidgetBase.refreshNow(context)
    }

    /** Each widget type provides its own RemoteViews. */
    protected abstract fun buildViews(context: Context): RemoteViews

    /** Layout pre-styled for the active theme (dark default) + transparency. */
    protected abstract fun layoutRes(context: Context): Int

    protected fun openAppPendingIntent(context: Context): PendingIntent =
        PendingIntent.getActivity(
            context, 0,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

    companion object {
        /** Every widget provider class the app ships. */
        val allProviderClasses: List<Class<out WeatherWidgetBase>> = listOf(
            WeatherWidgetProvider::class.java,
            WeatherTextWidgetProvider::class.java,
            WeatherCurrentWidgetProvider::class.java,
        )

        private const val UNIQUE_NAME = "weather_refresh"

        fun schedule(context: Context) {
            val minutes = Settings.intervalMinutes.coerceAtLeast(15L)
            val request = PeriodicWorkRequestBuilder<WeatherRefreshWorker>(
                minutes, TimeUnit.MINUTES
            ).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_NAME, ExistingPeriodicWorkPolicy.UPDATE, request
            )
            AlarmRefreshReceiver.schedule(context)
        }

        /** Fill data quickly (first add / theme / transparency change) instead of waiting. */
        fun refreshNow(context: Context) {
            WeatherRefreshWorker.refreshNow(context)
        }

        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            for (cls in allProviderClasses) {
                val ids = manager.getAppWidgetIds(ComponentName(context, cls))
                if (ids.isNotEmpty()) {
                    val views = (cls.getDeclaredConstructor().newInstance() as WeatherWidgetBase)
                        .buildViews(context)
                    manager.updateAppWidget(ids, views)
                }
            }
        }

        fun isDark(context: Context): Boolean = when (Settings.themeMode) {
            Settings.THEME_LIGHT -> false
            Settings.THEME_SYSTEM ->
                (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
                    Configuration.UI_MODE_NIGHT_YES
            else -> true
        }

        /** Pick the pre-styled layout id: dark/light theme × solid/glass. */
        fun styledLayout(
            context: Context,
            darkSolid: Int, darkGlass: Int, lightSolid: Int, lightGlass: Int,
        ): Int {
            val dark = isDark(context)
            val glass = Settings.widgetTransparent
            return when {
                dark && !glass -> darkSolid
                dark -> darkGlass
                !glass -> lightSolid
                else -> lightGlass
            }
        }

        fun fg(context: Context): Int =
            context.getColor(if (isDark(context)) R.color.widget_text else R.color.widget_text_light)

        fun dim(context: Context): Int =
            context.getColor(if (isDark(context)) R.color.widget_text_dim else R.color.widget_text_dim_light)

        /** RemoteViews can't color-filter, so bake a tinted bitmap for icons. */
        fun tintedIcon(context: Context, resId: Int, color: Int): Bitmap {
            val d: Drawable = androidx.core.content.ContextCompat.getDrawable(context, resId)
                ?.mutate() ?: return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888)
            d.setColorFilter(color, PorterDuff.Mode.SRC_IN)
            val w = d.intrinsicWidth.coerceAtLeast(1)
            val h = d.intrinsicHeight.coerceAtLeast(1)
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            val c = Canvas(bmp)
            d.setBounds(0, 0, w, h)
            d.draw(c)
            return bmp
        }

        fun tempText(): String {
            val temp = Settings.cachedTempC
            return if (temp.isFinite()) "${Math.round(temp)}°" else "--°"
        }
    }
}