package com.weathersummary.app.data

import com.google.gson.annotations.SerializedName
import com.weathersummary.app.R
import kotlin.math.roundToInt

/**
 * Normalized weather model — the single shape everything upstream of the AI
 * works with, regardless of which weather provider was queried.
 * See docs/RECIPE.md for the contract.
 */
data class WeatherSnapshot(
    val current: CurrentWeather,
    /** precip mm per 15-min slot from "now", ~2h ahead (may be null for providers without it). */
    val minutely15: List<Double>? = null,
    /** hourly slices, ~24-48h ahead. */
    val hourly: List<HourSlice> = emptyList(),
)

data class CurrentWeather(
    val temperatureC: Double,
    val apparentTemperatureC: Double? = null,
    val humidityPct: Int? = null,
    val windKmh: Double? = null,
    val weatherCode: Int = 0,
    val precipitationMm: Double? = null,
    val isDay: Boolean? = null,
    val cloudCoverPct: Int? = null,
)

data class HourSlice(
    val time: String,
    val temperatureC: Double? = null,
    val precipProbabilityPct: Int? = null,
    val precipMm: Double? = null,
    val weatherCode: Int? = null,
)

// ---------------------------------------------------------------------------
// Facts derived from the snapshot (shared logic with ha/openmeteo.py)
// ---------------------------------------------------------------------------

/** A uniform precip timeline: [values] indexed by [stepMinutes] from "now". */
data class RainSeries(val stepMinutes: Int, val values: List<Double>)

data class WeatherFacts(
    val tempC: Double,
    val feelsC: Double?,
    val conditionLabel: String,
    val isRainingNow: Boolean,
    val rainStartInMin: Int?,
    val rainStopInMin: Int?,
    val precipNextHourMm: Double,
    val maxChanceRain24h: Pair<Int, String>?,
    val peakTemp24h: Pair<Double, String>?,
    val windKmh: Double?,
    val humidityPct: Int?,
)

object ForecastFacts {

    private const val RAIN_THRESHOLD_MM = 0.2
    private const val MINUTES_24H = 24

    /** Build a uniform precip timeline, preferring minutely over hourly. */
    fun rainSeries(snapshot: WeatherSnapshot): RainSeries {
        snapshot.minutely15?.let {
            if (it.isNotEmpty()) return RainSeries(15, it)
        }
        val hourly = snapshot.hourly.map { it.precipMm ?: 0.0 }
        if (hourly.isNotEmpty()) return RainSeries(60, hourly)
        return RainSeries(60, emptyList())
    }

    fun derive(snapshot: WeatherSnapshot): WeatherFacts {
        val c = snapshot.current
        val series = rainSeries(snapshot)
        val step = series.stepMinutes
        val rain = series.values

        val rainingNow = (c.precipitationMm ?: 0.0) >= RAIN_THRESHOLD_MM ||
            rain.getOrNull(0)?.let { it >= RAIN_THRESHOLD_MM } == true

        var rainStartMin: Int? = null
        var rainStopMin: Int? = null
        if (rainingNow) {
            // first sustained dry gap (>= 2 slots) after now
            for (i in 1 until maxOf(rain.size - 1, 1)) {
                val cur = rain.getOrNull(i) ?: 0.0
                val next = rain.getOrNull(i + 1) ?: 0.0
                if (cur < RAIN_THRESHOLD_MM && next < RAIN_THRESHOLD_MM) {
                    rainStopMin = i * step
                    break
                }
            }
        } else {
            for (i in rain.indices) {
                if (rain[i] >= RAIN_THRESHOLD_MM) {
                    rainStartMin = i * step
                    break
                }
            }
        }

        val precipNextHour = rain.take((60 / step).coerceAtLeast(1)).sum()

        var maxChance: Pair<Int, String>? = null
        var peakTemp: Pair<Double, String>? = null
        snapshot.hourly.take(MINUTES_24H).forEach { slice ->
            slice.precipProbabilityPct?.let {
                if (maxChance == null || it > maxChance!!.first) {
                    maxChance = it to hourLabel(slice.time)
                }
            }
            slice.temperatureC?.let {
                if (peakTemp == null || it > peakTemp!!.first) {
                    peakTemp = it to hourLabel(slice.time)
                }
            }
        }

        return WeatherFacts(
            tempC = c.temperatureC,
            feelsC = c.apparentTemperatureC,
            conditionLabel = WeatherCodes.label(c.weatherCode),
            isRainingNow = rainingNow,
            rainStartInMin = rainStartMin,
            rainStopInMin = rainStopMin,
            precipNextHourMm = precipNextHour,
            maxChanceRain24h = maxChance,
            peakTemp24h = peakTemp,
            windKmh = c.windKmh,
            humidityPct = c.humidityPct,
        )
    }

