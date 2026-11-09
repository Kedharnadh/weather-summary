import type { LocationSettings, StoredWeather, WeatherFacts } from './types';
import { loadSettings } from './settings';
import { displayCity } from './weather/city';
import { formatUpdated } from './weather/format';
import { formatTemp } from './weather/units';

const WIDGET_CACHE = 'weather-summary-widget';
const WIDGET_DATA_PATH = 'widgets/live-data.json';

/**
 * Mirror the latest forecast into the cache read by the Windows 11 widget
 * service worker, then ask it to re-render any installed widgets.
 *
 * This is intentionally best-effort: browsers without the widget API, or
 * private-mode cache failures, must never break the main app.
 */
export async function publishWidgetData(
  stored: StoredWeather,
  location: LocationSettings,
): Promise<void> {
  if (typeof caches === 'undefined') return;

  const dataUrl = new URL(WIDGET_DATA_PATH, document.baseURI).href;
  const iconUrl = new URL('icons/icon-192.png', document.baseURI).href;
  const appUrl = new URL('./', document.baseURI).href;
  const facts = stored.facts;
  const settings = loadSettings();

  const payload = {
    location: displayCity(location),
    temperature: formatTemp(facts.tempC, settings.units),
    condition: facts.conditionLabel,
    feels:
      facts.feelsC != null
        ? `Feels like ${formatTemp(facts.feelsC, settings.units)}`
        : '',
    summary: stored.summary,
    rain: rainLine(facts),
    updated: `Updated ${formatUpdated(stored.savedAt, settings.clock)}`,
    iconUrl,
    appUrl,
    lat: location.lat,
    lon: location.lon,
  };

  try {
    const cache = await caches.open(WIDGET_CACHE);
    await cache.put(
      dataUrl,
      new Response(JSON.stringify(payload), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  } catch {
    return;
  }

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    registration?.active?.postMessage({ type: 'weather-widget-update' });
  } catch {
    // No service worker yet; the widget will pick the data up on install.
  }
}

function rainLine(facts: WeatherFacts): string {
  if (facts.isRainingNow) {
    return facts.rainStopInMin != null
      ? `Rain stops in ~${minutesText(facts.rainStopInMin)}.`
      : 'Raining now.';
  }
  if (facts.rainStartInMin != null && facts.rainStartInMin <= 120) {
    return `Rain starts in ~${minutesText(facts.rainStartInMin)}.`;
  }
  if (facts.maxChanceRain24h) {
    return `${facts.maxChanceRain24h.percent}% chance around ${facts.maxChanceRain24h.at}.`;
  }
  return 'Dry for now.';
}

function minutesText(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
