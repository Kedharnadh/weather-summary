import { describe, expect, it } from 'vitest';
import { renderFaces, sphereFaces } from './icon3d';
import { cloudFaces, sunFaces } from './iconScenes';

const PALETTE = ['#ffffff', '#e2e8f0', '#94a3b8'];

describe('renderFaces', () => {
  it('projects faces into depth-sorted polygons', () => {
    const polygons = renderFaces(sphereFaces({ palette: PALETTE }), 32, 32, 16);

    expect(polygons.length).toBeGreaterThan(0);
    for (const polygon of polygons) {
      expect(polygon.points).toMatch(/^-?\d+(\.\d+)?,-?\d+(\.\d+)? /);
      expect(polygon.fill).toMatch(/^#/);
      expect(Number.isFinite(polygon.depth)).toBe(true);
    }

    const depths = polygons.map((polygon) => polygon.depth);
    expect(depths).toEqual([...depths].sort((a, b) => a - b));
  });

  it('culls back faces', () => {
    const all = sphereFaces({ palette: PALETTE, cull: false });
    const visible = renderFaces(sphereFaces({ palette: PALETTE }), 32, 32, 16);

    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(all.length);
  });

  it('keeps every projected point inside the icon box', () => {
    const polygons = renderFaces(cloudFaces(), 32, 33, 15.5);

    for (const polygon of polygons) {
      for (const pair of polygon.points.split(' ')) {
        const [x, y] = pair.split(',').map(Number);
        expect(x).toBeGreaterThanOrEqual(-8);
        expect(x).toBeLessThanOrEqual(72);
        expect(y).toBeGreaterThanOrEqual(-8);
        expect(y).toBeLessThanOrEqual(72);
      }
    }
  });
});

describe('scene builders', () => {
  it('builds a chunky cloud from many facets', () => {
    expect(cloudFaces().length).toBeGreaterThan(60);
  });

  it('adds folded rays around the sun', () => {
    const plain = sunFaces({ rays: false });
    const rayed = sunFaces({ rays: true });
    expect(rayed.length).toBeGreaterThan(plain.length);
  });
});
