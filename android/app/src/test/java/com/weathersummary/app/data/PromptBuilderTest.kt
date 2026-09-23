package com.weathersummary.app.data

import com.weathersummary.app.ai.PromptBuilder
import org.junit.Assert.assertTrue
import org.junit.Test

class PromptBuilderTest {

    private val baseFacts = WeatherFacts(
        tempC = 26.5,
        feelsC = 28.0,
        conditionLabel = "Partly cloudy",
        isRainingNow = false,
        rainStartInMin = 20,
        rainStopInMin = null,
        precipNextHourMm = 0.0,
        maxChanceRain24h = 60 to "19:00",
        peakTemp24h = 30.0 to "15:00",
        windKmh = 12.0,
        humidityPct = 55,
    )

    @Test
    fun `short mode enforces one sentence and 100 chars`() {
        val prompt = PromptBuilder.build(baseFacts, "short")
        assertTrue(prompt.contains("ONE sentence, max 100 characters"))
        assertTrue(prompt.contains("rain_start_in_min: 20"))
        assertTrue(prompt.contains("current: 26.5°"))
        assertTrue(prompt.contains("feels 28.0°"))
    }

    @Test
    fun `tiny mode uses 60 char cap`() {
        val prompt = PromptBuilder.build(baseFacts, "tiny")
        assertTrue(prompt.contains("max 60 characters"))
    }

    @Test
    fun `long mode allows two sentences`() {
        val prompt = PromptBuilder.build(baseFacts, "long")
        assertTrue(prompt.contains("ONE or TWO short sentences, max 240 characters"))
    }

    @Test
    fun `facts with nulls do not break the prompt`() {
        val facts = baseFacts.copy(feelsC = null, maxChanceRain24h = null, windKmh = null, humidityPct = null)
        val prompt = PromptBuilder.build(facts, "short")
        assertTrue(prompt.contains("raining_now: false"))
        assertTrue(prompt.contains("max_chance_rain_next_24h") == false)
    }

    @Test
    fun `prompt includes instruction to only output the sentence`() {
        assertTrue(PromptBuilder.build(baseFacts, "short").contains("Only output the sentence."))
    }
}