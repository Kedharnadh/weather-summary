"""Constants for the Weather Summary integration."""

from __future__ import annotations

from homeassistant.const import Platform

DOMAIN = "weather_summary"
VERSION = "1.5.1"
PLATFORMS = [Platform.SENSOR, Platform.BINARY_SENSOR, Platform.WEATHER]

# Config entry keys
CONF_WEATHER_PROVIDER = "weather_provider"
CONF_OWM_API_KEY = "owm_api_key"
CONF_WA_API_KEY = "weatherapi_api_key"
CONF_WINDY_API_KEY = "windy_api_key"
CONF_LLM_PROVIDER = "llm_provider"
CONF_LLM_BASE_URL = "llm_base_url"
CONF_LLM_MODEL = "llm_model"
CONF_LLM_API_KEY = "llm_api_key"
CONF_LLM_GEMINI_KEY = "gemini_api_key"
CONF_LLM_GEMINI_MODEL = "gemini_model"
CONF_URL = "url"
CONF_SENTENCE_MODE = "sentence_mode"

# Sentence modes
SENTENCE_TINY = "tiny"
SENTENCE_SHORT = "short"
SENTENCE_LONG = "long"

# Weather providers
PROVIDER_OPEN_METEO = "openmeteo"
PROVIDER_OPEN_WEATHER_MAP = "openweathermap"
PROVIDER_WEATHER_API_COM = "weatherapi"
PROVIDER_WINDY = "windy"

# LLM providers
LLM_NONE = "none"
LLM_OPENAI_COMPAT = "openai_compatible"
LLM_HOME_ASSISTANT = "homeassistant"
LLM_GEMINI = "gemini"

# Defaults
DEFAULT_SCAN_INTERVAL = 15
MIN_SCAN_INTERVAL = 5
DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_WEATHER_MAP_URL = "https://api.openweathermap.org/data/3.0/onecall"
WEATHER_API_COM_URL = "https://api.weatherapi.com/v1/forecast.json"
WINDY_URL = "https://api.windy.com/api/point-forecast/v2"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta"

# Open-Meteo weather codes (mirrors docs/RECIPE.md)
WMO_KEYS = {
    "clear": {0},
    "partly": {1, 2},
    "overcast": {3},
    "fog": {45, 48},
    "drizzle": {51, 53, 55, 56, 57},
    "rain": {61, 63, 65, 66, 67},
    "snow": {71, 73, 75, 77},
    "showers": {80, 81, 82},
    "snow_showers": {85, 86},
    "thunder": {95, 96, 99},
}

RAIN_THRESHOLD_MM = 0.2
FALLBACK_SUMMARY = "Forecast summary unavailable."