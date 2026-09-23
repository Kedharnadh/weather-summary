package com.weathersummary.app.data

import kotlin.math.roundToInt
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FallbackTemplatesTest {

    private fun facts(
        temp: Double = 22.0,
        raining: Boolean = false,
        rainStart: Int? = null,
        rainStop: Int? = null,
        wind: Double? = 8.0,
        maxChance: Pair<Int, String>? = null,
        condition: String = "Clear",
    ) = WeatherFacts(
        tempC = temp,
        feelsC = temp + 1,
        conditionLabel = condition,
        isRainingNow = raining,
        rainStartInMin = rainStart,
        rainStopInMin = rainStop,
        precipNextHourMm = 0.0,
        maxChanceRain24h = maxChance,
        peakTemp24h = null,
        windKmh = wind,
        humidityPct = 50,
    )

    @Test
    fun `rain starting soon wins the template`() {
        val text = FallbackTemplates.text(facts(rainStart = 20))
        assertTrue(text.contains("Rain starting in ~20 min"))
    }

    @Test
    fun `rain easing when it is raining and stopping`() {
        val text = FallbackTemplates.text(facts(raining = true, rainStop = 10))
        assertTrue(text.contains("should stop in ~10 min"))
    }

    @Test
    fun `very hot day is called out`() {
        val text = FallbackTemplates.text(facts(temp = 38.0, maxChance = 70 to "15:00"))
        assertTrue(text.contains("Very hot"))
        assertTrue(text.contains("rain possible 15:00"))
    }

    @Test
    fun `freezing day is called out`() {
        val text = FallbackTemplates.text(facts(temp = -3.0))
        assertTrue(text.contains("Freezing"))
    }

    @Test
    fun `windy day is called out`() {
        val text = FallbackTemplates.text(facts(temp = 20.0, wind = 42.0))
        assertTrue(text.contains("Windy"))
        assertTrue(text.contains("42 km/h"))
    }

    @Test
    fun `calm clear day stays short and neutral`() {
        val text = FallbackTemplates.text(facts(temp = 22.0, wind = 8.0, maxChance = 30 to "18:00"))
        assertTrue(text.startsWith("22°"))
        assertFalse(text.contains("rain possible"))
    }

    @Test
    fun `sentence is always short`() {
        val text = FallbackTemplates.text(facts(rainStart = 20))
        assertTrue(text.length <= 100)
        assertEquals("24°", "%d°".format(facts(temp = 24.0).tempC.roundToInt()))
    }
}