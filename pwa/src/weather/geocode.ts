/**
 * Location search helpers.
 *
 * - Place names are looked up with the Open-Meteo geocoding API, which is fast
 *   and returns clean city-level results.
 * - Pincodes and neighbourhoods that Open-Meteo does not know fall back to
 *   OpenStreetMap's Nominatim search.
 * - Geolocation results are reverse-geocoded with BigDataCloud so the card
 *   shows a place name instead of "My location".
 *
 * All three services are public, keyless, and CORS-enabled.
 */

import { cityFromLabel } from './city';

export interface PlaceResult {
  lat: number;
  lon: number;
  label: string;
  /** City name for compact chips, when known. */
  city?: string;
}

interface OpenMeteoPlace {
  name?: string;
  latitude?: number;
  longitude?: number;
  admin1?: string;
  country?: string;
}

interface NominatimPlace {
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string | undefined>;
}

interface ReversePlace {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
}

const OPEN_METEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const REVERSE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

const searchCache = new Map<string, PlaceResult[]>();

// Nominatim asks clients to stay at or below one request per second.
const NOMINATIM_MIN_INTERVAL_MS = 1_100;
let lastNominatimAt = 0;

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('Aborted'));
    };

    timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function fetchNominatim<T>(url: string, signal?: AbortSignal): Promise<T> {
  const elapsed = Date.now() - lastNominatimAt;
  if (elapsed < NOMINATIM_MIN_INTERVAL_MS) {
    await wait(NOMINATIM_MIN_INTERVAL_MS - elapsed, signal);
  }
  lastNominatimAt = Date.now();
  return fetchJson<T>(url, signal);
}

function uniqueLabel(parts: Array<string | undefined | null>): string {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const part of parts) {
    const value = part?.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(value);
  }

  return values.join(', ');
}

/** True when the query looks like a numeric postal code (e.g. 517501). */
export function isPostalCode(query: string): boolean {
  return /^\d{3,10}$/.test(query.trim());
}

/** True for placeholder labels that should be replaced by a real place name. */
export function isGenericLabel(label: string): boolean {
  const value = label.trim();
  if (!value) return true;
  if (value.toLowerCase() === 'my location') return true;
  return /^[-+]?\d{1,3}(?:\.\d+)?\s*,\s*[-+]?\d{1,3}(?:\.\d+)?$/.test(value);
}

export function labelFromOpenMeteo(place: OpenMeteoPlace): string {
  return uniqueLabel([place.name, place.admin1, place.country]);
}

export function labelFromNominatim(place: NominatimPlace): string {
  const address = place.address ?? {};
  const primary =
    address.neighbourhood ||
    address.suburb ||
    address.quarter ||
    address.hamlet ||
    address.village ||
    address.town ||
    address.city ||
    address.municipality ||
    address.county ||
    place.name;

  const city = address.city || address.town || address.village || address.municipality;
  const secondary =
    city && city !== primary
      ? city
      : address.state_district || address.county || address.state;

  return uniqueLabel([primary, secondary, address.state, address.country]);
}

/** The city (not the neighbourhood) for a Nominatim result. */
export function cityFromNominatim(place: NominatimPlace): string {
  const address = place.address ?? {};
  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.suburb ||
    address.neighbourhood ||
    ''
  ).trim();
}

/** The city for an Open-Meteo geocoding result (its `name` is the city). */
export function cityFromOpenMeteo(place: OpenMeteoPlace): string {
  return (place.name ?? '').trim();
}

export function cityFromReverse(place: ReversePlace): string {
  return (place.city || place.locality || '').trim();
}

export function labelFromReverse(place: ReversePlace): string {
  const primary =
    place.locality && place.locality !== place.city
      ? place.locality
      : place.city || place.locality;

  return uniqueLabel([primary, place.principalSubdivision, place.countryName]);
}

