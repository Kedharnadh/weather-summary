# Weather Summary PWA

An installable, offline-friendly version of Weather Summary built with
**Vite + React + TypeScript**. This first version is a deliberately small demo:

- **Open-Meteo** for weather (no API key)
- deterministic **template sentence** (no LLM yet)
- **low-poly 3D weather icons** drawn as inline SVG — faceted, depth-sorted meshes
- **sunrise and sunset** times with daylight length and a "next event" hint
- **air quality** (live US AQI nowcast + European reference + key pollutants) with per-category advice
- location details (label, coordinates, timezone) shown with the current weather
- **starts with your device location** on first open (London is the fallback)
- **saved locations** with live temperatures, so you can store several places and
  switch between them in one tap; a **Manage** mode reorders, renames, and
  removes them
- **location search by place name or pincode**, with reverse-geocoded labels
- **compact icon header** for Location, Install, Settings, and Refresh
- **settings** for metric/imperial units, 12/24-hour clock, and an optional
  ground-station AQI token
- **offline, retry, update, and stale-forecast states** so the app is honest
  about the data it is showing
- a **Windows 11 widget** for the installed PWA (Edge + Widgets Board)
- cached forecast per location in `localStorage`, so the app still shows data offline
- installable via the browser's **Add to Home Screen / Install** prompt

The Android app and Home Assistant integration are untouched and still live in
`../android` and `../custom_components`.

## Quick start

```bash
cd pwa
npm install
npm run dev
```

Open the printed local URL. The header uses compact icon buttons:
**Location**, **Install** (when available), **Settings**, and **Refresh**. Use
**Location** to:

- **search by place name or pincode** (for example `Tirupati`, `STV Nagar`, or
  `517501`),
- **use my location** (the label is reverse-geocoded to a place name), or
- enter coordinates manually.

On the **first open** the app asks for device location and starts there. If
permission is denied, unavailable, or times out, it falls back to London and
shows a dismissible notice.

## Saved locations

Every place you open (device location, search result, or manual coordinates) is
added to a **saved-locations strip** under the header. Each chip shows the city
name, live temperature, and condition for that place, fetched in a single
batched Open-Meteo request, so you can compare several locations at a glance.
Tap a chip to switch the full forecast; tap **×** to remove it. The active place
and its forecast are cached per location, so switching works offline too.

Open **Manage** on the strip to reorder places, rename them, remove individual
entries, or clear the whole list. The full place label is still used in the
summary card and in the chip's hover/accessibility text; only the visible chip
text is shortened to the city.

## Settings

The **Settings** icon opens a panel stored on the device:

