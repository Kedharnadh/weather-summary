package com.weathersummary.app.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.weathersummary.app.data.WeatherRepository
import com.weathersummary.app.ha.HomeAssistantClient
import com.weathersummary.app.prefs.Settings
import com.weathersummary.app.widget.WeatherWidgetBase
import java.util.concurrent.TimeUnit

/**
 * Periodic background refresh: fetches weather + regenerates the AI sentence,
 * updates the widget and (optionally) pushes everything to Home Assistant.
 */
class WeatherRefreshWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val result = WeatherRepository.refresh(applicationContext)
            Settings.cachedTempC = result.snapshot.current.temperatureC
            Settings.cachedCondition = result.facts.conditionLabel
            Settings.cachedWeatherCode = result.snapshot.current.weatherCode
            Settings.cachedIsDay = result.snapshot.current.isDay
            Settings.cachedSummary = result.summary
            Settings.cachedUpdatedAtMs = System.currentTimeMillis()
            Settings.lastError = ""
            Settings.cachedFeelsC = result.facts.feelsC ?: Double.NaN
            Settings.cachedWindKmh = result.facts.windKmh ?: Double.NaN
            Settings.cachedHumidityPct = result.facts.humidityPct ?: -1
            Settings.cachedCloudPct = result.snapshot.current.cloudCoverPct ?: -1

            updateWidgets()
            if (Settings.pushToHA) {
                runCatching { HomeAssistantClient.push(result.snapshot, result.facts, result.summary) }
                    .onFailure { Settings.lastError = "HA push: ${it.message}" }
            }
            Result.success()
        } catch (e: Exception) {
            // keep stale cache so widget still shows last known data
            Settings.lastError = e.message ?: "Unknown error"
            if (e.message?.contains("API key") == true) {
                Result.failure(workDataOf("reason" to "config"))
            } else {
                Result.retry()
            }
        }
    }

    private fun updateWidgets() {
        WeatherWidgetBase.updateAll(applicationContext)
    }

    companion object {
        private const val UNIQUE_NAME = "weather_refresh"
        private const val IMMEDIATE_NAME = "widget_immediate"

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

        /** Fill data quickly (widget add / theme change / alarm tick) instead of waiting. */
        fun refreshNow(context: Context) {
            val request = OneTimeWorkRequestBuilder<WeatherRefreshWorker>().build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                IMMEDIATE_NAME, ExistingWorkPolicy.REPLACE, request
            )
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_NAME)
        }
    }
}