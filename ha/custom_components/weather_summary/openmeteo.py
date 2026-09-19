"""Weather fetching + normalization + fact derivation.

Mirrors the Android app's `WeatherProviders.kt` / `WeatherModels.kt` so both
produce the same normalized snapshot, facts and fallback sentences.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
import json
import logging
from typing import Any

import aiohttp

from .const import (
    OPEN_METEO_URL,
    OPEN_WEATHER_MAP_URL,
    WEATHER_API_COM_URL,
    PROVIDER_OPEN_METEO,
    PROVIDER_OPEN_WEATHER_MAP,
    PROVIDER_WEATHER_API_COM,
    RAIN_THRESHOLD_MM,
)

_LOGGER = logging.getLogger(__name__)

TIMEOUT = aiohttp.ClientTimeout(total=15)


# ---------------------------------------------------------------------------
# Normalized model (docs/RECIPE.md)
# ---------------------------------------------------------------------------

@dataclass
class CurrentWeather:
    temperature_c: float
    apparent_temperature_c: float | None = None
    humidity_pct: int | None = None
    wind_kmh: float | None = None
    weather_code: int = 0
    precipitation_mm: float | None = None
    is_day: bool | None = None
    cloud_cover_pct: int | None = None


@dataclass
class HourSlice:
    time: str
    temperature_c: float | None = None
    precip_probability_pct: int | None = None
    precip_mm: float | None = None
    weather_code: int | None = None


@dataclass
class WeatherSnapshot:
    current: CurrentWeather
    minutely15: list | None = None
    hourly: list = field(default_factory=list)


@dataclass
class WeatherFacts:
    temp_c: float
    feels_c: float | None
    condition_label: str
    is_raining_now: bool
    rain_start_in_min: int | None
    rain_stop_in_min: int | None
    precip_next_hour_mm: float
    max_chance_rain_24h: tuple[int, str] | None
    peak_temp_24h: tuple[float, str] | None
    wind_kmh: float | None
    humidity_pct: int | None


# ---------------------------------------------------------------------------
# Providers
# ---------------------------------------------------------------------------

async def get_json(session: aiohttp.ClientSession, url: str) -> dict[str, Any]:
    async with session.get(url, timeout=TIMEOUT) as resp:
        resp.raise_for_status()
        return await resp.json(content_type=None)


async def fetch(
    session: aiohttp.ClientSession,
    provider: str,
    lat: float,
    lon: float,
    owm_key: str | None = None,
    wa_key: str | None = None,
) -> WeatherSnapshot:
    """Fetch and normalize from the configured provider."""
    if provider == PROVIDER_OPEN_METEO:
        return await _fetch_open_meteo(session, lat, lon)
    if provider == PROVIDER_OPEN_WEATHER_MAP:
        return await _fetch_open_weather_map(session, lat, lon, owm_key)
    if provider == PROVIDER_WEATHER_API_COM:
        return await _fetch_weather_api_com(session, lat, lon, wa_key)
    raise ValueError(f"Unknown weather provider: {provider}")


async def _fetch_open_meteo(
    session: aiohttp.ClientSession, lat: float, lon: float
) -> WeatherSnapshot:
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,apparent_temperature,relative_humidity_2m,is_day,"
        "precipitation,weather_code,wind_speed_10m,cloud_cover",
        "minutely_15": "precipitation,weather_code",
        "forecast_minutely_15": 120,
        "hourly": "temperature_2m,precipitation_probability,precipitation,weather_code",
        "forecast_hours": 48,
        "timezone": "auto",
    }
    url = _with_params(OPEN_METEO_URL, params)
    data = await get_json(session, url)
    cur = data.get("current") or {}
    hourly = data.get("hourly") or {}
    m15 = data.get("minutely_15") or {}
    times = hourly.get("time") or []
    return WeatherSnapshot(
        current=CurrentWeather(
            temperature_c=cur.get("temperature_2m", 0.0),
            apparent_temperature_c=cur.get("apparent_temperature"),
            humidity_pct=cur.get("relative_humidity_2m"),
            wind_kmh=cur.get("wind_speed_10m"),
            weather_code=cur.get("weather_code", 0),
            precipitation_mm=cur.get("precipitation"),
            is_day={"1": True, 1: True}.get(cur.get("is_day"), False) if cur.get("is_day") is not None else None,
            cloud_cover_pct=cur.get("cloud_cover"),
        ),
        minutely15=m15.get("precipitation"),
        hourly=[
            HourSlice(
                time=t,
                temperature_c=_pick(hourly.get("temperature_2m"), i),
                precip_probability_pct=_pick(hourly.get("precipitation_probability"), i),
                precip_mm=_pick(hourly.get("precipitation"), i),
                weather_code=_pick(hourly.get("weather_code"), i),
            )
            for i, t in enumerate(times)
        ],
    )


async def _fetch_open_weather_map(
    session: aiohttp.ClientSession, lat: float, lon: float, key: str | None
) -> WeatherSnapshot:
    if not key:
        raise ValueError("OpenWeatherMap API key missing — add it in the integration options.")
    params = {"lat": lat, "lon": lon, "appid": key, "units": "metric", "exclude": "alerts"}
    url = _with_params(OPEN_WEATHER_MAP_URL, params)
    data = await get_json(session, url)
    cur = data.get("current") or {}
    weather = (cur.get("weather") or [{}])[0]
    code = owm_to_wmo(weather.get("id", 0))
    hourly = data.get("hourly") or []
    return WeatherSnapshot(
        current=CurrentWeather(
            temperature_c=cur.get("temp", 0.0),
            apparent_temperature_c=cur.get("feels_like"),
            humidity_pct=cur.get("humidity"),
            wind_kmh=cur.get("wind_speed"),
            weather_code=code,
            precipitation_mm=(cur.get("rain") or {}).get("1h"),
        ),
        minutely15=[s.get("precipitation", 0.0) for s in (data.get("minutely") or [])],
        hourly=[
            HourSlice(
                time=str(h.get("dt", i)),
                temperature_c=h.get("temp"),
                precip_probability_pct=round(h.get("pop", 0.0) * 100),
                precip_mm=(h.get("rain") or {}).get("1h"),
                weather_code=owm_to_wmo(((h.get("weather") or [{}])[0]).get("id", 0)),
            )
            for i, h in enumerate(hourly)
        ],
    )


async def _fetch_weather_api_com(
    session: aiohttp.ClientSession, lat: float, lon: float, key: str | None
) -> WeatherSnapshot:
    if not key:
        raise ValueError("WeatherAPI.com key missing — add it in the integration options.")
    params = {"key": key, "q": f"{lat},{lon}", "days": 2, "aqi": "no", "alerts": "no"}
    url = _with_params(WEATHER_API_COM_URL, params)
    data = await get_json(session, url)
    cur = data.get("current") or {}
    hours = []
    for day in (data.get("forecast") or {}).get("forecastday", []):
        for h in day.get("hour", []):
            hours.append(
                HourSlice(
                    time=h.get("time", ""),
                    temperature_c=h.get("temp_c"),
                    precip_probability_pct=h.get("chance_of_rain"),
                    precip_mm=h.get("precip_mm"),
                    weather_code=weatherapi_to_wmo((h.get("condition") or {}).get("code", 1000)),
                )
            )
    return WeatherSnapshot(
        current=CurrentWeather(
            temperature_c=cur.get("temp_c", 0.0),
            apparent_temperature_c=cur.get("feelslike_c"),
            humidity_pct=cur.get("humidity"),
            wind_kmh=cur.get("wind_kph"),
            weather_code=weatherapi_to_wmo((cur.get("condition") or {}).get("code", 1000)),
            is_day={1: True, 0: False}.get(cur.get("is_day")),
            cloud_cover_pct=cur.get("cloud"),
        ),
        minutely15=None,
        hourly=hours,
    )


def owm_to_wmo(code: int) -> int:
    return {
        200: 95, 201: 95, 202: 95, 210: 95, 211: 95, 212: 95, 221: 95,
        230: 95, 231: 95, 232: 95,
        300: 51, 301: 51, 302: 51, 310: 51, 311: 51, 312: 51, 313: 51, 314: 51,
        321: 51, 520: 51, 521: 51, 522: 51, 531: 51,
        500: 61, 501: 61, 502: 61, 503: 61, 504: 61,
        511: 66, 611: 66, 612: 66, 613: 66, 615: 66, 616: 66,
        600: 71, 601: 71, 602: 71, 620: 71, 621: 71, 622: 71,
        701: 45, 711: 45, 721: 45, 731: 45, 741: 45, 751: 45, 761: 45, 762: 45, 771: 45,
        800: 0,
        801: 2, 802: 2,
        803: 3, 804: 3,
    }.get(code, 0)


def weatherapi_to_wmo(code: int) -> int:
    return {
        1000: 0, 1003: 2, 1006: 3, 1007: 3, 1009: 45, 1030: 45, 1135: 45, 1147: 45,
        1063: 51, 1069: 51, 1072: 51, 1150: 53, 1153: 53,
        1180: 61, 1183: 61, 1186: 63, 1189: 63, 1192: 65, 1195: 65,
        1198: 66, 1201: 67,
        1204: 71, 1207: 71, 1210: 73, 1213: 73, 1216: 75, 1219: 75,
        1222: 77, 1225: 77, 1237: 75,
        1240: 80, 1243: 81, 1246: 82, 1249: 66, 1252: 67,
        1255: 85, 1258: 85, 1261: 86, 1264: 86,
        1273: 95, 1276: 95, 1279: 95, 1282: 95,
    }.get(code, 0)


def wmo_label(code: int) -> str:
    for label, codes in {
        "Clear": {0},
        "Partly cloudy": {1, 2},
        "Overcast": {3},
        "Foggy": {45, 48},
        "Drizzle": {51, 53, 55, 56, 57},
        "Rain": {61, 63, 65, 66, 67},
        "Snow": {71, 73, 75, 77},
        "Showers": {80, 81, 82},
        "Snow showers": {85, 86},
        "Thunderstorm": {95, 96, 99},
    }.items():
        if code in codes:
            return label
    return "Unknown"


# ---------------------------------------------------------------------------
# Fact derivation (mirrors ForecastFacts.derive in the Android app)
# ---------------------------------------------------------------------------

def derive_facts(snapshot: WeatherSnapshot) -> WeatherFacts:
    cur = snapshot.current
    series, step = _rain_series(snapshot)

    raining_now = bool(
        (cur.precipitation_mm or 0.0) >= RAIN_THRESHOLD_MM
        or (series and series[0] >= RAIN_THRESHOLD_MM)
    )

    rain_start: int | None = None
    rain_stop: int | None = None
    if raining_now:
        for i in range(1, max(len(series) - 1, 1)):
            a = series[i] if i < len(series) else 0.0
            b = series[i + 1] if i + 1 < len(series) else 0.0
            if a < RAIN_THRESHOLD_MM and b < RAIN_THRESHOLD_MM:
                rain_stop = i * step
                break
    else:
        for i, v in enumerate(series):
            if v >= RAIN_THRESHOLD_MM:
                rain_start = i * step
                break

    precip_next_hour = sum(series[: max(60 // step, 1)])

    max_chance: tuple[int, str] | None = None
    peak_temp: tuple[float, str] | None = None
    for h in snapshot.hourly[:24]:
        if h.precip_probability_pct is not None and (
            max_chance is None or h.precip_probability_pct > max_chance[0]
        ):
            max_chance = (h.precip_probability_pct, hour_label(h.time))
        if h.temperature_c is not None and (peak_temp is None or h.temperature_c > peak_temp[0]):
            peak_temp = (h.temperature_c, hour_label(h.time))

    return WeatherFacts(
        temp_c=cur.temperature_c,
        feels_c=cur.apparent_temperature_c,
        condition_label=wmo_label(cur.weather_code),
        is_raining_now=raining_now,
        rain_start_in_min=rain_start,
        rain_stop_in_min=rain_stop,
        precip_next_hour_mm=precip_next_hour,
        max_chance_rain_24h=max_chance,
        peak_temp_24h=peak_temp,
        wind_kmh=cur.wind_kmh,
        humidity_pct=cur.humidity_pct,
    )


def _rain_series(snapshot: WeatherSnapshot) -> tuple[list[float], int]:
    if snapshot.minutely15:
        return snapshot.minutely15, 15
    if snapshot.hourly:
        return [h.precip_mm or 0.0 for h in snapshot.hourly], 60
    return [], 60


def hour_label(time: str) -> str:
    if not time:
        return "?"
    try:
        from datetime import datetime

        return datetime.fromisoformat(time.replace("Z", "+00:00")).strftime("%H:%M")
    except Exception:
        try:
            return time.rsplit("T", 1)[1][:5]
        except Exception:
            from datetime import datetime

            try:
                return datetime.utcfromtimestamp(int(time)).strftime("%H:%M")
            except Exception:
                return "?"


# ---------------------------------------------------------------------------
# Deterministic fallback sentence (mirrors FallbackTemplates.text)
# ---------------------------------------------------------------------------

def fallback_text(facts: WeatherFacts) -> str:
    temp = f"{round(facts.temp_c)}°"
    if facts.is_raining_now and facts.rain_stop_in_min is not None:
        return f"Rain easing, should stop in ~{minutes_text(facts.rain_stop_in_min)}."
    if facts.is_raining_now:
        return f"Rain now — {facts.condition_label.lower()}."
    if facts.rain_start_in_min is not None and facts.rain_start_in_min <= 120:
        return f"Rain starting in ~{minutes_text(facts.rain_start_in_min)}."
    if facts.temp_c >= 35:
        extra = (
            f"rain {chance_word(facts.max_chance_rain_24h[0])} after {facts.max_chance_rain_24h[1]}"
            if facts.max_chance_rain_24h and facts.max_chance_rain_24h[0] >= 55
            else "drying out"
        )
        return f"Very hot, {temp}. Stay cool, {extra}."
    if facts.temp_c <= 0:
        return f"Freezing, {temp}. Bundle up."
    if facts.wind_kmh is not None and facts.wind_kmh >= 35:
        return f"Windy, {temp}, gusts to {round(facts.wind_kmh)} km/h."
    if facts.max_chance_rain_24h and facts.max_chance_rain_24h[0] >= 55:
        hour = facts.max_chance_rain_24h[1]
        return f"{temp}, {facts.condition_label.lower()}; rain {chance_word(facts.max_chance_rain_24h[0])} after {hour}."
    return f"{temp}, {facts.condition_label.lower().replace('overcast', 'cloudy')}."


def chance_word(pct: int) -> str:
    return "likely" if pct >= 70 else "possible"


def minutes_text(minutes: int) -> str:
    if minutes < 60:
        return f"{minutes} min"
    h, m = divmod(minutes, 60)
    return f"{h} h" if m == 0 else f"{h} h {m} min"


def _with_params(base: str, params: dict) -> str:
    import urllib.parse

    return base + "?" + urllib.parse.urlencode(params)


def _pick(lst: list | None, i: int):
    try:
        return lst[i]
    except (TypeError, IndexError):
        return None