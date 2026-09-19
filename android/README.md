# Weather Summary — Android app

Native Kotlin + Jetpack Compose app that fetches current weather, has a free-AI
write a **short sentence** for it, and shows it on a **home-screen widget**.

## Build

Open this folder in **Android Studio** (Hedgehog+), let Gradle sync (wrapper
already included), then **Run**. To build from the command line:

```
.\gradlew.bat assembleDebug
```

APK: `app/build/outputs/apk/debug/app-debug.apk`

Requires JDK 17+ and the Android SDK (compileSdk 35).

## First run

1. Grant location permission (or set a **fixed** latitude/longitude in Settings — handy for a home/ping location).
2. It works immediately with **Open-Meteo** (no API key).
3. Add a free **Gemini** key (`https://aistudio.google.com/apikey`) in **Settings → AI provider** for the smart sentences. Without one, a built-in fallback sentence is shown (never blank).
4. To use your Home Assistant LLM or an Ollama server for the AI text, pick that provider in Settings.

## Widget

Add the **Weather Summary** widget to the home screen. It refreshes in the
background (WorkManager, default every 15 min). The AI sentence is generated on
the phone, so the widget works even if you never set up Home Assistant.

## Home Assistant

- Set AI provider = **Home Assistant**, or
- Toggle **Push to HA** to have the app post its latest forecast + sentence to the
  `weather_summary` integration as soon as it refreshes.

Both need a long-lived token from HA (Profile → Security → **Long-Lived Access Tokens**) and the HA URL. Install the integration first — see `ha/README.md`.

## Source layout

| Path | Purpose |
| --- | --- |
| `data/WeatherProviders.kt` | `WeatherProvider` interface + Open-Meteo, OpenWeatherMap, WeatherAPI.com clients (normalize to one snapshot) |
| `data/WeatherModels.kt` | Normalized model, WMO mapping, derived rain facts, fallback templating |
| `data/WeatherRepository.kt` | One-shot refresh: location → weather → facts → sentence |
| `ai/` | `AiProvider` interface + Gemini / Ollama / Home Assistant backends + shared prompt builder |
| `widget/` | Home-screen widget (RemoteViews, reads cached prefs) |
| `work/` | Periodic refresh worker + boot rescheduling |
| `ha/HomeAssistantClient.kt` | Push to the Home Assistant integration's `ingest_app` service |
| `prefs/Settings.kt` | All config + the cache the widget reads |

## Extending

To add a weather source, implement `WeatherProvider` (return a
`WeatherSnapshot`). To add an AI backend, implement `AiProvider`. The contract is
in `docs/RECIPE.md` — HA's Python integration follows the same contract so both
speak the same "language".