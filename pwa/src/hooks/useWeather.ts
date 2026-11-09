import { useCallback, useEffect, useRef, useState } from 'react';
import { loadWeatherFor, locationKey, saveWeatherFor } from '../storage';
import type { LocationSettings, StoredWeather } from '../types';
import { deriveFacts } from '../weather/facts';
import { fallbackSentence } from '../weather/fallback';
import { fetchAirQuality } from '../weather/airQuality';
import { fetchOpenMeteo } from '../weather/openMeteo';
import { publishWidgetData } from '../widgetBridge';

interface WeatherState {
  data: StoredWeather | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** Which location the current `data` belongs to. */
  key: string | null;
}

interface Options {
  /** Skip fetching while the app is still resolving the first location. */
  enabled?: boolean;
}

const AUTO_REFRESH_MS = 10 * 60_000;

export function useWeather(location: LocationSettings, options?: Options) {
  const enabled = options?.enabled !== false;
  const key = locationKey(location.lat, location.lon);

  const [state, setState] = useState<WeatherState>(() => {
    const cached = enabled ? loadWeatherFor(location) : null;
    return {
      data: cached,
      loading: enabled && cached == null,
      refreshing: false,
      error: null,
      key: enabled ? key : null,
    };
  });
  const abortRef = useRef<AbortController | null>(null);
  const lastKey = useRef(key);

  const refresh = useCallback(
    async (refreshOptions?: { silent?: boolean }) => {
      if (!enabled) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState((previous) => ({
        ...previous,
        loading: previous.data == null && !refreshOptions?.silent,
        refreshing: previous.data != null,
        error: null,
      }));

      try {
        // Air quality is best-effort: a failure resolves to null and must not
        // block the forecast itself.
        const [snapshot, air] = await Promise.all([
          fetchOpenMeteo(location.lat, location.lon, controller.signal),
          fetchAirQuality(location.lat, location.lon, controller.signal),
        ]);
        const facts = deriveFacts(snapshot);
        const stored: StoredWeather = {
          snapshot: { ...snapshot, air },
          facts,
          summary: fallbackSentence(facts),
          savedAt: Date.now(),
        };
        setState({ data: stored, loading: false, refreshing: false, error: null, key });
        saveWeatherFor(location, stored);
        void publishWidgetData(stored, location);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error ? error.message : 'Could not load the weather.';
        setState((previous) => ({
          ...previous,
          loading: false,
          refreshing: false,
          error: message,
        }));
      }
    },
    [enabled, key, location.lat, location.lon, location.label],
  );

  // When the active place changes, show that place's own cached forecast
  // instead of the previous location's weather until the new fetch lands.
  useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    const cached = enabled ? loadWeatherFor(location) : null;
    setState({
      data: cached,
      loading: enabled && cached == null,
      refreshing: false,
      error: null,
      key: enabled ? key : null,
    });
  }, [enabled, key, location]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    const onOnline = () => void refresh({ silent: true });
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [refresh]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh({ silent: true });
      }
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const matches = state.key === key;

  return {
    data: matches ? state.data : null,
    loading: matches ? state.loading : enabled,
    refreshing: matches ? state.refreshing : false,
    error: matches ? state.error : null,
    refresh: () => void refresh({ silent: true }),
  };
}