    private fun hourLabel(time: String): String {
        return try {
            java.time.LocalDateTime.parse(time).let { "%02d:%02d".format(it.hour, it.minute) }
        } catch (e: Exception) {
            try {
                java.time.OffsetDateTime.parse(time).let { "%02d:%02d".format(it.hour, it.minute) }
            } catch (e2: Exception) {
                time.substringAfterLast('T').take(5)
            }
        }
    }
}

/** Deterministic sentence used when no AI is configured or the call fails. */
object FallbackTemplates {
    fun text(f: WeatherFacts): String {
        val temp = "%d°".format(f.tempC.roundToIntSafe())
        return when {
            f.isRainingNow && f.rainStopInMin != null ->
                "Rain easing, should stop in ~${minutesText(f.rainStopInMin)}."
            f.isRainingNow ->
                "Rain now — ${f.conditionLabel.lowercase()}."
            f.rainStartInMin != null && f.rainStartInMin <= 120 ->
                "Rain starting in ~${minutesText(f.rainStartInMin)}."
            f.tempC >= 35 ->
                "Very hot, $temp. Stay cool, ${
                    f.maxChanceRain24h?.let { "rain possible ${it.second}" } ?: "drying out"
                }."
            f.tempC <= 0 ->
                "Freezing, $temp. Bundle up."
            f.windKmh != null && f.windKmh >= 35 ->
                "Windy, $temp, gusts to ${f.windKmh!!.roundToIntSafe()} km/h."
            f.maxChanceRain24h != null && f.maxChanceRain24h.first >= 55 ->
                "$temp, ${conditionWording(f.conditionLabel)}; rain ${chanceWord(f.maxChanceRain24h.first)} after ${f.maxChanceRain24h.second}."
            else ->
                "$temp, ${conditionWording(f.conditionLabel)}."
        }
    }

    private fun conditionWording(label: String): String =
        label.lowercase().replace("overcast", "cloudy")

    private fun chanceWord(pct: Int) = if (pct >= 70) "likely" else "possible"

    private fun minutesText(min: Int): String =
        if (min < 60) "$min min" else {
            val h = min / 60
            val m = min % 60
            if (m == 0) "$h h" else "$h h $m min"
        }
}

private fun Double.roundToIntSafe(): Int = roundToInt()

/** WMO weather codes → human label + drawable icon (see docs/RECIPE.md). */
object WeatherCodes {

    fun label(code: Int): String =
        when (code) {
            0 -> "Clear"
            1, 2 -> "Partly cloudy"
            3 -> "Overcast"
            45, 48 -> "Foggy"
            51, 53, 55, 56, 57 -> "Drizzle"
            61, 63, 65, 66, 67 -> "Rain"
            71, 73, 75, 77 -> "Snow"
            80, 81, 82 -> "Showers"
            85, 86 -> "Snow showers"
            95, 96, 99 -> "Thunderstorm"
            else -> "Unknown"
        }

    fun iconRes(code: Int, isDay: Boolean?): Int {
        val night = isDay == false
        return when (code) {
            0 -> if (night) R.drawable.ic_w_clear_night else R.drawable.ic_w_clear_day
            1, 2 -> if (night) R.drawable.ic_w_partly_night else R.drawable.ic_w_partly_day
            3 -> R.drawable.ic_w_cloud
            45, 48 -> R.drawable.ic_w_fog
            51, 53, 55, 56, 57 -> R.drawable.ic_w_drizzle
            61, 63, 65, 66, 67 -> R.drawable.ic_w_rain
            71, 73, 75, 77 -> R.drawable.ic_w_snow
            80, 81, 82 -> R.drawable.ic_w_rain
            85, 86 -> R.drawable.ic_w_snow
            95, 96, 99 -> R.drawable.ic_w_thunder
            else -> R.drawable.ic_w_cloud
        }
    }
}