import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { locationKey } from '../storage';
import type {
  AirQuality,
  HourSlice,
  LocationSettings,
  RainSeries,
  SunTimes,
  WeatherFacts,
} from '../types';
import { AirQualityCard } from './AirQualityCard';
import { CardIcon, type CardIconKind } from './CardIcon';
import { FactsGrid } from './FactsGrid';
import { HourlyStrip } from './HourlyStrip';
import { RainTimeline } from './RainTimeline';
import { SavedLocations } from './SavedLocations';
import { SummaryCard } from './SummaryCard';
import { SunCard } from './SunCard';
import { WeatherIcon, weatherIconKind, type WeatherIconKind } from './WeatherIcon';

const WEATHER_KINDS: WeatherIconKind[] = [
  'clear-day',
  'clear-night',
  'partly-cloudy-day',
  'partly-cloudy-night',
  'cloudy',
  'fog',
  'drizzle',
  'rain',
  'showers',
  'snow',
  'snow-showers',
  'thunderstorm',
  'unknown',
];

const CARD_KINDS: CardIconKind[] = [
  'rain',
  'umbrella',
  'temperature',
  'feels',
  'wind',
  'humidity',
  'sunrise',
  'sunset',
  'air',
  'clock',
  'location',
];

const facts: WeatherFacts = {
  tempC: 12,
  feelsC: 10,
  conditionLabel: 'Rain',
  isRainingNow: true,
  rainStartInMin: null,
  rainStopInMin: 30,
  precipNextHourMm: 1.2,
  maxChanceRain24h: { percent: 80, at: '15:00' },
  peakTemp24h: { tempC: 14, at: '14:00' },
  windKmh: 18,
  windGustKmh: 32,
  humidityPct: 82,
};

const rain: RainSeries = {
  stepMinutes: 15,
  values: [0.4, 0.6, 0.2, 0, 0, 0, 0, 0],
  startTime: '2026-11-09T14:00',
};

const sun: SunTimes = {
  sunrise: '2026-11-09T07:12',
  sunset: '2026-11-09T16:31',
  tomorrowSunrise: '2026-11-10T07:13',
  tomorrowSunset: '2026-11-10T16:30',
};

const air: AirQuality = {
  time: '2026-11-09T20:00',
  europeanAqi: 68,
  usAqi: 93,
  pm25: 26.4,
  pm10: 33.1,
  ozone: 0,
  no2: 75.8,
  so2: 7.3,
  co: 430,
};

const hours: HourSlice[] = Array.from({ length: 12 }, (_, index) => ({
  time: `2026-11-09T${String(14 + index).padStart(2, '0')}:00`,
  temperatureC: 12 + index * 0.2,
  precipProbabilityPct: 20 + index,
  precipMm: index < 2 ? 0.4 : 0,
  weatherCode: 61,
  isDay: true,
}));

describe('weather icons', () => {
  it('renders every weather kind as polygons', () => {
    for (const kind of WEATHER_KINDS) {
      const markup = renderToStaticMarkup(<WeatherIcon kind={kind} size={64} />);
      expect(markup).toContain('<svg');
      expect(markup).toContain('<polygon');
      expect(markup).not.toContain('NaN');
    }
  });

  it('maps weather codes to kinds', () => {
    expect(weatherIconKind(0, true)).toBe('clear-day');
    expect(weatherIconKind(0, false)).toBe('clear-night');
    expect(weatherIconKind(61, true)).toBe('rain');
    expect(weatherIconKind(95, false)).toBe('thunderstorm');
    expect(weatherIconKind(null, true)).toBe('unknown');
  });
});

describe('card icons', () => {
  it('renders every card kind', () => {
    for (const kind of CARD_KINDS) {
      const markup = renderToStaticMarkup(<CardIcon kind={kind} size={28} />);
      expect(markup).toContain('<polygon');
      expect(markup).not.toContain('NaN');
    }
  });

  it('colours the air icon by tone', () => {
    const good = renderToStaticMarkup(<CardIcon kind="air" tone="good" />);
    const poor = renderToStaticMarkup(<CardIcon kind="air" tone="very-poor" />);
    expect(good).not.toBe(poor);
  });
});

describe('cards', () => {
  it('renders the rain timeline', () => {
    const markup = renderToStaticMarkup(<RainTimeline rain={rain} />);
    expect(markup).toContain('Next 2 hours');
    expect(markup).toContain('rain-bar active');
  });

  it('renders the sun card', () => {
    const markup = renderToStaticMarkup(<SunCard sun={sun} timezone="Europe/London" />);
    expect(markup).toContain('Sunrise');
    expect(markup).toContain('07:12');
    expect(markup).toContain('9 h 19 min of daylight today');
  });

  it('renders the air quality card', () => {
    const markup = renderToStaticMarkup(<AirQualityCard air={air} />);
    expect(markup).toContain('Air quality');
    expect(markup).toContain('European AQI');
    expect(markup).toContain('68');
    expect(markup).toContain('PM2.5');
  });

  it('renders the facts grid and hourly strip', () => {
    const factsMarkup = renderToStaticMarkup(<FactsGrid facts={facts} />);
    expect(factsMarkup).toContain('Rain now');
    expect(factsMarkup).toContain('Stops in ~30 min');

    const hourlyMarkup = renderToStaticMarkup(<HourlyStrip hours={hours} />);
    expect(hourlyMarkup).toContain('Next 12 hours');
    expect(hourlyMarkup).toContain('Now');
  });

  it('renders saved locations with live temperatures and remove actions', () => {
    const saved: LocationSettings[] = [
      { lat: 51.5072, lon: -0.1276, label: 'London, UK' },
      { lat: 13.6288, lon: 79.4192, label: 'Tirupati, India' },
    ];
    const markup = renderToStaticMarkup(
      <SavedLocations
        saved={saved}
        active={saved[0]}
        glances={{
          [locationKey(51.5072, -0.1276)]: {
            temperatureC: 11.4,
            weatherCode: 61,
            isDay: true,
          },
        }}
        onSelect={() => {}}
        onRemove={() => {}}
      />,
    );

    expect(markup).toContain('London, UK');
    expect(markup).toContain('11° · Rain');
    expect(markup).toContain('Tirupati, India');
    expect(markup).toContain('Tap to view');
    expect(markup).toContain('Remove London, UK');
    expect(markup).toContain('aria-pressed="true"');
  });

  it('shows an unsaved active place without a remove button', () => {
    const saved: LocationSettings[] = [{ lat: 1, lon: 2, label: 'Saved place' }];
    const active: LocationSettings = { lat: 3, lon: 4, label: 'Current place' };
    const markup = renderToStaticMarkup(
      <SavedLocations
        saved={saved}
        active={active}
        glances={{}}
        onSelect={() => {}}
        onRemove={() => {}}
      />,
    );

    expect(markup).toContain('Current place');
    expect(markup).not.toContain('Remove Current place');
  });

  it('renders the summary card with location details', () => {
    const markup = renderToStaticMarkup(
      <SummaryCard
        summary="Rain easing, should stop in ~30 min."
        facts={facts}
        weatherCode={61}
        isDay={true}
        location={{ lat: 51.5072, lon: -0.1276, label: 'London, UK' }}
        timezone="Europe/London"
      />,
    );

    expect(markup).toContain('London, UK');
    expect(markup).toContain('51.51°N, 0.13°W');
    expect(markup).toContain('Europe/London');
  });
});
