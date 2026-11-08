import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = resolve(root, 'public');
const iconsDir = resolve(publicDir, 'icons');

const DEFS = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0ea5e9"/>
      <stop offset="0.55" stop-color="#2563eb"/>
      <stop offset="1" stop-color="#1e1b4b"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.2" r="0.8">
      <stop offset="0" stop-color="#7dd3fc" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#7dd3fc" stop-opacity="0"/>
    </radialGradient>
  </defs>
`;

function facetedCircle(cx, cy, radius, count, colors) {
  const points = Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });

  return points
    .map((point, index) => {
      const next = points[(index + 1) % count];
      return `<polygon points="${cx},${cy} ${point[0].toFixed(1)},${point[1].toFixed(
        1,
      )} ${next[0].toFixed(1)},${next[1].toFixed(1)}" fill="${
        colors[index % colors.length]
      }"/>`;
    })
    .join('');
}

function sunRays(cx, cy, inner, outer, count, colors) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const left = angle - 0.2;
    const right = angle + 0.2;
    const p1 = [cx + Math.cos(left) * inner, cy + Math.sin(left) * inner];
    const p2 = [cx + Math.cos(right) * inner, cy + Math.sin(right) * inner];
    const p3 = [cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer];
    return `<polygon points="${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(
      1,
    )},${p2[1].toFixed(1)} ${p3[0].toFixed(1)},${p3[1].toFixed(1)}" fill="${
      colors[index % colors.length]
    }"/>`;
  }).join('');
}

const CLOUD_OUTLINE = [
  [8, 40],
  [10, 30],
  [18, 23],
  [28, 20],
  [38, 21],
  [47, 27],
  [52, 36],
  [50, 44],
  [44, 48],
  [16, 48],
  [10, 45],
];

function facetedCloud(cx, cy, scale, palette) {
  const points = CLOUD_OUTLINE.map(([x, y]) => [
    cx + (x - 30) * scale,
    cy + (y - 36) * scale,
  ]);
  const top = cy - 16 * scale;
  const height = 28 * scale;

  return points
    .map((point, index) => {
      const next = points[(index + 1) % points.length];
      const averageY = (point[1] + next[1] + cy) / 3;
      const ratio = Math.max(0, Math.min(0.999, (averageY - top) / height));
      const shade =
        palette[Math.min(palette.length - 1, Math.floor(ratio * palette.length))];
      return `<polygon points="${cx},${cy} ${point[0].toFixed(1)},${point[1].toFixed(
        1,
      )} ${next[0].toFixed(1)},${next[1].toFixed(1)}" fill="${shade}"/>`;
    })
    .join('');
}

function rainDrop(x, y, scale) {
  return `
    <polygon points="${x},${y - 26 * scale} ${x - 16 * scale},${y - 2 * scale} ${
      x - 8 * scale
    },${y + 20 * scale} ${x},${y + 6 * scale}" fill="#7dd3fc"/>
    <polygon points="${x},${y - 26 * scale} ${x + 16 * scale},${y - 2 * scale} ${
      x + 8 * scale
    },${y + 20 * scale} ${x},${y + 6 * scale}" fill="#0ea5e9"/>
    <polygon points="${x - 8 * scale},${y + 20 * scale} ${x},${y + 6 * scale} ${
      x + 8 * scale
    },${y + 20 * scale} ${x},${y + 24 * scale}" fill="#0284c7"/>
  `;
}

const CONTENT = `
  <ellipse cx="256" cy="430" rx="160" ry="26" fill="#020617" opacity="0.28"/>
  ${sunRays(350, 168, 94, 128, 8, ['#fbbf24', '#f59e0b'])}
  ${facetedCircle(350, 168, 86, 10, [
    '#fde68a',
    '#fcd34d',
    '#fbbf24',
    '#f59e0b',
    '#fcd34d',
    '#fde68a',
    '#fbbf24',
    '#f59e0b',
    '#fcd34d',
    '#fde68a',
  ])}
  ${facetedCloud(232, 300, 4.4, [
    '#ffffff',
    '#f8fafc',
    '#e2e8f0',
    '#cbd5e1',
    '#94a3b8',
  ])}
  ${rainDrop(206, 390, 1.5)}
  ${rainDrop(256, 408, 1.6)}
  ${rainDrop(306, 390, 1.5)}
`;

