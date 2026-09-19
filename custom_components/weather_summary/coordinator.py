"""DataUpdateCoordinator that fetches weather + generates the summary."""

from __future__ import annotations

from datetime import timedelta
import logging
import time
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import CONF_WEATHER_PROVIDER, DOMAIN, PROVIDER_OPEN_METEO
from . import llm, openmeteo

_LOGGER = logging.getLogger(__name__)


class WeatherSummaryCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Fetch weather from the provider, derive facts, generate a sentence."""

    def __init__(self, hass: HomeAssistant, config: dict[str, Any]) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=self._interval(config),
        )
        self.config = config
        self.facts: openmeteo.WeatherFacts | None = None
        self.snapshot: openmeteo.WeatherSnapshot | None = None
        self.summary: str = ""
        self.last_error: str | None = None

    async def _async_update_data(self) -> dict[str, Any]:
        session = self.hass.helpers.aiohttp_client.async_get_clientsession()
        try:
            snapshot = await openmeteo.fetch(
                session=session,
                provider=self.config.get(CONF_WEATHER_PROVIDER, PROVIDER_OPEN_METEO),
                lat=self.config["latitude"],
                lon=self.config["longitude"],
                owm_key=self.config.get("owm_api_key"),
                wa_key=self.config.get("weatherapi_api_key"),
                windy_key=self.config.get("windy_api_key"),
            )
        except Exception as err:  # noqa: BLE001
            self.last_error = str(err)
            raise UpdateFailed(str(err)) from err

        facts = openmeteo.derive_facts(snapshot)
        self.snapshot = snapshot
        self.facts = facts
        self.last_error = None
        try:
            self.summary = await llm.summarize(
                self.hass, self.config, facts, bool(self.config.get("tiny_sentence", False))
            )
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Summary generation failed: %s", err)
            self.summary = openmeteo.fallback_text(facts)

        return self._payload(facts, snapshot, self.summary)

    def _payload(
        self,
        facts: openmeteo.WeatherFacts,
        snapshot: openmeteo.WeatherSnapshot,
        summary: str,
    ) -> dict[str, Any]:
        return {
            "summary": summary,
            "temperature": facts.temp_c,
            "apparent_temperature": facts.feels_c,
            "humidity": facts.humidity_pct,
            "wind_kmh": facts.wind_kmh,
            "condition": facts.condition_label,
            "weather_code": snapshot.current.weather_code,
            "is_raining": facts.is_raining_now,
            "rain_start_in_min": facts.rain_start_in_min,
            "rain_stop_in_min": facts.rain_stop_in_min,
            "precip_next_hour_mm": facts.precip_next_hour_mm,
            "rain_chance_24h_pct": facts.max_chance_rain_24h[0] if facts.max_chance_rain_24h else None,
            "peak_temp_24h": facts.peak_temp_24h[0] if facts.peak_temp_24h else None,
            "updated_at": int(time.time() * 1000),
        }

    def apply_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Adopt data pushed from the Android app (weather_summary.ingest_app)."""
        data = {
            "summary": payload.get("summary") or "",
            "temperature": payload.get("temperature"),
            "apparent_temperature": payload.get("apparent_temperature"),
            "humidity": payload.get("humidity"),
            "wind_kmh": payload.get("wind_kmh"),
            "condition": payload.get("condition"),
            "weather_code": payload.get("weather_code"),
            "is_raining": payload.get("is_raining"),
            "rain_start_in_min": payload.get("rain_start_in_min"),
            "rain_stop_in_min": payload.get("rain_stop_in_min"),
            "precip_next_hour_mm": payload.get("precip_next_hour_mm"),
            "rain_chance_24h_pct": payload.get("rain_chance_24h_pct"),
            "peak_temp_24h": payload.get("peak_temp_24h"),
            "updated_at": int(time.time() * 1000),
        }
        self.async_set_updated_data(data)
        return data

    @staticmethod
    def _interval(config: dict[str, Any]) -> timedelta:
        return timedelta(minutes=max(int(config.get("scan_interval", 15)), 5))