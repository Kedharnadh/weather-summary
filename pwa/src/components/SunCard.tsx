import type { SunTimes } from '../types';
import { formatHour } from '../weather/format';
import { daylightMinutes, formatDuration, nextSunEvent } from '../weather/sun';
import { CardIcon } from './CardIcon';

export function SunCard({
  sun,
  timezone,
}: {
  sun: SunTimes | null | undefined;
  timezone?: string;
}) {
  const next = nextSunEvent(sun, new Date(), timezone);
  const daylight = daylightMinutes(sun);

  return (
    <section className="card sun-card" aria-label="Sunrise and sunset">
      <div className="card-heading">
        <div className="card-title">
          <CardIcon kind="sunrise" size={26} decorative />
          <h2>Sun</h2>
        </div>
        {next && (
          <span className="pill sun">
            {next.kind === 'sunrise' ? 'Sunrise' : 'Sunset'} {formatHour(next.time)}
          </span>
        )}
      </div>

      <div className="sun-grid">
        <div className="sun-event">
          <CardIcon kind="sunrise" size={38} />
          <span className="sun-label">Sunrise</span>
          <strong>{sun?.sunrise ? formatHour(sun.sunrise) : '—'}</strong>
        </div>
        <div className="sun-event">
          <CardIcon kind="sunset" size={38} />
          <span className="sun-label">Sunset</span>
          <strong>{sun?.sunset ? formatHour(sun.sunset) : '—'}</strong>
        </div>
      </div>

      <p className="sun-caption">
        {daylight != null
          ? `${formatDuration(daylight)} of daylight today`
          : 'Daylight length unavailable.'}
      </p>
    </section>
  );
}
