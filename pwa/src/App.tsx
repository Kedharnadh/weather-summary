import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clearTemperatureBadge, setTemperatureBadge } from './badge';
import { AirQualityCard } from './components/AirQualityCard';
import { FactsGrid } from './components/FactsGrid';
import { HourlyStrip } from './components/HourlyStrip';
import { IconButton } from './components/IconButton';
import { LocationBar } from './components/LocationBar';
import { RainTimeline } from './components/RainTimeline';
import { SavedLocations } from './components/SavedLocations';
import { SettingsBar } from './components/SettingsBar';
import { SummaryCard } from './components/SummaryCard';
import { SunCard } from './components/SunCard';
import { UiIcon } from './components/UiIcon';
import { WeatherIcon } from './components/WeatherIcon';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useLocationGlances } from './hooks/useLocationGlances';
import { useNow } from './hooks/useNow';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useWeather } from './hooks/useWeather';
import { SettingsProvider, useSettings } from './SettingsContext';
import { loadSettings, saveSettings, type AppSettings } from './settings';
import {
  DEFAULT_LOCATION,
  MAX_SAVED_LOCATIONS,
  findSavedMatch,
  isSameLocation,
  loadActiveLocation,
  loadLocations,
  locationKey,
  saveActiveLocation,
  saveLocations,
} from './storage';
import type { LocationSettings } from './types';
import { displayCity } from './weather/city';
import { formatHour, formatRelative, formatUpdated } from './weather/format';
import { isGenericLabel, reverseGeocodeDetails } from './weather/geocode';

/** A forecast older than this is flagged as stale in the footer. */
const STALE_AFTER_MS = 60 * 60_000;

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return (
    <SettingsProvider settings={settings} updateSettings={updateSettings}>
      <AppShell />
    </SettingsProvider>
  );
}

