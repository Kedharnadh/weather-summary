import { useState, type FormEvent } from 'react';
import type { LocationSettings } from '../types';
import { formatCoordinates } from '../weather/format';
import { searchPlaces, type PlaceResult } from '../weather/geocode';
import { CardIcon } from './CardIcon';

interface Props {
  location: LocationSettings;
  onApply: (location: LocationSettings) => void;
  onLocate: () => void;
  locating: boolean;
  isSaved: boolean;
  onSave: () => void;
}

export function LocationBar({
  location,
  onApply,
  onLocate,
  locating,
  isSaved,
  onSave,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [lat, setLat] = useState(String(location.lat));
  const [lon, setLon] = useState(String(location.lon));
  const [coordError, setCoordError] = useState<string | null>(null);

  const search = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setSearchError('Enter at least 2 characters, a place name, or a pincode.');
      setResults([]);
      return;
    }

    setSearching(true);
    setSearchError(null);
    setResults([]);

    try {
      const found = await searchPlaces(trimmed);
      setResults(found);
      if (found.length === 0) {
        setSearchError('No places found. Try a city, area, or pincode.');
      }
    } catch {
      setSearchError('Could not search right now. Check your connection and try again.');
    } finally {
      setSearching(false);
    }
  };

  const submitCoordinates = (event: FormEvent) => {
    event.preventDefault();
    const nextLat = Number(lat);
    const nextLon = Number(lon);

    if (!Number.isFinite(nextLat) || nextLat < -90 || nextLat > 90) {
      setCoordError('Latitude must be between -90 and 90.');
      return;
    }
    if (!Number.isFinite(nextLon) || nextLon < -180 || nextLon > 180) {
      setCoordError('Longitude must be between -180 and 180.');
      return;
    }

    setCoordError(null);
    onApply({
      lat: nextLat,
      lon: nextLon,
      label: `${nextLat.toFixed(2)}, ${nextLon.toFixed(2)}`,
    });
  };

  return (
    <div className="location-bar card">
      <div className="card-heading">
        <div className="card-title">
          <CardIcon kind="location" size={24} decorative />
          <h2>Location</h2>
        </div>
        {isSaved ? (
          <span className="pill saved-pill">Saved</span>
        ) : (
          <button type="button" className="ghost small" onClick={onSave}>
            Save current
          </button>
        )}
      </div>

      <p className="location-current">
        Current location: <strong>{location.label}</strong>
      </p>

      <form className="location-search" onSubmit={search}>
        <label htmlFor="place-search">Search by place name or pincode</label>
        <div className="search-row">
          <input
            id="place-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setResults([]);
              setSearchError(null);
            }}
            placeholder="e.g. Tirupati, STV Nagar, 517501"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="secondary" disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {searchError && (
          <p className="form-error" role="alert">
            {searchError}
          </p>
        )}

        {results.length > 0 && (
          <ul className="search-results" aria-label="Search results">
            {results.map((place) => (
              <li key={`${place.lat},${place.lon},${place.label}`}>
                <button type="button" onClick={() => onApply(place)}>
                  <span className="result-label">{place.label}</span>
                  <span className="result-coords">
                    {formatCoordinates(place.lat, place.lon)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      <div className="location-divider">
        <span>or use coordinates</span>
      </div>

      <form className="location-row" onSubmit={submitCoordinates}>
        <label>
          Latitude
          <input
            value={lat}
            onChange={(event) => setLat(event.target.value)}
            inputMode="decimal"
            autoComplete="off"
          />
        </label>
        <label>
          Longitude
          <input
            value={lon}
            onChange={(event) => setLon(event.target.value)}
            inputMode="decimal"
            autoComplete="off"
          />
        </label>
        <button type="submit" className="secondary">
          Use coordinates
        </button>
        <button type="button" className="ghost" onClick={onLocate} disabled={locating}>
          {locating ? 'Locating…' : 'Use my location'}
        </button>
      </form>

      {coordError && (
        <p className="form-error" role="alert">
          {coordError}
        </p>
      )}
    </div>
  );
}
