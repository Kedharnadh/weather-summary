"""Weather platform for Weather Summary."""

from __future__ import annotations

from typing import Any

from homeassistant.components.weather import (
    ConditionEntity,
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
    0: ConditionEntity.SUNNY,
    1: ConditionEntity.PARTLYCLOUDY,
    2: ConditionEntity.PARTLYCLOUDY,
    3: ConditionEntity.CLOUDY,
    45: ConditionEntity.FOGGY,
    48: ConditionEntity.FOGGY,
    51: ConditionEntity.RAINY,
    53: ConditionEntity.RAINY,
    55: ConditionEntity.RAINY,
    56: ConditionEntity.RAINY,
    57: ConditionEntity.RAINY,
    61: ConditionEntity.RAINY,
    63: ConditionEntity.RAINY,
    65: ConditionEntity.POURING,
    66: ConditionEntity.RAINY,
    67: ConditionEntity.RAINY,
    71: ConditionEntity.SNOWY,
    73: ConditionEntity.SNOWY,
    75: ConditionEntity.SNOWY,
    77: ConditionEntity.SNOWY,
    80: ConditionEntity.RAINY,
    81: ConditionEntity.RAINY,
    82: ConditionEntity.POURING,
    85: ConditionEntity.SNOWY,
    86: ConditionEntity.SNOWY,
    95: ConditionEntity.LIGHTNING,
    96: ConditionEntity.LIGHTNING,
    99: ConditionEntity.LIGHTNING,
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
            return ConditionEntity.RAINY
        code = data.get("weather_code")
        if code is None:
            return None
        return WMO_TO_CONDITION.get(int(code), ConditionEntity.EXCEPTIONAL)

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
                condition=WMO_TO_CONDITION.get(h.weather_code or 0, ConditionEntity.EXCEPTIONAL),
                native_temperature=h.temperature_c,
                native_precipitation=h.precip_mm,
            )
            for h in snapshot.hourly[:24]
        ]