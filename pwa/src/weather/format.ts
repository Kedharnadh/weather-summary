import type { ClockFormat } from '../settings';

/** Parse an Open-Meteo local timestamp ("YYYY-MM-DDTHH:mm") or a full ISO date. */
export function parseWeatherTime(value: string): Date | null {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hour12For(clock: ClockFormat): boolean | undefined {
  if (clock === '12') return true;
  if (clock === '24') return false;
  return undefined;
}

/**
 * Format a location-local timestamp. Open-Meteo returns naive local strings,
 * so parsing them as device-local keeps the wall-clock hour the location sees.
 */
export function formatHour(value: string, clock: ClockFormat = '24'): string {
  const date = parseWeatherTime(value);
  if (!date) return '?';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: hour12For(clock),
  }).format(date);
}

export function formatUpdated(timestamp: number, clock: ClockFormat = '24'): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: hour12For(clock),
  }).format(new Date(timestamp));
}

export function formatRelative(timestamp: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - timestamp) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} h ago`;
}

/** Format a latitude/longitude pair as a compact, human-readable location. */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`;
}

