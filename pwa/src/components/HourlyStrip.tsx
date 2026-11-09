import type { CurrentWeather, HourSlice } from '../types';
import { useSettings } from '../SettingsContext';
import { formatHour } from '../weather/format';
import { formatTemp } from '../weather/units';
import { CardIcon } from './CardIcon';
import { WeatherIcon, weatherIconKind } from './WeatherIcon';

interface Props {
  hours: HourSlice[];
  /** The location's current local time, used to start at the current hour. */
  startTime?: string | null;
  /** Current conditions, used to make the "Now" tile exact. */
  current?: CurrentWeather | null;
}

/**
 * Find the index of the hourly slot that contains `startTime`. Both values are
 * Open-Meteo local-time ISO strings, so a lexical comparison is timezone-safe
 * even when the user is viewing a place in another timezone.
 */
function currentHourIndex(hours: HourSlice[], startTime?: string | null): number {
  if (!startTime) return 0;
  let index = 0;
  for (let position = 0; position < hours.length; position += 1) {
    if (hours[position].time <= startTime) index = position;
    else break;
  }
  return index;
}

export function HourlyStrip({ hours, startTime, current }: Props) {
  const { units, clock } = useSettings();
  const start = currentHourIndex(hours, startTime);
  const visible = hours.slice(start, start + 12);

  return (
    <section className="card hourly-card" aria-label="Next twelve hours">
      <div className="card-heading">
        <div className="card-title">
          <CardIcon kind="clock" size={26} decorative />
          <h2>Next 12 hours</h2>
        </div>
      </div>
      <div className="hourly-strip">
        {visible.map((hour, index) => {
          const isNow = index === 0;
          const temperature = isNow && current ? current.temperatureC : hour.temperatureC;
          const weatherCode = isNow && current ? current.weatherCode : hour.weatherCode;
          const isDay = isNow && current ? current.isDay : hour.isDay;

          return (
            <article className="hour-tile" key={`${hour.time}-${index}`}>
              <span className="hour-time">{isNow ? 'Now' : formatHour(hour.time, clock)}</span>
              <WeatherIcon kind={weatherIconKind(weatherCode, isDay)} size={42} />
              <span className="hour-temp">
                {temperature != null ? formatTemp(temperature, units) : '—'}
              </span>
              <span className="hour-rain">
                {hour.precipProbabilityPct != null ? `${hour.precipProbabilityPct}%` : '—'}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
