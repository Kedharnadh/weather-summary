package com.weathersummary.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ForecastFactsTest {

    private fun snapshot(
        temp: Double = 22.0,
        precipNow: Double? = 0.0,
        minutely: List<Double>? = null,
        hourly: List<HourSlice> = emptyList(),
    ) = WeatherSnapshot(
        current = CurrentWeather(
            temperatureC = temp,
            humidityPct = 50,
            windKmh = 8.0,
            weatherCode = 0,
            precipitationMm = precipNow,
        ),
        minutely15 = minutely,
        hourly = hourly,
    )

    @Test
    fun `rain start detected from minutely timeline`() {
        val facts = ForecastFacts.derive(
            snapshot(minutely = listOf(0.0, 0.0, 0.0, 0.4, 0.6, 0.5))
        )
        assertFalse(facts.isRainingNow)
        assertEquals(45, facts.rainStartInMin)
        assertNull(facts.rainStopInMin)
    }

    @Test
    fun `raining now and stop minutes derived from minutely timeline`() {
        val facts = ForecastFacts.derive(
            snapshot(precipNow = 0.5, minutely = listOf(0.5, 0.3, 0.0, 0.0, 0.0))
        )
        assertTrue(facts.isRainingNow)
        assertNull(facts.rainStartInMin)
        assertEquals(30, facts.rainStopInMin)
    }

    @Test
    fun `precipitation next hour sums the right number of 15min slots`() {
        val facts = ForecastFacts.derive(
            snapshot(minutely = listOf(0.1, 0.3, 0.2, 0.0, 0.9))
        )
        assertEquals(0.6, facts.precipNextHourMm, 1e-9)
    }

    @Test
    fun `hourly fallback is used when no minutely data`() {
        val facts = ForecastFacts.derive(
            snapshot(
                hourly = listOf(
                    HourSlice("2026-09-23T14:00", 24.0, 20, 0.0, 0),
                    HourSlice("2026-09-23T15:00", 26.0, 40, 0.0, 2),
                    HourSlice("2026-09-23T16:00", 25.0, 10, 0.0, 2),
                )
            )
        )
        assertNull(facts.rainStartInMin)
        // precip next hour = first hour of the 60-min fallback series
        assertEquals(0.0, facts.precipNextHourMm, 1e-9)
    }

    @Test
    fun `max rain chance and peak temp are found within first 24 hours`() {
        val hours = (0 until 48).map { i ->
            HourSlice(
                time = "2026-09-23T${i.toString().padStart(2, '0')}:00",
                temperatureC = 20.0 + i,
                precipProbabilityPct = (i % 10) * 5,
                precipMm = 0.0,
                weatherCode = 2,
            )
        }
        val facts = ForecastFacts.derive(snapshot(hourly = hours))
        // max precip chance = (i % 10) * 5 -> max 45 at the first i where i%10==9 (i=9) within the first 24h
        assertEquals(45, facts.maxChanceRain24h?.first)
        assertEquals("09:00", facts.maxChanceRain24h?.second)
        // peak temperature within first 24h is the last hour (i=23 -> 43°)
        assertEquals(43.0, facts.peakTemp24h?.first ?: 0.0, 1e-9)
    }

    @Test
    fun `rain start uses 60min steps when only hourly data`() {
        val facts = ForecastFacts.derive(
            snapshot(
                hourly = listOf(
                    HourSlice("2026-09-23T14:00", 24.0, 20, 0.0, 0),
                    HourSlice("2026-09-23T15:00", 24.0, 20, 0.5, 61),
                    HourSlice("2026-09-23T16:00", 24.0, 20, 0.8, 61),
                )
            )
        )
        assertEquals(60, facts.rainStartInMin)
    }
}