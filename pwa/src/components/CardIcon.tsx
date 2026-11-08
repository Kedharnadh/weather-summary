import { useMemo } from 'react';
import type { AirTone } from '../weather/airQuality';
import { renderFaces, type Face } from './icon3d';
import {
  airFaces,
  clockFaces,
  humidityFaces,
  pinFaces,
  rainCloudCardFaces,
  sunHorizonFaces,
  thermometerFaces,
  umbrellaFaces,
  windFaces,
} from './iconScenes';

export type CardIconKind =
  | 'rain'
  | 'umbrella'
  | 'temperature'
  | 'feels'
  | 'wind'
  | 'humidity'
  | 'sunrise'
  | 'sunset'
  | 'air'
  | 'clock'
  | 'location';

const LABELS: Record<CardIconKind, string> = {
  rain: 'Rain',
  umbrella: 'Chance of rain',
  temperature: 'Temperature',
  feels: 'Feels like',
  wind: 'Wind',
  humidity: 'Humidity',
  sunrise: 'Sunrise',
  sunset: 'Sunset',
  air: 'Air quality',
  clock: 'Hourly forecast',
  location: 'Location',
};

interface Scene {
  faces: Face[];
  scale: number;
}

export function cardIconScene(
  kind: CardIconKind,
  { tone, warm }: { tone?: AirTone; warm?: boolean },
): Scene {
  switch (kind) {
    case 'rain':
      return { faces: rainCloudCardFaces(), scale: 15 };
    case 'umbrella':
      return { faces: umbrellaFaces(), scale: 15.5 };
    case 'temperature':
    case 'feels':
      return { faces: thermometerFaces({ warm }), scale: 24 };
    case 'wind':
      return { faces: windFaces(), scale: 15.5 };
    case 'humidity':
      return { faces: humidityFaces(), scale: 20 };
    case 'sunrise':
      return { faces: sunHorizonFaces({ sunset: false }), scale: 16 };
    case 'sunset':
      return { faces: sunHorizonFaces({ sunset: true }), scale: 16 };
    case 'air':
      return { faces: airFaces(tone ?? 'unknown'), scale: 15.5 };
    case 'clock':
      return { faces: clockFaces(), scale: 16 };
    case 'location':
      return { faces: pinFaces(), scale: 21 };
  }
}

export function CardIcon({
  kind,
  size = 28,
  tone,
  warm,
  className,
  decorative = false,
  label,
}: {
  kind: CardIconKind;
  size?: number;
  tone?: AirTone;
  warm?: boolean;
  className?: string;
  decorative?: boolean;
  label?: string;
}) {
  const scene = useMemo(() => cardIconScene(kind, { tone, warm }), [kind, tone, warm]);
  const polygons = useMemo(
    () => renderFaces(scene.faces, 32, 32, scene.scale),
    [scene],
  );

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : (label ?? LABELS[kind])}
      aria-hidden={decorative || undefined}
      focusable="false"
    >
      {polygons.map((polygon, index) => (
        <polygon key={index} points={polygon.points} fill={polygon.fill} />
      ))}
    </svg>
  );
}
