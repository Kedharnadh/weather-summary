import type { WeatherFacts } from '../types';

export function fallbackSentence(facts: WeatherFacts): string {
  const temp = `${Math.round(facts.tempC)}°`;

  if (facts.isRainingNow && facts.rainStopInMin != null) {
    return `Rain easing, should stop in ~${minutesText(facts.rainStopInMin)}.`;
  }
  if (facts.isRainingNow) {
    return `Rain now — ${facts.conditionLabel.toLowerCase()}.`;
  }
  if (facts.rainStartInMin != null && facts.rainStartInMin <= 120) {
    return `Rain starting in ~${minutesText(facts.rainStartInMin)}.`;
  }
  if (facts.tempC >= 35) {
    const extra =
      facts.maxChanceRain24h && facts.maxChanceRain24h.percent >= 55
        ? `rain ${chanceWord(facts.maxChanceRain24h.percent)} after ${facts.maxChanceRain24h.at}`
        : 'drying out';
    return `Very hot, ${temp}. Stay cool, ${extra}.`;
  }
  if (facts.tempC <= 0) {
    return `Freezing, ${temp}. Bundle up.`;
  }
  if (facts.windKmh != null && facts.windKmh >= 35) {
    const gust =
      facts.windGustKmh != null ? `, gusts to ${Math.round(facts.windGustKmh)} km/h` : '';
    return `Windy, ${temp}${gust}.`;
  }
  if (facts.maxChanceRain24h && facts.maxChanceRain24h.percent >= 55) {
    return `${temp}, ${facts.conditionLabel.toLowerCase()}; rain ${chanceWord(
      facts.maxChanceRain24h.percent,
    )} after ${facts.maxChanceRain24h.at}.`;
  }

  return `${temp}, ${facts.conditionLabel.toLowerCase().replace('overcast', 'cloudy')}.`;
}

function chanceWord(percent: number): string {
  return percent >= 70 ? 'likely' : 'possible';
}

function minutesText(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
