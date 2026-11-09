import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
});

describe('settings', () => {
  it('uses defaults when nothing is stored', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips saved settings', () => {
    saveSettings({ units: 'imperial', clock: '12', waqiToken: 'abc123' });
    expect(loadSettings()).toEqual({
      units: 'imperial',
      clock: '12',
      waqiToken: 'abc123',
    });
  });

  it('sanitizes unknown values and trims the token', () => {
    localStorage.setItem(
      'weather-summary:settings',
      JSON.stringify({ units: 'kelvin', clock: 'military', waqiToken: '  tok  ' }),
    );
    expect(loadSettings()).toEqual({
      units: 'metric',
      clock: '24',
      waqiToken: 'tok',
    });
  });

  it('falls back to defaults for corrupt storage', () => {
    localStorage.setItem('weather-summary:settings', '{not json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
