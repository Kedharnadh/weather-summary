package com.weathersummary.app.ai

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.weathersummary.app.data.Http
import com.weathersummary.app.data.gson
import com.weathersummary.app.data.WeatherFacts
import com.weathersummary.app.prefs.Settings

/** Gemini (Google) — free tier key from https://aistudio.google.com/apikey */
class GeminiAiProvider : AiProvider {
    override val id = AiProviders.GEMINI

    override suspend fun summarize(facts: WeatherFacts, mode: String): String? {
        val key = Settings.geminiApiKey
        if (key.isBlank()) return null
        val model = Settings.geminiModel.ifBlank { "gemini-3.8-flash" }

        val body = JsonObject().apply {
            val parts = JsonArray().apply {
                add(JsonObject().apply { addProperty("text", PromptBuilder.build(facts, mode)) })
            }
            val contents = JsonArray().apply {
                add(JsonObject().apply { add("parts", parts) })
            }
            add("contents", contents)
            add("generationConfig", JsonObject().apply {
                addProperty("temperature", 0.4)
                addProperty("maxOutputTokens", 300)
            })
        }

        val url = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$key"
        val resp = Http.postJson(url, body.toString(), bearerToken = null)
        return try {
            val root = gson.fromJson(resp, JsonObject::class.java)
            val candidates = root.getAsJsonArray("candidates")
            if (candidates.size() == 0) return null
            val parts = candidates[0].asJsonObject
                .getAsJsonObject("content")
                .getAsJsonArray("parts")
            parts[0].asJsonObject.get("text")?.asString
        } catch (e: Exception) {
            null
        }
    }
}

/** Ollama — point it at your own server or the HA add-on. Native chat API. */
class OllamaAiProvider : AiProvider {
    override val id = AiProviders.OLLAMA

    override suspend fun summarize(facts: WeatherFacts, mode: String): String? {
        val base = Settings.ollamaUrl.trimEnd('/')
        if (base.endsWith("/v1")) {
            return openAiCompatible(base, facts = facts, mode = mode)
        }
        val model = Settings.ollamaModel.ifBlank { "llama3.2" }

        val body = JsonObject().apply {
            addProperty("model", model)
            addProperty("stream", false)
            add("messages", chatMessages(facts, mode))
        }
        val resp = Http.postJson("$base/api/chat", body.toString())
        return try {
            JsonParser.parseString(resp).asJsonObject
                .getAsJsonObject("message")
                .get("content")?.asString
        } catch (e: Exception) {
            null
        }
    }

    private suspend fun openAiCompatible(
        base: String, facts: WeatherFacts, mode: String,
    ): String? = runCatching {
        val model = Settings.ollamaModel.ifBlank { "llama3.2" }
        val body = JsonObject().apply {
            addProperty("model", model)
            addProperty("stream", false)
            add("messages", chatMessages(facts, mode))
        }
        val resp = Http.postJson("$base/chat/completions", body.toString())
        JsonParser.parseString(resp).asJsonObject
            .getAsJsonArray("choices")[0].asJsonObject
            .getAsJsonObject("message")
            .get("content")?.asString
    }.getOrNull()

    private fun chatMessages(facts: WeatherFacts, mode: String): JsonArray =
        JsonArray().apply {
            add(JsonObject().apply {
                addProperty("role", "user")
                addProperty("content", PromptBuilder.build(facts, mode))
            })
        }
}

/**
 * Home Assistant — configure your LLM once in HA (Ollama/OpenAI-compatible),
 * the app simply calls the integration's REST view:
 * POST /api/weather_summary/generate  {"prompt": "...", "mode": "tiny|short|long"}
 */
class HomeAssistantAiProvider : AiProvider {
    override val id = AiProviders.HOME_ASSISTANT

    override suspend fun summarize(facts: WeatherFacts, mode: String): String? {
        val url = Settings.haUrl.trimEnd('/') + "/api/weather_summary/generate"
        val token = Settings.haToken
        if (token.isBlank()) return null

        val body = JsonObject().apply {
            addProperty("prompt", PromptBuilder.build(facts, mode))
            addProperty("mode", mode)
        }
        val resp = Http.postJson(url, body.toString(), bearerToken = token)
        return try {
            JsonParser.parseString(resp).asJsonObject.get("text")?.asString
        } catch (e: Exception) {
            null
        }
    }
}