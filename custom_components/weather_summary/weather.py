"""Weather platform for Weather Summary."""

from __future__ import annotations

from typing import Any

from homeassistant.components.weather import (
    ATTR_CONDITION_CLOUDY,
    ATTR_CONDITION_EXCEPTIONAL,
    ATTR_CONDITION_FOG,
    ATTR_CONDITION_LIGHTNING,
    ATTR_CONDITION_PARTLYCLOUDY,
    ATTR_CONDITION_POURING,
    ATTR_CONDITION_RAINY,
    ATTR_CONDITION_SNOWY,
    ATTR_CONDITION_SUNNY,
    Forecast,
    WeatherEntity,
    WeatherEntityFeature,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import (
    UnitOfPrecipitationDepth,
    UnitOfSpeed,
    UnitOfTemperature,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import WeatherSummaryCoordinator

WMO_TO_CONDITION = {
    0: ATTR_CONDITION_SUNNY,
    1: ATTR_CONDITION_PARTLYCLOUDY,
    2: ATTR_CONDITION_PARTLYCLOUDY,
    3: ATTR_CONDITION_CLOUDY,
    45: ATTR_CONDITION_FOG,
    48: ATTR_CONDITION_FOG,
    51: ATTR_CONDITION_RAINY,
    53: ATTR_CONDITION_RAINY,
    55: ATTR_CONDITION_RAINY,
    56: ATTR_CONDITION_RAINY,
    57: ATTR_CONDITION_RAINY,
    61: ATTR_CONDITION_RAINY,
    63: ATTR_CONDITION_RAINY,
    65: ATTR_CONDITION_POURING,
    66: ATTR_CONDITION_RAINY,
    67: ATTR_CONDITION_RAINY,
    71: ATTR_CONDITION_SNOWY,
    73: ATTR_CONDITION_SNOWY,
    75: ATTR_CONDITION_SNOWY,
    77: ATTR_CONDITION_SNOWY,
    80: ATTR_CONDITION_RAINY,
    81: ATTR_CONDITION_RAINY,
    82: ATTR_CONDITION_POURING,
    85: ATTR_CONDITION_SNOWY,
    86: ATTR_CONDITION_SNOWY,
    95: ATTR_CONDITION_LIGHTNING,
    96: ATTR_CONDITION_LIGHTNING,
    99: ATTR_CONDITION_LIGHTNING,
}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: WeatherSummaryCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    async_add_entities([WeatherSummaryWeather(coordinator, entry)])


class WeatherSummaryWeather(
    CoordinatorEntity[WeatherSummaryCoordinator], WeatherEntity
):
    """Expose the normalized snapshot as a standard weather entity."""

    def __init__(
        self,
        coordinator: WeatherSummaryCoordinator,
        entry: ConfigEntry,
    ) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"{entry.entry_id}_weather"
        self._attr_name = None
        self._attr_has_entity_name = True
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, entry.entry_id)})
        self._attr_supported_features = WeatherEntityFeature.FORECAST_HOURLY

    @property
    def condition(self) -> str | None:
        data = self.coordinator.data or {}
        if data.get("is_raining"):
            return ATTR_CONDITION_RAINY
        code = data.get("weather_code")
        if code is None:
            return None
        return WMO_TO_CONDITION.get(int(code), ATTR_CONDITION_EXCEPTIONAL)

    @property
    def native_temperature(self) -> float | None:
        return self.coordinator.data.get("temperature") if self.coordinator.data else None

    @property
    def native_temperature_unit(self) -> str:
        return UnitOfTemperature.CELSIUS

    @property
    def native_apparent_temperature(self) -> float | None:
        return (
            self.coordinator.data.get("apparent_temperature")
            if self.coordinator.data
            else None
        )

    @property
    def humidity(self) -> int | None:
        return self.coordinator.data.get("humidity") if self.coordinator.data else None

    @property
    def native_wind_speed(self) -> float | None:
        return self.coordinator.data.get("wind") if self.coordinator.data else None

    @property
    def native_wind_speed_unit(self) -> str:
        return UnitOfSpeed.KILOMETERS_PER_HOUR

    @property
    def native_precipitation(self) -> float | None:
        return (
            self.coordinator.data.get("precipitation_next_hour")
            if self.coordinator.data
            else None
        )

    @property
    def native_precipitation_unit(self) -> str:
        return UnitOfPrecipitationDepth.MILLIMETERS

    @property
    def forecast_hourly(self) -> list[Forecast] | None:
        snapshot = self.coordinator.snapshot
        if snapshot is None or not snapshot.hourly:
            return None
        return [
            Forecast(
                datetime=h.time.replace("Z", "+00:00"),
                condition=WMO_TO_CONDITION.get(h.weather_code or 0, ATTR_CONDITION_EXCEPTIONAL),
                native_temperature=h.temperature_c,
                native_precipitation=h.precip_mm,
            )
            for h in snapshot.hourly[:24]
        ]