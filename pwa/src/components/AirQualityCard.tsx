import type { AirQuality } from '../types';
import { airReading } from '../weather/airQuality';
import { CardIcon } from './CardIcon';

function pollutant(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} µg/m³`;
}

export function AirQualityCard({ air }: { air: AirQuality | null | undefined }) {
  const reading = airReading(air);

  const pollutants = (
    [
      ['PM2.5', pollutant(air?.pm25)],
      ['PM10', pollutant(air?.pm10)],
      ['O₃', pollutant(air?.ozone)],
      ['NO₂', pollutant(air?.no2)],
      ['SO₂', pollutant(air?.so2)],
      ['CO', pollutant(air?.co)],
    ] as Array<[string, string | null]>
  ).filter((entry): entry is [string, string] => entry[1] != null);

  return (
    <section className="card air-card" aria-label="Air quality">
      <div className="card-heading">
        <div className="card-title">
          <CardIcon kind="air" tone={reading.tone} size={26} decorative />
          <h2>Air quality</h2>
        </div>
        <span className={`pill aqi ${reading.tone}`}>{reading.label}</span>
      </div>

      {reading.value != null ? (
        <>
          <p className="air-value">
            <strong>{Math.round(reading.value)}</strong>
            <span>{reading.scale}</span>
          </p>
          <p className="air-advice">{reading.advice}</p>
          {pollutants.length > 0 && (
            <div className="air-pollutants">
              {pollutants.map(([name, value]) => (
                <span key={name}>
                  {name} {value}
                </span>
              ))}
            </div>
          )}
          {(reading.alternates.length > 0 || reading.estimated) && (
            <p className="air-note">
              {reading.alternates
                .map((alternate) =>
                  `${alternate.scale === 'European AQI' ? 'EU' : 'US'} AQI ${Math.round(
                    alternate.value,
                  )}`,
                )
                .join(' · ')}
              {reading.alternates.length > 0 && reading.estimated ? ' · ' : ''}
              {reading.estimated ? 'nowcast from current pollutants; local monitors may differ' : ''}
            </p>
          )}
        </>
      ) : (
        <p className="muted">{reading.advice}</p>
      )}
    </section>
  );
}
