# Weather Summary dashboard card

The integration does **not** auto-add a card — it only creates sensors. Add one
of the cards below to your dashboard to see the summary sentence.

## Quick add

1. Open your dashboard → **Edit dashboard** → **Add card** → search for the card
   type (Entities, Markdown, …) and pick it.
2. Paste the YAML below (use the ✎ "edit YAML" view in the card editor, or the
   **Overview → Save** after selecting *Pesquisar card*).
3. Replace `weather_summary` below with your actual entity names if you renamed them
   (defaults match this integration's registry names).

---

## 1. Entities card (simplest)

Shows the sentence plus the most useful numbers in a plain list.

```yaml
type: entities
title: ⛅ Weather summary
entities:
  - entity: sensor.weather_summary_text
    name: Summary
  - entity: sensor.weather_summary_condition
    name: Condition
  - entity: sensor.weather_summary_temperature
    name: Temperature
  - entity: sensor.weather_summary_humidity
  - entity: binary_sensor.weather_summary_is_raining
  - entity: sensor.weather_summary_updated
```

## 2. Markdown card (sentence + facts)

The summary sentence rendered in a heading, with the derived facts behind it.

```yaml
type: markdown
title: ⛅ Weather summary
content: >
  ## {{ states('sensor.weather_summary_text') }}

  Cond: **{{ states('sensor.weather_summary_condition') }}**
  – **{{ states('sensor.weather_summary_temperature') }}°C**, feels like
  {{ states('sensor.weather_summary_apparent_temperature') }}°C
  – humidity {{ states('sensor.weather_summary_humidity') }}%

  {% if is_state('binary_sensor.weather_summary_is_raining', 'on') %}🌧 Rain now{% else %}☀️ No rain now{% endif %}
```

> Tip: a Markdown card only updates when the dashboard refreshes; it triggers
> from `sensor.weather_summary_text` because that state is embedded in the card.

## 3. Template card (prettier, condition-aware)

A single-line look that reuses Home Assistant colors. Add the `template`
integration if you prefer a compact card:

```yaml
type: custom:mushroom-template-card
primary: >-
  {{ states('sensor.weather_summary_text') }}
secondary: >-
  {{ states('sensor.weather_summary_condition') }} ·
  {{ states('sensor.weather_summary_temperature') }}°C ·
  Updated {{ states('sensor.weather_summary_updated') }}
icon: >-
  {% if is_state('binary_sensor.weather_summary_is_raining', 'on') %}
  mdi:weather-pouring
  {% else %}
  mdi:weather-partly-cloudy
  {% endif %}
```

*(Requires the [Mushroom](https://github.com/piitaya/lovelace-mushroom) card pack.)*

## 4. Grid: sentence + rain radar card

Combine the summary with the built-in **Weather** card stats:

```yaml
type: grid
title: ☔ Weather
cards:
  - type: markdown
    content: |
      {{ states('sensor.weather_summary_text') }}
  - type: weather-forecast
    entity: weather.forecast_home   # pick the weather entity you already have
    show_forecast: true
```

## Entity reference

| Card-friendly entity | Purpose |
| --- | --- |
| `sensor.weather_summary_text` | The AI sentence (the main thing to show) |
| `sensor.weather_summary_condition` | WMO condition label |
| `sensor.weather_summary_temperature` | Current temperature (°C) |
| `sensor.weather_summary_apparent_temperature` | Feels-like (°C) |
| `sensor.weather_summary_humidity` | Humidity (%) |
| `binary_sensor.weather_summary_is_raining` | True when precip ≥ 0.2 mm |
| `sensor.weather_summary_updated` | Last refresh timestamp |

Diagnostic sensors (`weather_summary_rain_starts_in`,
`weather_summary_precipitation_next_hour`, …) are hidden by default; enable
them via **Settings → Devices & Services → Weather Summary → ✓ enabled** if you
want a specific one on your card.