import type { LocationSettings, StoredWeather } from './types';

const WEATHER_PREFIX = 'weather-summary:weather:';
const LOCATIONS_KEY = 'weather-summary:locations';
const ACTIVE_KEY = 'weather-summary:active';

// Keys written by the first release; migrated into the multi-location model.
const LEGACY_WEATHER_KEY = 'weather-summary:last';
const LEGACY_LOCATION_KEY = 'weather-summary:location';

/** Upper bound so the saved-locations strip stays manageable. */
export const MAX_SAVED_LOCATIONS = 12;

/** Demo default so the app still shows something if geolocation is denied. */
export const DEFAULT_LOCATION: LocationSettings = {
  lat: 51.5072,
  lon: -0.1276,
  label: 'London, UK',
};

/** Stable identity for a location, tolerant of tiny coordinate differences. */
export function locationKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

export function isSameLocation(a: LocationSettings, b: LocationSettings): boolean {
  return locationKey(a.lat, a.lon) === locationKey(b.lat, b.lon);
}

function coordinateLabel(lat: number, lon: number): string {
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

function parseLocation(raw: string | null): LocationSettings | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LocationSettings>;
    if (typeof parsed.lat !== 'number' || typeof parsed.lon !== 'number') return null;
    if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lon)) return null;
    const label = typeof parsed.label === 'string' ? parsed.label.trim() : '';
    return {
      lat: parsed.lat,
      lon: parsed.lon,
      label: label || coordinateLabel(parsed.lat, parsed.lon),
    };
  } catch {
    return null;
  }
}

function parseWeather(raw: string | null): StoredWeather | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredWeather;
    if (!parsed?.snapshot || !parsed?.facts || typeof parsed.savedAt !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function dedupeLocations(list: LocationSettings[]): LocationSettings[] {
  const seen = new Set<string>();
  const result: LocationSettings[] = [];
  for (const location of list) {
    const key = locationKey(location.lat, location.lon);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(location);
  }
  return result.slice(0, MAX_SAVED_LOCATIONS);
}

/** The list of places the user has kept, in the order they were added. */
export function loadLocations(): LocationSettings[] {
  try {
    const raw = localStorage.getItem(LOCATIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return dedupeLocations(
          parsed
            .map((item) => parseLocation(JSON.stringify(item)))
            .filter((item): item is LocationSettings => item != null),
        );
      }
    }

    // Migrate a location saved by the first release into the saved list.
    const legacy = parseLocation(localStorage.getItem(LEGACY_LOCATION_KEY));
    return legacy ? [legacy] : [];
  } catch {
    return [];
  }
}

export function saveLocations(list: LocationSettings[]): void {
  try {
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(dedupeLocations(list)));
  } catch {
    // Quota or private-mode failures should never break the UI.
  }
}

/**
 * The location currently on screen. Returns `null` only on a genuinely fresh
 * install, which lets the app prompt for the device location on first open.
 */
export function loadActiveLocation(): LocationSettings | null {
  try {
    return (
      parseLocation(localStorage.getItem(ACTIVE_KEY)) ??
      parseLocation(localStorage.getItem(LEGACY_LOCATION_KEY))
    );
  } catch {
    return null;
  }
}

export function saveActiveLocation(location: LocationSettings): void {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(location));
  } catch {
    // Ignore storage failures; the in-memory location still works.
  }
}

/** Cached forecast for one location, so switching places works offline. */
export function loadWeatherFor(location: LocationSettings): StoredWeather | null {
  try {
    const key = WEATHER_PREFIX + locationKey(location.lat, location.lon);
    const stored = parseWeather(localStorage.getItem(key));
    if (stored) return stored;

    // Only reuse the legacy snapshot if it belonged to the same place.
    const legacyLocation = parseLocation(localStorage.getItem(LEGACY_LOCATION_KEY));
    if (legacyLocation && isSameLocation(legacyLocation, location)) {
      return parseWeather(localStorage.getItem(LEGACY_WEATHER_KEY));
    }
    return null;
  } catch {
    return null;
  }
}

export function saveWeatherFor(location: LocationSettings, value: StoredWeather): void {
  try {
    const key = WEATHER_PREFIX + locationKey(location.lat, location.lon);
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures; the in-memory forecast still works.
  }
}
