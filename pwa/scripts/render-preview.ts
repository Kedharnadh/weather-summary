/**
 * Dev-only preview sheet for the low-poly icon scenes. Renders every weather
 * icon and card icon into one SVG, then rasterises it with sharp so the result
 * can be eyeballed without launching the app.
 *
 *   npx vite-node scripts/render-preview.ts
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { cardIconScene, type CardIconKind } from '../src/components/CardIcon';
import { renderFaces, type Face } from '../src/components/icon3d';
import { weatherScene, type WeatherIconKind } from '../src/components/WeatherIcon';

const WEATHER_KINDS: WeatherIconKind[] = [
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

const CARD_KINDS: Array<{ kind: CardIconKind; tone?: Parameters<typeof cardIconScene>[1]['tone'] }> = [
  { kind: 'rain' },
  { kind: 'umbrella' },
  { kind: 'temperature', tone: undefined },
  { kind: 'feels' },
  { kind: 'wind' },
  { kind: 'humidity' },
  { kind: 'sunrise' },
  { kind: 'sunset' },
  { kind: 'air', tone: 'good' },
  { kind: 'air', tone: 'very-poor' },
  { kind: 'clock' },
  { kind: 'location' },
];

interface Entry {
  label: string;
  polygons: ReturnType<typeof renderFaces>;
  shadow?: { y: number; rx: number };
}

function polygonsMarkup(entry: Entry, offsetX: number, offsetY: number): string {
  const shadow = entry.shadow
    ? `<ellipse cx="${offsetX + 32}" cy="${offsetY + entry.shadow.y}" rx="${entry.shadow.rx}" ry="3" fill="#0f172a" opacity="0.16"/>`
    : '';
  const body = entry.polygons
    .map((polygon) => `<polygon points="${polygon.points}" fill="${polygon.fill}"/>`)
    .join('');
  return shadow + body;
}

function escapeLabel(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const entries: Entry[] = [];

for (const kind of WEATHER_KINDS) {
  const scene = weatherScene(kind);
  entries.push({
    label: kind,
    polygons: renderFaces(scene.faces, 32, 33, 15.5),
    shadow: scene.shadow,
  });
}

for (const entry of CARD_KINDS) {
  const scene = cardIconScene(entry.kind, { tone: entry.tone });
  entries.push({
    label: entry.tone ? `${entry.kind} (${entry.tone})` : entry.kind,
    polygons: renderFaces(scene.faces, 32, 32, scene.scale),
  });
}

const cellWidth = 150;
const cellHeight = 150;
const columns = 7;
const rows = Math.ceil(entries.length / columns);
const iconScale = 1.65;
const iconSize = 64 * iconScale;
const width = columns * cellWidth;
const height = rows * cellHeight;

const cells = entries
  .map((entry, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * cellWidth + (cellWidth - iconSize) / 2;
    const originY = row * cellHeight + 10;

    return `
      <g>
        <rect x="${column * cellWidth + 6}" y="${row * cellHeight + 6}" width="${cellWidth - 12}" height="${cellHeight - 12}" rx="18" fill="#e2e8f0"/>
        <g transform="translate(${originX} ${originY}) scale(${iconScale})">
          ${polygonsMarkup(entry, 0, 0)}
        </g>
        <text x="${column * cellWidth + cellWidth / 2}" y="${row * cellHeight + cellHeight - 14}" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="11" fill="#334155">${escapeLabel(entry.label)}</text>
      </g>`;
  })
  .join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f1f5f9"/>
  ${cells}
</svg>`;

const outDir = resolve('scripts', 'preview');
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'icons-3d.svg'), svg, 'utf8');
await sharp(Buffer.from(svg)).png().toFile(resolve(outDir, 'icons-3d.png'));

console.log(`Wrote ${resolve(outDir, 'icons-3d.png')} (${entries.length} icons)`);
