/**
 * A tiny deterministic low-poly 3D renderer.
 *
 * The weather icons are built from real faceted meshes (icospheres, cones,
 * prisms, folded paper ribbons) and projected orthographically into SVG. Flat
 * shading comes from a single light direction, so every triangle reads as a
 * folded paper facet. No image assets, 3D runtime, or WebGL are required.
 */

export type Vec3 = readonly [number, number, number];
export type Palette = readonly string[];

export interface Face {
  points: readonly [Vec3, Vec3, Vec3];
  normal: Vec3;
  palette: Palette;
  /** Mesh faces are backface-culled; folded paper faces are double-sided. */
  cull?: boolean;
  twoSided?: boolean;
  /** Shift the palette index to exaggerate folds. */
  bias?: number;
}

export interface RenderFace {
  points: string;
  fill: string;
  depth: number;
}

/** Key light, from the upper left and slightly in front. */
export const LIGHT: Vec3 = normalize([-0.48, 0.82, 0.68]);

export function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scaleVec(v: Vec3, scale: number): Vec3 {
  return [v[0] * scale, v[1] * scale, v[2] * scale];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function average(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
}

/** Rotate around Y (yaw), then X (pitch). */
export function rotate(v: Vec3, yaw: number, pitch: number): Vec3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = v[0] * cy + v[2] * sy;
  const z1 = -v[0] * sy + v[2] * cy;

  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const y1 = v[1] * cp - z1 * sp;
  const z2 = v[1] * sp + z1 * cp;

  return [x1, y1, z2];
}

const PHI = (1 + Math.sqrt(5)) / 2;

const ICO_VERTICES: readonly Vec3[] = (
  [
    [-1, PHI, 0],
    [1, PHI, 0],
    [-1, -PHI, 0],
    [1, -PHI, 0],
    [0, -1, PHI],
    [0, 1, PHI],
    [0, -1, -PHI],
    [0, 1, -PHI],
    [PHI, 0, -1],
    [PHI, 0, 1],
    [-PHI, 0, -1],
    [-PHI, 0, 1],
  ] as Vec3[]
).map(normalize);

const ICO_FACES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 11, 5],
  [0, 5, 1],
  [0, 1, 7],
  [0, 7, 10],
  [0, 10, 11],
  [1, 5, 9],
  [5, 11, 4],
  [11, 10, 2],
  [10, 7, 6],
  [7, 1, 8],
  [3, 9, 4],
  [3, 4, 2],
  [3, 2, 6],
  [3, 6, 8],
  [3, 8, 9],
  [4, 9, 5],
  [2, 4, 11],
  [6, 2, 10],
  [8, 6, 7],
  [9, 8, 1],
];

const OCTA_VERTICES: readonly Vec3[] = (
  [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, 1],
    [-1, 0, 0],
    [0, 0, -1],
    [0, -1, 0],
  ] as Vec3[]
).map(normalize);

const OCTA_FACES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2],
  [0, 2, 3],
  [0, 3, 4],
  [0, 4, 1],
  [5, 2, 1],
  [5, 3, 2],
  [5, 4, 3],
  [5, 1, 4],
];

export interface MeshOptions {
  vertices: readonly Vec3[];
  faces: ReadonlyArray<readonly [number, number, number]>;
  position?: Vec3;
  rotation?: readonly [number, number];
  scale?: Vec3;
  palette: Palette;
  cull?: boolean;
}

/**
 * Transform a convex mesh into world-space triangles. Face normals are
 * oriented outward using the mesh centroid, so the source winding does not
 * matter and non-uniform scales still shade correctly.
 */
