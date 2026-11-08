/** Sunrise/sunset helpers built on Open-Meteo's daily forecast. */

import type { SunTimes } from '../types';
import { parseWeatherTime } from './format';

export type SunEventKind = 'sunrise' | 'sunset';

export interface SunEvent {
  kind: SunEventKind;
  /** Raw Open-Meteo local timestamp, e.g. "2026-11-09T07:08". */
  time: string;
  date: Date;
}

function collect(sun: SunTimes | null | undefined): SunEvent[] {
  if (!sun) return [];

  const candidates: Array<[SunEventKind, string | null]> = [
    ['sunrise', sun.sunrise],
    ['sunset', sun.sunset],
    ['sunrise', sun.tomorrowSunrise],
    ['sunset', sun.tomorrowSunset],
  ];

  const events: SunEvent[] = [];
  for (const [kind, time] of candidates) {
    if (!time) continue;
    const date = parseWeatherTime(time);
    if (date) events.push({ kind, time, date });
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Open-Meteo timestamps are naive local times ("2026-11-09T07:08") for the
 * *forecast location*, not the device. Re-express "now" with the same wall
 * clock in the location's timezone so the two are comparable.
 */
function zonedNow(now: Date, timeZone?: string): Date {
  if (!timeZone) return now;

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '00';

    const local = new Date(
      `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`,
    );
    return Number.isNaN(local.getTime()) ? now : local;
  } catch {
    return now;
  }
}

/** The next sunrise or sunset strictly after `now`, compared in `timeZone`. */
export function nextSunEvent(
  sun: SunTimes | null | undefined,
  now: Date = new Date(),
  timeZone?: string,
): SunEvent | null {
  const nowMs = zonedNow(now, timeZone).getTime();
  return collect(sun).find((event) => event.date.getTime() > nowMs) ?? null;
}

/** Length of today's daylight, in minutes. */
export function daylightMinutes(sun: SunTimes | null | undefined): number | null {
  if (!sun?.sunrise || !sun?.sunset) return null;
  const sunrise = parseWeatherTime(sun.sunrise);
  const sunset = parseWeatherTime(sun.sunset);
  if (!sunrise || !sunset) return null;

  const minutes = Math.round((sunset.getTime() - sunrise.getTime()) / 60_000);
  return minutes > 0 ? minutes : null;
}

/** Human-friendly duration, e.g. "9 h 19 min". */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
