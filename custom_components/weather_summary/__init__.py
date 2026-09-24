"""Weather Summary for Home Assistant."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv, device_registry as dr

# Import platforms eagerly at module load so HA pre-imports them in its import
# executor instead of doing a blocking import during event-loop setup.
from . import api, binary_sensor, sensor, weather  # noqa: F401
from .const import DOMAIN, PLATFORMS, VERSION
from .coordinator import WeatherSummaryCoordinator

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Set up the integration (no YAML setup supported; config flow only)."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    config = _merged_config(entry)
    coordinator = WeatherSummaryCoordinator(hass, config)

    await coordinator.async_config_entry_first_refresh()

    _register_device(hass, entry)

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"coordinator": coordinator}

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    view = await api.async_register_http(hass, coordinator)
    await api.async_register_services(hass, coordinator)

    entry.async_on_unload(lambda: api.async_unload_services(hass))
    entry.async_on_unload(lambda: api.async_unregister_http(hass, view))
    entry.async_on_unload(entry.add_update_listener(async_reload_entry))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data.setdefault(DOMAIN, {}).pop(entry.entry_id, None)
    return unload_ok


async def async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options changes: update the coordinator config and refresh."""
    coordinator = hass.data.setdefault(DOMAIN, {}).get(entry.entry_id, {}).get("coordinator")
    if coordinator is not None:
        coordinator.config = _merged_config(entry)
        await coordinator.async_refresh()


def _register_device(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Create a stable device so entity IDs are weather_summary_<entity>."""
    dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id,
        entry_type=dr.DeviceEntryType.SERVICE,
        identifiers={(DOMAIN, entry.entry_id)},
        name="Weather Summary",
        manufacturer="Weather Summary",
        model="Home Assistant integration",
        sw_version=VERSION,
    )


def _merged_config(entry: ConfigEntry) -> dict[str, Any]:
    return {**entry.data, **entry.options}