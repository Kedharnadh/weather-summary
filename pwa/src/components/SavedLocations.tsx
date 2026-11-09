import { useState } from 'react';
import type { LocationSettings } from '../types';
import { useSettings } from '../SettingsContext';
import { isSameLocation, locationKey } from '../storage';
import { displayCity } from '../weather/city';
import type { LocationGlance } from '../weather/openMeteo';
import { formatTemp } from '../weather/units';
import { conditionLabel } from '../weather/weatherCodes';
import { IconButton } from './IconButton';
import { UiIcon } from './UiIcon';
import { WeatherIcon, weatherIconKind } from './WeatherIcon';

interface Props {
  saved: LocationSettings[];
  active: LocationSettings | null;
  glances: Record<string, LocationGlance>;
  onSelect: (location: LocationSettings) => void;
  onRemove: (location: LocationSettings) => void;
  onReorder?: (index: number, direction: -1 | 1) => void;
  onRename?: (location: LocationSettings, label: string) => void;
  onClear?: () => void;
}

/**
 * Horizontally scrolling chips for every stored place. Each chip shows the
 * live temperature and condition so several locations can be compared at a
 * glance; tapping one makes it the active forecast. "Manage" exposes reorder,
 * rename, and remove controls.
 */
export function SavedLocations({
  saved,
  active,
  glances,
  onSelect,
  onRemove,
  onReorder,
  onRename,
  onClear,
}: Props) {
  const { units } = useSettings();
  const [managing, setManaging] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const activeKey = active ? locationKey(active.lat, active.lon) : null;
  const activeIsSaved = active
    ? saved.some((location) => isSameLocation(location, active))
    : true;
  const chips = active && !activeIsSaved ? [active, ...saved] : saved;

  if (chips.length === 0) return null;

  const canManage = saved.length > 0 && Boolean(onReorder || onRename || onClear);

  const commitRename = (location: LocationSettings) => {
    const key = locationKey(location.lat, location.lon);
    const value = (drafts[key] ?? location.label).trim();
    setDrafts((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
    if (!value || value === location.label) return;
    onRename?.(location, value);
  };

  return (
    <section className="saved-locations" aria-label="Saved locations">
      {canManage && (
        <div className="saved-heading">
          <span className="saved-heading-label">Places</span>
          <button
            type="button"
            className="ghost small"
            onClick={() => setManaging((value) => !value)}
            aria-expanded={managing}
          >
            {managing ? 'Done' : 'Manage'}
          </button>
        </div>
      )}

      {managing ? (
        <div className="saved-manage">
          <ul className="saved-manage-list">
            {saved.map((location, index) => {
              const key = locationKey(location.lat, location.lon);
              return (
                <li className="saved-manage-row" key={key}>
                  <span className="saved-manage-index">{index + 1}</span>
                  <input
                    className="saved-rename"
                    value={drafts[key] ?? location.label}
                    onChange={(event) =>
                      setDrafts((previous) => ({ ...previous, [key]: event.target.value }))
                    }
                    onBlur={() => commitRename(location)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.currentTarget.blur();
                      } else if (event.key === 'Escape') {
                        setDrafts((previous) => {
                          const next = { ...previous };
                          delete next[key];
                          return next;
                        });
                        event.currentTarget.blur();
                      }
                    }}
                    aria-label={`Rename ${location.label}`}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <div className="saved-manage-actions">
                    <IconButton
                      label={`Move ${displayCity(location)} up`}
                      icon={<UiIcon name="up" />}
                      disabled={index === 0 || !onReorder}
                      onClick={() => onReorder?.(index, -1)}
                    />
                    <IconButton
                      label={`Move ${displayCity(location)} down`}
                      icon={<UiIcon name="down" />}
                      disabled={index === saved.length - 1 || !onReorder}
                      onClick={() => onReorder?.(index, 1)}
                    />
                    <IconButton
                      label={`Remove ${location.label}`}
                      icon={<UiIcon name="trash" />}
                      onClick={() => onRemove(location)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          {onClear && (
            <button type="button" className="ghost small saved-clear" onClick={onClear}>
              Clear all saved places
            </button>
          )}
        </div>
      ) : (
        <ul className="saved-list">
          {chips.map((location) => {
            const key = locationKey(location.lat, location.lon);
            const glance = glances[key];
            const isActive = key === activeKey;
            const isSaved = saved.some((item) => isSameLocation(item, location));
            const kind = weatherIconKind(glance?.weatherCode, glance?.isDay ?? null);
            const condition = conditionLabel(glance?.weatherCode);
            const city = displayCity(location);

            return (
              <li key={key} className={`saved-chip${isActive ? ' is-active' : ''}`}>
                <button
                  type="button"
                  className="saved-select"
                  onClick={() => onSelect(location)}
                  aria-pressed={isActive}
                  aria-label={`Show weather for ${location.label}`}
                  title={glance ? `${location.label} · ${condition}` : location.label}
                >
                  <WeatherIcon kind={kind} size={30} />
                  <span className="saved-copy">
                    <span className="saved-label">{city}</span>
                    <span className="saved-temp">
                      {glance?.temperatureC != null
                        ? `${formatTemp(glance.temperatureC, units)} · ${condition}`
                        : 'Tap to view'}
                    </span>
                  </span>
                </button>
                {isSaved && (
                  <button
                    type="button"
                    className="saved-remove"
                    onClick={() => onRemove(location)}
                    aria-label={`Remove ${location.label}`}
                    title={`Remove ${location.label}`}
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
