import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AirQualityCard } from './components/AirQualityCard';
import { FactsGrid } from './components/FactsGrid';
import { HourlyStrip } from './components/HourlyStrip';
import { LocationBar } from './components/LocationBar';
import { RainTimeline } from './components/RainTimeline';
import { SavedLocations } from './components/SavedLocations';
import { SummaryCard } from './components/SummaryCard';
import { SunCard } from './components/SunCard';
import { WeatherIcon } from './components/WeatherIcon';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useLocationGlances } from './hooks/useLocationGlances';
import { useWeather } from './hooks/useWeather';
import {
  DEFAULT_LOCATION,
  MAX_SAVED_LOCATIONS,
  isSameLocation,
  loadActiveLocation,
  loadLocations,
  locationKey,
  saveActiveLocation,
  saveLocations,
} from './storage';
import type { LocationSettings } from './types';
import { formatRelative, formatUpdated } from './weather/format';
import { isGenericLabel, reverseGeocode } from './weather/geocode';

export default function App() {
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
  const [locating, setLocating] = useState(false);
  const { canInstall, install } = useInstallPrompt();

  // Replace placeholder labels ("My location", "13.62, 79.43") with a real
  // place name, in both the active location and the saved list.
  const resolveLabel = useCallback((target: LocationSettings) => {
    if (!isGenericLabel(target.label)) return;
    const key = locationKey(target.lat, target.lon);

    void reverseGeocode(target.lat, target.lon)
      .then((label) => {
        if (!label) return;
        setLocation((current) =>
          current && locationKey(current.lat, current.lon) === key
            ? { ...current, label }
            : current,
        );
        setLocations((previous) =>
          previous.map((item) =>
            locationKey(item.lat, item.lon) === key ? { ...item, label } : item,
          ),
        );
      })
      .catch(() => {
        // Keep the coordinate label when reverse geocoding is unavailable.
      });
  }, []);

  const remember = useCallback((target: LocationSettings) => {
    setLocations((previous) => {
      const key = locationKey(target.lat, target.lon);
      const index = previous.findIndex(
        (item) => locationKey(item.lat, item.lon) === key,
      );
      if (index >= 0) {
        const next = previous.slice();
        next[index] = { ...next[index], label: target.label };
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

  const saveCurrent = useCallback(() => {
    if (location) remember(location);
  }, [location, remember]);

  const weatherLocation = location ?? DEFAULT_LOCATION;
  const { data, loading, refreshing, error, refresh } = useWeather(weatherLocation, {
    enabled: location != null,
  });

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

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setNotice('Geolocation is not available in this browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        applyLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          label: 'My location',
        });
      },
      (geoError) => {
        setLocating(false);
        setNotice(`Could not get your location: ${geoError.message}`);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  };

  const activeIsSaved = location
    ? locations.some((item) => isSameLocation(item, location))
    : false;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <WeatherIcon kind="partly-cloudy-day" size={38} />
          </span>
          <div>
            <h1>Weather Summary</h1>
            <p>{location?.label ?? 'Finding your location…'}</p>
          </div>
        </div>

        <div className="topbar-actions">
          {canInstall && (
            <button type="button" className="ghost" onClick={() => void install()}>
              Install
            </button>
          )}
          <button
            type="button"
            className="ghost"
            onClick={() => setShowLocation((value) => !value)}
            aria-expanded={showLocation}
            disabled={booting}
          >
            Location
          </button>
          <button
            type="button"
            className="primary"
            onClick={refresh}
            disabled={loading || refreshing || booting}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {location && (
        <SavedLocations
          saved={locations}
          active={location}
          glances={glances}
          onSelect={applyLocation}
          onRemove={removeLocation}
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
          {error}
          {data ? ' Showing the last saved forecast.' : ''}
        </div>
      )}

      {booting ? (
        <main className="content" aria-busy="true" aria-label="Finding your location">
          <div className="banner notice" role="status">
            <span>Finding your location…</span>
            <span className="muted">Allow location access to start with your local weather.</span>
          </div>
          <div className="skeleton hero-skeleton" />
          <div className="skeleton row-skeleton" />
        </main>
      ) : data ? (
        <main className="content">
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
              Updated {formatUpdated(data.savedAt)} · {formatRelative(data.savedAt)}
            </span>
            <span>Open-Meteo · cached offline</span>
          </footer>
        </main>
      ) : loading ? (
        <main className="content" aria-busy="true" aria-label="Loading weather">
          <div className="skeleton hero-skeleton" />
          <div className="skeleton row-skeleton" />
          <div className="skeleton grid-skeleton" />
        </main>
      ) : null}
    </div>
  );
}
