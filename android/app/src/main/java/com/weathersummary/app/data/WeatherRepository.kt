package com.weathersummary.app.data

import android.content.Context
import com.weathersummary.app.ai.Summary
import com.weathersummary.app.location.LocationHelper
import com.weathersummary.app.prefs.Settings

data class RefreshResult(
    val snapshot: WeatherSnapshot,
    val facts: WeatherFacts,
    val summary: String,
)

/**
 * Orchestrates one full refresh: resolve location → fetch snapshot from the
 * configured provider → derive facts → generate the AI sentence (with fallback).
 * Shared by the UI ViewModel and the background Worker.
 */
object WeatherRepository {

    suspend fun refresh(context: Context): RefreshResult {
        val (lat, lon) = resolveLocation(context)
        val provider = WeatherProviders.from(Settings)
        val snapshot = provider.fetch(lat, lon)
        val facts = ForecastFacts.derive(snapshot)
        val summary = Summary.generate(snapshot, Settings.tinySentence)
        return RefreshResult(snapshot, facts, summary)
    }

    private fun resolveLocation(context: Context): Pair<Double, Double> {
        if (Settings.useGps) {
            if (!LocationHelper.hasPermission(context)) {
                throw IllegalStateException(
                    context.getString(com.weathersummary.app.R.string.location_permission_needed)
                )
            }
            LocationHelper.lastKnown(context)?.let { return it }
            throw IllegalStateException("No location fix yet — open the app after granting location access.")
        }
        val lat = Settings.latitude
        val lon = Settings.longitude
        if (lat == 0.0 && lon == 0.0) {
            throw IllegalStateException("Set a fixed latitude/longitude in Settings.")
        }
        return lat to lon
    }
}