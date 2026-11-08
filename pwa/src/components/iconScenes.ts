/**
 * Shared low-poly 3D scenes used by the weather icons and the small card icons.
 * Every scene is a list of world-space triangles; `renderFaces` projects them.
 */

import type { AirTone } from '../weather/airQuality';
import {
  add,
  coneFaces,
  foldedKite,
  foldedPolygon,
  foldedRibbon,
  hemisphereFaces,
  octahedronFaces,
  prismFaces,
  sphereFaces,
  starFaces,
  tearFaces,
  type Face,
  type Palette,
  type Vec3,
} from './icon3d';

export const CLOUD_MAIN: Palette = ['#ffffff', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8'];
export const CLOUD_BACK: Palette = ['#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b'];
export const CLOUD_BASE: Palette = ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569'];
export const CLOUD_DARK: Palette = ['#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155'];

export const SUN: Palette = ['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b'];
export const SUNSET_SUN: Palette = ['#fff7ed', '#fed7aa', '#fdba74', '#fb923c', '#ea580c'];
export const MOON: Palette = ['#ffffff', '#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8'];
export const RAIN: Palette = ['#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0284c7'];
export const SNOW: Palette = ['#ffffff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#0ea5e9'];
export const BOLT: Palette = ['#fef9c3', '#fde047', '#facc15', '#eab308', '#ca8a04'];
export const FOG: Palette = ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569'];

export const GROUND_SUNRISE: Palette = ['#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#047857'];
export const GROUND_SUNSET: Palette = ['#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#9a3412'];

export const UMBRELLA: Palette = ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb'];
export const HANDLE: Palette = ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569'];
export const TUBE: Palette = ['#ffffff', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8'];
export const WARM: Palette = ['#fed7aa', '#fdba74', '#fb923c', '#f97316', '#c2410c'];
export const COLD: Palette = ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#1d4ed8'];
export const CLOCK_RIM: Palette = ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb'];
export const CLOCK_FACE: Palette = ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1'];
export const CLOCK_HAND: Palette = ['#94a3b8', '#64748b', '#475569', '#334155', '#1e293b'];
export const PIN: Palette = ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb'];
export const PIN_HOLE: Palette = ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1'];
export const AIR_WIND: Palette = ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569'];

export const AIR_TONE_PALETTES: Record<AirTone, Palette> = {
  good: ['#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#16a34a'],
  fair: ['#ecfccb', '#d9f99d', '#bef264', '#a3e635', '#65a30d'],
  moderate: ['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#d97706'],
  poor: ['#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#ea580c'],
  'very-poor': ['#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#dc2626'],
  'extremely-poor': ['#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#9333ea'],
  unknown: ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569'],
};

/** A chunky cumulus cloud made from overlapping faceted puffs. */
export function cloudFaces({
  offset = [0, 0, 0],
  scale = 1,
  dark = false,
}: {
  offset?: Vec3;
  scale?: number;
  dark?: boolean;
} = {}): Face[] {
  const main = dark ? CLOUD_DARK : CLOUD_MAIN;
  const back = dark ? CLOUD_DARK : CLOUD_BACK;
  const base = dark ? CLOUD_DARK : CLOUD_BASE;

  const puffs: Array<{
    position: Vec3;
    scale: Vec3;
    palette: Palette;
    rotation: readonly [number, number];
  }> = [
    { position: [-0.95, 0.0, -0.35], scale: [0.62, 0.5, 0.5], palette: back, rotation: [0.4, 0.5] },
    { position: [0.85, -0.03, -0.3], scale: [0.6, 0.48, 0.5], palette: back, rotation: [0.1, -0.5] },
    { position: [-0.05, 0.7, -0.15], scale: [0.62, 0.55, 0.55], palette: main, rotation: [-0.3, 0.7] },
    { position: [-0.55, 0.3, 0.1], scale: [0.72, 0.62, 0.6], palette: main, rotation: [0.5, -0.3] },
    { position: [0.48, 0.26, 0.12], scale: [0.75, 0.6, 0.6], palette: main, rotation: [0.2, 0.1] },
    { position: [0.0, -0.28, 0.35], scale: [1.12, 0.4, 0.55], palette: base, rotation: [0.1, 0.2] },
    { position: [-0.95, -0.18, 0.25], scale: [0.45, 0.38, 0.4], palette: base, rotation: [0.3, 0.4] },
    { position: [0.95, -0.18, 0.25], scale: [0.45, 0.38, 0.4], palette: base, rotation: [0.2, -0.4] },
  ];

  return puffs.flatMap((puff) =>
    sphereFaces({
      position: add(offset, [
        puff.position[0] * scale,
        puff.position[1] * scale,
        puff.position[2] * scale,
      ]),
      scale: [
        puff.scale[0] * scale,
        puff.scale[1] * scale,
        puff.scale[2] * scale,
      ],
      palette: puff.palette,
      rotation: puff.rotation,
    }),
  );
}

export function sunFaces({
  x = 0,
  y = 0,
  z = 0,
  scale = 1,
  rays = true,
  palette = SUN,
  rayCount = 8,
  rayStart = 0,
}: {
  x?: number;
  y?: number;
  z?: number;
  scale?: number;
  rays?: boolean;
  palette?: Palette;
  rayCount?: number;
  rayStart?: number;
} = {}): Face[] {
  const faces = sphereFaces({
    position: [x, y, z],
    scale: [0.8 * scale, 0.8 * scale, 0.8 * scale],
    palette,
    rotation: [0.35, 0.6],
  });

  if (rays) {
    for (let index = 0; index < rayCount; index += 1) {
      const angle = rayStart + (index / rayCount) * Math.PI * 2 + Math.PI / rayCount;
      faces.push(
        ...foldedKite({
          angle,
          inner: 0.9 * scale,
          outer: 1.5 * scale,
          palette,
          z: z - 0.25,
          centre: [x, y],
        }),
      );
    }
  }

  return faces;
}

export function moonSphereFaces({
  x = 0.05,
  y = 0,
  z = 0,
  scale = 1,
}: {
  x?: number;
  y?: number;
  z?: number;
  scale?: number;
} = {}): Face[] {
  return sphereFaces({
    position: [x, y, z],
    scale: [0.8 * scale, 0.8 * scale, 0.8 * scale],
    palette: MOON,
    rotation: [0.2, 0.4],
  });
}

export function starsFaces(): Face[] {
  return [
    ...octahedronFaces({ position: [-0.9, 0.8, 0.3], scale: [0.11, 0.11, 0.11], palette: MOON }),
    ...octahedronFaces({ position: [0.8, 0.95, 0.2], scale: [0.08, 0.08, 0.08], palette: MOON }),
    ...octahedronFaces({ position: [1.0, -0.5, 0.4], scale: [0.1, 0.1, 0.1], palette: MOON }),
  ];
}

export function rainFaces({
  y = -1.05,
  count = 4,
  size = 0.24,
}: {
  y?: number;
  count?: number;
  size?: number;
} = {}): Face[] {
  const positions: Array<[number, number]> = [
    [-0.7, y],
    [-0.15, y - 0.2],
    [0.4, y],
    [0.9, y - 0.2],
  ];

  return positions.slice(0, count).flatMap(([x, dropY]) =>
    tearFaces({
      position: [x, dropY, 0.55],
      scale: [size, size * 1.15, size],
      palette: RAIN,
      rotation: [0.2, 0.3],
    }),
  );
}

export function snowFaces({
  y = -1.05,
  count = 3,
  size = 0.24,
}: {
  y?: number;
  count?: number;
  size?: number;
} = {}): Face[] {
  const positions: Array<[number, number]> = [
    [-0.6, y],
    [0.05, y - 0.2],
    [0.65, y],
  ];

  return positions.slice(0, count).flatMap(([x, flakeY]) =>
    starFaces({ position: [x, flakeY, 0.55], size, palette: SNOW }),
  );
}

/** Two folded paper shards form a chunky lightning bolt. */
export function lightningFaces(): Face[] {
  return [
    ...foldedPolygon(
      [
        [0.18, 0.75],
        [-0.32, 0.06],
        [0.0, 0.06],
        [0.1, 0.42],
      ],
      [0.0, 0.34],
      0.55,
      BOLT,
    ),
    ...foldedPolygon(
      [
        [0.0, 0.06],
        [-0.18, -0.95],
        [0.42, 0.16],
        [0.1, 0.16],
      ],
      [0.08, -0.2],
      0.57,
      BOLT,
      1,
    ),
  ];
}

export function fogFaces(): Face[] {
  return [
    ...foldedRibbon(
      [
        [-1.15, -0.72],
        [-0.4, -0.77],
        [0.35, -0.72],
        [1.15, -0.77],
      ],
      { width: 0.28, palette: FOG, z: 0.25, taper: 0.2 },
    ),
    ...foldedRibbon(
      [
        [-0.95, -1.04],
        [-0.2, -1.09],
        [0.55, -1.04],
        [1.05, -1.09],
      ],
      { width: 0.26, palette: FOG, z: 0.3, taper: 0.2, bias: 1 },
    ),
    ...foldedRibbon(
      [
        [-0.75, -1.36],
        [-0.05, -1.41],
        [0.7, -1.36],
      ],
      { width: 0.24, palette: FOG, z: 0.35, taper: 0.2, bias: 2 },
    ),
  ];
}

export function windFaces({
  palette = AIR_WIND,
  z = 0,
}: {
  palette?: Palette;
  z?: number;
} = {}): Face[] {
  return [
    ...foldedRibbon(
      [
        [-1.25, 0.55],
        [-0.45, 0.5],
        [0.35, 0.62],
        [0.95, 0.75],
        [1.18, 0.55],
        [1.05, 0.4],
      ],
      { width: 0.3, palette, z, taper: 0.5 },
    ),
    ...foldedRibbon(
      [
        [-1.1, 0.05],
        [-0.25, 0.0],
        [0.6, 0.1],
        [1.12, 0.25],
      ],
      { width: 0.32, palette, z: z + 0.05, taper: 0.6, bias: 1 },
    ),
    ...foldedRibbon(
      [
        [-0.95, -0.45],
        [-0.15, -0.5],
        [0.55, -0.4],
      ],
      { width: 0.28, palette, z: z + 0.1, taper: 0.6, bias: 2 },
    ),
  ];
}

export function airParticlesFaces(palette: Palette): Face[] {
  return [
    ...octahedronFaces({ position: [-0.85, 0.72, 0.5], scale: [0.14, 0.14, 0.14], palette }),
    ...octahedronFaces({ position: [0.82, 0.25, 0.55], scale: [0.11, 0.11, 0.11], palette }),
    ...octahedronFaces({ position: [0.35, -0.65, 0.6], scale: [0.16, 0.16, 0.16], palette }),
  ];
}

export function airFaces(tone: AirTone = 'unknown'): Face[] {
  return [...windFaces(), ...airParticlesFaces(AIR_TONE_PALETTES[tone])];
}

export function horizonFaces(palette: Palette, y = -0.62): Face[] {
  return [
    ...foldedRibbon(
      [
        [-1.45, y],
        [-0.5, y - 0.03],
        [0.5, y - 0.03],
        [1.45, y],
      ],
      { width: 0.18, palette, z: 0.32, taper: 0, ridge: 0.04 },
    ),
    ...foldedRibbon(
      [
        [-1.45, y - 0.18],
        [-0.5, y - 0.21],
        [0.5, y - 0.21],
        [1.45, y - 0.18],
      ],
      { width: 0.22, palette, z: 0.28, taper: 0, ridge: 0.04, bias: 1 },
    ),
  ];
}

/** Half sun sitting on a folded horizon, with rays in the upper sky. */
export function sunHorizonFaces({ sunset }: { sunset: boolean }): Face[] {
  const palette = sunset ? SUNSET_SUN : SUN;
  const ground = sunset ? GROUND_SUNSET : GROUND_SUNRISE;
  const horizonY = sunset ? -0.72 : -0.62;
  const domeScale = sunset ? 0.92 : 1;

  const faces = [
    ...hemisphereFaces({
      position: [0, horizonY, 0],
      scale: [domeScale, domeScale, domeScale],
      palette,
      rotation: [0.15, 0.3],
    }),
    ...horizonFaces(ground, horizonY),
  ];

  const rayCount = 7;
  for (let index = 0; index < rayCount; index += 1) {
    const angle = Math.PI * (0.12 + 0.76 * (index / (rayCount - 1)));
    faces.push(
      ...foldedKite({
        angle,
        inner: domeScale + 0.06,
        outer: domeScale + 0.5,
        palette,
        z: -0.2,
        centre: [0, horizonY],
        spread: 0.17,
      }),
    );
  }

  return faces;
}

export function umbrellaFaces(): Face[] {
  return [
    ...hemisphereFaces({
      position: [0, 0.15, 0],
      scale: [1.0, 0.5, 1.0],
      palette: UMBRELLA,
      rotation: [0.2, 0.3],
    }),
    ...foldedRibbon(
      [
        [-1.0, 0.15],
        [-0.5, 0.12],
        [0, 0.1],
        [0.5, 0.12],
        [1.0, 0.15],
      ],
      { width: 0.12, palette: UMBRELLA, z: 0.05, taper: 0, ridge: 0.03 },
    ),
    ...foldedRibbon(
      [
        [0, 0.1],
        [0, -0.6],
        [-0.05, -0.8],
        [0.12, -0.9],
        [0.28, -0.82],
      ],
      { width: 0.13, palette: HANDLE, z: 0.22, taper: 0.2, ridge: 0.03 },
    ),
  ];
}

export function thermometerFaces({ warm = false }: { warm?: boolean } = {}): Face[] {
  const liquid = warm ? WARM : COLD;

  return [
    ...prismFaces({
      position: [0, 0.03, 0],
      scale: [0.3, 1.05, 0.3],
      palette: TUBE,
      sides: 6,
    }),
    ...sphereFaces({
      position: [0, -0.67, 0],
      scale: [0.42, 0.42, 0.42],
      palette: liquid,
    }),
    ...prismFaces({
      position: [0, -0.47, 0.14],
      scale: [0.14, 0.65, 0.14],
      palette: liquid,
      sides: 6,
    }),
  ];
}

export function clockFaces(): Face[] {
  return [
    ...prismFaces({
      position: [0, 0, 0],
      rotation: [0, Math.PI / 2],
      scale: [1.0, 0.18, 1.0],
      palette: CLOCK_RIM,
      sides: 12,
    }),
    ...prismFaces({
      position: [0, 0, 0.1],
      rotation: [0, Math.PI / 2],
      scale: [0.82, 0.1, 0.82],
      palette: CLOCK_FACE,
      sides: 12,
    }),
    ...foldedRibbon(
      [
        [0, 0],
        [0, 0.55],
      ],
      { width: 0.1, palette: CLOCK_HAND, z: 0.22, taper: 0.2, ridge: 0.02 },
    ),
    ...foldedRibbon(
      [
        [0, 0],
        [0.38, -0.2],
      ],
      { width: 0.1, palette: CLOCK_HAND, z: 0.22, taper: 0.2, ridge: 0.02 },
    ),
  ];
}

export function pinFaces(): Face[] {
  return [
    ...coneFaces({
      position: [0, 0.35, 0],
      rotation: [0, Math.PI],
      scale: [0.48, 1.0, 0.48],
      palette: PIN,
      sides: 8,
    }),
    ...sphereFaces({
      position: [0, 0.3, 0],
      scale: [0.5, 0.5, 0.5],
      palette: PIN,
    }),
    ...sphereFaces({
      position: [0, 0.3, 0.52],
      scale: [0.18, 0.18, 0.18],
      palette: PIN_HOLE,
    }),
  ];
}

export function rainCloudCardFaces(): Face[] {
  return [
    ...cloudFaces({ offset: [0, 0.25, 0], scale: 0.8 }),
    ...rainFaces({ y: -0.72, count: 2, size: 0.2 }),
  ];
}

export function humidityFaces(): Face[] {
  return tearFaces({
    position: [0, -0.12, 0],
    scale: [1.3, 1.4, 1.3],
    palette: RAIN,
    rotation: [0.2, 0.3],
  });
}
