/**
 * Air quality helpers.
 *
 * Open-Meteo's air-quality API is public, keyless, and CORS-enabled. It returns
 * both the European AQI and the US AQI, plus the individual pollutant
 * concentrations.
 *
 * The card shows a **US AQI nowcast** computed from the current pollutant
 * concentrations, because that is the scale most consumer AQI services (and
 * local Indian dashboards such as aqi.in) display. Open-Meteo's own `us_aqi`
 * uses 24-hour averages, which can read much lower than a live nowcast, so it
 * is only used as a fallback. The European AQI is shown as a secondary value.
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

/** US EPA categories, with inclusive upper bounds. */
const US_CATEGORIES: Array<{ max: number; category: AirCategory }> = [
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

const HAZARDOUS: AirCategory = {
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
  return HAZARDOUS;
}

/** Map a European AQI value to its category. */
export function airCategory(value: number | null | undefined): AirCategory {
  if (value == null || !Number.isFinite(value) || value < 0) return UNKNOWN;
  return bandFor(value, EUROPEAN_BANDS);
}

/** Map a US AQI value to its EPA category (inclusive boundaries). */
export function usCategory(value: number | null | undefined): AirCategory {
  if (value == null || !Number.isFinite(value) || value < 0) return UNKNOWN;
  for (const band of US_CATEGORIES) {
    if (value <= band.max) return band.category;
  }
  return HAZARDOUS;
}

interface EpaBand {
  cLo: number;
  cHi: number;
  iLo: number;
  iHi: number;
}

// US EPA breakpoints. Concentrations are in µg/m³ except where noted.
const PM25_BANDS: EpaBand[] = [
  { cLo: 0, cHi: 12.0, iLo: 0, iHi: 50 },
  { cLo: 12.1, cHi: 35.4, iLo: 51, iHi: 100 },
  { cLo: 35.5, cHi: 55.4, iLo: 101, iHi: 150 },
  { cLo: 55.5, cHi: 150.4, iLo: 151, iHi: 200 },
  { cLo: 150.5, cHi: 250.4, iLo: 201, iHi: 300 },
  { cLo: 250.5, cHi: 350.4, iLo: 301, iHi: 400 },
  { cLo: 350.5, cHi: 500.4, iLo: 401, iHi: 500 },
];

const PM10_BANDS: EpaBand[] = [
  { cLo: 0, cHi: 54, iLo: 0, iHi: 50 },
  { cLo: 55, cHi: 154, iLo: 51, iHi: 100 },
  { cLo: 155, cHi: 254, iLo: 101, iHi: 150 },
  { cLo: 255, cHi: 354, iLo: 151, iHi: 200 },
  { cLo: 355, cHi: 424, iLo: 201, iHi: 300 },
  { cLo: 425, cHi: 504, iLo: 301, iHi: 400 },
  { cLo: 505, cHi: 604, iLo: 401, iHi: 500 },
];

// O3 breakpoints are in ppb; Open-Meteo reports µg/m³.
const O3_BANDS: EpaBand[] = [
  { cLo: 0, cHi: 54, iLo: 0, iHi: 50 },
  { cLo: 55, cHi: 70, iLo: 51, iHi: 100 },
  { cLo: 71, cHi: 85, iLo: 101, iHi: 150 },
  { cLo: 86, cHi: 105, iLo: 151, iHi: 200 },
  { cLo: 106, cHi: 200, iLo: 201, iHi: 300 },
];

// CO breakpoints are in ppm; Open-Meteo reports µg/m³.
const CO_BANDS: EpaBand[] = [
  { cLo: 0, cHi: 4.4, iLo: 0, iHi: 50 },
  { cLo: 4.5, cHi: 9.4, iLo: 51, iHi: 100 },
  { cLo: 9.5, cHi: 12.4, iLo: 101, iHi: 150 },
  { cLo: 12.5, cHi: 15.4, iLo: 151, iHi: 200 },
  { cLo: 15.5, cHi: 30.4, iLo: 201, iHi: 300 },
  { cLo: 30.5, cHi: 40.4, iLo: 301, iHi: 400 },
  { cLo: 40.5, cHi: 50.4, iLo: 401, iHi: 500 },
];

// NO2 breakpoints are in ppb; Open-Meteo reports µg/m³.
const NO2_BANDS: EpaBand[] = [
  { cLo: 0, cHi: 53, iLo: 0, iHi: 50 },
  { cLo: 54, cHi: 100, iLo: 51, iHi: 100 },
  { cLo: 101, cHi: 360, iLo: 101, iHi: 150 },
  { cLo: 361, cHi: 649, iLo: 151, iHi: 200 },
  { cLo: 650, cHi: 1249, iLo: 201, iHi: 300 },
  { cLo: 1250, cHi: 1649, iLo: 301, iHi: 400 },
  { cLo: 1650, cHi: 2049, iLo: 401, iHi: 500 },
];

// SO2 breakpoints are in ppb; Open-Meteo reports µg/m³.
const SO2_BANDS: EpaBand[] = [
  { cLo: 0, cHi: 35, iLo: 0, iHi: 50 },
  { cLo: 36, cHi: 75, iLo: 51, iHi: 100 },
  { cLo: 76, cHi: 185, iLo: 101, iHi: 150 },
  { cLo: 186, cHi: 304, iLo: 151, iHi: 200 },
  { cLo: 305, cHi: 604, iLo: 201, iHi: 300 },
  { cLo: 605, cHi: 804, iLo: 301, iHi: 400 },
  { cLo: 805, cHi: 1004, iLo: 401, iHi: 500 },
];

function epaSubIndex(value: number | null | undefined, bands: EpaBand[]): number | null {
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  const last = bands[bands.length - 1];
  const clamped = Math.min(value, last.cHi);
  for (const band of bands) {
    if (clamped <= band.cHi) {
      if (band.cHi === band.cLo) return band.iLo;
      const ratio = (clamped - band.cLo) / (band.cHi - band.cLo);
      return band.iLo + ratio * (band.iHi - band.iLo);
    }
  }
  return last.iHi;
}

/**
 * US AQI computed from the current pollutant concentrations (a "nowcast").
 *
 * This mirrors how live AQI dashboards combine the current readings and gives
 * a much more useful number than a 24-hour average during a pollution spike.
 * Returns null when no pollutant is available.
 */
export function usAqiNowcast(air: AirQuality | null | undefined): number | null {
  if (!air) return null;

  const subIndices = [
    epaSubIndex(air.pm25, PM25_BANDS),
    epaSubIndex(air.pm10, PM10_BANDS),
    // 1 ppb O3 ≈ 1.96 µg/m³, 1 ppm CO ≈ 1145 µg/m³,
    // 1 ppb NO2 ≈ 1.88 µg/m³, 1 ppb SO2 ≈ 2.62 µg/m³.
    epaSubIndex(air.ozone == null ? null : air.ozone / 1.96, O3_BANDS),
    epaSubIndex(air.co == null ? null : air.co / 1145, CO_BANDS),
    epaSubIndex(air.no2 == null ? null : air.no2 / 1.88, NO2_BANDS),
    epaSubIndex(air.so2 == null ? null : air.so2 / 2.62, SO2_BANDS),
  ].filter((value): value is number => value != null);

  if (subIndices.length === 0) return null;
  return Math.round(Math.max(...subIndices));
}

export interface AirAlternate {
  scale: 'European AQI' | 'US AQI';
  value: number;
}

export interface AirReading {
  value: number | null;
  scale: 'US AQI' | 'European AQI' | 'AQI';
  tone: AirTone;
  label: string;
  advice: string;
  /** Other available scales, for comparison. */
  alternates: AirAlternate[];
  /** True when the primary value was derived from current pollutants. */
  estimated: boolean;
  /** Where the headline reading came from. */
  source: 'waqi' | 'cams' | 'none';
  /** Ground-station name when the reading came from WAQI. */
  station?: string | null;
}

function europeanAlternate(air: AirQuality): AirAlternate[] {
  if (air.europeanAqi != null && Number.isFinite(air.europeanAqi)) {
    return [{ scale: 'European AQI', value: Math.round(air.europeanAqi) }];
  }
  return [];
}

/** Pick the best available index and describe it. */
export function airReading(air: AirQuality | null | undefined): AirReading {
  if (air) {
    // A configured ground monitor (WAQI) is the most local source available.
    if (air.source === 'waqi' && air.usAqi != null && Number.isFinite(air.usAqi)) {
      const category = usCategory(air.usAqi);
      return {
        value: Math.round(air.usAqi),
        scale: 'US AQI',
        tone: category.tone,
        label: category.label,
        advice: category.advice,
        alternates: europeanAlternate(air),
        estimated: false,
        source: 'waqi',
        station: air.station ?? null,
      };
    }

    // Prefer a live US AQI nowcast: it matches what consumer AQI services show.
    const nowcast = usAqiNowcast(air);
    if (nowcast != null) {
      const category = usCategory(nowcast);
      return {
        value: nowcast,
        scale: 'US AQI',
        tone: category.tone,
        label: category.label,
        advice: category.advice,
        alternates: europeanAlternate(air),
        estimated: true,
        source: 'cams',
      };
    }

    // Fall back to Open-Meteo's 24-hour US index.
    if (air.usAqi != null && Number.isFinite(air.usAqi)) {
      const category = usCategory(air.usAqi);
      return {
        value: Math.round(air.usAqi),
        scale: 'US AQI',
        tone: category.tone,
        label: category.label,
        advice: category.advice,
        alternates: europeanAlternate(air),
        estimated: false,
        source: 'cams',
      };
    }

    // Last resort: the European index.
    if (air.europeanAqi != null && Number.isFinite(air.europeanAqi)) {
      const category = airCategory(air.europeanAqi);
      return {
        value: Math.round(air.europeanAqi),
        scale: 'European AQI',
        tone: category.tone,
        label: category.label,
        advice: category.advice,
        alternates: [],
        estimated: false,
        source: 'cams',
      };
    }
  }

  return {
    value: null,
    scale: 'AQI',
    tone: UNKNOWN.tone,
    label: UNKNOWN.label,
    advice: UNKNOWN.advice,
    alternates: [],
    estimated: false,
    source: 'none',
  };
}

const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const WAQI_URL = 'https://api.waqi.info/feed';

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

async function fetchCams(
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
      source: 'cams',
    };
  } catch {
    return null;
  }
}

