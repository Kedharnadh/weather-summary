import type { RainSeries } from '../types';
import { CardIcon } from './CardIcon';

const BAR_COUNT = 8;

export function RainTimeline({ rain }: { rain: RainSeries }) {
  const values = rain.values.slice(0, BAR_COUNT);
  const max = Math.max(0.2, ...values);
  const hasRain = values.some((value) => value >= 0.2);

  return (
    <section className="card rain-card" aria-label="Rain in the next two hours">
      <div className="card-heading">
        <div className="card-title">
          <CardIcon kind="rain" size={26} decorative />
          <h2>Next 2 hours</h2>
        </div>
        <span className={hasRain ? 'pill rain' : 'pill'}>
          {hasRain ? 'Rain possible' : 'Looking dry'}
        </span>
      </div>

      {values.length === 0 ? (
        <p className="muted">No rain data available.</p>
      ) : (
        <div className="rain-bars">
          {values.map((value, index) => {
            const height = Math.max(4, Math.round((value / max) * 100));
            return (
              <div className="rain-bar-slot" key={`${rain.startTime}-${index}`}>
                <div
                  className={value >= 0.2 ? 'rain-bar active' : 'rain-bar'}
                  style={{ height: `${height}%` }}
                />
                <span>{index === 0 ? 'now' : `+${index * rain.stepMinutes}m`}</span>
              </div>
            );
          })}
        </div>
      )}

      <p className="rain-caption">
        {rain.stepMinutes === 15 ? '15-minute nowcast' : 'Hourly forecast'} ·{' '}
        {rain.values.length} slots available
      </p>
    </section>
  );
}
