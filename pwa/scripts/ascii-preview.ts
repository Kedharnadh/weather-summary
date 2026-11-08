/**
 * Dev-only ASCII silhouette preview. Rasterises each icon's polygons into a
 * coarse character grid so shape problems are visible in a terminal.
 *
 *   npx vite-node scripts/ascii-preview.ts [kind ...]
 */

import { cardIconScene, type CardIconKind } from '../src/components/CardIcon';
import { renderFaces, type RenderFace } from '../src/components/icon3d';
import { weatherScene, type WeatherIconKind } from '../src/components/WeatherIcon';

const COLS = 40;
const ROWS = 20;

function inside(point: [number, number], polygon: Array<[number, number]>): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects =
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) result = !result;
  }
  return result;
}

function silhouette(polygons: RenderFace[]): string {
  const parsed = polygons.map((polygon) =>
    polygon.points.split(' ').map((pair) => pair.split(',').map(Number) as [number, number]),
  );

  const lines: string[] = [];
  for (let row = 0; row < ROWS; row += 1) {
    let line = '';
    for (let col = 0; col < COLS; col += 1) {
      const point: [number, number] = [((col + 0.5) / COLS) * 64, ((row + 0.5) / ROWS) * 64];
      line += parsed.some((polygon) => inside(point, polygon)) ? '#' : ' ';
    }
    lines.push(line.replace(/\s+$/, ''));
  }
  return lines.join('\n');
}

const requested = process.argv.slice(2);

const scenes: Array<{ label: string; polygons: RenderFace[] }> = [];

const weatherKinds: WeatherIconKind[] = [
  'clear-day',
  'clear-night',
  'partly-cloudy-day',
  'cloudy',
  'fog',
  'rain',
  'snow',
  'thunderstorm',
];

const cardKinds: CardIconKind[] = [
  'rain',
  'umbrella',
  'temperature',
  'wind',
  'humidity',
  'sunrise',
  'sunset',
  'air',
  'clock',
  'location',
];

for (const kind of weatherKinds) {
  const scene = weatherScene(kind);
  scenes.push({ label: `weather:${kind}`, polygons: renderFaces(scene.faces, 32, 33, 15.5) });
}

for (const kind of cardKinds) {
  const scene = cardIconScene(kind, { tone: kind === 'air' ? 'good' : undefined });
  scenes.push({ label: `card:${kind}`, polygons: renderFaces(scene.faces, 32, 32, scene.scale) });
}

for (const scene of scenes) {
  if (requested.length > 0 && !requested.some((needle) => scene.label.includes(needle))) continue;
  console.log(`\n${scene.label}\n${'-'.repeat(COLS)}`);
  console.log(silhouette(scene.polygons));
}
