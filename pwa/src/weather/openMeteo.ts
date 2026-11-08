import type {
  CurrentWeather,
  HourSlice,
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
    rain: buildRainSeries(data, new Date()),
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

function buildRainSeries(data: OmResponse, now: Date): RainSeries {
  const minutely = data.minutely_15;
  if (minutely?.time?.length && minutely.precipitation?.length) {
    return alignSeries(minutely.time, minutely.precipitation, 15, now);
  }

  const hourly = data.hourly;
  if (hourly?.time?.length && hourly.precipitation?.length) {
    return alignSeries(hourly.time, hourly.precipitation, 60, now);
  }

  return { stepMinutes: 60, values: [], startTime: '' };
}

function alignSeries(
  times: string[],
  values: number[],
  stepMinutes: number,
  now: Date,
): RainSeries {
  const length = Math.min(times.length, values.length);
  const stepMs = stepMinutes * 60_000;
  const nowMs = now.getTime();
  let start = -1;

  // Prefer the slot that contains "now" so the first value is the current
  // forecast interval instead of one that has already passed.
  for (let index = 0; index < length; index += 1) {
    const time = parseWeatherTime(times[index]);
    if (time && time.getTime() <= nowMs && nowMs < time.getTime() + stepMs) {
      start = index;
      break;
    }
  }

  if (start === -1) {
    for (let index = 0; index < length; index += 1) {
      const time = parseWeatherTime(times[index]);
      if (time && time.getTime() >= nowMs) {
        start = index;
        break;
      }
    }
  }

  if (start === -1) start = 0;

  return {
    stepMinutes,
    values: values.slice(start, start + 96),
    startTime: times[start] ?? '',
  };
}
