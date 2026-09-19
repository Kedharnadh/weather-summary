package com.weathersummary.app.prefs

import android.content.Context
import android.content.SharedPreferences

/**
 * Thin wrapper over SharedPreferences. Also read by the widget + worker
 * (same process), so a single default-preferences file is fine.
 */
object Settings {

    private const val PREFS = "weather_summary_prefs"
    private lateinit var sp: SharedPreferences

    // keys
    private const val K_WEATHER_PROVIDER = "weather_provider"
    private const val K_OWM_KEY = "owm_api_key"
    private const val K_WA_KEY = "weatherapi_api_key"
    private const val K_AI_PROVIDER = "ai_provider"
    private const val K_GEMINI_KEY = "gemini_api_key"
    private const val K_GEMINI_MODEL = "gemini_model"
    private const val K_OLLAMA_URL = "ollama_url"
    private const val K_OLLAMA_MODEL = "ollama_model"
    private const val K_HA_URL = "ha_url"
    private const val K_HA_TOKEN = "ha_token"
    private const val K_TINY = "tiny_sentence"
    private const val K_USE_GPS = "use_gps"
    private const val K_LAT = "lat"
    private const val K_LON = "lon"
    private const val K_PUSH_HA = "push_ha"
    private const val K_INTERVAL_MIN = "interval_min"
    private const val K_THEME = "theme_mode"
    private const val K_WIDGET_TRANSPARENT = "widget_transparent"

    // cached values written by the refresh worker (used by widget + UI)
    private const val K_CUR_TEMP = "cache_temp"
    private const val K_CUR_CONDITION = "cache_condition"
    private const val K_CUR_CODE = "cache_code"
    private const val K_CUR_IS_DAY = "cache_is_day"
    private const val K_SUMMARY = "cache_summary"
    private const val K_UPDATED_AT = "cache_updated_at"
    private const val K_LAST_ERR = "cache_last_error"
    private const val K_FEELS = "cache_feels"
    private const val K_WIND = "cache_wind"
    private const val K_HUMIDITY = "cache_humidity"
    private const val K_CLOUD = "cache_cloud"

    // AI provider ids — keep in sync with ai.AiProviders
    const val AI_GEMINI = "gemini"
    const val AI_OLLAMA = "ollama"
    const val AI_HOME_ASSISTANT = "homeassistant"