export function meshFaces({
  vertices,
  faces,
  position = [0, 0, 0],
  rotation = [0, 0],
  scale = [1, 1, 1],
  palette,
  cull = true,
}: MeshOptions): Face[] {
  const world = vertices.map((vertex) => {
    const scaled: Vec3 = [vertex[0] * scale[0], vertex[1] * scale[1], vertex[2] * scale[2]];
    return add(rotate(scaled, rotation[0], rotation[1]), position);
  });

  const interior = world.reduce<Vec3>(
    (total, vertex) => [total[0] + vertex[0], total[1] + vertex[1], total[2] + vertex[2]],
    [0, 0, 0],
  );
  const center: Vec3 = [
    interior[0] / world.length,
    interior[1] / world.length,
    interior[2] / world.length,
  ];

  const output: Face[] = [];

  for (const [ia, ib, ic] of faces) {
    let a = world[ia];
    let b = world[ib];
    let c = world[ic];
    let normal = normalize(cross(sub(b, a), sub(c, a)));

    if (dot(normal, sub(average(a, b, c), center)) < 0) {
      normal = scaleVec(normal, -1);
      [b, c] = [c, b];
    }

    if (cull && normal[2] <= 0.01) continue;
    output.push({ points: [a, b, c], normal, palette, cull });
  }

  return output;
}

export function sphereFaces({
  position = [0, 0, 0],
  rotation = [0.25, 0.4],
  scale = [1, 1, 1],
  palette,
  cull = true,
}: {
  position?: Vec3;
  rotation?: readonly [number, number];
  scale?: Vec3;
  palette: Palette;
  cull?: boolean;
}): Face[] {
  return meshFaces({
    vertices: ICO_VERTICES,
    faces: ICO_FACES,
    position,
    rotation,
    scale,
    palette,
    cull,
  });
}

export function octahedronFaces({
  position = [0, 0, 0],
  rotation = [0.2, 0.35],
  scale = [1, 1, 1],
  palette,
  cull = true,
}: {
  position?: Vec3;
  rotation?: readonly [number, number];
  scale?: Vec3;
  palette: Palette;
  cull?: boolean;
}): Face[] {
  return meshFaces({
    vertices: OCTA_VERTICES,
    faces: OCTA_FACES,
    position,
    rotation,
    scale,
    palette,
    cull,
  });
}

/** A hemisphere cut at the world Y plane through its centre. */
export function hemisphereFaces({
  position = [0, 0, 0],
  rotation = [0.2, 0.35],
  scale = [1, 1, 1],
  palette,
}: {
  position?: Vec3;
  rotation?: readonly [number, number];
  scale?: Vec3;
  palette: Palette;
}): Face[] {
  return sphereFaces({ position, rotation, scale, palette }).filter((face) => {
    const centreY = (face.points[0][1] + face.points[1][1] + face.points[2][1]) / 3;
    return centreY >= position[1] - 0.02;
  });
}

/** A cone along +Y, from y=0 (base) to y=1 (apex). */
export function coneFaces({
  position = [0, 0, 0],
  rotation = [0, 0],
  scale = [1, 1, 1],
  palette,
  sides = 6,
  cap = true,
}: {
  position?: Vec3;
  rotation?: readonly [number, number];
  scale?: Vec3;
  palette: Palette;
  sides?: number;
  cap?: boolean;
}): Face[] {
  const vertices: Vec3[] = [];
  for (let index = 0; index < sides; index += 1) {
    const angle = (index / sides) * Math.PI * 2;
    vertices.push([Math.cos(angle), 0, Math.sin(angle)]);
  }
  const apex = vertices.length;
  vertices.push([0, 1, 0]);

  const faces: Array<[number, number, number]> = [];
  for (let index = 0; index < sides; index += 1) {
    const next = (index + 1) % sides;
    faces.push([index, next, apex]);
  }

  if (cap) {
    const baseCentre = vertices.length;
    vertices.push([0, 0, 0]);
    for (let index = 0; index < sides; index += 1) {
      const next = (index + 1) % sides;
      faces.push([next, index, baseCentre]);
    }
  }

  return meshFaces({ vertices, faces, position, rotation, scale, palette });
}

