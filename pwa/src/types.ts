export interface CurrentWeather {
  time: string;
  temperatureC: number;
  apparentTemperatureC: number | null;
  humidityPct: number | null;
  windKmh: number | null;
  windGustKmh: number | null;
  weatherCode: number;
  precipitationMm: number;
  isDay: boolean | null;
  cloudCoverPct: number | null;
}

export interface HourSlice {
  time: string;
  temperatureC: number | null;
  precipProbabilityPct: number | null;
  precipMm: number | null;
  weatherCode: number | null;
  isDay: boolean | null;
}

/** A uniform precipitation timeline indexed by [stepMinutes] from "now". */
export interface RainSeries {
  stepMinutes: number;
  values: number[];
  startTime: string;
}

export interface SunTimes {
  sunrise: string | null;
  sunset: string | null;
  tomorrowSunrise: string | null;
  tomorrowSunset: string | null;
}

export interface AirQuality {
  time: string;
  europeanAqi: number | null;
  usAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  ozone: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  /** Where the headline AQI came from: the CAMS model or a ground monitor. */
  source?: 'cams' | 'waqi';
  /** Ground-station name when `source` is "waqi". */
  station?: string | null;
}

export interface WeatherSnapshot {
  current: CurrentWeather;
  rain: RainSeries;
  hourly: HourSlice[];
  timezone: string;
  fetchedAt: number;
  sun?: SunTimes | null;
  air?: AirQuality | null;
}

export interface WeatherFacts {
  tempC: number;
  feelsC: number | null;
  conditionLabel: string;
  isRainingNow: boolean;
  rainStartInMin: number | null;
  rainStopInMin: number | null;
  precipNextHourMm: number;
  maxChanceRain24h: { percent: number; at: string } | null;
  peakTemp24h: { tempC: number; at: string } | null;
  windKmh: number | null;
  windGustKmh: number | null;
  humidityPct: number | null;
}

export interface StoredWeather {
  snapshot: WeatherSnapshot;
  facts: WeatherFacts;
  summary: string;
  savedAt: number;
}

export interface LocationSettings {
  lat: number;
  lon: number;
  label: string;
  /** City name for compact chips, when the geocoder provides one. */
  city?: string;
}
