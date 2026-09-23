"""Binary sensor platform for Weather Summary (currently: is_raining)."""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import WeatherSummaryCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: WeatherSummaryCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    async_add_entities([WeatherSummaryRainingSensor(coordinator, entry)])


class WeatherSummaryRainingSensor(
    CoordinatorEntity[WeatherSummaryCoordinator], BinarySensorEntity
):
    def __init__(
        self,
        coordinator: WeatherSummaryCoordinator,
        entry: ConfigEntry,
    ) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"{entry.entry_id}_is_raining"
        self._attr_name = "Is raining"
        self._attr_icon = "mdi:weather-pouring"
        self._attr_has_entity_name = True
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, entry.entry_id)})

    @property
    def is_on(self) -> bool | None:
        data = self.coordinator.data
        if data is None:
            return None
        return bool(data.get("is_raining"))