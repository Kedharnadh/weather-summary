"""Diagnostics support for Weather Summary."""

from __future__ import annotations

from dataclasses import asdict
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN

_SENSITIVE_KEYS = {
    "owm_api_key",
    "weatherapi_api_key",
    "windy_api_key",
    "gemini_api_key",
    "llm_api_key",
}


def _redact(data: dict[str, Any]) -> dict[str, Any]:
    return {
        key: ("***" if key in _SENSITIVE_KEYS else value)
        for key, value in data.items()
    }


def _facts(facts) -> dict[str, Any] | None:
    return asdict(facts) if facts is not None else None


def _snapshot(snapshot) -> dict[str, Any] | None:
    if snapshot is None:
        return None
    hourly = [
        asdict(h) for h in snapshot.hourly[:24]
    ]
    return {
        "current": asdict(snapshot.current),
        "minutely15": snapshot.minutely15[:24] if isinstance(snapshot.minutely15, list) else snapshot.minutely15,
        "hourly": hourly,
    }


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: ConfigEntry
) -> dict[str, Any]:
    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    return {
        "config_entry": {
            "title": entry.title,
            "data": _redact(entry.data),
            "options": _redact(entry.options),
        },
        "last_error": coordinator.last_error,
        "summary": coordinator.summary,
        "data": coordinator.data,
        "facts": _facts(coordinator.facts),
        "snapshot": _snapshot(coordinator.snapshot),
    }