/** A prism/cylinder along +Y, from y=0 to y=1, with a regular polygon base. */
export function prismFaces({
  position = [0, 0, 0],
  rotation = [0, 0],
  scale = [1, 1, 1],
  palette,
  sides = 6,
}: {
  position?: Vec3;
  rotation?: readonly [number, number];
  scale?: Vec3;
  palette: Palette;
  sides?: number;
}): Face[] {
  const vertices: Vec3[] = [];
  for (let index = 0; index < sides; index += 1) {
    const angle = (index / sides) * Math.PI * 2;
    vertices.push([Math.cos(angle), 0, Math.sin(angle)]);
  }
  for (let index = 0; index < sides; index += 1) {
    const angle = (index / sides) * Math.PI * 2;
    vertices.push([Math.cos(angle), 1, Math.sin(angle)]);
  }

  const faces: Array<[number, number, number]> = [];
  for (let index = 0; index < sides; index += 1) {
    const next = (index + 1) % sides;
    faces.push([index, next, next + sides]);
    faces.push([index, next + sides, index + sides]);
  }

  const bottomCentre = vertices.length;
  vertices.push([0, 0, 0]);
  const topCentre = vertices.length;
  vertices.push([0, 1, 0]);

  for (let index = 0; index < sides; index += 1) {
    const next = (index + 1) % sides;
    faces.push([next, index, bottomCentre]);
    faces.push([index + sides, next + sides, topCentre]);
  }

  return meshFaces({ vertices, faces, position, rotation, scale, palette });
}

/** A low-poly teardrop: a faceted bulb with a folded cone on top. */
export function tearFaces({
  position = [0, 0, 0],
  scale = [1, 1, 1],
  palette,
  rotation = [0.2, 0.3],
}: {
  position?: Vec3;
  scale?: Vec3;
  palette: Palette;
  rotation?: readonly [number, number];
}): Face[] {
  const bulb: Vec3 = [position[0], position[1] - 0.28 * scale[1], position[2]];
  const cone: Vec3 = [position[0], position[1] + 0.06 * scale[1], position[2]];

  return [
    ...sphereFaces({
      position: bulb,
      scale: [0.55 * scale[0], 0.55 * scale[1], 0.55 * scale[2]],
      palette,
      rotation,
    }),
    ...coneFaces({
      position: cone,
      scale: [0.52 * scale[0], 0.9 * scale[1], 0.52 * scale[2]],
      palette,
      rotation,
      sides: 6,
      cap: false,
    }),
  ];
}

function makeFace(
  a: Vec3,
  b: Vec3,
  c: Vec3,
  palette: Palette,
  options: { bias?: number; twoSided?: boolean; cull?: boolean } = {},
): Face {
  return {
    points: [a, b, c],
    normal: normalize(cross(sub(b, a), sub(c, a))),
    palette,
    bias: options.bias,
    twoSided: options.twoSided ?? true,
    cull: options.cull ?? false,
  };
}

/**
 * A folded paper ribbon. The centreline is raised above the two edges, so each
 * segment becomes two differently lit facets. The strip can taper to a point.
 */
export function foldedRibbon(
  points: ReadonlyArray<readonly [number, number]>,
  {
    width = 0.28,
    palette,
    z = 0,
    ridge = 0.07,
    taper = 0.55,
    bias = 0,
  }: {
    width?: number;
    palette: Palette;
    z?: number;
    ridge?: number;
    taper?: number;
    bias?: number;
  },
): Face[] {
  if (points.length < 2) return [];

  const stations = points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tx = next[0] - previous[0];
    const ty = next[1] - previous[1];
    const length = Math.hypot(tx, ty) || 1;
    const px = -ty / length;
    const py = tx / length;
    const progress = index / (points.length - 1);
    const halfWidth = (width * (1 - taper * progress)) / 2;

    return {
      left: [point[0] + px * halfWidth, point[1] + py * halfWidth, z] as Vec3,
      centre: [point[0], point[1], z + ridge] as Vec3,
      right: [point[0] - px * halfWidth, point[1] - py * halfWidth, z] as Vec3,
    };
  });

  const faces: Face[] = [];

  for (let index = 0; index < stations.length - 1; index += 1) {
    const current = stations[index];
    const next = stations[index + 1];

    faces.push(
      makeFace(current.left, next.left, next.centre, palette, { bias: bias - 1 }),
    );
    faces.push(
      makeFace(current.left, next.centre, current.centre, palette, { bias: bias - 1 }),
    );
    faces.push(
      makeFace(current.centre, next.centre, next.right, palette, { bias: bias + 1 }),
    );
    faces.push(
      makeFace(current.centre, next.right, current.right, palette, { bias: bias + 1 }),
    );
  }

  return faces;
}

