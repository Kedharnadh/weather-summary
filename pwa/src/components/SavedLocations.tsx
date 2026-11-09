import type { LocationSettings } from '../types';
import { isSameLocation, locationKey } from '../storage';
import type { LocationGlance } from '../weather/openMeteo';
import { conditionLabel } from '../weather/weatherCodes';
import { WeatherIcon, weatherIconKind } from './WeatherIcon';

interface Props {
  saved: LocationSettings[];
  active: LocationSettings | null;
  glances: Record<string, LocationGlance>;
  onSelect: (location: LocationSettings) => void;
  onRemove: (location: LocationSettings) => void;
}

/**
 * Horizontally scrolling chips for every stored place. Each chip shows the
 * live temperature and condition so several locations can be compared at a
 * glance; tapping one makes it the active forecast.
 */
export function SavedLocations({ saved, active, glances, onSelect, onRemove }: Props) {
  const activeKey = active ? locationKey(active.lat, active.lon) : null;
  const activeIsSaved = active ? saved.some((location) => isSameLocation(location, active)) : true;
  const chips = active && !activeIsSaved ? [active, ...saved] : saved;

  if (chips.length === 0) return null;

  return (
    <section className="saved-locations" aria-label="Saved locations">
      <ul className="saved-list">
        {chips.map((location) => {
          const key = locationKey(location.lat, location.lon);
          const glance = glances[key];
          const isActive = key === activeKey;
          const isSaved = saved.some((item) => isSameLocation(item, location));
          const kind = weatherIconKind(glance?.weatherCode, glance?.isDay ?? null);
          const condition = conditionLabel(glance?.weatherCode);

          return (
            <li key={key} className={`saved-chip${isActive ? ' is-active' : ''}`}>
              <button
                type="button"
                className="saved-select"
                onClick={() => onSelect(location)}
                aria-pressed={isActive}
                title={glance ? `${location.label} · ${condition}` : location.label}
              >
                <WeatherIcon kind={kind} size={30} />
                <span className="saved-copy">
                  <span className="saved-label">{location.label}</span>
                  <span className="saved-temp">
                    {glance?.temperatureC != null
                      ? `${Math.round(glance.temperatureC)}° · ${condition}`
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
    </section>
  );
}
