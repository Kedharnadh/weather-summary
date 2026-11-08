/*
 * Windows 11 PWA widget bridge.
 *
 * This file is imported by the generated Workbox service worker via the
 * `workbox.importScripts` option. It implements the Edge/Windows widget
 * lifecycle and keeps the Adaptive Card filled with the latest weather.
 *
 * Reference:
 * https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/widgets
 */

const WIDGET_TAG = 'weather-summary';
const WIDGET_CACHE = 'weather-summary-widget';
const BASE = new URL('./', self.location.href);

const WIDGET_URLS = {
  template: new URL('widgets/weather-widget.json', BASE).href,
  seedData: new URL('widgets/weather-data.json', BASE).href,
  liveData: new URL('widgets/live-data.json', BASE).href,
  icon: new URL('icons/icon-192.png', BASE).href,
  app: BASE.href,
};

const WEATHER_LABELS = {
  0: 'Clear',
  1: 'Partly cloudy',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Foggy',
  51: 'Drizzle',
  53: 'Drizzle',
  55: 'Drizzle',
  56: 'Drizzle',
  57: 'Drizzle',
  61: 'Rain',
  63: 'Rain',
  65: 'Rain',
  66: 'Rain',
  67: 'Rain',
  71: 'Snow',
  73: 'Snow',
  75: 'Snow',
  77: 'Snow',
  80: 'Showers',
  81: 'Showers',
  82: 'Showers',
  85: 'Snow showers',
  86: 'Snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm',
  99: 'Thunderstorm',
};

function labelFor(code) {
  return WEATHER_LABELS[code] || 'Unknown';
}

function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatHour(value) {
  const match = /T(\d{2}):(\d{2})/.exec(value || '');
  return match ? match[1] + ':' + match[2] : '';
}

function formatClock(date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function buildWidgetData(json, lat, lon, locationLabel) {
  const current = json.current || {};
  const temp = num(current.temperature_2m);
  const feels = num(current.apparent_temperature);
  const code = num(current.weather_code) || 0;
  const precipitation = num(current.precipitation) || 0;
  const condition = labelFor(code);

  const hourly = json.hourly || {};
  const times = hourly.time || [];
  const chances = hourly.precipitation_probability || [];
  const amounts = hourly.precipitation || [];

  let maxChance = null;
  let rainAt = null;
  for (let index = 0; index < times.length; index += 1) {
    const chance = num(chances[index]);
    if (chance != null && (maxChance == null || chance > maxChance)) {
      maxChance = chance;
    }
    if (rainAt == null && (num(amounts[index]) || 0) >= 0.2) {
      rainAt = times[index];
    }
  }

  const tempText = temp == null ? '—' : Math.round(temp) + '°';
  const feelsText = feels == null ? '' : 'Feels like ' + Math.round(feels) + '°';

  let summary = tempText + ', ' + condition.toLowerCase() + '.';
  let rain = '';

  if (precipitation >= 0.2) {
    summary = 'Rain now — ' + condition.toLowerCase() + ', ' + tempText + '.';
    rain = 'Rain is falling right now.';
  } else if (rainAt) {
    const time = formatHour(rainAt);
    summary =
      tempText + ', ' + condition.toLowerCase() + '; rain possible after ' + time + '.';
    rain = 'Rain possible after ' + time + '.';
  } else if (maxChance != null && maxChance >= 55) {
    summary = tempText + ', ' + condition.toLowerCase() + '; rain likely later.';
    rain = maxChance + '% chance in the next 12 hours.';
  } else if (maxChance != null) {
    rain = maxChance + '% chance in the next 12 hours.';
  }

  return {
    location: locationLabel || 'My location',
    temperature: tempText,
    condition,
    feels: feelsText,
    summary,
    rain,
    updated: 'Updated ' + formatClock(new Date()),
    iconUrl: WIDGET_URLS.icon,
    appUrl: WIDGET_URLS.app,
    lat,
    lon,
  };
}

async function fetchLive(lat, lon, locationLabel) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      'temperature_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m',
    hourly: 'precipitation_probability,precipitation,temperature_2m',
    forecast_hours: '12',
    timezone: 'auto',
    wind_speed_unit: 'kmh',
  });

  const response = await fetch(
    'https://api.open-meteo.com/v1/forecast?' + params.toString(),
  );
  if (!response.ok) {
    throw new Error('Open-Meteo returned HTTP ' + response.status);
  }

  const json = await response.json();
  return buildWidgetData(json, lat, lon, locationLabel);
}

