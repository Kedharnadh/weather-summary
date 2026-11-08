import { useCallback, useEffect, useRef, useState } from 'react';
import { loadWeather, saveWeather } from '../storage';
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
}

const AUTO_REFRESH_MS = 10 * 60_000;

export function useWeather(location: LocationSettings) {
  const cached = useRef<StoredWeather | null>(loadWeather());
  const [state, setState] = useState<WeatherState>(() => ({
    data: cached.current,
    loading: cached.current == null,
    refreshing: false,
    error: null,
  }));
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState((previous) => ({
        ...previous,
        loading: previous.data == null && !options?.silent,
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
        setState({ data: stored, loading: false, refreshing: false, error: null });
        saveWeather(stored);
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
    [location.lat, location.lon, location.label],
  );

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

  return {
    ...state,
    refresh: () => void refresh({ silent: true }),
  };
}