    fun init(context: Context) {
        sp = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    fun edit(block: SharedPreferences.Editor.() -> Unit) {
        val e = sp.edit()
        e.block()
        e.apply()
    }

    var weatherProvider: String
        get() = sp.getString(K_WEATHER_PROVIDER, "openmeteo") ?: "openmeteo"
        set(v) = edit { putString(K_WEATHER_PROVIDER, v) }
    var openWeatherApiKey: String
        get() = sp.getString(K_OWM_KEY, "") ?: ""
        set(v) = edit { putString(K_OWM_KEY, v) }
    var weatherApiKey: String
        get() = sp.getString(K_WA_KEY, "") ?: ""
        set(v) = edit { putString(K_WA_KEY, v) }

    var aiProvider: String
        get() = sp.getString(K_AI_PROVIDER, AI_GEMINI) ?: AI_GEMINI
        set(v) = edit { putString(K_AI_PROVIDER, v) }
    var geminiApiKey: String
        get() = sp.getString(K_GEMINI_KEY, "") ?: ""
        set(v) = edit { putString(K_GEMINI_KEY, v) }
    var geminiModel: String
        get() = sp.getString(K_GEMINI_MODEL, "gemini-2.5-flash") ?: "gemini-2.5-flash"
        set(v) = edit { putString(K_GEMINI_MODEL, v) }
    var ollamaUrl: String
        get() = sp.getString(K_OLLAMA_URL, "http://192.168.1.1:11434") ?: "http://192.168.1.1:11434"
        set(v) = edit { putString(K_OLLAMA_URL, v) }
    var ollamaModel: String
        get() = sp.getString(K_OLLAMA_MODEL, "llama3.2") ?: "llama3.2"
        set(v) = edit { putString(K_OLLAMA_MODEL, v) }
    var haUrl: String
        get() = sp.getString(K_HA_URL, "http://homeassistant.local:8123") ?: "http://homeassistant.local:8123"
        set(v) = edit { putString(K_HA_URL, v) }
    var haToken: String
        get() = sp.getString(K_HA_TOKEN, "") ?: ""
        set(v) = edit { putString(K_HA_TOKEN, v) }

    var tinySentence: Boolean
        get() = sp.getBoolean(K_TINY, false)
        set(v) = edit { putBoolean(K_TINY, v) }
    var useGps: Boolean
        get() = sp.getBoolean(K_USE_GPS, true)
        set(v) = edit { putBoolean(K_USE_GPS, v) }
    var latitude: Double
        get() = sp.getFloat(K_LAT, 0f).toDouble()
        set(v) = edit { putFloat(K_LAT, v.toFloat()) }
    var longitude: Double
        get() = sp.getFloat(K_LON, 0f).toDouble()
        set(v) = edit { putFloat(K_LON, v.toFloat()) }
    var pushToHA: Boolean
        get() = sp.getBoolean(K_PUSH_HA, false)
        set(v) = edit { putBoolean(K_PUSH_HA, v) }
    var intervalMinutes: Long
        get() = sp.getLong(K_INTERVAL_MIN, 15L).coerceIn(15L, 240L)
        set(v) = edit { putLong(K_INTERVAL_MIN, v.coerceIn(15L, 240L)) }

    // theme: dark/light/system — dark is the default
    const val THEME_DARK = "dark"
    const val THEME_LIGHT = "light"
    const val THEME_SYSTEM = "system"
    var themeMode: String
        get() = sp.getString(K_THEME, THEME_DARK) ?: THEME_DARK
        set(v) = edit { putString(K_THEME, v) }

    // --- cache (widget/UI reads these) ---
    var cachedTempC: Double
        get() = sp.getString(K_CUR_TEMP, null)?.toDoubleOrNull() ?: Double.NaN
        set(v) = edit { putString(K_CUR_TEMP, v.toString()) }
    var cachedCondition: String
        get() = sp.getString(K_CUR_CONDITION, null) ?: ""
        set(v) = edit { putString(K_CUR_CONDITION, v) }
    var cachedWeatherCode: Int
        get() = sp.getInt(K_CUR_CODE, 0)
        set(v) = edit { putInt(K_CUR_CODE, v) }
    var cachedIsDay: Boolean?
        get() = if (sp.contains(K_CUR_IS_DAY)) sp.getBoolean(K_CUR_IS_DAY, true) else null
        set(v) = edit {
            if (v == null) remove(K_CUR_IS_DAY) else putBoolean(K_CUR_IS_DAY, v)
        }
    var cachedSummary: String
        get() = sp.getString(K_SUMMARY, null) ?: ""
        set(v) = edit { putString(K_SUMMARY, v) }
    var cachedUpdatedAtMs: Long
        get() = sp.getLong(K_UPDATED_AT, 0L)
        set(v) = edit { putLong(K_UPDATED_AT, v) }
    var lastError: String
        get() = sp.getString(K_LAST_ERR, null) ?: ""
        set(v) = edit { putString(K_LAST_ERR, v) }

    var cachedFeelsC: Double
        get() = sp.getString(K_FEELS, null)?.toDoubleOrNull() ?: Double.NaN
        set(v) = edit { putString(K_FEELS, v.toString()) }
    var cachedWindKmh: Double
        get() = sp.getString(K_WIND, null)?.toDoubleOrNull() ?: Double.NaN
        set(v) = edit { putString(K_WIND, v.toString()) }
    var cachedHumidityPct: Int
        get() = sp.getInt(K_HUMIDITY, -1)
        set(v) = edit { putInt(K_HUMIDITY, v) }
    var cachedCloudPct: Int
        get() = sp.getInt(K_CLOUD, -1)
        set(v) = edit { putInt(K_CLOUD, v) }

    var widgetTransparent: Boolean
        get() = sp.getBoolean(K_WIDGET_TRANSPARENT, false)
        set(v) = edit { putBoolean(K_WIDGET_TRANSPARENT, v) }
}