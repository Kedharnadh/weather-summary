package com.weathersummary.app.ai

import com.weathersummary.app.data.FallbackTemplates
import com.weathersummary.app.data.ForecastFacts
import com.weathersummary.app.data.WeatherFacts
import com.weathersummary.app.data.WeatherSnapshot
import com.weathersummary.app.prefs.Settings

/** Contracts + prompt builder — mirrors docs/RECIPE.md exactly. */

interface AiProvider {
    val id: String
    /** Returns the sentence, or null if it must be retried / cannot be produced. */
    suspend fun summarize(facts: WeatherFacts, mode: String): String?
}

object AiProviders {
    const val GEMINI = "gemini"
    const val OLLAMA = "ollama"
    const val HOME_ASSISTANT = "homeassistant"

    fun from(id: String): AiProvider = when (id) {
        GEMINI -> GeminiAiProvider()
        OLLAMA -> OllamaAiProvider()
        HOME_ASSISTANT -> HomeAssistantAiProvider()
        else -> GeminiAiProvider()
    }
}

object PromptBuilder {

    val exampleShort = listOf(
        "Rain starting in ~20 min, umbrella time.",
        "Light rain easing, should stop in ~10 min.",
        "Clear 26°, breezy; chance of drizzle after 6 pm.",
        "Sunny and hot, 34°; storms possible late evening.",
    )

    val exampleTiny = listOf(
        "Rain in ~20 min.",
        "Rain stops in ~10 min.",
        "Clear 26°, breezy.",
        "Hot 34°; storms late.",
    )

    val exampleLong = listOf(
        "Rain starting in ~20 min, easing by early afternoon; after that it dries out and warms to 24°.",
        "Clear and breezy at 26° all day; a light shower chance returns after 6 pm.",
        "Sunny and hot, 34°; storms possible late evening, then cooler and calm tomorrow morning.",
    )

    fun build(facts: WeatherFacts, mode: String): String {
        val (max, examples) = when (mode) {
            "long" -> 240 to exampleLong
            "tiny" -> 60 to exampleTiny
            else -> 100 to exampleShort
        }
        val sentenceRule = if (mode == "long") {
            "Keep it to ONE or TWO short sentences, max $max characters total"
        } else {
            "ONE sentence, max $max characters"
        }

        val line = StringBuilder()
        line.append("You write phone-widget weather sentences. Rules:\n")
        line.append("- $sentenceRule, no emoji, no greeting, no units (write \"28°\").\n")
        line.append("- Prioritise (in order): rain starting/stopping soon, extreme heat/cold, heavy wind/storm, otherwise keep it neutral.\n")
        line.append("- Only mention things that are actually true from the facts.\n")
        line.append("- Speak in present/next-hour terms.\n")
        line.append("Examples:\n")
        examples.forEach { line.append("- \"").append(it).append("\"\n") }
        line.append("\nFacts:\n")
        line.append("current: ${"%.1f".format(facts.tempC)}°")
        facts.feelsC?.let { line.append(" (feels ${"%.1f".format(it)}°)") }
        facts.humidityPct?.let { line.append(", humidity ${it}%") }
        facts.windKmh?.let { line.append(", wind ${"%.0f".format(it)} km/h") }
        line.append(", condition: ${facts.conditionLabel.lowercase()}\n")
        line.append("raining_now: ${facts.isRainingNow}\n")
        line.append("rain_start_in_min: ${facts.rainStartInMin ?: "none"}\n")
        line.append("rain_stop_in_min: ${facts.rainStopInMin ?: "none"}\n")
        line.append("precip_next_hour_mm: ${"%.1f".format(facts.precipNextHourMm)}\n")
        facts.maxChanceRain24h?.let {
            line.append("max_chance_rain_next_24h: ${it.first}% at ${it.second}\n")
        }
        facts.peakTemp24h?.let {
            line.append("peak_temp_next_24h: ${"%.0f".format(it.first)}° at ${it.second}\n")
        }
        line.append("\nOnly output the sentence.")
        return line.toString()
    }
}

object Summary {
    /**
     * Produce the sentence for display. Uses AI when configured; falls back to
     * a deterministic template otherwise so the widget is never empty.
     * [Settings.lastAiError] is set when the AI request failed so the UI can
     * surface why no AI sentence was produced.
     */
    suspend fun generate(snapshot: WeatherSnapshot, mode: String): String {
        val facts = ForecastFacts.derive(snapshot)
        val id = Settings.aiProvider
        val ai = AiProviders.from(id)
        return try {
            val text = ai.summarize(facts, mode)?.clean()?.takeIf { it.isNotEmpty() }
            if (text != null) {
                Settings.lastAiError = ""
                text
            } else {
                Settings.lastAiError = if (aiConfigured(id)) {
                    "AI returned no text — check the key/model/network."
                } else {
                    "AI not configured — add a key in Settings."
                }
                FallbackTemplates.text(facts)
            }
        } catch (e: Exception) {
            Settings.lastAiError = (e.message ?: "AI provider error").take(160)
            FallbackTemplates.text(facts)
        }
    }

    private fun aiConfigured(id: String): Boolean = when (id) {
        AiProviders.GEMINI -> Settings.geminiApiKey.isNotBlank()
        AiProviders.OLLAMA -> Settings.ollamaUrl.isNotBlank()
        AiProviders.HOME_ASSISTANT -> Settings.haToken.isNotBlank()
        else -> false
    }
}

private fun String.clean(): String = trim()
    .removePrefix("\"")
    .removeSuffix("\"")
    .replace("\n", " ")
    .trim()