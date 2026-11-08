import { useCallback, useEffect, useRef, useState } from 'react';
import { AirQualityCard } from './components/AirQualityCard';
import { FactsGrid } from './components/FactsGrid';
import { HourlyStrip } from './components/HourlyStrip';
import { LocationBar } from './components/LocationBar';
import { RainTimeline } from './components/RainTimeline';
import { SummaryCard } from './components/SummaryCard';
import { SunCard } from './components/SunCard';
import { WeatherIcon } from './components/WeatherIcon';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useWeather } from './hooks/useWeather';
import { loadLocation, saveLocation } from './storage';
import type { LocationSettings } from './types';
import { formatRelative, formatUpdated } from './weather/format';
import { isGenericLabel, reverseGeocode } from './weather/geocode';

export default function App() {
  const [location, setLocation] = useState<LocationSettings>(() => loadLocation());
  const [showLocation, setShowLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const { data, loading, refreshing, error, refresh } = useWeather(location);
  const { canInstall, install } = useInstallPrompt();
  const resolvedOnMount = useRef(false);

  // Replace placeholder labels ("My location", "13.62, 79.43") with a real
  // place name. This also upgrades locations saved before geocoding existed.
  const resolveLabel = useCallback((next: LocationSettings) => {
    if (!isGenericLabel(next.label)) return;

    void reverseGeocode(next.lat, next.lon)
      .then((label) => {
        if (!label) return;
        setLocation((current) => {
          if (current.lat !== next.lat || current.lon !== next.lon) return current;
          return { ...current, label };
        });
      })
      .catch(() => {
        // Keep the coordinate label when reverse geocoding is unavailable.
      });
  }, []);

  useEffect(() => {
    if (resolvedOnMount.current) return;
    resolvedOnMount.current = true;
    resolveLabel(location);
  }, [location, resolveLabel]);

  // Persist every location change, including reverse-geocoded labels.
  useEffect(() => {
    saveLocation(location);
  }, [location]);

  const applyLocation = (next: LocationSettings) => {
    setLocation(next);
    setShowLocation(false);
    resolveLabel(next);
  };

  const locate = () => {
    if (!('geolocation' in navigator)) {
      window.alert('Geolocation is not available in this browser.');
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
        window.alert(`Could not get your location: ${geoError.message}`);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <WeatherIcon kind="partly-cloudy-day" size={38} />
          </span>
          <div>
            <h1>Weather Summary</h1>
            <p>{location.label}</p>
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
          >
            Location
          </button>
          <button
            type="button"
            className="primary"
            onClick={refresh}
            disabled={loading || refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {showLocation && (
        <LocationBar
          location={location}
          onApply={applyLocation}
          onLocate={locate}
          locating={locating}
        />
      )}

      {error && (
        <div className="banner error" role="alert">
          {error}
          {data ? ' Showing the last saved forecast.' : ''}
        </div>
      )}

      {data ? (
        <main className="content">
          <SummaryCard
            summary={data.summary}
            facts={data.facts}
            weatherCode={data.snapshot.current.weatherCode}
            isDay={data.snapshot.current.isDay}
            location={location}
            timezone={data.snapshot.timezone}
          />
          <RainTimeline rain={data.snapshot.rain} />
          <div className="split">
            <SunCard sun={data.snapshot.sun} timezone={data.snapshot.timezone} />
            <AirQualityCard air={data.snapshot.air} />
          </div>
          <FactsGrid facts={data.facts} />
          <HourlyStrip hours={data.snapshot.hourly} />
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