function AppShell() {
  const settings = useSettings();
  const [initial] = useState(() => {
    const active = loadActiveLocation();
    const saved = loadLocations();
    return {
      active: active ?? saved[0] ?? null,
      saved,
      needsLocate: active == null && saved.length === 0,
    };
  });

  const [location, setLocation] = useState<LocationSettings | null>(initial.active);
  const [locations, setLocations] = useState<LocationSettings[]>(initial.saved);
  const [booting, setBooting] = useState(initial.needsLocate);
  const [notice, setNotice] = useState<string | null>(null);
  const [showLocation, setShowLocation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [locating, setLocating] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const { canInstall, install } = useInstallPrompt();
  const online = useOnlineStatus();
  const now = useNow();

  // Replace placeholder labels ("My location", "13.62, 79.43") with a real
  // place name and city, in both the active location and the saved list.
  const resolveLabel = useCallback((target: LocationSettings) => {
    if (!isGenericLabel(target.label)) return;
    const key = locationKey(target.lat, target.lon);

    void reverseGeocodeDetails(target.lat, target.lon)
      .then((details) => {
        if (!details) return;
        const patch: Partial<LocationSettings> = {};
        if (details.label) patch.label = details.label;
        if (details.city) patch.city = details.city;
        if (Object.keys(patch).length === 0) return;

        setLocation((current) =>
          current && locationKey(current.lat, current.lon) === key
            ? { ...current, ...patch }
            : current,
        );
        setLocations((previous) =>
          previous.map((item) =>
            locationKey(item.lat, item.lon) === key ? { ...item, ...patch } : item,
          ),
        );
      })
      .catch(() => {
        // Keep the coordinate label when reverse geocoding is unavailable.
      });
  }, []);

  const remember = useCallback((target: LocationSettings) => {
    setLocations((previous) => {
      const match = findSavedMatch(previous, target);
      if (match) {
        const index = previous.indexOf(match);
        const next = previous.slice();
        next[index] = {
          ...match,
          lat: target.lat,
          lon: target.lon,
          // Never replace a real place name with a placeholder label.
          label: isGenericLabel(target.label) ? match.label : target.label,
          city: target.city?.trim() || match.city,
        };
        return next;
      }
      return [...previous, target].slice(-MAX_SAVED_LOCATIONS);
    });
  }, []);

  const applyLocation = useCallback(
    (next: LocationSettings, options?: { remember?: boolean }) => {
      setLocation(next);
      setShowLocation(false);
      setBooting(false);
      setNotice(null);
      if (options?.remember !== false) remember(next);
      resolveLabel(next);
    },
    [remember, resolveLabel],
  );

  /**
   * Apply a device fix. Reverse geocoding runs first so the city can be
   * compared with the saved list: using "my location" in a city that is
   * already saved should switch to that place, not add a near-duplicate.
   */
  const applyDeviceLocation = useCallback(
    async (coords: { lat: number; lon: number }) => {
      const fallback: LocationSettings = { ...coords, label: 'My location' };
      let target = fallback;

      try {
        const details = await Promise.race([
          reverseGeocodeDetails(coords.lat, coords.lon),
          new Promise<null>((resolve) =>
            window.setTimeout(() => resolve(null), 4000),
          ),
        ]);
        if (details) {
          target = {
            ...coords,
            label: details.label || 'My location',
            ...(details.city ? { city: details.city } : {}),
          };
        }
      } catch {
        // Keep the placeholder label; the proximity match below still applies.
      }

      const match = findSavedMatch(locations, target, {
        matchCity: true,
        maxKm: 5,
      });

      if (match) {
        const merged: LocationSettings = {
          ...match,
          lat: target.lat,
          lon: target.lon,
          city: match.city ?? target.city,
        };
        setLocations((previous) =>
          previous.map((item) => (isSameLocation(item, match) ? merged : item)),
        );
        applyLocation(merged, { remember: false });
        return;
      }

      applyLocation(target, { remember: true });
    },
    [applyLocation, locations],
  );

  const removeLocation = useCallback(
    (target: LocationSettings) => {
      const remaining = locations.filter((item) => !isSameLocation(item, target));
      setLocations(remaining);
      if (location && isSameLocation(location, target) && remaining.length > 0) {
        setLocation(remaining[0]);
      }
    },
    [location, locations],
  );

  const reorderLocation = useCallback((index: number, direction: -1 | 1) => {
    setLocations((previous) => {
      const target = index + direction;
      if (
        index < 0 ||
        index >= previous.length ||
        target < 0 ||
        target >= previous.length
      ) {
        return previous;
      }
      const next = previous.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const renameLocation = useCallback((target: LocationSettings, label: string) => {
    const key = locationKey(target.lat, target.lon);
    setLocations((previous) =>
      previous.map((item) =>
        locationKey(item.lat, item.lon) === key ? { ...item, label } : item,
      ),
    );
    setLocation((current) =>
      current && locationKey(current.lat, current.lon) === key
        ? { ...current, label }
        : current,
    );
  }, []);

  const clearLocations = useCallback(() => {
    setLocations([]);
  }, []);

  const saveCurrent = useCallback(() => {
    if (location) remember(location);
  }, [location, remember]);

  const weatherLocation = location ?? DEFAULT_LOCATION;
  const { data, loading, refreshing, error, refresh, retry } = useWeather(
    weatherLocation,
    {
      enabled: location != null,
      waqiToken: settings.waqiToken,
    },
  );

  // Include the active place in the strip even if it is not saved yet.
  const glanceLocations = useMemo(() => {
    if (!location) return locations;
    return locations.some((item) => isSameLocation(item, location))
      ? locations
      : [location, ...locations];
  }, [location, locations]);

  const { glances } = useLocationGlances(glanceLocations, location != null);

  // First open: start with the device location. If the browser cannot provide
  // it (denied, unsupported, or slow), fall back to the demo city and explain.
  useEffect(() => {
    if (!initial.needsLocate || location) return;

    let cancelled = false;
    let settled = false;

    const fallback = (message: string) => {
      if (cancelled || settled) return;
      settled = true;
      setBooting(false);
      setLocation(DEFAULT_LOCATION);
      setNotice(message);
    };

    if (!('geolocation' in navigator)) {
      fallback(
        'This browser has no location access. Showing London — use Location to pick a place.',
      );
      return;
    }

    const timer = window.setTimeout(() => {
      fallback(
        'Could not determine your location in time. Showing London — use Location to pick a place.',
      );
    }, 12_000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled || settled) return;
        settled = true;
        window.clearTimeout(timer);
        applyLocation(
          {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            label: 'My location',
          },
          { remember: true },
        );
      },
      () => {
        window.clearTimeout(timer);
        fallback(
          'Location permission was not granted. Showing London — use Location to pick a place.',
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [applyLocation, initial.needsLocate, location]);

  // Resolve placeholder labels once on mount.
  const labelsResolved = useRef(false);
  useEffect(() => {
    if (labelsResolved.current) return;
    labelsResolved.current = true;
    if (location) resolveLabel(location);
    locations.forEach((item) => resolveLabel(item));
  }, [location, locations, resolveLabel]);

  // Persist the active place and the saved list on every change.
  useEffect(() => {
    if (location) saveActiveLocation(location);
  }, [location]);

  useEffect(() => {
    saveLocations(locations);
  }, [locations]);

  // Service-worker update and offline-ready notifications, raised by main.tsx.
  useEffect(() => {
    const onUpdate = () => setUpdateReady(true);
    const onOffline = () => setOfflineReady(true);
    window.addEventListener('pwa:update-available', onUpdate);
    window.addEventListener('pwa:offline-ready', onOffline);
    return () => {
      window.removeEventListener('pwa:update-available', onUpdate);
      window.removeEventListener('pwa:offline-ready', onOffline);
    };
  }, []);

  // Mirror the current temperature on the app icon where the platform allows.
  useEffect(() => {
    if (data) {
      void setTemperatureBadge(data.facts.tempC, settings.units);
    } else {
      void clearTemperatureBadge();
    }
  }, [data, settings.units]);

  useEffect(() => () => void clearTemperatureBadge(), []);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setNotice('Geolocation is not available in this browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void applyDeviceLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        }).finally(() => setLocating(false));
      },
      (geoError) => {
        setLocating(false);
        setNotice(`Could not get your location: ${geoError.message}`);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  }, [applyDeviceLocation]);

  // Manifest shortcuts open the app with ?location=1 or ?locate=1.
  const shortcutsHandled = useRef(false);
  useEffect(() => {
    if (shortcutsHandled.current) return;
    shortcutsHandled.current = true;

    const params = new URLSearchParams(window.location.search);
    const wantsLocation = params.has('location') || params.has('locate');
    if (!wantsLocation) return;

    setShowLocation(true);
    if (params.has('locate')) locate();

    const url = new URL(window.location.href);
    url.searchParams.delete('location');
    url.searchParams.delete('locate');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, [locate]);

  const activeIsSaved = location
    ? locations.some((item) => isSameLocation(item, location))
    : false;
  const stale = data != null && now - data.savedAt > STALE_AFTER_MS;
  const city = location ? displayCity(location) : null;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to weather
      </a>

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <WeatherIcon kind="partly-cloudy-day" size={34} />
          </span>
          <div className="brand-copy">
            <h1>Weather Summary</h1>
            <p title={location?.label}>{city ?? 'Finding your location…'}</p>
          </div>
        </div>

        <div className="topbar-actions" role="group" aria-label="App actions">
          <IconButton
            label={showLocation ? 'Hide location picker' : 'Choose location'}
            icon={<UiIcon name="location" />}
            onClick={() => setShowLocation((value) => !value)}
            disabled={booting}
            className={showLocation ? 'is-active' : undefined}
          />
          {canInstall && (
            <IconButton
              label="Install app"
              icon={<UiIcon name="install" />}
              onClick={() => void install()}
            />
          )}
          <IconButton
            label={showSettings ? 'Hide settings' : 'Settings'}
            icon={<UiIcon name="settings" />}
            onClick={() => setShowSettings((value) => !value)}
            className={showSettings ? 'is-active' : undefined}
          />
          <IconButton
            label={refreshing ? 'Refreshing weather' : 'Refresh weather'}
            icon={<UiIcon name="refresh" />}
            onClick={refresh}
            variant="primary"
            disabled={loading || refreshing || booting}
            busy={refreshing}
          />
        </div>
      </header>

      {updateReady && (
        <div className="banner notice update-banner" role="status">
          <span className="banner-copy">
            <UiIcon name="update" size={18} />
            <span>A new version is ready.</span>
          </span>
          <span className="banner-actions">
            <button
              type="button"
              className="primary small"
              onClick={() => window.dispatchEvent(new Event('pwa:apply-update'))}
            >
              Reload
            </button>
            <button
              type="button"
              className="ghost small"
              onClick={() => setUpdateReady(false)}
            >
              Later
            </button>
          </span>
        </div>
      )}

      {!online && (
        <div className="banner offline" role="status">
          <span className="banner-copy">
            <UiIcon name="offline" size={18} />
            <span>
              You are offline. Showing the last saved forecast; refresh resumes when
              the connection returns.
            </span>
          </span>
        </div>
      )}

      {offlineReady && online && (
        <div className="banner notice" role="status">
          <span className="banner-copy">
            <UiIcon name="check" size={18} />
            <span>Saved for offline use. You can open this app without a connection.</span>
          </span>
          <button
            type="button"
            className="ghost small"
            onClick={() => setOfflineReady(false)}
          >
            Dismiss
          </button>
        </div>
      )}

      {location && (
        <SavedLocations
          saved={locations}
          active={location}
          glances={glances}
          onSelect={applyLocation}
          onRemove={removeLocation}
          onReorder={reorderLocation}
          onRename={renameLocation}
          onClear={clearLocations}
        />
      )}

      {showLocation && location && (
        <LocationBar
          location={location}
          onApply={applyLocation}
          onLocate={locate}
          locating={locating}
          isSaved={activeIsSaved}
          onSave={saveCurrent}
        />
      )}

      {showSettings && <SettingsBar onClose={() => setShowSettings(false)} />}

      {notice && !booting && (
        <div className="banner notice" role="status">
          <span>{notice}</span>
          <button type="button" className="ghost small" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="banner error" role="alert">
          <span>
            {error}
            {data ? ' Showing the last saved forecast.' : ''}
          </span>
          <button type="button" className="ghost small" onClick={retry}>
            Retry now
          </button>
        </div>
      )}

      {booting ? (
        <main id="main" className="content" aria-busy="true" aria-label="Finding your location">
          <div className="banner notice" role="status">
            <span>Finding your location…</span>
            <span className="muted">Allow location access to start with your local weather.</span>
          </div>
          <div className="skeleton hero-skeleton" />
          <div className="skeleton row-skeleton" />
        </main>
      ) : data ? (
        <main id="main" className="content">
          <SummaryCard
            summary={data.summary}
            facts={data.facts}
            weatherCode={data.snapshot.current.weatherCode}
            isDay={data.snapshot.current.isDay}
            location={location ?? DEFAULT_LOCATION}
            timezone={data.snapshot.timezone}
          />
          <RainTimeline rain={data.snapshot.rain} />
          <div className="split">
            <SunCard sun={data.snapshot.sun} timezone={data.snapshot.timezone} />
            <AirQualityCard air={data.snapshot.air} />
          </div>
          <FactsGrid facts={data.facts} />
          <HourlyStrip
            hours={data.snapshot.hourly}
            startTime={data.snapshot.current.time}
            current={data.snapshot.current}
          />
          <footer className="footer">
            <span>
              Observed {formatHour(data.snapshot.current.time, settings.clock)} · Updated{' '}
              {formatUpdated(data.savedAt, settings.clock)} · {formatRelative(data.savedAt)}
            </span>
            <span className="footer-meta">
              {stale && (
                <span
                  className="pill stale-pill"
                  title="This forecast is more than an hour old"
                >
                  Stale
                </span>
              )}
              <span>Open-Meteo · cached offline</span>
            </span>
          </footer>
        </main>
      ) : loading ? (
        <main id="main" className="content" aria-busy="true" aria-label="Loading weather">
          <div className="skeleton hero-skeleton" />
          <div className="skeleton row-skeleton" />
          <div className="skeleton grid-skeleton" />
        </main>
      ) : error ? (
        <main id="main" className="content">
          <div className="card empty-state">
            <h2>Could not load the weather</h2>
            <p className="muted">
              Check your connection, then try again. Saved forecasts stay available
              offline.
            </p>
            <button type="button" className="primary" onClick={retry}>
              Try again
            </button>
          </div>
        </main>
      ) : null}
    </div>
  );
}
