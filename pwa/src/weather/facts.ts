import type { WeatherFacts, WeatherSnapshot } from '../types';
import { formatHour, parseWeatherTime } from './format';
import { conditionLabel } from './weatherCodes';

export const RAIN_THRESHOLD_MM = 0.2;

export function deriveFacts(snapshot: WeatherSnapshot, now = Date.now()): WeatherFacts {
  const current = snapshot.current;
  const { stepMinutes: step, values: rain } = snapshot.rain;

  const rainingNow =
    current.precipitationMm >= RAIN_THRESHOLD_MM ||
    (rain.length > 0 && rain[0] >= RAIN_THRESHOLD_MM);

  let rainStartInMin: number | null = null;
  let rainStopInMin: number | null = null;

  if (rainingNow) {
    // First sustained dry gap (two consecutive slots) after the current slot.
    for (let index = 1; index < rain.length - 1; index += 1) {
      if (rain[index] < RAIN_THRESHOLD_MM && rain[index + 1] < RAIN_THRESHOLD_MM) {
        rainStopInMin = index * step;
        break;
      }
    }
  } else {
    for (let index = 0; index < rain.length; index += 1) {
      if (rain[index] >= RAIN_THRESHOLD_MM) {
        rainStartInMin = index * step;
        break;
      }
    }
  }

  const slotsPerHour = Math.max(1, Math.round(60 / step));
  const precipNextHourMm = rain
    .slice(0, slotsPerHour)
    .reduce((total, value) => total + value, 0);

  const futureHours = snapshot.hourly.filter((hour) => {
    const time = parseWeatherTime(hour.time);
    return !time || time.getTime() + 60 * 60_000 > now;
  });

  let maxChanceRain24h: WeatherFacts['maxChanceRain24h'] = null;
  let peakTemp24h: WeatherFacts['peakTemp24h'] = null;

  for (const hour of futureHours.slice(0, 24)) {
    if (
      hour.precipProbabilityPct != null &&
      (maxChanceRain24h == null || hour.precipProbabilityPct > maxChanceRain24h.percent)
    ) {
      maxChanceRain24h = {
        percent: hour.precipProbabilityPct,
        at: formatHour(hour.time),
      };
    }

    if (
      hour.temperatureC != null &&
      (peakTemp24h == null || hour.temperatureC > peakTemp24h.tempC)
    ) {
      peakTemp24h = {
        tempC: hour.temperatureC,
        at: formatHour(hour.time),
      };
    }
  }

  return {
    tempC: current.temperatureC,
    feelsC: current.apparentTemperatureC,
    conditionLabel: conditionLabel(current.weatherCode),
    isRainingNow: rainingNow,
    rainStartInMin,
    rainStopInMin,
    precipNextHourMm,
    maxChanceRain24h,
    peakTemp24h,
    windKmh: current.windKmh,
    windGustKmh: current.windGustKmh,
    humidityPct: current.humidityPct,
  };
}
