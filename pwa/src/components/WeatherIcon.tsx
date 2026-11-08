import { useMemo } from 'react';
import { renderFaces, type Face } from './icon3d';
import {
  cloudFaces,
  fogFaces,
  lightningFaces,
  moonSphereFaces,
  rainFaces,
  snowFaces,
  starsFaces,
  sunFaces,
} from './iconScenes';

export type WeatherIconKind =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy-day'
  | 'partly-cloudy-night'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'showers'
  | 'snow'
  | 'snow-showers'
  | 'thunderstorm'
  | 'unknown';

const KIND_LABELS: Record<WeatherIconKind, string> = {
  'clear-day': 'Clear sky',
  'clear-night': 'Clear night',
  'partly-cloudy-day': 'Partly cloudy',
  'partly-cloudy-night': 'Partly cloudy night',
  cloudy: 'Cloudy',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  showers: 'Showers',
  snow: 'Snow',
  'snow-showers': 'Snow showers',
  thunderstorm: 'Thunderstorm',
  unknown: 'Weather',
};

export function weatherIconKind(
  code: number | null | undefined,
  isDay: boolean | null,
): WeatherIconKind {
  const day = isDay !== false;
  if (code == null) return 'unknown';
  if (code === 0) return day ? 'clear-day' : 'clear-night';
  if (code === 1 || code === 2) return day ? 'partly-cloudy-day' : 'partly-cloudy-night';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code >= 61 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'showers';
  if (code >= 85 && code <= 86) return 'snow-showers';
  if (code >= 95) return 'thunderstorm';
  return 'unknown';
}

interface Scene {
  faces: Face[];
  shadow?: { y: number; rx: number };
}

export function weatherScene(kind: WeatherIconKind): Scene {
  switch (kind) {
    case 'clear-day':
      return { faces: sunFaces({ scale: 1.05 }), shadow: { y: 58, rx: 15 } };

    case 'clear-night':
      return {
        faces: [...moonSphereFaces({ x: 0.1, scale: 1.05 }), ...starsFaces()],
        shadow: { y: 58, rx: 15 },
      };

    case 'partly-cloudy-day':
      return {
        faces: [
          ...sunFaces({ x: -0.62, y: 0.66, z: -0.5, scale: 0.7 }),
          ...cloudFaces({ offset: [0.18, -0.12, 0.35], scale: 0.92 }),
        ],
        shadow: { y: 58, rx: 20 },
      };

    case 'partly-cloudy-night':
      return {
        faces: [
          ...moonSphereFaces({ x: -0.6, y: 0.66, z: -0.5, scale: 0.72 }),
          ...starsFaces(),
          ...cloudFaces({ offset: [0.18, -0.12, 0.35], scale: 0.92 }),
        ],
        shadow: { y: 58, rx: 20 },
      };

    case 'cloudy':
      return {
        faces: [
          ...cloudFaces({ offset: [0.22, 0.12, -0.25], scale: 0.98, dark: true }),
          ...cloudFaces({ offset: [-0.18, -0.12, 0.4], scale: 0.88 }),
        ],
        shadow: { y: 59, rx: 22 },
      };

    case 'fog':
      return {
        faces: [
          ...cloudFaces({ offset: [0, 0.34, 0], scale: 0.82 }),
          ...fogFaces(),
        ],
        shadow: { y: 60, rx: 22 },
      };

    case 'drizzle':
      return {
        faces: [
          ...cloudFaces({ offset: [0, 0.3, 0], scale: 0.9 }),
          ...rainFaces({ y: -0.8, count: 3, size: 0.18 }),
        ],
        shadow: { y: 60, rx: 20 },
      };

    case 'rain':
      return {
        faces: [
          ...cloudFaces({ offset: [0, 0.32, 0], scale: 0.92 }),
          ...rainFaces({ y: -0.78, count: 4, size: 0.2 }),
        ],
        shadow: { y: 60, rx: 22 },
      };

    case 'showers':
      return {
        faces: [
          ...sunFaces({ x: -0.64, y: 0.64, z: -0.5, scale: 0.62 }),
          ...cloudFaces({ offset: [0.18, 0.06, 0.35], scale: 0.86 }),
          ...rainFaces({ y: -0.82, count: 3, size: 0.18 }),
        ],
        shadow: { y: 60, rx: 22 },
      };

    case 'snow':
      return {
        faces: [
          ...cloudFaces({ offset: [0, 0.32, 0], scale: 0.92 }),
          ...snowFaces({ y: -0.8, count: 3, size: 0.22 }),
        ],
        shadow: { y: 60, rx: 22 },
      };

    case 'snow-showers':
      return {
        faces: [
          ...sunFaces({ x: -0.64, y: 0.64, z: -0.5, scale: 0.62 }),
          ...cloudFaces({ offset: [0.18, 0.06, 0.35], scale: 0.86 }),
          ...snowFaces({ y: -0.8, count: 2, size: 0.2 }),
        ],
        shadow: { y: 60, rx: 22 },
      };

    case 'thunderstorm':
      return {
        faces: [
          ...cloudFaces({ offset: [0, 0.34, 0], scale: 0.98, dark: true }),
          ...rainFaces({ y: -0.78, count: 2, size: 0.16 }),
          ...lightningFaces(),
        ],
        shadow: { y: 60, rx: 22 },
      };

    default:
      return {
        faces: cloudFaces({ offset: [0, 0.1, 0] }),
        shadow: { y: 58, rx: 20 },
      };
  }
}

export function WeatherIcon({
  kind,
  size = 64,
  className,
}: {
  kind: WeatherIconKind;
  size?: number;
  className?: string;
}) {
  const scene = useMemo(() => weatherScene(kind), [kind]);
  const polygons = useMemo(() => renderFaces(scene.faces, 32, 33, 15.5), [scene]);

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={KIND_LABELS[kind]}
      focusable="false"
    >
      {scene.shadow && (
        <ellipse
          cx="32"
          cy={scene.shadow.y}
          rx={scene.shadow.rx}
          ry="3"
          fill="#0f172a"
          opacity="0.16"
        />
      )}
      {polygons.map((polygon, index) => (
        <polygon key={index} points={polygon.points} fill={polygon.fill} />
      ))}
    </svg>
  );
}
