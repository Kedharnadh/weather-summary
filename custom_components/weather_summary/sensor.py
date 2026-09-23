"""Sensor platform for Weather Summary."""

from __future__ import annotations

from datetime import datetime, timezone

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE, UnitOfSpeed, UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import WeatherSummaryCoordinator

SENSOR_ENTITY_DESCRIPTIONS: tuple[SensorEntityDescription, ...] = (
    SensorEntityDescription(
        key="text",
        name="Text",
        icon="mdi:text-box-outline",
    ),
    SensorEntityDescription(
        key="temperature",
        name="Temperature",
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        state_class=SensorStateClass.MEASUREMENT,
    ),
    SensorEntityDescription(
        key="apparent_temperature",
        name="Apparent temperature",
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        state_class=SensorStateClass.MEASUREMENT,
    ),
    SensorEntityDescription(
        key="humidity",
        name="Humidity",
        device_class=SensorDeviceClass.HUMIDITY,
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
    ),
    SensorEntityDescription(
        key="wind",
        name="Wind",
        device_class=SensorDeviceClass.WIND_SPEED,
        native_unit_of_measurement=UnitOfSpeed.KILOMETERS_PER_HOUR,
        state_class=SensorStateClass.MEASUREMENT,
    ),
    SensorEntityDescription(
        key="condition",
        name="Condition",
        icon="mdi:weather-partly-cloudy",
    ),
    SensorEntityDescription(
        key="rain_starts_in",
        name="Rain starts in",
        icon="mdi:weather-pouring",
        entity_registry_enabled_default=False,
    ),
    SensorEntityDescription(
        key="rain_stops_in",
        name="Rain stops in",
        icon="mdi:weather-pouring",
        entity_registry_enabled_default=False,
    ),
    SensorEntityDescription(
        key="precipitation_next_hour",
        name="Precipitation next hour",
        icon="mdi:water",
        native_unit_of_measurement="mm",
        state_class=SensorStateClass.MEASUREMENT,
        entity_registry_enabled_default=False,
    ),
    SensorEntityDescription(
        key="rain_chance_next_24_h",
        name="Rain chance next 24 h",
        native_unit_of_measurement=PERCENTAGE,
        icon="mdi:weather-rainy",
        entity_registry_enabled_default=False,
    ),
    SensorEntityDescription(
        key="peak_temperature_next_24_h",
        name="Peak temperature next 24 h",
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        icon="mdi:thermometer",
        entity_registry_enabled_default=False,
    ),
    SensorEntityDescription(
        key="updated",
        name="Updated",
        device_class=SensorDeviceClass.TIMESTAMP,
        entity_registry_enabled_default=False,
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: WeatherSummaryCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    async_add_entities(
        WeatherSummarySensor(coordinator, entry, description)
        for description in SENSOR_ENTITY_DESCRIPTIONS
    )


class WeatherSummarySensor(CoordinatorEntity[WeatherSummaryCoordinator], SensorEntity):
    def __init__(
        self,
        coordinator: WeatherSummaryCoordinator,
        entry: ConfigEntry,
        description: SensorEntityDescription,
    ) -> None:
        super().__init__(coordinator)
        self.entity_description = description
        self._attr_unique_id = f"{entry.entry_id}_{description.key}"
        self._attr_has_entity_name = True
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, entry.entry_id)})

    @property
    def native_value(self) -> object | None:
        data = self.coordinator.data or {}
        value = data.get(self.entity_description.key)
        if value is None:
            return None
        if self.entity_description.key == "updated":
            return datetime.fromtimestamp(value / 1000, tz=timezone.utc)
        return value