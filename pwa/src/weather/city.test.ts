import { describe, expect, it } from 'vitest';
import { cityFromLabel, displayCity } from './city';

describe('cityFromLabel', () => {
  it('handles the common label shapes', () => {
    expect(cityFromLabel('London, UK')).toBe('London');
    expect(cityFromLabel('Tirupati, Andhra Pradesh, India')).toBe('Tirupati');
    expect(cityFromLabel('STV Nagar, Tirupati, Andhra Pradesh, India')).toBe(
      'Tirupati',
    );
    expect(cityFromLabel('Bengaluru')).toBe('Bengaluru');
  });

  it('keeps the trimmed label when it is empty or odd', () => {
    expect(cityFromLabel('   ')).toBe('');
  });
});

describe('displayCity', () => {
  it('prefers an explicit city', () => {
    expect(
      displayCity({
        lat: 13.6288,
        lon: 79.4192,
        label: 'STV Nagar, Tirupati, Andhra Pradesh, India',
        city: 'Tirupati',
      }),
    ).toBe('Tirupati');
  });

  it('falls back to the label for older saved places', () => {
    expect(displayCity({ lat: 51.5072, lon: -0.1276, label: 'London, UK' })).toBe(
      'London',
    );
    expect(
      displayCity({ lat: 1, lon: 2, label: 'Somewhere', city: '   ' }),
    ).toBe('Somewhere');
  });
});
