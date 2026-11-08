import { describe, expect, it } from 'vitest';
import type { WeatherSnapshot } from '../types';
import { deriveFacts } from './facts';

function snapshot(overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    current: {
      time: '2026-11-09T14:00',
      temperatureC: 12,
      apparentTemperatureC: 11,
      humidityPct: 70,
      windKmh: 10,
      windGustKmh: 20,
      weatherCode: 3,
      precipitationMm: 0,
      isDay: true,
      cloudCoverPct: 80,
    },
    rain: { stepMinutes: 15, values: [0, 0, 0, 0], startTime: '2026-11-09T14:00' },
    hourly: [],
    timezone: 'Europe/London',
    fetchedAt: Date.now(),
    ...overrides,
  };
}

describe('deriveFacts', () => {
  it('detects rain starting from a 15-minute series', () => {
    const facts = deriveFacts(
      snapshot({ rain: { stepMinutes: 15, values: [0, 0, 0.4, 0.6], startTime: '' } }),
    );

    expect(facts.isRainingNow).toBe(false);
    expect(facts.rainStartInMin).toBe(30);
  });

  it('sums the next hour from 15-minute slots', () => {
    const facts = deriveFacts(
      snapshot({
        rain: { stepMinutes: 15, values: [0.1, 0.2, 0.3, 0.4, 9], startTime: '' },
      }),
    );

    expect(facts.precipNextHourMm).toBeCloseTo(1);
  });

  it('uses hourly slots when there is no minutely series', () => {
    const facts = deriveFacts(
      snapshot({ rain: { stepMinutes: 60, values: [0.5, 0.2], startTime: '' } }),
    );

    expect(facts.isRainingNow).toBe(true);
    expect(facts.precipNextHourMm).toBe(0.5);
  });

  it('finds the first sustained dry gap when it is raining', () => {
    const facts = deriveFacts(
      snapshot({
        rain: { stepMinutes: 15, values: [0.5, 0.3, 0, 0, 0.8], startTime: '' },
      }),
    );

    expect(facts.rainStopInMin).toBe(30);
  });

  it('ignores hourly slots that have already finished', () => {
    const facts = deriveFacts(
      snapshot({
        rain: { stepMinutes: 60, values: [], startTime: '' },
        hourly: [
          {
            time: '2020-01-01T00:00',
            temperatureC: 99,
            precipProbabilityPct: 100,
            precipMm: 0,
            weatherCode: 0,
            isDay: true,
          },
          {
            time: '2099-01-01T00:00',
            temperatureC: 21,
            precipProbabilityPct: 40,
            precipMm: 0,
            weatherCode: 1,
            isDay: true,
          },
        ],
      }),
    );

    expect(facts.peakTemp24h?.tempC).toBe(21);
    expect(facts.maxChanceRain24h?.percent).toBe(40);
  });
});
