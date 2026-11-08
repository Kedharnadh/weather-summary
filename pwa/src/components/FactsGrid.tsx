import type { WeatherFacts } from '../types';
import { CardIcon, type CardIconKind } from './CardIcon';

function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

interface Tile {
  label: string;
  value: string;
  hint: string;
  icon: CardIconKind;
  warm?: boolean;
}

export function FactsGrid({ facts }: { facts: WeatherFacts }) {
  const rainNow = facts.isRainingNow
    ? facts.rainStopInMin != null
      ? `Stops in ~${minutesLabel(facts.rainStopInMin)}`
      : 'Raining now'
    : facts.rainStartInMin != null && facts.rainStartInMin <= 120
      ? `Starts in ~${minutesLabel(facts.rainStartInMin)}`
      : 'Dry for now';

  const feels = facts.feelsC ?? facts.tempC;

  const tiles: Tile[] = [
    {
      label: 'Rain now',
      value: rainNow,
      hint: `${facts.precipNextHourMm.toFixed(1)} mm next hour`,
      icon: 'rain',
    },
    {
      label: 'Rain chance',
      value: facts.maxChanceRain24h ? `${facts.maxChanceRain24h.percent}%` : '—',
      hint: facts.maxChanceRain24h ? `around ${facts.maxChanceRain24h.at}` : 'next 24 hours',
      icon: 'umbrella',
    },
    {
      label: 'Peak temp',
      value: facts.peakTemp24h ? `${Math.round(facts.peakTemp24h.tempC)}°` : '—',
      hint: facts.peakTemp24h ? `around ${facts.peakTemp24h.at}` : 'next 24 hours',
      icon: 'temperature',
      warm: facts.peakTemp24h != null && facts.peakTemp24h.tempC >= 22,
    },
    {
      label: 'Wind',
      value: facts.windKmh != null ? `${Math.round(facts.windKmh)} km/h` : '—',
      hint:
        facts.windGustKmh != null
          ? `gusts ${Math.round(facts.windGustKmh)} km/h`
          : '10 m wind',
      icon: 'wind',
    },
    {
      label: 'Humidity',
      value: facts.humidityPct != null ? `${Math.round(facts.humidityPct)}%` : '—',
      hint: 'relative humidity',
      icon: 'humidity',
    },
    {
      label: 'Feels like',
      value: facts.feelsC != null ? `${Math.round(facts.feelsC)}°` : '—',
      hint: 'apparent temperature',
      icon: 'feels',
      warm: feels >= 22,
    },
  ];

  return (
    <section className="facts-grid" aria-label="Weather facts">
      {tiles.map((tile) => (
        <article className="fact-tile" key={tile.label}>
          <div className="fact-head">
            <CardIcon kind={tile.icon} size={24} warm={tile.warm} decorative />
            <span className="fact-label">{tile.label}</span>
          </div>
          <strong className="fact-value">{tile.value}</strong>
          <span className="fact-hint">{tile.hint}</span>
        </article>
      ))}
    </section>
  );
}