function toPlaceFromOpenMeteo(place: OpenMeteoPlace): PlaceResult | null {
  if (typeof place.latitude !== 'number' || typeof place.longitude !== 'number') {
    return null;
  }
  const city = cityFromOpenMeteo(place);
  return {
    lat: place.latitude,
    lon: place.longitude,
    label: labelFromOpenMeteo(place),
    ...(city ? { city } : {}),
  };
}

function toPlaceFromNominatim(place: NominatimPlace): PlaceResult | null {
  const lat = Number(place.lat);
  const lon = Number(place.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const label = labelFromNominatim(place);
  const city = cityFromNominatim(place) || cityFromLabel(label);
  return { lat, lon, label, ...(city ? { city } : {}) };
}

function dedupe(places: PlaceResult[]): PlaceResult[] {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = `${place.lat.toFixed(3)},${place.lon.toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Geocoding request failed (HTTP ${response.status}).`);
  }
  return (await response.json()) as T;
}

/** Turn coordinates into a human place name, e.g. "Tirupati, Andhra Pradesh, India". */
export interface ReverseGeocodeResult {
  label: string;
  city: string;
}

export async function reverseGeocodeDetails(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<ReverseGeocodeResult | null> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    localityLanguage: 'en',
  });

  const place = await fetchJson<ReversePlace>(`${REVERSE_URL}?${params.toString()}`, signal);
  const label = labelFromReverse(place);
  if (!label) return null;
  return { label, city: cityFromReverse(place) };
}

export async function reverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<string | null> {
  return (await reverseGeocodeDetails(lat, lon, signal))?.label ?? null;
}

async function searchNominatim(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '6',
    'accept-language': 'en',
  });

  const results = await fetchNominatim<NominatimPlace[]>(
    `${NOMINATIM_URL}?${params.toString()}`,
    signal,
  );

  return dedupe(
    results
      .map(toPlaceFromNominatim)
      .filter((place): place is PlaceResult => place != null),
  ).slice(0, 6);
}

async function searchByName(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const params = new URLSearchParams({
    name: query,
    count: '6',
    language: 'en',
    format: 'json',
  });

  try {
    const data = await fetchJson<{ results?: OpenMeteoPlace[] }>(
      `${OPEN_METEO_URL}?${params.toString()}`,
      signal,
    );

    const places = dedupe(
      (data.results ?? [])
        .map(toPlaceFromOpenMeteo)
        .filter((place): place is PlaceResult => place != null),
    );

    if (places.length > 0) return places.slice(0, 6);
  } catch (error) {
    if (signal?.aborted) throw error;
    // Fall through to Nominatim, which also understands neighbourhoods.
  }

  return searchNominatim(query, signal);
}

async function searchPostalCode(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const params = new URLSearchParams({
    postalcode: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
    'accept-language': 'en',
  });

  const results = await fetchNominatim<NominatimPlace[]>(
    `${NOMINATIM_URL}?${params.toString()}`,
    signal,
  );

  const places = results
    .map(toPlaceFromNominatim)
    .filter((place): place is PlaceResult => place != null)
    .slice(0, 5);

  // Postcode results often only list the postcode, district, and state. Reverse
  // geocode the centre so the result reads "Tirupati" rather than "517501".
  const refined = await Promise.all(
    places.map(async (place) => {
      try {
        const details = await reverseGeocodeDetails(place.lat, place.lon, signal);
        return details
          ? { ...place, label: details.label, ...(details.city ? { city: details.city } : {}) }
          : place;
      } catch {
        return place;
      }
    }),
  );

  return dedupe(refined).slice(0, 5);
}

/** Search by place name or numeric postal code. Results are cached per query. */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const key = trimmed.toLowerCase();
  const cached = searchCache.get(key);
  if (cached) return cached;

  const results = isPostalCode(trimmed)
    ? await searchPostalCode(trimmed, signal)
    : await searchByName(trimmed, signal);

  searchCache.set(key, results);
  return results;
}
