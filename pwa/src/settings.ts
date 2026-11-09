/** User preferences, persisted locally. */

export type Units = 'metric' | 'imperial';
export type ClockFormat = 'auto' | '12' | '24';

export interface AppSettings {
  units: Units;
  clock: ClockFormat;
  /** Optional World Air Quality Index token for ground-station AQI. */
  waqiToken: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  units: 'metric',
  clock: '24',
  waqiToken: '',
};

const SETTINGS_KEY = 'weather-summary:settings';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;

    return {
      units: parsed.units === 'imperial' ? 'imperial' : 'metric',
      clock:
        parsed.clock === 'auto' || parsed.clock === '12' ? parsed.clock : '24',
      waqiToken:
        typeof parsed.waqiToken === 'string' ? parsed.waqiToken.trim() : '',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage can fail in private mode; settings still work for this session.
  }
}
