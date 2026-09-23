"""DataUpdateCoordinator that fetches weather + generates the summary."""

from __future__ import annotations

from datetime import timedelta
import logging
import time
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
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
        session = async_get_clientsession(self.hass)
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

        # Publish immediately with the deterministic fallback so polling and
        # the coordinator never block on the (up to 60s) LLM call.
        fallback = openmeteo.fallback_text(facts)
        self.summary = fallback
        payload = self._payload(facts, snapshot, fallback)

        self._schedule_summary(payload, facts)
        return payload

    def _schedule_summary(
        self, payload: dict[str, Any], facts: openmeteo.WeatherFacts
    ) -> None:
        """Regenerate the sentence in the background once the LLM answers."""
        config = {**self.config}
        mode = llm.sentence_mode(self.config)

        async def _finish() -> None:
            text = await llm.summarize(self.hass, config, facts, mode)
            if self.data is not payload:
                _LOGGER.debug("Ignoring stale LLM summary (data refreshed meanwhile)")
                return
            self.summary = text
            self.async_set_updated_data({**payload, "text": text})

        self.hass.async_create_task(_finish(), eager_start=True)

    def _payload(
        self,
        facts: openmeteo.WeatherFacts,
        snapshot: openmeteo.WeatherSnapshot,
        summary: str,
    ) -> dict[str, Any]:
        """Build the data dict keyed by the documented sensor slugs."""
        return {
            "text": summary,
            "temperature": facts.temp_c,
            "apparent_temperature": facts.feels_c,
            "humidity": facts.humidity_pct,
            "wind": facts.wind_kmh,
            "condition": facts.condition_label,
            "weather_code": snapshot.current.weather_code,
            "is_raining": facts.is_raining_now,
            "rain_starts_in": facts.rain_start_in_min,
            "rain_stops_in": facts.rain_stop_in_min,
            "precipitation_next_hour": facts.precip_next_hour_mm,
            "rain_chance_next_24_h": facts.max_chance_rain_24h[0] if facts.max_chance_rain_24h else None,
            "peak_temperature_next_24_h": facts.peak_temp_24h[0] if facts.peak_temp_24h else None,
            "updated": int(time.time() * 1000),
        }

    def apply_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Adopt data pushed from the Android app (weather_summary.ingest_app).

        The app still sends its own key names (summary, wind_kmh,
        rain_start_in_min, ...); map them onto the documented sensor slugs.
        """
        data = {
            "text": payload.get("summary") or "",
            "temperature": payload.get("temperature"),
            "apparent_temperature": payload.get("apparent_temperature"),
            "humidity": payload.get("humidity"),
            "wind": payload.get("wind_kmh"),
            "condition": payload.get("condition"),
            "weather_code": payload.get("weather_code"),
            "is_raining": payload.get("is_raining"),
            "rain_starts_in": payload.get("rain_start_in_min"),
            "rain_stops_in": payload.get("rain_stop_in_min"),
            "precipitation_next_hour": payload.get("precip_next_hour_mm"),
            "rain_chance_next_24_h": payload.get("rain_chance_24h_pct"),
            "peak_temperature_next_24_h": payload.get("peak_temp_24h"),
            "updated": int(time.time() * 1000),
        }
        self.summary = data["text"]
        self.async_set_updated_data(data)
        return data

    @staticmethod
    def _interval(config: dict[str, Any]) -> timedelta:
        return timedelta(minutes=max(int(config.get("scan_interval", 15)), 5))