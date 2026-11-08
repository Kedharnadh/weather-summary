import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const outDir = resolve('scripts', 'preview');
await mkdir(outDir, { recursive: true });

const PHI = (1 + Math.sqrt(5)) / 2;
const ICO_VERTS = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
].map(normalize3);
const ICO_FACES = [
  [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
  [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
  [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
  [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
];

const OCTA_VERTS = [
  [0,1,0],[1,0,0],[0,0,1],[-1,0,0],[0,0,-1],[0,-1,0],
].map(normalize3);
const OCTA_FACES = [
  [0,1,2],[0,2,3],[0,3,4],[0,4,1],
  [5,2,1],[5,3,2],[5,4,3],[5,1,4],
];

const LIGHT = normalize3([-0.55, 0.85, 0.7]);

function normalize3(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
function sub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function cross(a, b) {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}
function dot(a, b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function rotate(v, yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const x1 = v[0]*cy + v[2]*sy;
  const z1 = -v[0]*sy + v[2]*cy;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const y1 = v[1]*cp - z1*sp;
  const z2 = v[1]*sp + z1*cp;
  return [x1, y1, z2];
}

function meshFaces({ verts, faces, pos, rot, radius, palette, cx, cy, scale }) {
  const rotated = verts.map((v) => {
    const scaled = [v[0]*radius, v[1]*radius, v[2]*radius];
    const r = rotate(scaled, rot[0], rot[1]);
    return [r[0]+pos[0], r[1]+pos[1], r[2]+pos[2]];
  });
  const out = [];
  for (const [i, j, k] of faces) {
    const a = rotated[i], b = rotated[j], c = rotated[k];
    const n = normalize3(cross(sub(b, a), sub(c, a)));
    if (n[2] <= 0.02) continue;
    const d = Math.max(0, dot(n, LIGHT));
    const index = Math.min(palette.length - 1, Math.floor((1 - d) * palette.length));
    out.push({
      points: [a, b, c]
        .map((p) => `${(cx + p[0]*scale).toFixed(2)},${(cy - p[1]*scale).toFixed(2)}`)
        .join(' '),
      color: palette[index],
      depth: (a[2] + b[2] + c[2]) / 3,
    });
  }
  return out;
}

function scene(faces) {
  faces.sort((a, b) => a.depth - b.depth);
  return faces.map((f) => `<polygon points="${f.points}" fill="${f.color}" stroke="${f.color}" stroke-width="0.35" stroke-linejoin="round"/>`).join('');
}

const CLOUD_BACK = ['#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b'];
const CLOUD_MAIN = ['#ffffff', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8'];
const CLOUD_BASE = ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569'];
const CLOUD_DARK = ['#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155'];
const SUN_PAL = ['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b'];
const MOON_PAL = ['#ffffff', '#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8'];
const RAIN_PAL = ['#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0284c7'];
const SNOW_PAL = ['#ffffff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#0ea5e9'];
const BOLT_PAL = ['#fef9c3', '#fde047', '#facc15', '#eab308', '#ca8a04'];

function cloudFaces({ cx = 32, cy = 36, scale = 17, dark = false, offsetX = 0, offsetY = 0 } = {}) {
  const main = dark ? CLOUD_DARK : CLOUD_MAIN;
  const back = dark ? CLOUD_DARK : CLOUD_BACK;
  const base = dark ? CLOUD_DARK : CLOUD_BASE;
  const puffs = [
    { pos: [-0.62 + offsetX, 0.02 + offsetY, -0.22], r: 0.5, rot: [0.4, 0.5], pal: back },
    { pos: [0.6 + offsetX, 0.0 + offsetY, -0.18], r: 0.5, rot: [0.1, -0.5], pal: back },
    { pos: [-0.3 + offsetX, 0.24 + offsetY, 0.12], r: 0.6, rot: [-0.3, 0.7], pal: main },
    { pos: [0.3 + offsetX, 0.22 + offsetY, 0.16], r: 0.58, rot: [0.5, -0.3], pal: main },
    { pos: [0.0 + offsetX, 0.5 + offsetY, 0.02], r: 0.48, rot: [0.2, 0.1], pal: main },
    { pos: [0.0 + offsetX, -0.16 + offsetY, 0.28], r: 0.66, rot: [0.1, 0.2], pal: base },
  ];
  const faces = [];
  for (const p of puffs) {
    faces.push(...meshFaces({ verts: ICO_VERTS, faces: ICO_FACES, pos: p.pos, rot: p.rot, radius: p.r, palette: p.pal, cx, cy, scale }));
  }
  return faces;
}

function sunFaces({ cx = 32, cy = 32, scale = 17, radius = 0.72 } = {}) {
  return meshFaces({ verts: ICO_VERTS, faces: ICO_FACES, pos: [0, 0, 0], rot: [0.35, 0.6], radius, palette: SUN_PAL, cx, cy, scale });
}

function moonFaces({ cx = 32, cy = 32, scale = 17, radius = 0.8 } = {}) {
  return meshFaces({ verts: ICO_VERTS, faces: ICO_FACES, pos: [0, 0, 0], rot: [0.2, 0.4], radius, palette: MOON_PAL, cx, cy, scale });
}

function dropFaces({ x, y, s = 1, cx = 32, cy = 32, scale = 17 } = {}) {
  const pos = [(x - 32) / scale, (32 - y) / scale, 0.5];
  return meshFaces({ verts: OCTA_VERTS, faces: OCTA_FACES, pos, rot: [0.2, 0.3], radius: 0.2 * s, palette: RAIN_PAL, cx, cy, scale });
}

function starFaces({ x, y, s = 1, cx = 32, cy = 32, scale = 17 } = {}) {
  const pos = [(x - 32) / scale, (32 - y) / scale, 0.5];
  return meshFaces({ verts: OCTA_VERTS, faces: OCTA_FACES, pos, rot: [0.3, 0.5], radius: 0.2 * s, palette: SNOW_PAL, cx, cy, scale });
}

function boltFaces({ cx = 32, cy = 32, scale = 17 } = {}) {
  // Two folded 3D shards.
  const faces = [];
  faces.push(...meshFaces({ verts: OCTA_VERTS, faces: OCTA_FACES, pos: [0.08, -0.32, 0.6], rot: [0.2, 0.1], radius: 0.34, palette: BOLT_PAL, cx, cy, scale }));
  faces.push(...meshFaces({ verts: OCTA_VERTS, faces: OCTA_FACES, pos: [-0.06, -0.62, 0.6], rot: [0.5, 0.2], radius: 0.26, palette: BOLT_PAL, cx, cy, scale }));
  return faces;
}

function icon(name) {
  const faces = [];
  let shadow = '';
  let extras = '';
  switch (name) {
    case 'sun':
      shadow = '<ellipse cx="32" cy="58" rx="13" ry="3" fill="#0f172a" opacity="0.15"/>';
      faces.push(...sunFaces());
      break;
    case 'cloud':
      shadow = '<ellipse cx="32" cy="58" rx="21" ry="3.4" fill="#0f172a" opacity="0.16"/>';
      faces.push(...cloudFaces());
      break;
    case 'partly':
      shadow = '<ellipse cx="32" cy="58" rx="21" ry="3.4" fill="#0f172a" opacity="0.16"/>';
      faces.push(...sunFaces({ cx: 21, cy: 22, scale: 17, radius: 0.52 }));
      faces.push(...cloudFaces({ cy: 38, offsetX: 0.18, offsetY: -0.1 }));
      break;
    case 'rain':
      shadow = '<ellipse cx="32" cy="60" rx="21" ry="3.4" fill="#0f172a" opacity="0.16"/>';
      faces.push(...cloudFaces({ cy: 34 }));
      faces.push(...dropFaces({ x: 20, y: 53, s: 0.9 }));
      faces.push(...dropFaces({ x: 30, y: 56, s: 0.9 }));
      faces.push(...dropFaces({ x: 40, y: 53, s: 0.9 }));
      faces.push(...dropFaces({ x: 49, y: 56, s: 0.9 }));
      break;
    case 'snow':
      shadow = '<ellipse cx="32" cy="60" rx="21" ry="3.4" fill="#0f172a" opacity="0.16"/>';
      faces.push(...cloudFaces({ cy: 34 }));
      faces.push(...starFaces({ x: 21, y: 53, s: 1 }));
      faces.push(...starFaces({ x: 33, y: 57, s: 0.9 }));
      faces.push(...starFaces({ x: 45, y: 53, s: 1 }));
      break;
    case 'thunder':
      shadow = '<ellipse cx="32" cy="60" rx="21" ry="3.4" fill="#0f172a" opacity="0.16"/>';
      faces.push(...cloudFaces({ cy: 33, dark: true }));
      faces.push(...boltFaces());
      break;
    case 'moon':
      shadow = '<ellipse cx="32" cy="58" rx="13" ry="3" fill="#0f172a" opacity="0.15"/>';
      faces.push(...moonFaces());
      extras = '<circle cx="13" cy="15" r="2.2" fill="#f8fafc"/><circle cx="49" cy="18" r="1.7" fill="#fde68a"/><circle cx="52" cy="44" r="2" fill="#f8fafc"/>';
      break;
    default:
      faces.push(...cloudFaces());
  }
  return `<g>${shadow}${scene(faces)}${extras}</g>`;
}

const names = ['sun', 'cloud', 'partly', 'rain', 'snow', 'thunder', 'moon'];
const cell = 180;
const cols = 4;
const rows = Math.ceil(names.length / cols);
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols*cell}" height="${rows*cell}" viewBox="0 0 ${cols*cell} ${rows*cell}">`;
svg += `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs>`;
svg += `<rect width="100%" height="100%" fill="url(#bg)"/>`;
names.forEach((name, i) => {
  const x = (i % cols) * cell;
  const y = Math.floor(i / cols) * cell;
  svg += `<g transform="translate(${x + 18} ${y + 18}) scale(2.25)">${icon(name)}</g>`;
  svg += `<text x="${x + cell/2}" y="${y + cell - 12}" text-anchor="middle" fill="#94a3b8" font-family="Segoe UI, Arial" font-size="12">${name}</text>`;
});
svg += '</svg>';

await writeFile(resolve(outDir, 'icons.svg'), svg);
await sharp(Buffer.from(svg)).png().toFile(resolve(outDir, 'icons.png'));
console.log('wrote scripts/preview/icons.svg and icons.png');

