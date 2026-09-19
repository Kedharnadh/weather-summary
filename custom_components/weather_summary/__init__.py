"""Weather Summary for Home Assistant."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from . import api
from .const import DOMAIN, PLATFORMS
from .coordinator import WeatherSummaryCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Set up the integration (no YAML setup supported; config flow only)."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    config = _merged_config(entry)
    coordinator = WeatherSummaryCoordinator(hass, config)

    await coordinator.async_config_entry_first_refresh()

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"coordinator": coordinator}

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    await api.async_register_http(hass, coordinator)
    await api.async_register_services(hass, coordinator)

    entry.async_on_unload(lambda: api.async_unload_services(hass))

    async def _reload() -> None:
        coordinator.config = _merged_config(entry)
        await coordinator.async_refresh()

    entry.async_on_unload(_reload)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data.setdefault(DOMAIN, {}).pop(entry.entry_id, None)
    return unload_ok


async def async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    coordinator = hass.data.setdefault(DOMAIN, {}).get(entry.entry_id, {}).get("coordinator")
    if coordinator is not None:
        coordinator.config = _merged_config(entry)
        await coordinator.async_refresh()
    return True


def _merged_config(entry: ConfigEntry) -> dict[str, Any]:
    return {**entry.data, **entry.options}