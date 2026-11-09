import { useState } from 'react';
import { useSettingsActions } from '../SettingsContext';
import type { ClockFormat, Units } from '../settings';
import { IconButton } from './IconButton';
import { UiIcon } from './UiIcon';

const UNIT_OPTIONS: Array<{ value: Units; label: string; hint: string }> = [
  { value: 'metric', label: 'Metric', hint: '°C · km/h · mm' },
  { value: 'imperial', label: 'Imperial', hint: '°F · mph · in' },
];

const CLOCK_OPTIONS: Array<{ value: ClockFormat; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: '12', label: '12-hour' },
  { value: '24', label: '24-hour' },
];

/**
 * Preferences panel. Units and clock apply immediately; the optional WAQI
 * token is committed on blur or Enter so typing does not fire a request per
 * keystroke.
 */
export function SettingsBar({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useSettingsActions();
  const [token, setToken] = useState(settings.waqiToken);
  const [tokenSaved, setTokenSaved] = useState(false);

  const commitToken = () => {
    const next = token.trim();
    if (next === settings.waqiToken) return;
    updateSettings({ waqiToken: next });
    setTokenSaved(true);
    window.setTimeout(() => setTokenSaved(false), 1800);
  };

  return (
    <section className="settings-panel card" aria-label="Settings">
      <div className="card-heading">
        <div className="card-title">
          <UiIcon name="settings" size={22} />
          <h2>Settings</h2>
        </div>
        <IconButton label="Close settings" icon={<UiIcon name="close" />} onClick={onClose} />
      </div>

      <div className="setting-row">
        <div className="setting-label">
          <strong>Units</strong>
          <span>Temperature, wind, and rain</span>
        </div>
        <div className="segmented" role="group" aria-label="Units">
          {UNIT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={settings.units === option.value ? 'is-selected' : undefined}
              aria-pressed={settings.units === option.value}
              onClick={() => updateSettings({ units: option.value })}
            >
              <span>{option.label}</span>
              <small>{option.hint}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-label">
          <strong>Clock</strong>
          <span>How times are shown</span>
        </div>
        <div className="segmented three" role="group" aria-label="Clock format">
          {CLOCK_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={settings.clock === option.value ? 'is-selected' : undefined}
              aria-pressed={settings.clock === option.value}
              onClick={() => updateSettings({ clock: option.value })}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="setting-row stacked">
        <div className="setting-label">
          <strong>Ground-station air quality</strong>
          <span>
            Optional. With a free{' '}
            <a href="https://aqicn.org/data-platform/token/" target="_blank" rel="noreferrer">
              World Air Quality Index token
            </a>
            , the AQI card prefers a nearby physical monitor over the CAMS model.
          </span>
        </div>
        <div className="token-row">
          <input
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
              setTokenSaved(false);
            }}
            onBlur={commitToken}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              } else if (event.key === 'Escape') {
                setToken(settings.waqiToken);
                event.currentTarget.blur();
              }
            }}
            placeholder="Paste your WAQI token"
            aria-label="WAQI token"
            autoComplete="off"
            spellCheck={false}
          />
          {token && (
            <button
              type="button"
              className="ghost small"
              onClick={() => {
                setToken('');
                updateSettings({ waqiToken: '' });
                setTokenSaved(false);
              }}
            >
              Clear
            </button>
          )}
          {tokenSaved && (
            <span className="pill saved-pill">
              <UiIcon name="check" size={13} /> Saved
            </span>
          )}
        </div>
        <p className="setting-note">
          Settings and saved places stay on this device. The token is only sent to
          api.waqi.info.
        </p>
      </div>
    </section>
  );
}
