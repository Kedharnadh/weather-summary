import { describe, expect, it } from 'vitest';
import type { AirQuality } from '../types';
import { airCategory, airReading, usAqiNowcast, usCategory } from './airQuality';

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

// Current Open-Meteo readings for Tirupati (517501).
const tirupati = air({
  europeanAqi: 67,
  usAqi: 112,
  pm25: 59.8,
  pm10: 70.1,
  ozone: 134,
  no2: 1.4,
  so2: 9.9,
  co: 337,
});

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

describe('usCategory', () => {
  it('uses the US EPA bands with inclusive upper bounds', () => {
    expect(usCategory(50).label).toBe('Good');
    expect(usCategory(51).label).toBe('Moderate');
    expect(usCategory(100).label).toBe('Moderate');
    expect(usCategory(101).label).toBe('Unhealthy for sensitive groups');
    expect(usCategory(150).label).toBe('Unhealthy for sensitive groups');
    expect(usCategory(151).label).toBe('Unhealthy');
    expect(usCategory(200).label).toBe('Unhealthy');
    expect(usCategory(201).label).toBe('Very unhealthy');
    expect(usCategory(301).label).toBe('Hazardous');
  });
});

describe('usAqiNowcast', () => {
  it('matches the live US AQI scale for Tirupati', () => {
    // aqi.in reports ~160 for the same hour; Open-Meteo's model PM2.5 is a
    // little lower, so a nowcast in the low 150s is expected.
    expect(usAqiNowcast(tirupati)).toBe(153);
  });

  it('returns null without pollutant readings', () => {
    expect(usAqiNowcast(null)).toBeNull();
    expect(usAqiNowcast(air())).toBeNull();
  });
});

describe('airReading', () => {
  it('prefers the live US AQI nowcast and keeps the EU value for reference', () => {
    const reading = airReading(tirupati);
    expect(reading.value).toBe(153);
    expect(reading.scale).toBe('US AQI');
    expect(reading.tone).toBe('very-poor');
    expect(reading.label).toBe('Unhealthy');
    expect(reading.estimated).toBe(true);
    expect(reading.alternates).toEqual([{ scale: 'European AQI', value: 67 }]);
  });

  it('falls back to the 24-hour US index without pollutants', () => {
    const reading = airReading(air({ europeanAqi: 12, usAqi: 60 }));
    expect(reading.value).toBe(60);
    expect(reading.scale).toBe('US AQI');
    expect(reading.tone).toBe('moderate');
    expect(reading.estimated).toBe(false);
  });

  it('falls back to the European index when no US index exists', () => {
    const reading = airReading(air({ europeanAqi: 12 }));
    expect(reading.value).toBe(12);
    expect(reading.scale).toBe('European AQI');
    expect(reading.tone).toBe('good');
  });

  it('reports unknown when no index is available', () => {
    const reading = airReading(null);
    expect(reading.value).toBeNull();
    expect(reading.tone).toBe('unknown');
  });
});
