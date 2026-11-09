import { useEffect, useRef, useState } from 'react';
import { locationKey } from '../storage';
import type { LocationSettings } from '../types';
import { fetchGlances, type LocationGlance } from '../weather/openMeteo';

export type GlanceMap = Record<string, LocationGlance>;

const REFRESH_MS = 10 * 60_000;

/**
 * Current conditions for every saved place, used by the saved-locations strip.
 * Requests are batched into a single Open-Meteo call and refreshed alongside
 * the main forecast cadence. Failures are ignored so chips keep their last
 * known reading.
 */
export function useLocationGlances(locations: LocationSettings[], enabled = true) {
  const [glances, setGlances] = useState<GlanceMap>({});
  const [loading, setLoading] = useState(false);
  const locationsRef = useRef(locations);
  locationsRef.current = locations;

  const keys = locations.map((location) => locationKey(location.lat, location.lon)).join('|');

  useEffect(() => {
    if (!enabled || locationsRef.current.length === 0) {
      setGlances({});
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const load = async () => {
      const current = locationsRef.current;
      if (current.length === 0) return;
      setLoading(true);
      try {
        const results = await fetchGlances(current, controller.signal);
        if (cancelled) return;
        const next: GlanceMap = {};
        current.forEach((location, index) => {
          const result = results[index];
          if (result) next[locationKey(location.lat, location.lon)] = result;
        });
        setGlances(next);
      } catch {
        // Keep the previous readings when the glance request fails.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [keys, enabled]);

  return { glances, loading };
}