/** A folded paper kite, used for sun rays. */
export function foldedKite({
  angle,
  inner,
  outer,
  palette,
  z = -0.2,
  spread = 0.2,
  bias = 0,
  centre: origin = [0, 0],
}: {
  angle: number;
  inner: number;
  outer: number;
  palette: Palette;
  z?: number;
  spread?: number;
  bias?: number;
  centre?: readonly [number, number];
}): Face[] {
  const centre: Vec3 = [
    origin[0] + Math.cos(angle) * inner,
    origin[1] + Math.sin(angle) * inner,
    z,
  ];
  const tip: Vec3 = [
    origin[0] + Math.cos(angle) * outer,
    origin[1] + Math.sin(angle) * outer,
    z,
  ];
  const leftRadius = inner + (outer - inner) * 0.32;
  const left: Vec3 = [
    origin[0] + Math.cos(angle - spread) * leftRadius,
    origin[1] + Math.sin(angle - spread) * leftRadius,
    z - 0.025,
  ];
  const right: Vec3 = [
    origin[0] + Math.cos(angle + spread) * leftRadius,
    origin[1] + Math.sin(angle + spread) * leftRadius,
    z - 0.025,
  ];

  return [
    makeFace(centre, left, tip, palette, { bias: bias - 1 }),
    makeFace(centre, tip, right, palette, { bias: bias + 1 }),
  ];
}

/** A folded paper polygon, fan-triangulated from a raised centre. */
export function foldedPolygon(
  points: ReadonlyArray<readonly [number, number]>,
  centre: readonly [number, number],
  z: number,
  palette: Palette,
  bias = 0,
): Face[] {
  if (points.length < 3) return [];

  const hub: Vec3 = [centre[0], centre[1], z + 0.06];
  const faces: Face[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    faces.push(
      makeFace(
        hub,
        [current[0], current[1], z],
        [next[0], next[1], z],
        palette,
        { bias: bias + (index % 2 === 0 ? -1 : 1) },
      ),
    );
  }

  return faces;
}

/** A layered, folded paper snowflake. */
export function starFaces({
  position = [0, 0, 0],
  size = 1,
  palette,
}: {
  position?: Vec3;
  size?: number;
  palette: Palette;
}): Face[] {
  const layers = [
    { radius: 1, z: 0, bias: 0 },
    { radius: 0.66, z: 0.09, bias: 1 },
    { radius: 0.34, z: 0.18, bias: 2 },
  ];

  const faces: Face[] = [];

  for (const layer of layers) {
    const points: Array<readonly [number, number]> = [];
    const arms = 6;
    for (let index = 0; index < arms * 2; index += 1) {
      const angle = (index / (arms * 2)) * Math.PI * 2 - Math.PI / 2;
      const radius = (index % 2 === 0 ? size : size * 0.4) * layer.radius;
      points.push([
        position[0] + Math.cos(angle) * radius,
        position[1] + Math.sin(angle) * radius,
      ]);
    }

    faces.push(
      ...foldedPolygon(
        points,
        [position[0], position[1]],
        position[2] + layer.z,
        palette,
        layer.bias,
      ),
    );
  }

  return faces;
}

/** Project world-space faces into depth-sorted SVG polygon data. */
export function renderFaces(
  faces: readonly Face[],
  cx: number,
  cy: number,
  scale: number,
): RenderFace[] {
  const output: RenderFace[] = [];

  for (const face of faces) {
    if (face.cull !== false && face.normal[2] <= 0.01) continue;

    const length = face.palette.length;
    const lighting = face.twoSided
      ? Math.abs(dot(face.normal, LIGHT))
      : Math.max(0, dot(face.normal, LIGHT));
    let index = Math.floor((1 - lighting) * length) + (face.bias ?? 0);
    index = Math.max(0, Math.min(length - 1, index));

    const [a, b, c] = face.points;
    const points = [a, b, c]
      .map(
        (point) =>
          `${(cx + point[0] * scale).toFixed(2)},${(cy - point[1] * scale).toFixed(2)}`,
      )
      .join(' ');

    output.push({
      points,
      fill: face.palette[index],
      depth: (a[2] + b[2] + c[2]) / 3,
    });
  }

  output.sort((a, b) => a.depth - b.depth);
  return output;
}
