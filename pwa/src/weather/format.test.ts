import { describe, expect, it } from 'vitest';
import { formatCoordinates } from './format';

describe('formatCoordinates', () => {
  it('formats northern and western coordinates', () => {
    expect(formatCoordinates(51.5072, -0.1276)).toBe('51.51°N, 0.13°W');
  });

  it('formats southern and eastern coordinates', () => {
    expect(formatCoordinates(-33.8688, 151.2093)).toBe('33.87°S, 151.21°E');
  });
});
