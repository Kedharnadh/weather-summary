"""Config flow for Weather Summary."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.const import CONF_LATITUDE, CONF_LONGITUDE, CONF_SCAN_INTERVAL
from homeassistant.helpers import selector
import homeassistant.helpers.config_validation as cv

from .const import (
    CONF_LLM_API_KEY,
    CONF_LLM_BASE_URL,
    CONF_LLM_GEMINI_KEY,
    CONF_LLM_GEMINI_MODEL,
    CONF_LLM_MODEL,
    CONF_LLM_PROVIDER,
    CONF_OWM_API_KEY,
    CONF_SENTENCE_MODE,
    CONF_WEATHER_PROVIDER,
    CONF_WA_API_KEY,
    CONF_WINDY_API_KEY,
    DOMAIN,
    DEFAULT_GEMINI_MODEL,
    DEFAULT_SCAN_INTERVAL,
    LLM_GEMINI,
    LLM_HOME_ASSISTANT,
    LLM_NONE,
    LLM_OPENAI_COMPAT,
    PROVIDER_OPEN_METEO,
    PROVIDER_OPEN_WEATHER_MAP,
    PROVIDER_WEATHER_API_COM,
    PROVIDER_WINDY,
    SENTENCE_LONG,
    SENTENCE_SHORT,
    SENTENCE_TINY,
)

WEATHER_PROVIDER_OPTIONS = [
    PROVIDER_OPEN_METEO,
    PROVIDER_OPEN_WEATHER_MAP,
    PROVIDER_WEATHER_API_COM,
    PROVIDER_WINDY,
]

LLM_PROVIDER_OPTIONS = [LLM_NONE, LLM_GEMINI, LLM_OPENAI_COMPAT, LLM_HOME_ASSISTANT]

SENTENCE_MODE_OPTIONS = [SENTENCE_TINY, SENTENCE_SHORT, SENTENCE_LONG]


def _dropdown(options: list[str]) -> selector.SelectSelector:
    """Dropdown selector that stays functional if mode enums get removed.

    Newer HA refactors have been trimming helper APIs, so request the
    dropdown nicety via getattr and fall back to the default (list) mode.
    """
    cfg_kwargs: dict[str, Any] = {"options": options}
    mode = getattr(selector, "SelectSelectorMode", None)
    if mode is not None:
        try:
            cfg_kwargs["mode"] = mode.DROPDOWN
        except Exception:  # noqa: BLE001 - cosmetic only
            pass
    return selector.SelectSelector(selector.SelectSelectorConfig(**cfg_kwargs))


def sentence_mode_select() -> selector.SelectSelector:
    return _dropdown(SENTENCE_MODE_OPTIONS)


def weather_select() -> selector.SelectSelector:
    return _dropdown(WEATHER_PROVIDER_OPTIONS)


def llm_select() -> selector.SelectSelector:
    return _dropdown(LLM_PROVIDER_OPTIONS)


def _sentence_mode_default(config: dict[str, Any]) -> str:
    """Current sentence mode, migrating the legacy tiny_sentence boolean."""
    if CONF_SENTENCE_MODE in config:
        return config[CONF_SENTENCE_MODE]
    return SENTENCE_TINY if config.get("tiny_sentence") else SENTENCE_SHORT


class WeatherSummaryConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            if user_input[CONF_WEATHER_PROVIDER] == PROVIDER_OPEN_WEATHER_MAP and not user_input.get(
                CONF_OWM_API_KEY
            ):
                errors[CONF_OWM_API_KEY] = "missing_key"
            if user_input[CONF_WEATHER_PROVIDER] == PROVIDER_WEATHER_API_COM and not user_input.get(
                CONF_WA_API_KEY
            ):
                errors[CONF_WA_API_KEY] = "missing_key"
            if user_input[CONF_WEATHER_PROVIDER] == PROVIDER_WINDY and not user_input.get(
                CONF_WINDY_API_KEY
            ):
                errors[CONF_WINDY_API_KEY] = "missing_key"
            if user_input[CONF_LLM_PROVIDER] == LLM_GEMINI and not user_input.get(
                CONF_LLM_GEMINI_KEY
            ):
                errors[CONF_LLM_GEMINI_KEY] = "missing_gemini_key"
            if user_input[CONF_LLM_PROVIDER] == LLM_OPENAI_COMPAT and not user_input.get(
                CONF_LLM_BASE_URL
            ):
                errors[CONF_LLM_BASE_URL] = "missing_url"
            if not errors:
                return self.async_create_entry(
                    title="Weather Summary",
                    data={
                        CONF_WEATHER_PROVIDER: user_input[CONF_WEATHER_PROVIDER],
                        CONF_LATITUDE: user_input[CONF_LATITUDE],
                        CONF_LONGITUDE: user_input[CONF_LONGITUDE],
                    },
                    options={
                        CONF_LLM_PROVIDER: user_input[CONF_LLM_PROVIDER],
                        CONF_OWM_API_KEY: user_input.get(CONF_OWM_API_KEY) or "",
                        CONF_WA_API_KEY: user_input.get(CONF_WA_API_KEY) or "",
                        CONF_WINDY_API_KEY: user_input.get(CONF_WINDY_API_KEY) or "",
                        CONF_LLM_GEMINI_KEY: user_input.get(CONF_LLM_GEMINI_KEY) or "",
                        CONF_LLM_GEMINI_MODEL: user_input.get(CONF_LLM_GEMINI_MODEL) or DEFAULT_GEMINI_MODEL,
                        CONF_LLM_BASE_URL: user_input.get(CONF_LLM_BASE_URL) or "",
                        CONF_LLM_MODEL: user_input.get(CONF_LLM_MODEL) or "llama3.2",
                        CONF_LLM_API_KEY: user_input.get(CONF_LLM_API_KEY) or "",
                        CONF_SCAN_INTERVAL: user_input.get(CONF_SCAN_INTERVAL) or DEFAULT_SCAN_INTERVAL,
                        CONF_SENTENCE_MODE: user_input.get(CONF_SENTENCE_MODE) or SENTENCE_SHORT,
                    },
                )

        schema = self._build_user_schema()
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

    def _build_user_schema(self) -> vol.Schema:
        lat = self.hass.config.latitude or 0.0
        lon = self.hass.config.longitude or 0.0
        return vol.Schema(
            {
                vol.Required(CONF_LATITUDE, default=lat): cv.latitude,
                vol.Required(CONF_LONGITUDE, default=lon): cv.longitude,
                vol.Required(CONF_WEATHER_PROVIDER, default=PROVIDER_OPEN_METEO): weather_select(),
                vol.Optional(CONF_OWM_API_KEY): cv.string,
                vol.Optional(CONF_WA_API_KEY): cv.string,
                vol.Optional(CONF_WINDY_API_KEY): cv.string,
                vol.Required(CONF_LLM_PROVIDER, default=LLM_OPENAI_COMPAT): llm_select(),
                vol.Optional(CONF_LLM_GEMINI_KEY): cv.string,
                vol.Optional(CONF_LLM_GEMINI_MODEL, default=DEFAULT_GEMINI_MODEL): cv.string,
                vol.Optional(CONF_LLM_BASE_URL, default="http://localhost:11434/v1"): cv.string,
                vol.Optional(CONF_LLM_MODEL, default="llama3.2"): cv.string,
                vol.Optional(CONF_LLM_API_KEY): cv.string,
                vol.Required(CONF_SENTENCE_MODE, default=SENTENCE_SHORT): sentence_mode_select(),
                vol.Required(CONF_SCAN_INTERVAL, default=DEFAULT_SCAN_INTERVAL): vol.All(
                    vol.Coerce(int), vol.Range(min=5, max=360)
                ),
            }
        )

    @staticmethod
    def async_get_options_flow(config_entry) -> OptionsFlow:
        return WeatherSummaryOptionsFlow(config_entry)


class WeatherSummaryOptionsFlow(OptionsFlow):
    def __init__(self, config_entry) -> None:
        self._entry = config_entry

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            if user_input[CONF_WEATHER_PROVIDER] == PROVIDER_OPEN_WEATHER_MAP and not user_input.get(
                CONF_OWM_API_KEY
            ):
                errors[CONF_OWM_API_KEY] = "missing_key"
            if user_input[CONF_WEATHER_PROVIDER] == PROVIDER_WEATHER_API_COM and not user_input.get(
                CONF_WA_API_KEY
            ):
                errors[CONF_WA_API_KEY] = "missing_key"
            if user_input[CONF_WEATHER_PROVIDER] == PROVIDER_WINDY and not user_input.get(
                CONF_WINDY_API_KEY
            ):
                errors[CONF_WINDY_API_KEY] = "missing_key"
            if user_input[CONF_LLM_PROVIDER] == LLM_GEMINI and not user_input.get(
                CONF_LLM_GEMINI_KEY
            ):
                errors[CONF_LLM_GEMINI_KEY] = "missing_gemini_key"
            if user_input[CONF_LLM_PROVIDER] == LLM_OPENAI_COMPAT and not user_input.get(
                CONF_LLM_BASE_URL
            ):
                errors[CONF_LLM_BASE_URL] = "missing_url"
            if not errors:
                return self.async_create_entry(title="Weather Summary", data=user_input)

        current = self._entry.options
        schema = vol.Schema(
            {
                vol.Required(CONF_WEATHER_PROVIDER, default=current.get(CONF_WEATHER_PROVIDER, PROVIDER_OPEN_METEO)): weather_select(),
                vol.Optional(CONF_OWM_API_KEY, default=current.get(CONF_OWM_API_KEY, "")): cv.string,
                vol.Optional(CONF_WA_API_KEY, default=current.get(CONF_WA_API_KEY, "")): cv.string,
                vol.Optional(CONF_WINDY_API_KEY, default=current.get(CONF_WINDY_API_KEY, "")): cv.string,
                vol.Required(CONF_LLM_PROVIDER, default=current.get(CONF_LLM_PROVIDER, LLM_OPENAI_COMPAT)): llm_select(),
                vol.Optional(CONF_LLM_GEMINI_KEY, default=current.get(CONF_LLM_GEMINI_KEY, "")): cv.string,
                vol.Optional(CONF_LLM_GEMINI_MODEL, default=current.get(CONF_LLM_GEMINI_MODEL, DEFAULT_GEMINI_MODEL)): cv.string,
                vol.Optional(
                    CONF_LLM_BASE_URL,
                    default=current.get(CONF_LLM_BASE_URL, "http://localhost:11434/v1"),
                ): cv.string,
                vol.Optional(CONF_LLM_MODEL, default=current.get(CONF_LLM_MODEL, "llama3.2")): cv.string,
                vol.Optional(CONF_LLM_API_KEY, default=current.get(CONF_LLM_API_KEY, "")): cv.string,
                vol.Optional(CONF_SENTENCE_MODE, default=_sentence_mode_default(current)): sentence_mode_select(),
                vol.Required(
                    CONF_SCAN_INTERVAL,
                    default=current.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL),
                ): vol.All(vol.Coerce(int), vol.Range(min=5, max=360)),
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema, errors=errors)