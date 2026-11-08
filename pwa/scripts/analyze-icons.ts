/**
 * Dev-only geometry report for the low-poly icon scenes. Prints the projected
 * bounding box (in the 64x64 icon space), facet count, colour count, and any
 * degenerate triangles so layout problems are visible without an image.
 *
 *   npx vite-node scripts/analyze-icons.ts
 */

import { cardIconScene, type CardIconKind } from '../src/components/CardIcon';
import { renderFaces, type Face } from '../src/components/icon3d';
import { weatherScene, type WeatherIconKind } from '../src/components/WeatherIcon';

interface Report {
  label: string;
  faces: Face[];
  cx: number;
  cy: number;
  scale: number;
}

const weatherKinds: WeatherIconKind[] = [
  'clear-day',
  'clear-night',
  'partly-cloudy-day',
  'partly-cloudy-night',
  'cloudy',
  'fog',
  'drizzle',
  'rain',
  'showers',
  'snow',
  'snow-showers',
  'thunderstorm',
  'unknown',
];

const cardKinds: CardIconKind[] = [
  'rain',
  'umbrella',
  'temperature',
  'feels',
  'wind',
  'humidity',
  'sunrise',
  'sunset',
  'air',
  'clock',
  'location',
];

const reports: Report[] = weatherKinds.map((kind) => {
  const scene = weatherScene(kind);
  return { label: kind, faces: scene.faces, cx: 32, cy: 33, scale: 15.5 };
});

for (const kind of cardKinds) {
  const scene = cardIconScene(kind, { tone: kind === 'air' ? 'good' : undefined });
  reports.push({ label: `card:${kind}`, faces: scene.faces, cx: 32, cy: 32, scale: scene.scale });
}

let failures = 0;

for (const report of reports) {
  const polygons = renderFaces(report.faces, report.cx, report.cy, report.scale);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let degenerate = 0;
  let nonFinite = 0;
  const colours = new Set<string>();

  for (const polygon of polygons) {
    colours.add(polygon.fill);
    const points = polygon.points.split(' ').map((pair) => pair.split(',').map(Number));
    if (points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) {
      nonFinite += 1;
      continue;
    }

    const [a, b, c] = points;
    const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
    if (area < 0.01) degenerate += 1;

    for (const [x, y] of points) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const outside = minX < 2 || maxX > 62 || minY < 2 || maxY > 62;
  const tiny = width < 10 || height < 10;

  if (nonFinite || degenerate > 0 || outside || tiny) failures += 1;

  console.log(
    [
      report.label.padEnd(22),
      `faces=${String(polygons.length).padStart(3)}`,
      `colours=${String(colours.size).padStart(2)}`,
      `x=[${minX.toFixed(1)}, ${maxX.toFixed(1)}]`,
      `y=[${minY.toFixed(1)}, ${maxY.toFixed(1)}]`,
      `size=${width.toFixed(1)}x${height.toFixed(1)}`,
      nonFinite ? `NaN=${nonFinite}` : '',
      degenerate ? `degenerate=${degenerate}` : '',
      outside ? 'OUTSIDE' : '',
      tiny ? 'TINY' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );
}

console.log(`\n${failures === 0 ? 'OK' : `${failures} scene(s) need attention`}`);
