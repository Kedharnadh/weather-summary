import type { LocationSettings } from '../types';

/**
 * Best-effort city name from a full label such as
 * "STV Nagar, Tirupati, Andhra Pradesh, India".
 *
 * Geocoded locations carry an explicit `city`, so this is only a fallback for
 * older saved places and hand-entered coordinates.
 */
export function cityFromLabel(label: string): string {
  const parts = label
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return label.trim();
  if (parts.length <= 2) return parts[0];
  if (parts.length >= 4) return parts[parts.length - 3];
  return parts[0];
}

/** The short name shown on saved-location chips. */
export function displayCity(location: LocationSettings): string {
  return location.city?.trim() || cityFromLabel(location.label);
}
