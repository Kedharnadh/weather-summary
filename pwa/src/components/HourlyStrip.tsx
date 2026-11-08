import type { HourSlice } from '../types';
import { formatHour } from '../weather/format';
import { CardIcon } from './CardIcon';
import { WeatherIcon, weatherIconKind } from './WeatherIcon';

export function HourlyStrip({ hours }: { hours: HourSlice[] }) {
  const visible = hours.slice(0, 12);

  return (
    <section className="card hourly-card" aria-label="Next twelve hours">
      <div className="card-heading">
        <div className="card-title">
          <CardIcon kind="clock" size={26} decorative />
          <h2>Next 12 hours</h2>
        </div>
      </div>
      <div className="hourly-strip">
        {visible.map((hour, index) => (
          <article className="hour-tile" key={`${hour.time}-${index}`}>
            <span className="hour-time">{index === 0 ? 'Now' : formatHour(hour.time)}</span>
            <WeatherIcon
              kind={weatherIconKind(hour.weatherCode, hour.isDay)}
              size={42}
            />
            <span className="hour-temp">
              {hour.temperatureC != null ? `${Math.round(hour.temperatureC)}°` : '—'}
            </span>
            <span className="hour-rain">
              {hour.precipProbabilityPct != null ? `${hour.precipProbabilityPct}%` : '—'}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