function svgDocument({ maskable = false } = {}) {
  const background = maskable
    ? '<rect width="512" height="512" fill="url(#bg)"/>'
    : '<rect width="512" height="512" rx="112" fill="url(#bg)"/>';
  const body = maskable
    ? `<g transform="translate(256 256) scale(0.78) translate(-256 -256)">${CONTENT}</g>`
    : CONTENT;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    ${DEFS}
    ${background}
    <circle cx="170" cy="140" r="210" fill="url(#glow)"/>
    ${body}
  </svg>`;
}

/** 600x400 preview used by the Windows 11 widget picker. */
function widgetScreenshotSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    ${DEFS}
    <rect width="600" height="400" fill="url(#bg)"/>
    <circle cx="90" cy="50" r="260" fill="url(#glow)"/>
    <rect x="32" y="32" width="536" height="336" rx="30" fill="#ffffff" fill-opacity="0.08" stroke="#94a3b8" stroke-opacity="0.28"/>
    <g transform="translate(-10 20) scale(0.5)">
      ${sunRays(350, 168, 94, 128, 8, ['#fbbf24', '#f59e0b'])}
      ${facetedCircle(350, 168, 86, 10, [
        '#fde68a',
        '#fcd34d',
        '#fbbf24',
        '#f59e0b',
        '#fcd34d',
        '#fde68a',
        '#fbbf24',
        '#f59e0b',
        '#fcd34d',
        '#fde68a',
      ])}
      ${facetedCloud(232, 300, 4.4, [
        '#ffffff',
        '#f8fafc',
        '#e2e8f0',
        '#cbd5e1',
        '#94a3b8',
      ])}
    </g>
    <text x="250" y="120" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="700" fill="#e8eefb">London, UK</text>
    <text x="250" y="148" font-family="Segoe UI, Arial, sans-serif" font-size="14" fill="#9aa8bd">Updated 14:05</text>
    <text x="250" y="222" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="700" fill="#ffffff">12°</text>
    <text x="250" y="252" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#9aa8bd">Overcast</text>
    <text x="250" y="300" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#e8eefb">12°, overcast; rain possible</text>
    <text x="250" y="322" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#e8eefb">after 15:00.</text>
    <text x="250" y="352" font-family="Segoe UI, Arial, sans-serif" font-size="13" fill="#7dd3fc">Rain possible after 15:00.</text>
  </svg>`;
}

await mkdir(iconsDir, { recursive: true });

const iconSvg = svgDocument();
const maskableSvg = svgDocument({ maskable: true });

await writeFile(resolve(publicDir, 'favicon.svg'), iconSvg);
await writeFile(resolve(iconsDir, 'icon.svg'), iconSvg);
await writeFile(resolve(iconsDir, 'icon-maskable.svg'), maskableSvg);

const targets = [
  { svg: iconSvg, size: 192, out: 'icon-192.png' },
  { svg: iconSvg, size: 512, out: 'icon-512.png' },
  { svg: maskableSvg, size: 512, out: 'icon-512-maskable.png' },
  { svg: iconSvg, size: 180, out: 'apple-touch-icon.png' },
];

for (const target of targets) {
  await sharp(Buffer.from(target.svg))
    .resize(target.size, target.size)
    .png()
    .toFile(resolve(iconsDir, target.out));
  console.log(`wrote public/icons/${target.out}`);
}

await sharp(Buffer.from(widgetScreenshotSvg()))
  .png()
  .toFile(resolve(iconsDir, 'widget-screenshot.png'));
console.log('wrote public/icons/widget-screenshot.png');

console.log('Low-poly icons generated.');
