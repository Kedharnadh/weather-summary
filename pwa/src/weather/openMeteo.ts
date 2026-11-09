import type {
  CurrentWeather,
  HourSlice,
  LocationSettings,
  RainSeries,
  SunTimes,
  WeatherSnapshot,
} from '../types';
import { parseWeatherTime } from './format';

const API_URL = 'https://api.open-meteo.com/v1/forecast';

const CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'is_day',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_gusts_10m',
  'cloud_cover',
];

const HOURLY_FIELDS = [
  'temperature_2m',
  'precipitation_probability',
  'precipitation',
  'weather_code',
  'is_day',
];

const DAILY_FIELDS = ['sunrise', 'sunset'];

interface OmSeries {
  time?: string[];
  precipitation?: number[];
  weather_code?: number[];
  temperature_2m?: number[];
  precipitation_probability?: number[];
  is_day?: number[];
}

interface OmDaily {
  time?: string[];
  sunrise?: string[];
  sunset?: string[];
}

interface OmResponse {
  timezone?: string;
  current?: Record<string, unknown>;
  minutely_15?: OmSeries;
  hourly?: OmSeries;
  daily?: OmDaily;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** A one-line current-conditions reading for the saved-locations strip. */
export interface LocationGlance {
  temperatureC: number | null;
  weatherCode: number | null;
  isDay: boolean | null;
}

interface OmGlanceResponse {
  current?: Record<string, unknown>;
}

/**
 * Fetch current conditions for several places in a single request. Open-Meteo
 * accepts comma-separated coordinates and returns an array in the same order.
 */
export async function fetchGlances(
  locations: LocationSettings[],
  signal?: AbortSignal,
): Promise<LocationGlance[]> {
  if (locations.length === 0) return [];

  const params = new URLSearchParams({
    latitude: locations.map((location) => location.lat).join(','),
    longitude: locations.map((location) => location.lon).join(','),
    current: 'temperature_2m,weather_code,is_day',
    timezone: 'auto',
  });

  const response = await fetch(`${API_URL}?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(`Open-Meteo returned HTTP ${response.status}.`);
  }

  const data = (await response.json()) as OmGlanceResponse | OmGlanceResponse[];
  const list = Array.isArray(data) ? data : [data];

  return locations.map((_, index) => {
    const current = list[index]?.current ?? {};
    return {
      temperatureC: num(current.temperature_2m),
      weatherCode: num(current.weather_code),
      isDay: typeof current.is_day === 'number' ? current.is_day === 1 : null,
    };
  });
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function fetchOpenMeteo(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: CURRENT_FIELDS.join(','),
    hourly: HOURLY_FIELDS.join(','),
    minutely_15: 'precipitation,weather_code',
    daily: DAILY_FIELDS.join(','),
    forecast_minutely_15: '120',
    forecast_days: '3',
    timezone: 'auto',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
    temperature_unit: 'celsius',
  });

  const response = await fetch(`${API_URL}?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(`Open-Meteo returned HTTP ${response.status}.`);
  }

  const data = (await response.json()) as OmResponse;
  const cur = data.current ?? {};

  const current: CurrentWeather = {
    time: str(cur.time),
    temperatureC: num(cur.temperature_2m) ?? 0,
    apparentTemperatureC: num(cur.apparent_temperature),
    humidityPct: num(cur.relative_humidity_2m),
    windKmh: num(cur.wind_speed_10m),
    windGustKmh: num(cur.wind_gusts_10m),
    weatherCode: num(cur.weather_code) ?? 0,
    precipitationMm: num(cur.precipitation) ?? 0,
    isDay: typeof cur.is_day === 'number' ? cur.is_day === 1 : null,
    cloudCoverPct: num(cur.cloud_cover),
  };

  return {
    current,
    rain: buildRainSeries(data, current.time),
    hourly: buildHourly(data.hourly),
    timezone: data.timezone ?? 'UTC',
    fetchedAt: Date.now(),
    sun: buildSunTimes(data.daily),
  };
}

function buildSunTimes(daily: OmDaily | undefined): SunTimes | null {
  const sunrise = daily?.sunrise ?? [];
  const sunset = daily?.sunset ?? [];
  if (sunrise.length === 0 && sunset.length === 0) return null;

  return {
    sunrise: sunrise[0] ?? null,
    sunset: sunset[0] ?? null,
    tomorrowSunrise: sunrise[1] ?? null,
    tomorrowSunset: sunset[1] ?? null,
  };
}

function buildHourly(series: OmSeries | undefined): HourSlice[] {
  const times = series?.time ?? [];
  return times.map((time, index) => ({
    time,
    temperatureC: series?.temperature_2m?.[index] ?? null,
    precipProbabilityPct: series?.precipitation_probability?.[index] ?? null,
    precipMm: series?.precipitation?.[index] ?? null,
    weatherCode: series?.weather_code?.[index] ?? null,
    isDay: series?.is_day?.[index] != null ? series.is_day[index] === 1 : null,
  }));
}

function buildRainSeries(data: OmResponse, anchorTime: string): RainSeries {
  const minutely = data.minutely_15;
  if (minutely?.time?.length && minutely.precipitation?.length) {
    return alignSeries(minutely.time, minutely.precipitation, 15, anchorTime);
  }

  const hourly = data.hourly;
  if (hourly?.time?.length && hourly.precipitation?.length) {
    return alignSeries(hourly.time, hourly.precipitation, 60, anchorTime);
  }

  return { stepMinutes: 60, values: [], startTime: '' };
}

/**
 * Trim a precipitation series so its first value is the interval containing
 * `anchorTime`. Open-Meteo returns location-local ISO strings for both the
 * series and the current time, so a lexical comparison avoids timezone bugs
 * when the viewer is in a different timezone from the location.
 */
function alignSeries(
  times: string[],
  values: number[],
  stepMinutes: number,
  anchorTime: string,
): RainSeries {
  const length = Math.min(times.length, values.length);
  let start = 0;

  if (anchorTime) {
    for (let index = 0; index < length; index += 1) {
      if (times[index] <= anchorTime) start = index;
      else break;
    }
  } else {
    // Legacy fallback for callers that do not provide an anchor.
    const nowMs = Date.now();
    const stepMs = stepMinutes * 60_000;
    const next = times.findIndex((time) => {
      const parsed = parseWeatherTime(time);
      return parsed != null && parsed.getTime() + stepMs > nowMs;
    });
    start = next === -1 ? 0 : next;
  }

  return {
    stepMinutes,
    values: values.slice(start, start + 96),
    startTime: times[start] ?? '',
  };
}
