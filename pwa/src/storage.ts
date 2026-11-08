import type { LocationSettings, StoredWeather } from './types';

const WEATHER_KEY = 'weather-summary:last';
const LOCATION_KEY = 'weather-summary:location';

/** Demo default so the app shows something before the user grants location. */
export const DEFAULT_LOCATION: LocationSettings = {
  lat: 51.5072,
  lon: -0.1276,
  label: 'London, UK',
};

export function loadWeather(): StoredWeather | null {
  try {
    const raw = localStorage.getItem(WEATHER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredWeather;
    if (!parsed?.snapshot || !parsed?.facts || typeof parsed.savedAt !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveWeather(value: StoredWeather): void {
  try {
    localStorage.setItem(WEATHER_KEY, JSON.stringify(value));
  } catch {
    // Quota or private-mode failures should never break the UI.
  }
}

export function loadLocation(): LocationSettings {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return DEFAULT_LOCATION;
    const parsed = JSON.parse(raw) as Partial<LocationSettings>;
    if (typeof parsed.lat !== 'number' || typeof parsed.lon !== 'number') {
      return DEFAULT_LOCATION;
    }
    return {
      lat: parsed.lat,
      lon: parsed.lon,
      label: parsed.label || `${parsed.lat.toFixed(2)}, ${parsed.lon.toFixed(2)}`,
    };
  } catch {
    return DEFAULT_LOCATION;
  }
}

export function saveLocation(value: LocationSettings): void {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures; the in-memory location still works.
  }
}
