import type { Units } from './settings';
import { temperatureValue } from './weather/units';

type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/**
 * Put the current temperature on the app icon where the platform supports it
 * (Windows taskbar, Android launcher). Badging is numeric-only, so this is the
 * closest cross-platform equivalent of a weather icon.
 */
export async function setTemperatureBadge(tempC: number, units: Units): Promise<void> {
  const nav = navigator as BadgeNavigator;
  if (!nav.setAppBadge) return;
  try {
    await nav.setAppBadge(Math.round(temperatureValue(tempC, units)));
  } catch {
    // Badging is optional and can be blocked by the platform.
  }
}

export async function clearTemperatureBadge(): Promise<void> {
  const nav = navigator as BadgeNavigator;
  if (!nav.clearAppBadge) return;
  try {
    await nav.clearAppBadge();
  } catch {
    // Ignore unsupported or blocked badge calls.
  }
}
