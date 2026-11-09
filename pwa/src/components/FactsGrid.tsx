import type { WeatherFacts } from '../types';
import { useSettings } from '../SettingsContext';
import { formatPrecip, formatTemp, formatWind } from '../weather/units';
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
  const { units } = useSettings();
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
      hint: `${formatPrecip(facts.precipNextHourMm, units)} next hour`,
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
      value: facts.peakTemp24h ? formatTemp(facts.peakTemp24h.tempC, units) : '—',
      hint: facts.peakTemp24h ? `around ${facts.peakTemp24h.at}` : 'next 24 hours',
      icon: 'temperature',
      warm: facts.peakTemp24h != null && facts.peakTemp24h.tempC >= 22,
    },
    {
      label: 'Wind',
      value: facts.windKmh != null ? formatWind(facts.windKmh, units) : '—',
      hint:
        facts.windGustKmh != null
          ? `gusts ${formatWind(facts.windGustKmh, units)}`
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
      value: facts.feelsC != null ? formatTemp(facts.feelsC, units) : '—',
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