- **Units** — metric (°C, km/h, mm) or imperial (°F, mph, in).
- **Clock** — follow the device locale, or force 12-hour or 24-hour times.
- **Ground-station air quality** — paste a free
  [World Air Quality Index](https://aqicn.org/data-platform/token/) token to
  prefer a nearby physical monitor for the headline US AQI. The CAMS model still
  supplies the pollutant breakdown, and the token is only sent to
  `api.waqi.info`.

The panel also notes that settings and saved places stay in local storage.

## Data sources

| Data | Service | Notes |
| --- | --- | --- |
| Current + hourly + 15-minute rain | [Open-Meteo Forecast](https://open-meteo.com/en/docs) | Keyless, CORS-enabled. Requests `daily=sunrise,sunset` and 3 forecast days. |
| Air quality | [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) | Keyless. European + US AQI plus PM2.5, PM10, O₃, NO₂, SO₂, CO. Best-effort: a failure resolves to `null` and never blocks the forecast. |
| Ground-station AQI (optional) | [World Air Quality Index](https://aqicn.org/data-platform/token/) | Requires a free token in Settings. A nearby monitor is preferred for the headline US AQI; CAMS remains the fallback. |

Air quality is requested in parallel with the forecast. The card shows a **US
AQI nowcast** computed from the current pollutant concentrations (the same
scale live services such as aqi.in display), with the European AQI as a
secondary reference. Open-Meteo's own `us_aqi` uses 24-hour averages, so it is
only a fallback. Labels run from Good → Hazardous with short health advice.
Because the values are model-based (CAMS), they can read slightly lower than a
nearby ground monitor; the card says so. When a WAQI token is configured, the
card prefers the nearby ground monitor and names the station instead.

## Location search

| Query type | Service |
| --- | --- |
| Place name | [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) |
| Pincode, neighbourhood, or a name Open-Meteo does not know | [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap) |
| Reverse geocoding for "Use my location" | [BigDataCloud](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api) |

All three are public, keyless, and CORS-enabled. Search results are cached for
the session, and pincode results are reverse-geocoded so the card shows
`Tirupati, Andhra Pradesh, India` rather than just the postcode. Placeholder
labels such as `My location` or `13.62, 79.43` are upgraded to a real place name
on the next launch. Search itself needs a network connection; the last saved
forecast still works offline.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check + production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the Vitest unit tests |
| `npm run icons` | Regenerate the low-poly PNG app icons from the SVG source |
| `npm run icons:preview` | Render every weather + card icon to `scripts/preview/icons-3d.png` |
| `npm run icons:ascii` | Print ASCII silhouettes (optionally filter by kind, e.g. `npm run icons:ascii -- rain`) |
| `npm run icons:analyze` | Report per-icon bounding boxes, facet counts, and degenerate faces |

The last three are dev-only helpers for eyeballing the geometry without opening
the app. They need no browser and write only to `scripts/preview/`.

## Low-poly 3D icons

The icons are **true faceted meshes**, not flat 2D shapes:

- `src/components/icon3d.ts` — the renderer and geometry primitives: icospheres,
  octahedra, cones, prisms, hemispheres, teardrops, folded ribbons/kites/polygons,
  and stars. Faces are flat-shaded from a palette, back-face culled, depth-sorted,
  then projected to SVG polygons.
- `src/components/iconScenes.ts` — shared palettes and every scene builder
  (clouds, sun, moon, rain, snow, fog, lightning, umbrella, thermometer, wind,
  humidity, sun-on-horizon, air, clock, map pin).
- `src/components/WeatherIcon.tsx` — maps Open-Meteo weather codes to a scene and
  renders the large forecast icon (with a soft ground shadow).
- `src/components/CardIcon.tsx` — the small icons used in card headings and fact
  tiles (rain, umbrella, temperature, feels-like, wind, humidity, sunrise,
  sunset, air, clock, location).

Because the meshes are generated in code, there are **no image assets** to ship
and every icon stays crisp at any size. Run `npm run icons:preview` to render a
contact sheet, `npm run icons:ascii` for terminal silhouettes, or
`npm run icons:analyze` for a numeric geometry report.

The same visual language is used for the installable app icon. Run:

```bash
npm run icons
```

This writes `public/favicon.svg`, `public/icons/icon.svg`,
`public/icons/icon-maskable.svg`, the PNG sizes required by the web app
manifest (`192`, `512`, `512 maskable`, and `180` Apple touch), and the
`widget-screenshot.png` used by the Windows widget picker.

## Windows 11 widget

The PWA can add a widget to the **Windows 11 Widgets Board** when installed
through **Microsoft Edge**. This is the only OS that currently exposes
home-screen widgets to PWAs; Android and iOS require a native wrapper.

What is included:

| File | Purpose |
| --- | --- |
| `vite.config.ts` | Adds the `widgets` manifest member (tag, Adaptive Card template, data URL, refresh hint). |
| `public/widgets/weather-widget.json` | Adaptive Card template rendered by the Widgets Board. |
| `public/widgets/weather-data.json` | Seed data shown before the app has synced. |
| `public/widget-sw.js` | Widget lifecycle handlers (`widgetinstall`, `widgetresume`, `widgetclick`, `periodicsync`) imported by the generated service worker. |
| `src/widgetBridge.ts` | Mirrors each successful forecast into the widget cache and asks the service worker to re-render. |

How it behaves:

- The widget appears in **Windows logo key + W → Add widgets** after the PWA is
  installed from the deployed HTTPS URL.
- It shows the location, temperature, condition, summary, and rain hint.
- It refreshes when the app fetches new weather, and best-effort every 30
  minutes via **Periodic Background Sync** when the browser grants it.
- Clicking the widget action opens the installed PWA.

Widget support is not available on Android or iOS, and it requires Windows 11
with Edge. The existing Android app keeps its own native widget.

## Weather on the app icon

There is **no cross-platform web API that draws live weather on an installed
PWA's home-screen icon**. Manifest icons are static images, and JavaScript
cannot repaint them. What each platform actually allows:

| Platform | Weather on the icon? | Supported alternative |
| --- | --- | --- |
| Windows 11 (Edge) | No | **Widgets Board widget** (included); numeric badge via `navigator.setAppBadge` |
| Android (Chrome/Edge) | No | Numeric badge (launcher-dependent); a native widget needs a Trusted Web Activity or native wrapper |
| iOS / iPadOS | No | Static icon only; weather via notifications or a native WidgetKit wrapper |
| macOS (Safari) | No | Numeric Dock badge; no weather text |

The Badging API (`navigator.setAppBadge`) can show a small **number**, but it is
meant for unread counts, is not supported everywhere, and cannot render a
temperature icon. This app does use it as a best-effort temperature badge on
Windows taskbars and supported Android launchers (`src/badge.ts`); the value is
cleared when no forecast is loaded. The reliable surfaces are the **Windows 11
widget** (already included), notifications, and the app page itself.

## Deploying to GitHub Pages

A workflow is included at `.github/workflows/deploy-pwa.yml`. It builds `pwa/`
and deploys `pwa/dist` to GitHub Pages on every push to `main` that touches
`pwa/`.

1. In the GitHub repository, open **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually).

The production base path is set in `vite.config.ts`:

```ts
const PROD_BASE = '/weather-summary/';
```

If you rename the repository, or deploy to a custom domain at the root, update
`PROD_BASE` (and the manifest `start_url` / `scope` stay relative, so they
follow automatically).

## Offline behaviour

- The app shell is precached by the generated service worker.
- Open-Meteo forecast and air-quality responses each use a short `NetworkFirst`
  cache (1 hour). Geocoding responses are cached longer (24 hours to 7 days),
  and WAQI responses for 30 minutes.
- The last successful snapshot is also saved in `localStorage` **per saved
  location**, so switching places still works when the network is unavailable.
- When the device goes offline the app shows an offline banner and keeps the
  last saved forecast. A failed refresh retries automatically with exponential
  backoff (30 seconds up to 5 minutes) and immediately when the connection
  returns.
- A forecast older than an hour is flagged with a **Stale** pill in the footer.
- New deployments use a **prompt** update flow: the app shows a "new version is
  ready" banner and only reloads when you choose **Reload**, so a deploy never
  interrupts what you are doing.

## PWA limitations

- Browsers do not allow reliable background weather polling. The app refreshes
  when opened, when it comes back online, and every 10 minutes while visible.
- Geolocation requires HTTPS (or `localhost`) and user permission.
- Weather and air-quality data need no API key. The optional WAQI token is
  stored only in this device's local storage and sent only to `api.waqi.info`.
- Air quality is best-effort; when the air-quality API is unavailable the card
  shows an "unavailable" message and the rest of the app is unaffected.
- The manifest adds shortcuts for **Weather where I am** (`?locate=1`) and
  **Change location** (`?location=1`), available from the installed app's
  context menu.

## Next steps

- Port the remaining providers (OpenWeatherMap, WeatherAPI.com, Windy) using the
  fixes identified in the repo review.
- Add the Gemini / OpenAI-compatible / Home Assistant LLM sentence generation.
- Add Home Assistant push (`weather_summary.ingest_app`) and settings for the
  HA URL + long-lived token.
- Optionally reuse the low-poly icon set for the Android widget/app.
