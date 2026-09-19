"""HTTP view + services that let the Android app talk to this integration.

- POST /api/weather_summary/generate  {"prompt": "...", "mode": "tiny|short|long"}
  → {"text": "..."}      (used by the app when AI provider = Home Assistant)
- service weather_summary.generate  (same, with prompt field)
- service weather_summary.ingest_app (payload dict) → updates the sensors with
  data the phone already computed (used when the app pushes to HA).
"""

from __future__ import annotations

import voluptuous as vol

from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse
from homeassistant.helpers import config_validation as cv

from . import llm
from .const import CONF_SENTENCE_MODE, DOMAIN

GENERATE_SCHEMA = vol.Schema(
    {
        vol.Required("prompt"): cv.string,
        vol.Optional("mode", default="short"): vol.In(["tiny", "short", "long"]),
        vol.Optional("tiny", default=False): cv.boolean,  # legacy
    }
)

INGEST_SCHEMA = vol.Schema(
    {
        vol.Required("payload"): dict,
    }
)


class WeatherSummaryGenerateView(HomeAssistantView):
    """REST endpoint for the Android app to request a generated sentence."""

    url = "/api/weather_summary/generate"
    name = "api_weather_summary_generate"
    requires_auth = True

    def __init__(self, coordinator) -> None:
        self._coordinator = coordinator

    async def post(self, request):
        data = await request.json()
        prompt = str(data.get("prompt", "")).strip()
        if not prompt:
            return self.json({"error": "prompt is required"}, status_code=400)
        mode = str(data.get("mode") or ("tiny" if data.get("tiny") else "short"))
        text = await llm.generate_text(
            self._coordinator.hass, self._coordinator.config, prompt
        )
        if text is None:
            return self.json(
                {"error": "LLM generation failed — check the LLM provider settings."},
                status_code=503,
            )
        return self.json({"text": text})

    async def put(self, request):
        return await self.post(request)


async def async_register_http(hass: HomeAssistant, coordinator) -> None:
    hass.http.register_view(WeatherSummaryGenerateView(coordinator))


async def async_register_services(hass: HomeAssistant, coordinator) -> None:
    async def handle_generate(call: ServiceCall):
        prompt = str(call.data["prompt"]).strip()
        mode = str(call.data.get("mode") or ("tiny" if call.data.get("tiny") else "short"))
        coordinator.config[CONF_SENTENCE_MODE] = mode  # keep HA + app prompts in sync
        text = await llm.generate_text(hass, coordinator.config, prompt)
        if text:
            coordinator.summary = text
            if coordinator.data:
                coordinator.async_set_updated_data(
                    {**coordinator.data, "summary": text}
                )
            return {"text": text}
        if coordinator.facts:
            text = await llm.summarize(hass, coordinator.config, coordinator.facts, mode)
            coordinator.summary = text
            if coordinator.data:
                coordinator.async_set_updated_data(
                    {**coordinator.data, "summary": text}
                )
            return {"text": text}
        return {"text": None}

    async def handle_ingest(call: ServiceCall):
        payload = dict(call.data["payload"])
        labeled = {"payload_" + str(k): v for k, v in payload.items()}
        data = coordinator.apply_payload(payload)
        return {"sensors": data, "raw": labeled}

    hass.services.async_register(
        DOMAIN,
        "generate",
        handle_generate,
        schema=GENERATE_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN,
        "ingest_app",
        handle_ingest,
        schema=INGEST_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )


async def async_unload_services(hass: HomeAssistant) -> None:
    hass.services.async_remove(DOMAIN, "generate")
    hass.services.async_remove(DOMAIN, "ingest_app")