interface WaqiResponse {
  status?: string;
  data?: {
    aqi?: number | string;
    city?: { name?: string };
    time?: { iso?: string; s?: string };
    iaqi?: Record<string, { v?: number }>;
  };
}

interface GroundReading {
  aqi: number;
  station: string | null;
  time: string;
  pm25: number | null;
}

/**
 * Optional ground-station reading from the World Air Quality Index project.
 * A free token is required; failures fall back to the CAMS model silently.
 */
async function fetchWaqi(
  lat: number,
  lon: number,
  token: string,
  signal?: AbortSignal,
): Promise<GroundReading | null> {
  const url = `${WAQI_URL}/geo:${lat};${lon}/?token=${encodeURIComponent(token)}`;

  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;

    const body = (await response.json()) as WaqiResponse;
    if (body.status !== 'ok' || !body.data) return null;

    const aqi = typeof body.data.aqi === 'number' ? body.data.aqi : Number(body.data.aqi);
    if (!Number.isFinite(aqi)) return null;

    const time =
      typeof body.data.time?.iso === 'string'
        ? body.data.time.iso
        : typeof body.data.time?.s === 'string'
          ? body.data.time.s.replace(' ', 'T')
          : '';

    return {
      aqi: Math.round(aqi),
      station: body.data.city?.name?.trim() || null,
      time,
      pm25: num(body.data.iaqi?.pm25?.v),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch the current air quality. Any failure (network, CORS, quota) resolves to
 * `null` so the weather summary still renders without the air-quality card.
 *
 * When a WAQI token is configured, a nearby ground monitor is preferred for the
 * headline US AQI; the CAMS model still supplies the pollutant breakdown.
 */
export async function fetchAirQuality(
  lat: number,
  lon: number,
  signal?: AbortSignal,
  waqiToken?: string,
): Promise<AirQuality | null> {
  const token = waqiToken?.trim();
  const [cams, ground] = await Promise.all([
    fetchCams(lat, lon, signal),
    token ? fetchWaqi(lat, lon, token, signal) : Promise.resolve(null),
  ]);

  if (!cams && !ground) return null;

  const base: AirQuality = cams ?? {
    time: '',
    europeanAqi: null,
    usAqi: null,
    pm25: null,
    pm10: null,
    ozone: null,
    no2: null,
    so2: null,
    co: null,
    source: 'cams',
  };

  if (!ground) return base;

  return {
    ...base,
    time: ground.time || base.time,
    usAqi: ground.aqi,
    pm25: ground.pm25 ?? base.pm25,
    source: 'waqi',
    station: ground.station,
  };
}
