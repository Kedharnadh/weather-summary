package com.weathersummary.app.ha

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.weathersummary.app.data.Http
import com.weathersummary.app.data.WeatherFacts
import com.weathersummary.app.data.WeatherSnapshot
import com.weathersummary.app.prefs.Settings

/**
 * Pushes the app's latest forecast + generated sentence into Home Assistant via
 * the integration's `weather_summary.ingest_app` service, keeping the HA sensors
 * fresh even though the phone did the polling.
 *
 * Requires a long-lived token (Profile → Security → Long Lived Access Tokens).
 */
object HomeAssistantClient {

    suspend fun push(snapshot: WeatherSnapshot, facts: WeatherFacts, summary: String) {
        val url = Settings.haUrl.trimEnd('/')
        val token = Settings.haToken
        if (token.isBlank() || url.isBlank()) return

        val payload = JsonObject().apply {
            addProperty("temperature", facts.tempC.roundToOne())
            facts.feelsC?.let { addProperty("apparent_temperature", it.roundToOne()) }
            facts.humidityPct?.let { addProperty("humidity", it) }
            facts.windKmh?.let { addProperty("wind_kmh", it.roundToOne()) }
            addProperty("weather_code", snapshot.current.weatherCode)
            addProperty("condition", facts.conditionLabel)
            addProperty("is_raining", facts.isRainingNow)
            facts.rainStartInMin?.let { addProperty("rain_start_in_min", it) }
            facts.rainStopInMin?.let { addProperty("rain_stop_in_min", it) }
            addProperty("precip_next_hour_mm", facts.precipNextHourMm.roundToOne())
            facts.maxChanceRain24h?.let { addProperty("rain_chance_24h_pct", it.first) }
            facts.peakTemp24h?.let { addProperty("peak_temp_24h", it.first.roundToOne()) }
            addProperty("summary", summary)
            addProperty("updated_at", System.currentTimeMillis())
        }

        val body = JsonObject().apply {
            add("payload", payload)
        }

        val endpoint = "$url/api/services/weather_summary/ingest_app"
        Http.postJson(endpoint, body.toString(), bearerToken = token)
    }

    private fun Double.roundToOne(): Double = Math.round(this * 10) / 10.0
}