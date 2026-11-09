/** Unit conversion and formatting. All stored values stay metric. */

import type { Units } from '../settings';

export function temperatureValue(celsius: number, units: Units): number {
  return units === 'imperial' ? (celsius * 9) / 5 + 32 : celsius;
}

/** Compact temperature for cards, e.g. "29°". */
export function formatTemp(celsius: number, units: Units): string {
  return `${Math.round(temperatureValue(celsius, units))}°`;
}

/** Temperature with its unit, e.g. "29°C" or "84°F". */
export function formatTempWithUnit(celsius: number, units: Units): string {
  return `${Math.round(temperatureValue(celsius, units))}°${units === 'imperial' ? 'F' : 'C'}`;
}

export function formatWind(kmh: number, units: Units): string {
  if (units === 'imperial') {
    return `${Math.round(kmh * 0.621371)} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}

export function formatPrecip(mm: number, units: Units): string {
  if (units === 'imperial') {
    const inches = mm / 25.4;
    return `${inches >= 0.1 ? inches.toFixed(1) : inches.toFixed(2)} in`;
  }
  return `${mm.toFixed(1)} mm`;
}
