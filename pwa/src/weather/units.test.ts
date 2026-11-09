import { describe, expect, it } from 'vitest';
import {
  formatPrecip,
  formatTemp,
  formatTempWithUnit,
  formatWind,
  temperatureValue,
} from './units';

describe('units', () => {
  it('converts and formats temperature', () => {
    expect(temperatureValue(0, 'metric')).toBe(0);
    expect(temperatureValue(0, 'imperial')).toBe(32);
    expect(formatTemp(29.4, 'metric')).toBe('29°');
    expect(formatTempWithUnit(29.4, 'metric')).toBe('29°C');
    expect(formatTempWithUnit(29.4, 'imperial')).toBe('85°F');
  });

  it('converts and formats wind and precipitation', () => {
    expect(formatWind(100, 'metric')).toBe('100 km/h');
    expect(formatWind(100, 'imperial')).toBe('62 mph');
    expect(formatPrecip(25.4, 'metric')).toBe('25.4 mm');
    expect(formatPrecip(25.4, 'imperial')).toBe('1.0 in');
    expect(formatPrecip(1.27, 'imperial')).toBe('0.05 in');
  });
});