function normalizeData(data) {
  const value = data && typeof data === 'object' ? data : {};
  return {
    location: value.location || 'London, UK',
    temperature: value.temperature || '—',
    condition: value.condition || 'Open the app to refresh',
    feels: value.feels || '',
    summary: value.summary || 'Open Weather Summary to load the latest forecast.',
    rain: value.rain || '',
    updated: value.updated || 'Not updated yet',
    iconUrl: value.iconUrl
      ? new URL(value.iconUrl, BASE).href
      : WIDGET_URLS.icon,
    appUrl: value.appUrl ? new URL(value.appUrl, BASE).href : WIDGET_URLS.app,
    lat: typeof value.lat === 'number' ? value.lat : 51.5072,
    lon: typeof value.lon === 'number' ? value.lon : -0.1276,
  };
}

async function loadTemplate() {
  try {
    const response = await fetch(WIDGET_URLS.template, { cache: 'no-cache' });
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // Fall through to the precached copy.
  }

  const cached = await caches.match(WIDGET_URLS.template);
  return cached ? await cached.text() : '';
}

async function getWidgetData() {
  try {
    const cache = await caches.open(WIDGET_CACHE);
    const cached = await cache.match(WIDGET_URLS.liveData);
    if (cached) {
      return normalizeData(await cached.json());
    }
  } catch {
    // Fall through to the seed data.
  }

  try {
    const response = await fetch(WIDGET_URLS.seedData);
    if (response.ok) {
      const seed = normalizeData(await response.json());
      // Seed the live cache so periodic background refresh has coordinates to
      // work with even before the app has been opened.
      await writeWidgetData(seed).catch(() => {});
      return seed;
    }
  } catch {
    // Fall through to the hard-coded defaults.
  }

  return normalizeData({});
}

async function writeWidgetData(data) {
  const cache = await caches.open(WIDGET_CACHE);
  await cache.put(
    WIDGET_URLS.liveData,
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

async function renderWidget(widget) {
  if (!self.widgets) return;

  const tag = (widget && widget.definition && widget.definition.tag) || WIDGET_TAG;
  const [template, data] = await Promise.all([loadTemplate(), getWidgetData()]);
  if (!template) return;

  await self.widgets.updateByTag(tag, {
    template,
    data: JSON.stringify(data),
  });
}

async function updateAllWidgets() {
  if (!self.widgets) return;

  let widgets = [];
  try {
    widgets = await self.widgets.matchAll({ tag: WIDGET_TAG });
  } catch {
    const widget = await self.widgets.getByTag(WIDGET_TAG);
    widgets = widget ? [widget] : [];
  }

  await Promise.all(widgets.map((widget) => renderWidget(widget)));
}

async function refreshFromNetwork() {
  let cached;
  try {
    const cache = await caches.open(WIDGET_CACHE);
    cached = await cache.match(WIDGET_URLS.liveData);
  } catch {
    return;
  }
  if (!cached) return;

  let data;
  try {
    data = normalizeData(await cached.json());
  } catch {
    return;
  }

  try {
    const fresh = await fetchLive(data.lat, data.lon, data.location);
    await writeWidgetData(fresh);
  } catch {
    // Keep the cached data when the network is unavailable.
  }
}

async function registerPeriodicSync() {
  if (!self.registration.periodicSync) return;

  try {
    const tags = await self.registration.periodicSync.getTags();
    if (!tags.includes(WIDGET_TAG)) {
      await self.registration.periodicSync.register(WIDGET_TAG, {
        minInterval: 1800,
      });
    }
  } catch {
    // Periodic background sync is best-effort and may be denied.
  }
}

self.addEventListener('widgetinstall', (event) => {
  event.waitUntil(
    (async () => {
      await registerPeriodicSync();
      await renderWidget(event.widget);
    })(),
  );
});

self.addEventListener('widgetresume', (event) => {
  event.waitUntil(renderWidget(event.widget));
});

self.addEventListener('widgetuninstall', (event) => {
  event.waitUntil(
    (async () => {
      if (!self.widgets) return;
      const widgets = await self.widgets.matchAll({ tag: WIDGET_TAG });
      if (widgets.length > 0) return;
      if (self.registration.periodicSync) {
        try {
          await self.registration.periodicSync.unregister(WIDGET_TAG);
        } catch {
          // Ignore: the registration may already be gone.
        }
      }
    })(),
  );
});

self.addEventListener('widgetclick', (event) => {
  if (event.action === 'open-app') {
    clients.openWindow(WIDGET_URLS.app).catch(() => {
      // Opening a window can fail if the browser blocks it; ignore.
    });
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(updateAllWidgets());
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag !== WIDGET_TAG) return;
  event.waitUntil(
    (async () => {
      await refreshFromNetwork();
      await updateAllWidgets();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'weather-widget-update') {
    event.waitUntil(updateAllWidgets());
  }
});
