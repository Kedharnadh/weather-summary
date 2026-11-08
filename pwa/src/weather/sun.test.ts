import { describe, expect, it } from 'vitest';
import type { SunTimes } from '../types';
import { daylightMinutes, formatDuration, nextSunEvent } from './sun';

const sun: SunTimes = {
  sunrise: '2026-11-09T07:12',
  sunset: '2026-11-09T16:31',
  tomorrowSunrise: '2026-11-10T07:13',
  tomorrowSunset: '2026-11-10T16:30',
};

describe('nextSunEvent', () => {
  it('picks sunrise before sunrise', () => {
    const event = nextSunEvent(sun, new Date('2026-11-09T05:00'));
    expect(event?.kind).toBe('sunrise');
    expect(event?.time).toBe('2026-11-09T07:12');
  });

  it('picks sunset after sunrise', () => {
    const event = nextSunEvent(sun, new Date('2026-11-09T12:00'));
    expect(event?.kind).toBe('sunset');
    expect(event?.time).toBe('2026-11-09T16:31');
  });

  it('rolls over to tomorrow sunrise after sunset', () => {
    const event = nextSunEvent(sun, new Date('2026-11-09T20:00'));
    expect(event?.kind).toBe('sunrise');
    expect(event?.time).toBe('2026-11-10T07:13');
  });

  it('returns null without data', () => {
    expect(nextSunEvent(null)).toBeNull();
    expect(nextSunEvent({ ...sun, sunrise: null, sunset: null, tomorrowSunrise: null, tomorrowSunset: null })).toBeNull();
  });

  it('compares now in the location timezone, not the device timezone', () => {
    const instant = new Date('2026-11-09T12:00:00Z');

    // 12:00 in London: today's sunset is still ahead.
    expect(nextSunEvent(sun, instant, 'Europe/London')?.time).toBe('2026-11-09T16:31');

    // The same instant is 17:30 in Kolkata, so the next event is tomorrow's sunrise.
    expect(nextSunEvent(sun, instant, 'Asia/Kolkata')?.time).toBe('2026-11-10T07:13');
  });
});

describe('daylightMinutes', () => {
  it('measures sunrise to sunset', () => {
    expect(daylightMinutes(sun)).toBe(559);
  });

  it('returns null when a time is missing', () => {
    expect(daylightMinutes({ ...sun, sunrise: null })).toBeNull();
    expect(daylightMinutes(null)).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(559)).toBe('9 h 19 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(0)).toBe('—');
  });
});
