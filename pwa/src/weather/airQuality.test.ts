import { describe, expect, it } from 'vitest';
import type { AirQuality } from '../types';
import { airCategory, airReading } from './airQuality';

function air(overrides: Partial<AirQuality> = {}): AirQuality {
  return {
    time: '2026-11-09T20:00',
    europeanAqi: null,
    usAqi: null,
    pm25: null,
    pm10: null,
    ozone: null,
    no2: null,
    so2: null,
    co: null,
    ...overrides,
  };
}

describe('airCategory', () => {
  it('maps European AQI bands', () => {
    expect(airCategory(0).tone).toBe('good');
    expect(airCategory(19).tone).toBe('good');
    expect(airCategory(20).tone).toBe('fair');
    expect(airCategory(39).tone).toBe('fair');
    expect(airCategory(40).tone).toBe('moderate');
    expect(airCategory(60).tone).toBe('poor');
    expect(airCategory(80).tone).toBe('very-poor');
    expect(airCategory(100).tone).toBe('extremely-poor');
  });

  it('returns unknown for missing or invalid values', () => {
    expect(airCategory(null).tone).toBe('unknown');
    expect(airCategory(undefined).tone).toBe('unknown');
    expect(airCategory(Number.NaN).tone).toBe('unknown');
    expect(airCategory(-1).tone).toBe('unknown');
  });
});

describe('airReading', () => {
  it('prefers the European index', () => {
    const reading = airReading(air({ europeanAqi: 12, usAqi: 60 }));
    expect(reading.value).toBe(12);
    expect(reading.scale).toBe('European AQI');
    expect(reading.tone).toBe('good');
    expect(reading.label).toBe('Good');
  });

  it('falls back to the US index', () => {
    const reading = airReading(air({ usAqi: 160 }));
    expect(reading.value).toBe(160);
    expect(reading.scale).toBe('US AQI');
    expect(reading.tone).toBe('very-poor');
  });

  it('reports unknown when no index is available', () => {
    const reading = airReading(null);
    expect(reading.value).toBeNull();
    expect(reading.tone).toBe('unknown');
  });
});
