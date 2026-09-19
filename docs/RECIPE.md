# The shared "recipe": WeatherSnapshot, derived facts, and the AI prompt

This file is the single source of truth that keeps the Android app and the Home
Assistant integration producing the *same* kind of sentence. When you extend a
new weather provider or AI backend, make it satisfy the contracts below.

## 1. Normalized weather model (`WeatherSnapshot`)

Every weather provider is normalized into this shape (names intentionally
mirror the Open-Meteo field names). Providers: **Open-Meteo** (no key),
**OpenWeatherMap** (free key), **WeatherAPI.com** (free key).

```
current:
  temperature_c           Float          # °C
  apparent_temperature_c  Float?         # "feels like"
  humidity_pct            Int?
  wind_kmh                Float?
  weather_code            Int            # WMO weather code (see table)
  precipitation_mm        Float?         # current precip intensity
  is_day                  Boolean?
  cloud_cover_pct         Int?

minutely_15:              List<Float>?  # precip (mm) every 15 min, ~2h ahead (Open-Meteo/OWM)
hourly:                   List<HourSlice>
  HourSlice { time: String, temp: Float, precip_probability_pct: Int?, precip_mm: Float?, weather_code: Int? }
```

## 2. Derived facts (computed identically in `WeatherFacts` / `facts.py`)

From the snapshot we compute prompts that make the AI reliable & terse:

| Fact | Meaning |
| --- | --- |
| `is_raining_now` | current precip ≥ 0.2 mm |
| `rain_start_min` | minutes until first 15-min slot with precip ≥ 0.2 mm (null if none in next 2 h) |
| `rain_stop_min` | if raining now: minutes until first continuous gap ≥ 15 min with precip < 0.2 mm |
| `precip_next_hour` | mm expected in the next 60 min |
| `chance_rain_hour` | highest `precip_probability_pct` over next 24 h + when |
| `peak_temp` / `peak_temp_hour` | max temp in next 24 h |
| `wind_now_kmh` | current wind |

These are strings fed straight into the prompt (so a small local model can be terse).

## 3. The AI prompt

Both sides assemble the same style of user message (providers / limits may
differ slightly in wrapping, but the “rules + facts + examples” core is shared):

```
You write phone-widget weather sentences. Rules:
- ONE sentence, max 100 characters, no emoji, no "Good morning!", no units (say "28°").
- Prioritise (in order): rain starting/stopping soon, extreme heat/cold, heavy
  wind/storm, otherwise keep it neutral.
- Only mention things that are actually true from the facts.
- Speak in present/next-hour terms.
Examples:
- "Rain starting in ~20 min, umbrella time."
- "Light rain easing, should stop in ~10 min."
- "Clear 26°, breezy; chance of drizzle after 6 pm."
- "Sunny and hot, 34°; keep cool, storms possible late evening."

Facts:
current: 28.1° (feels 29.3), humidity 55%, wind 12 km/h, cloud 10%, code 0 (clear)
raining_now: false
rain_start_in_min: 75
rain_stop_in_min: -
precip_next_hour_mm: 0.1
max_chance_rain_next_24h: 60% at 19:00
peak_temp_next_24h: 31° at 15:00

Only output the sentence.
```

### Length control (“tiny” vs “short”)
- **Short** (default): ≤ 100 characters.
- **Tiny** (widget): ≤ 60 characters. Same prompt, stricter rule.

### Fallback (no AI / AI failure)
If the AI call fails, both sides generate a deterministic template sentence,
e.g. `Rain starting in ~20 min.` or `Clear, 28° (feels 29°).` so the UI/widget is
**never empty**.

## 4. WMO weather-code keys (for icons / fallback wording)

`0 clear · 1-2 partly cloudy · 3 overcast · 45/48 fog · 51-57 drizzle ·
61-67 rain · 71-77 snow · 80-82 showers · 85-86 snow showers · 95-99 thunderstorm`

See `WeatherCodes` (android) / `WMO` dict (ha) — keep them in sync.

## 5. Extension contracts

**App (Kotlin)**
- Weather: implement `data.WeatherProvider.fetch(lat, lon): WeatherSnapshot` and register in `data.WeatherProviders`.
- AI: implement `ai.AiProvider.summarize(WeatherFacts): String?` and register in `ai.AiProviders`.

**HA (Python)**
- Weather: add a branch in `openmeteo.py` (keep the same `snapshot`/`facts` return shape).
- AI: extend `llm.py` with a `generate(facts) -> str` fallback chain (REST OpenAI-compatible → built-in `get_ai_llm`).

## 6. Notes on Windy as a provider

Windy exposes a **Point Forecast API** (`POST https://api.windy.com/api/point-forecast/v2`
with `{"lat","lon","model","parameters","levels","key"}`, forecasting the full run ahead),
which is why people find windy.com accurate:

- The **free "Testing" tier is dev-only**: 500 requests/day and the docs state it
  *"returns randomly shuffled and slightly modified data"*. Not usable for real locations.
- **ECMWF is not available** in Point Forecast at any tier; free-tier models are GFS,
  ICON-global (`icon`), AROME, NAM, CAMS etc.
- The accurate panel you see on windy.com is ECMWF/HRRR-style data behind the
  **Professional** tier.

Windy is now implemented as a provider (app + HA) so the plumbing is real. Details:

- Model used: `gfs`; levels `["surface"]`. Response is `ts` (epoch-ms steps) plus one
  array per `parameter-surface` key. `temp` is Kelvin (subtract 273.15), `wind` arrives
  as `wind_u`/`wind_v` components (speed = √(u²+v²)), and precipitation is
  **`past3hprecip` — 3-hour accumulated buckets**.
- Because of that bucket size, Windy **cannot** power "rain in ~20 min" nowcasts; expect
  the rain start/stop to land on 3-hour boundaries with this provider.

Recommendation: keep **Open-Meteo** as the default. It blends ECMWF / ICON / GFS (and
lets you pin a model via `&models=`), and its `minutely_15` radar/satellite nowcast is
what actually powers the "rain in ~20 min" sentences. A Windy **Professional** key slots
into the existing provider with no code changes.

## 7. Free AI limits (verified vs. the providers' docs)

| Backend | Free limit | ~Usage here |
| --- | --- | --- |
| Gemini (free tier, `gemini-2.5-flash`/`3-flash`) | ~10 req/min, ~1,500 req/day (per project, resets midnight PT). Since mid-2026 keys should be restricted to the Gemini API in AI Studio. | 15-min refresh ≈ 96/day; even 5-min refresh ≈ 288/day. |
| Ollama | Unbounded (local). | — |
| Home Assistant LLM | Whatever backend it points to (Ollama = unbounded; a cloud one has that vendor's limits). | — |

No practical limit for a personal weather widget.