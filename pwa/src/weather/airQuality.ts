/**
 * Air quality helpers.
 *
 * Open-Meteo's air-quality API is public, keyless, and CORS-enabled. It returns
 * both the European AQI (0–100+ with five bands) and the US AQI. The app shows
 * the European index when available and falls back to the US index otherwise.
 */

import type { AirQuality } from '../types';

export type AirTone =
  | 'good'
  | 'fair'
  | 'moderate'
  | 'poor'
  | 'very-poor'
  | 'extremely-poor'
  | 'unknown';

export interface AirCategory {
  tone: AirTone;
  label: string;
  advice: string;
}

const EUROPEAN_BANDS: Array<{ max: number; category: AirCategory }> = [
  {
    max: 20,
    category: {
      tone: 'good',
      label: 'Good',
      advice: 'Air quality is good — a fine time to be outside.',
    },
  },
  {
    max: 40,
    category: {
      tone: 'fair',
      label: 'Fair',
      advice: 'Air quality is acceptable for most people.',
    },
  },
  {
    max: 60,
    category: {
      tone: 'moderate',
      label: 'Moderate',
      advice: 'Sensitive groups should ease off long outdoor exertion.',
    },
  },
  {
    max: 80,
    category: {
      tone: 'poor',
      label: 'Poor',
      advice: 'Cut back on prolonged outdoor exertion, especially if sensitive.',
    },
  },
  {
    max: 100,
    category: {
      tone: 'very-poor',
      label: 'Very poor',
      advice: 'Avoid outdoor exertion and keep windows closed.',
    },
  },
];

const US_BANDS: Array<{ max: number; category: AirCategory }> = [
  {
    max: 50,
    category: {
      tone: 'good',
      label: 'Good',
      advice: 'Air quality is good — a fine time to be outside.',
    },
  },
  {
    max: 100,
    category: {
      tone: 'moderate',
      label: 'Moderate',
      advice: 'Air quality is acceptable; sensitive groups should take care.',
    },
  },
  {
    max: 150,
    category: {
      tone: 'poor',
      label: 'Unhealthy for sensitive groups',
      advice: 'Sensitive groups should limit prolonged outdoor exertion.',
    },
  },
  {
    max: 200,
    category: {
      tone: 'very-poor',
      label: 'Unhealthy',
      advice: 'Everyone should reduce outdoor exertion.',
    },
  },
  {
    max: 300,
    category: {
      tone: 'extremely-poor',
      label: 'Very unhealthy',
      advice: 'Avoid outdoor activity and keep windows closed.',
    },
  },
];

const EXTREMELY_POOR: AirCategory = {
  tone: 'extremely-poor',
  label: 'Hazardous',
  advice: 'Stay indoors and avoid outdoor activity.',
};

const UNKNOWN: AirCategory = {
  tone: 'unknown',
  label: 'Unknown',
  advice: 'Air quality data is not available right now.',
};

function bandFor(value: number, bands: Array<{ max: number; category: AirCategory }>): AirCategory {
  for (const band of bands) {
    if (value < band.max) return band.category;
  }
  return EXTREMELY_POOR;
}

/** Map a European AQI value to its category. */
export function airCategory(value: number | null | undefined): AirCategory {
  if (value == null || !Number.isFinite(value) || value < 0) return UNKNOWN;
  return bandFor(value, EUROPEAN_BANDS);
}

export interface AirReading {
  value: number | null;
  scale: 'European AQI' | 'US AQI' | 'AQI';
  tone: AirTone;
  label: string;
  advice: string;
}

/** Pick the best available index and describe it. */
export function airReading(air: AirQuality | null | undefined): AirReading {
  if (air) {
    if (air.europeanAqi != null && Number.isFinite(air.europeanAqi)) {
      const category = airCategory(air.europeanAqi);
      return {
        value: air.europeanAqi,
        scale: 'European AQI',
        tone: category.tone,
        label: category.label,
        advice: category.advice,
      };
    }
    if (air.usAqi != null && Number.isFinite(air.usAqi)) {
      const category = bandFor(air.usAqi, US_BANDS);
      return {
        value: air.usAqi,
        scale: 'US AQI',
        tone: category.tone,
        label: category.label,
        advice: category.advice,
      };
    }
  }

  return {
    value: null,
    scale: 'AQI',
    tone: UNKNOWN.tone,
    label: UNKNOWN.label,
    advice: UNKNOWN.advice,
  };
}

const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const AIR_FIELDS = [
  'european_aqi',
  'us_aqi',
  'pm10',
  'pm2_5',
  'ozone',
  'nitrogen_dioxide',
  'sulphur_dioxide',
  'carbon_monoxide',
];

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Fetch the current air quality. Any failure (network, CORS, quota) resolves to
 * `null` so the weather summary still renders without the air-quality card.
 */
export async function fetchAirQuality(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<AirQuality | null> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: AIR_FIELDS.join(','),
    timezone: 'auto',
  });

  try {
    const response = await fetch(`${AIR_URL}?${params.toString()}`, { signal });
    if (!response.ok) return null;

    const data = (await response.json()) as { current?: Record<string, unknown> };
    const cur = data.current ?? {};

    return {
      time: typeof cur.time === 'string' ? cur.time : '',
      europeanAqi: num(cur.european_aqi),
      usAqi: num(cur.us_aqi),
      pm25: num(cur.pm2_5),
      pm10: num(cur.pm10),
      ozone: num(cur.ozone),
      no2: num(cur.nitrogen_dioxide),
      so2: num(cur.sulphur_dioxide),
      co: num(cur.carbon_monoxide),
    };
  } catch {
    return null;
  }
}
