package com.weathersummary.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProviderParsingTest {

    @Test
    fun `open-meteo parses current, minutely15 and hourly`() {
        val json = """
            {
              "current": {"temperature_2m": 27.5, "apparent_temperature": 29.0,
                "relative_humidity_2m": 55, "is_day": 1, "precipitation": 0.0,
                "weather_code": 2, "wind_speed_10m": 14.2, "cloud_cover": 40},
              "minutely_15": {"time": ["2026-09-23T14:00"], "precipitation": [0.0, 0.0, 0.0, 0.4],
                "weather_code": [2, 2, 2, 61]},
              "hourly": {"time": ["2026-09-23T14:00", "2026-09-23T15:00"],
                "precipitation_probability": [20, 30], "precipitation": [0.0, 0.0],
                "weather_code": [2, 3]}
            }
        """.trimIndent()

        val s = parseOpenMeteo(json)
        with(s.current) {
            assertEquals(27.5, temperatureC, 1e-9)
            assertEquals(29.0, apparentTemperatureC ?: 0.0, 1e-9)
            assertEquals(55, humidityPct)
            assertEquals(14.2, windKmh ?: 0.0, 1e-9)
            assertEquals(2, weatherCode)
            assertEquals(true, isDay)
            assertEquals(40, cloudCoverPct)
        }
        assertEquals(4, s.minutely15?.size)
        assertEquals(2, s.hourly.size)
        assertEquals("2026-09-23T14:00", s.hourly[0].time)
        assertEquals(20, s.hourly[0].precipProbabilityPct)
    }

    @Test
    fun `openweathermap converts units and maps codes to wmo`() {
        val json = """
            {
              "current": {"temp": 25.2, "feels_like": 26.0, "humidity": 60,
                "wind_speed": 3.5, "clouds": 20, "weather": [{"id": 500}], "rain": {"1h": 0.2}},
              "minutely": [{"precipitation": 0.0}, {"precipitation": 0.1}],
              "hourly": [{"dt": 1727100000, "temp": 24.5, "pop": 0.2,
                "weather": [{"id": 501}], "rain": {"1h": 0.1}}]
            }
        """.trimIndent()

        val s = parseOpenWeatherMap(json)
        with(s.current) {
            assertEquals(25.2, temperatureC, 1e-9)
            assertEquals(12.6, windKmh ?: 0.0, 1e-9) // m/s * 3.6
            assertEquals(61, weatherCode)             // 500 -> rain
            assertEquals(0.2, precipitationMm ?: 0.0, 1e-9)
        }
        assertEquals(2, s.minutely15?.size)
        assertEquals(1, s.hourly.size)
        assertEquals(20, s.hourly[0].precipProbabilityPct)
        assertEquals(0.1, s.hourly[0].precipMm ?: 0.0, 1e-9)
        assertEquals(61, s.hourly[0].weatherCode)
        assertEquals(
            java.time.Instant.ofEpochSecond(1727100000).toString(),
            s.hourly[0].time,
        )
    }

    @Test
    fun `weatherapi parses current and hourly forecast`() {
        val json = """
            {
              "current": {"temp_c": 28.0, "feelslike_c": 30.0, "humidity": 50,
                "wind_kph": 11.0, "cloud": 10, "is_day": 1, "condition": {"code": 1000}},
              "forecast": {"forecastday": [{"hour": [
                {"time": "2026-09-23 14:00", "temp_c": 28.0, "chance_of_rain": 0,
                 "precip_mm": 0.0, "condition": {"code": 1000}},
                {"time": "2026-09-23 15:00", "temp_c": 29.0, "chance_of_rain": 40,
                 "precip_mm": 0.5, "condition": {"code": 1003}}
              ]}]}
            }
        """.trimIndent()

        val s = parseWeatherApiCom(json)
        with(s.current) {
            assertEquals(28.0, temperatureC, 1e-9)
            assertEquals(0, weatherCode) // 1000 -> clear
            assertEquals(true, isDay)
        }
        assertEquals(2, s.hourly.size)
        assertNull(s.minutely15)
        assertEquals(40, s.hourly[1].precipProbabilityPct)
        assertEquals(2, s.hourly[1].weatherCode) // 1003 -> partly cloudy
    }

    @Test
    fun `windy converts kelvin, derives wind speed and cloud cover`() {
        val json = """
            {
              "ts": [1730000000000, 1730003600000],
              "temp-surface": [300.15, 301.15],
              "rh-surface": [50, 52],
              "wind_u-surface": [5, 6], "wind_v-surface": [0, 0],
              "gust-surface": [9, 10],
              "past3hprecip-surface": [0, 0], "past3hsnowprecip-surface": [0, 0],
              "lclouds-surface": [10, 20], "mclouds-surface": [20, 10],
              "hclouds-surface": [5, 5]
            }
        """.trimIndent()

        val s = parseWindy(json)
        with(s.current) {
            assertEquals(27.0, temperatureC, 1e-9) // 300.15 - 273.15
            assertEquals(18.0, windKmh ?: 0.0, 1e-9) // sqrt(25) * 3.6
            assertEquals(50, humidityPct)
            assertEquals(2, weatherCode) // cloud 20 -> partly cloudy
            assertEquals(20, cloudCoverPct)
        }
        assertEquals(2, s.hourly.size)
        assertEquals(
            java.time.Instant.ofEpochMilli(1730003600000).toString(),
            s.hourly[1].time,
        )
    }
}