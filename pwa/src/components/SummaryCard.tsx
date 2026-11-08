import type { LocationSettings, WeatherFacts } from '../types';
import { formatCoordinates } from '../weather/format';
import { CardIcon } from './CardIcon';
import { WeatherIcon, weatherIconKind } from './WeatherIcon';

interface Props {
  summary: string;
  facts: WeatherFacts;
  weatherCode: number;
  isDay: boolean | null;
  location: LocationSettings;
  timezone: string;
}

export function SummaryCard({
  summary,
  facts,
  weatherCode,
  isDay,
  location,
  timezone,
}: Props) {
  const feels = facts.feelsC != null ? Math.round(facts.feelsC) : Math.round(facts.tempC);

  return (
    <section className="summary-card" aria-label="Weather summary">
      <div className="summary-art">
        <WeatherIcon kind={weatherIconKind(weatherCode, isDay)} size={104} />
      </div>
      <div className="summary-copy">
        <p className="eyebrow">Right now</p>
        <p className="summary-location">
          <CardIcon kind="location" size={18} className="pin-icon" decorative />
          <span className="summary-location-label">{location.label}</span>
          <span className="summary-coords">
            {formatCoordinates(location.lat, location.lon)} · {timezone}
          </span>
        </p>
        <h2 className="summary-text">{summary}</h2>
        <p className="summary-meta">
          {Math.round(facts.tempC)}° · {facts.conditionLabel} · feels like {feels}°
        </p>
      </div>
    </section>
  );
}
