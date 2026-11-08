import { describe, expect, it } from 'vitest';
import {
  isGenericLabel,
  isPostalCode,
  labelFromNominatim,
  labelFromOpenMeteo,
  labelFromReverse,
} from './geocode';

describe('isPostalCode', () => {
  it('accepts numeric postcodes with surrounding whitespace', () => {
    expect(isPostalCode('517501')).toBe(true);
    expect(isPostalCode(' 90210 ')).toBe(true);
  });

  it('rejects place names and coordinate pairs', () => {
    expect(isPostalCode('Tirupati')).toBe(false);
    expect(isPostalCode('13.62, 79.43')).toBe(false);
  });
});

describe('isGenericLabel', () => {
  it('flags placeholder labels', () => {
    expect(isGenericLabel('My location')).toBe(true);
    expect(isGenericLabel('13.62, 79.43')).toBe(true);
    expect(isGenericLabel('')).toBe(true);
  });

  it('keeps real place names', () => {
    expect(isGenericLabel('Tirupati, Andhra Pradesh, India')).toBe(false);
    expect(isGenericLabel('STV Nagar, Tirupati, India')).toBe(false);
  });
});

describe('labelFromOpenMeteo', () => {
  it('joins name, region, and country', () => {
    expect(
      labelFromOpenMeteo({
        name: 'Tirupati',
        admin1: 'Andhra Pradesh',
        country: 'India',
      }),
    ).toBe('Tirupati, Andhra Pradesh, India');
  });

  it('removes repeated parts', () => {
    expect(
      labelFromOpenMeteo({
        name: 'Singapore',
        admin1: 'Singapore',
        country: 'Singapore',
      }),
    ).toBe('Singapore');
  });
});

describe('labelFromNominatim', () => {
  it('prefers the neighbourhood for a locality result', () => {
    expect(
      labelFromNominatim({
        name: 'STV Nagar',
        address: {
          quarter: 'STV Nagar',
          city: 'Tirupati',
          state: 'Andhra Pradesh',
          country: 'India',
        },
      }),
    ).toBe('STV Nagar, Tirupati, Andhra Pradesh, India');
  });

  it('uses district details for a postcode result', () => {
    expect(
      labelFromNominatim({
        name: '517501',
        address: {
          county: 'Tirupati Urban Mandal',
          state_district: 'Tirupati District',
          state: 'Andhra Pradesh',
          country: 'India',
        },
      }),
    ).toBe('Tirupati Urban Mandal, Tirupati District, Andhra Pradesh, India');
  });
});

describe('labelFromReverse', () => {
  it('builds a city label from reverse-geocode data', () => {
    expect(
      labelFromReverse({
        city: 'Tirupati',
        locality: 'Tirupati',
        principalSubdivision: 'Andhra Pradesh',
        countryName: 'India',
      }),
    ).toBe('Tirupati, Andhra Pradesh, India');
  });

  it('prefers a distinct locality over the city', () => {
    expect(
      labelFromReverse({
        city: 'Tirupati',
        locality: 'STV Nagar',
        principalSubdivision: 'Andhra Pradesh',
        countryName: 'India',
      }),
    ).toBe('STV Nagar, Andhra Pradesh, India');
  });
});
