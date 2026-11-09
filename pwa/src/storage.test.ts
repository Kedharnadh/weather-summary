import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LOCATION,
  MAX_SAVED_LOCATIONS,
  SAME_CITY_KM,
  distanceKm,
  findSavedMatch,
  isSameLocation,
  loadActiveLocation,
  loadLocations,
  loadWeatherFor,
  locationKey,
  saveActiveLocation,
  saveLocations,
  saveWeatherFor,
} from './storage';
import type { LocationSettings, StoredWeather } from './types';

class MemoryStorage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  get length(): number {
    return this.map.size;
  }
}

const store = new MemoryStorage();

function place(lat: number, lon: number, label = 'Place'): LocationSettings {
  return { lat, lon, label };
}

function weatherAt(tempC: number): StoredWeather {
  return {
    snapshot: {
      current: {
        time: '2026-11-09T12:00',
        temperatureC: tempC,
        apparentTemperatureC: tempC,
        humidityPct: 50,
        windKmh: 5,
        windGustKmh: 8,
        weatherCode: 0,
        precipitationMm: 0,
        isDay: true,
        cloudCoverPct: 10,
      },
      rain: { stepMinutes: 15, values: [], startTime: '' },
      hourly: [],
      timezone: 'Europe/London',
      fetchedAt: 0,
      sun: null,
      air: null,
    },
    facts: {
      tempC,
      feelsC: tempC,
      conditionLabel: 'Clear',
      isRainingNow: false,
      rainStartInMin: null,
      rainStopInMin: null,
      precipNextHourMm: 0,
      maxChanceRain24h: null,
      peakTemp24h: null,
      windKmh: 5,
      windGustKmh: 8,
      humidityPct: 50,
    },
    summary: 'Clear skies.',
    savedAt: 1,
  };
}

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', store);
});

describe('location identity', () => {
  it('treats near-identical coordinates as the same place', () => {
    expect(locationKey(51.50721, -0.12761)).toBe(locationKey(51.5072, -0.1276));
    expect(isSameLocation(place(51.5072, -0.1276), place(51.50721, -0.12761))).toBe(true);
    expect(isSameLocation(place(51.5, -0.12), place(52.5, -0.12))).toBe(false);
  });

  it('measures great-circle distance between places', () => {
    const london = place(51.5072, -0.1276);
    const paris = place(48.8566, 2.3522);
    expect(distanceKm(london, paris)).toBeCloseTo(343.5, 0);
    expect(distanceKm(london, london)).toBe(0);
  });
});

describe('saved place matching', () => {
  const tirupati = { ...place(13.6288, 79.4192, 'Tirupati, India'), city: 'Tirupati' };

  it('matches a device fix close to a saved place', () => {
    // A device fix a few hundred metres from the saved city centre.
    const fix = { ...place(13.632, 79.421, 'My location'), city: 'Tirupati' };
    expect(findSavedMatch([tirupati], fix)).toBe(tirupati);
  });

  it('matches a device fix in the same city when requested', () => {
    // Roughly 10 km away, but clearly the same city.
    const fix = { ...place(13.72, 79.42, 'My location'), city: 'Tirupati' };
    expect(findSavedMatch([tirupati], fix)).toBeNull();
    expect(findSavedMatch([tirupati], fix, { matchCity: true })).toBe(tirupati);
  });

  it('does not merge a same-named city that is too far away', () => {
    const fix = { ...place(13.6288 + SAME_CITY_KM / 50, 79.4192, 'My location'), city: 'Tirupati' };
    expect(findSavedMatch([tirupati], fix, { matchCity: true })).toBeNull();
  });

  it('does not merge a different city', () => {
    const chennai = { ...place(13.0827, 80.2707, 'Chennai, India'), city: 'Chennai' };
    expect(findSavedMatch([tirupati], chennai, { matchCity: true })).toBeNull();
  });
});

describe('active location', () => {
  it('returns null on a fresh install so the app can ask for location', () => {
    expect(loadActiveLocation()).toBeNull();
    expect(loadLocations()).toEqual([]);
  });

  it('round-trips the active location', () => {
    saveActiveLocation(place(13.6288, 79.4192, 'Tirupati, Andhra Pradesh, India'));
    expect(loadActiveLocation()).toEqual(place(13.6288, 79.4192, 'Tirupati, Andhra Pradesh, India'));
  });
});

describe('saved locations', () => {
  it('dedupes and caps the saved list', () => {
    const many = Array.from({ length: MAX_SAVED_LOCATIONS + 5 }, (_, index) =>
      place(index + 1, index + 2, `Place ${index}`),
    );
    saveLocations([...many, place(1, 2, 'Duplicate')]);

    const loaded = loadLocations();
    expect(loaded).toHaveLength(MAX_SAVED_LOCATIONS);
    expect(loaded[0].label).toBe('Place 0');
    expect(loaded[loaded.length - 1].label).toBe(`Place ${MAX_SAVED_LOCATIONS - 1}`);
  });
});

describe('per-location weather cache', () => {
  it('keeps forecasts separate for each place', () => {
    const london = place(51.5072, -0.1276, 'London, UK');
    const tirupati = place(13.6288, 79.4192, 'Tirupati, India');

    saveWeatherFor(london, weatherAt(11));
    saveWeatherFor(tirupati, weatherAt(31));

    expect(loadWeatherFor(london)?.facts.tempC).toBe(11);
    expect(loadWeatherFor(tirupati)?.facts.tempC).toBe(31);
    expect(loadWeatherFor(place(0, 0, 'Nowhere'))).toBeNull();
  });
});

describe('legacy migration', () => {
  it('adopts a location and forecast saved by the first release', () => {
    store.setItem(
      'weather-summary:location',
      JSON.stringify(DEFAULT_LOCATION),
    );
    store.setItem('weather-summary:last', JSON.stringify(weatherAt(9)));

    expect(loadActiveLocation()).toEqual(DEFAULT_LOCATION);
    expect(loadLocations()).toEqual([DEFAULT_LOCATION]);
    expect(loadWeatherFor(DEFAULT_LOCATION)?.facts.tempC).toBe(9);
    // The legacy snapshot must not leak onto a different place.
    expect(loadWeatherFor(place(13.6288, 79.4192, 'Tirupati'))).toBeNull();
  });
});
