import type { PlaceResult } from './weather/geocode';

const RECENT_KEY = 'weather-summary:recent-searches';
const MAX_RECENT = 5;

function isPlace(value: unknown): value is PlaceResult {
  if (!value || typeof value !== 'object') return false;
  const place = value as Partial<PlaceResult>;
  return (
    typeof place.lat === 'number' &&
    Number.isFinite(place.lat) &&
    typeof place.lon === 'number' &&
    Number.isFinite(place.lon) &&
    typeof place.label === 'string' &&
    place.label.trim().length > 0
  );
}

export function loadRecentSearches(): PlaceResult[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPlace).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function saveRecentSearch(place: PlaceResult): PlaceResult[] {
  const next = [
    place,
    ...loadRecentSearches().filter(
      (item) => `${item.lat.toFixed(4)},${item.lon.toFixed(4)}` !==
        `${place.lat.toFixed(4)},${place.lon.toFixed(4)}`,
    ),
  ].slice(0, MAX_RECENT);

  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures; the list is a convenience only.
  }

  return next;
}
