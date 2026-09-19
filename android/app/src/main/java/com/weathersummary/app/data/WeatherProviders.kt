package com.weathersummary.app.data

import com.google.gson.annotations.SerializedName
import com.weathersummary.app.prefs.Settings
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.util.concurrent.TimeUnit

/**
 * Contract implemented by every weather source. Any new provider only needs to
 * return a normalized [WeatherSnapshot] (see docs/RECIPE.md).
 */
interface WeatherProvider {
    val id: String
    val requiresApiKey: Boolean
    suspend fun fetch(lat: Double, lon: Double): WeatherSnapshot
}

object WeatherProviders {

    const val OPEN_METEO = "openmeteo"
    const val OPEN_WEATHER_MAP = "openweathermap"
    const val WEATHER_API_COM = "weatherapi"

    fun all(): List<WeatherProvider> = listOf(
        OpenMeteoProvider(),
        OpenWeatherMapProvider(),
        WeatherApiComProvider(),
    )

    fun from(settings: Settings): WeatherProvider =
        all().firstOrNull { it.id == settings.weatherProvider } ?: OpenMeteoProvider()
}

// ---------------------------------------------------------------------------
// Shared HTTP helper
// ---------------------------------------------------------------------------

internal object Http {
    val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    suspend fun get(url: String): String = withContext(Dispatchers.IO) {
        client.newCall(Request.Builder().url(url).build()).execute().useResponse { r ->
            val text = r.body?.string().orEmpty()
            if (!r.isSuccessful) throw RuntimeException("HTTP ${r.code}: $text")
            text
        }
    }

    suspend fun postJson(url: String, body: String, bearerToken: String? = null): String =
        withContext(Dispatchers.IO) {
            val builder = Request.Builder().url(url)
                .post(body.toRequestBody("application/json; charset=utf-8".toMediaType()))
            if (bearerToken != null) builder.header("Authorization", "Bearer $bearerToken")
            builder.build().let { req ->
                client.newCall(req).execute().useResponse { r ->
                    val text = r.body?.string().orEmpty()
                    if (!r.isSuccessful) throw RuntimeException("HTTP ${r.code}: $text")
                    text
                }
            }
        }

    private inline fun Response.useResponse(block: (Response) -> String): String =
        use { block(it) }
}

private fun String.toRequestBody(mediaType: MediaType): RequestBody =
    RequestBody.create(mediaType, this)

// ---------------------------------------------------------------------------
// 1. Open-Meteo — free, no API key, open data
// ---------------------------------------------------------------------------

internal data class OmResponse(
    val current: OmCurrent? = null,
    @SerializedName("minutely_15") val minutely15: OmSeries? = null,
    val hourly: OmSeries? = null,
)

internal data class OmCurrent(
    @SerializedName("temperature_2m") val temperature2m: Double = 0.0,
    @SerializedName("apparent_temperature") val apparentTemperature: Double? = null,
    @SerializedName("relative_humidity_2m") val relativeHumidity2m: Int? = null,
    @SerializedName("is_day") val isDayRaw: Int? = null,
    val precipitation: Double? = null,
    @SerializedName("weather_code") val weatherCode: Int = 0,
    @SerializedName("wind_speed_10m") val windSpeed10m: Double? = null,
    @SerializedName("cloud_cover") val cloudCover: Int? = null,
)

internal data class OmSeries(
    val time: List<String> = emptyList(),
    val precipitation: List<Double>? = null,
    @SerializedName("weather_code") val weatherCode: List<Int>? = null,
    @SerializedName("temperature_2m") val temperature2m: List<Double>? = null,
    @SerializedName("precipitation_probability") val precipitationProbability: List<Int>? = null,
)

internal class OpenMeteoProvider : WeatherProvider {
    override val id = WeatherProviders.OPEN_METEO
    override val requiresApiKey = false

    override suspend fun fetch(lat: Double, lon: Double): WeatherSnapshot {
        val url = buildString {
            append("https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon")
            append("&current=temperature_2m,apparent_temperature,relative_humidity_2m,")
            append("is_day,precipitation,weather_code,wind_speed_10m,cloud_cover")
            append("&minutely_15=precipitation,weather_code&forecast_minutely_15=120")
            append("&hourly=temperature_2m,precipitation_probability,precipitation,weather_code")
            append("&forecast_hours=48&timezone=auto")
        }
        val om = gson().fromJson(Http.get(url), OmResponse::class.java)
        return om.toSnapshot()
    }

    private fun OmResponse.toSnapshot(): WeatherSnapshot {
        val cur = current
        return WeatherSnapshot(
            current = CurrentWeather(
                temperatureC = cur?.temperature2m ?: 0.0,
                apparentTemperatureC = cur?.apparentTemperature,
                humidityPct = cur?.relativeHumidity2m,
                windKmh = cur?.windSpeed10m,
                weatherCode = cur?.weatherCode ?: 0,
                precipitationMm = cur?.precipitation,
                isDay = cur?.isDayRaw?.let { it == 1 },
                cloudCoverPct = cur?.cloudCover,
            ),
            minutely15 = minutely15?.precipitation,
            hourly = hourly?.let { s ->
                s.time.mapIndexedNotNull { i, t ->
                    HourSlice(
                        time = t,
                        temperatureC = s.temperature2m?.getOrNull(i),
                        precipProbabilityPct = s.precipitationProbability?.getOrNull(i),
                        precipMm = s.precipitation?.getOrNull(i),
                        weatherCode = s.weatherCode?.getOrNull(i),
                    )
                }
            } ?: emptyList(),
        )
    }
}

// ---------------------------------------------------------------------------
// 2. OpenWeatherMap — One Call 3.0 (free tier, requires appid)
// ---------------------------------------------------------------------------

internal data class OwlResponse(
    val current: OwlCurrent? = null,
    val minutely: List<OwlStep>? = null,
    val hourly: List<OwlHour>? = null,
)

internal data class OwlCurrent(
    val temp: Double = 0.0,
    @SerializedName("feels_like") val feelsLike: Double? = null,
    val humidity: Int? = null,
    @SerializedName("wind_speed") val windSpeedMps: Double? = null,
    val clouds: Int? = null,
    val weather: List<OwlWeather>? = null,
    val rain: OwlRain? = null,
)

internal data class OwlStep(val precipitation: Double? = null)
internal data class OwlRain(@SerializedName("1h") val oneHour: Double? = null)

internal data class OwlHour(
    val dt: Long? = null,
    val temp: Double? = null,
    val pop: Double? = null,
    val weather: List<OwlWeather>? = null,
    val rain: OwlRain? = null,
)

internal data class OwlWeather(val id: Int = 0)

private fun Int.owmToWmo(): Int = when (this) {
    200, 201, 202, 210, 211, 212, 221, 230, 231, 232 -> 95
    300, 301, 302, 310, 311, 312, 313, 314, 321, 520, 521, 522, 531 -> 51
    500, 501, 502, 503, 504 -> 61
    511, 611, 612, 613, 615, 616 -> 66
    600, 601, 602, 620, 621, 622 -> 73
    701, 711, 721, 731, 741, 751, 761, 762, 771 -> 45
    800 -> 0
    801, 802 -> 2
    803, 804 -> 3
    else -> 0
}

internal class OpenWeatherMapProvider : WeatherProvider {
    override val id = WeatherProviders.OPEN_WEATHER_MAP
    override val requiresApiKey = true

    override suspend fun fetch(lat: Double, lon: Double): WeatherSnapshot {
        val key = Settings.openWeatherApiKey
        check(key.isNotBlank()) { "OpenWeatherMap API key missing — add it in Settings." }
        val url = "https://api.openweathermap.org/data/3.0/onecall?" +
            "lat=$lat&lon=$lon&appid=$key&units=metric&exclude=alerts"
        val ow = gson().fromJson(Http.get(url), OwlResponse::class.java)
        val cur = ow.current
        return WeatherSnapshot(
            current = CurrentWeather(
                temperatureC = cur?.temp ?: 0.0,
                apparentTemperatureC = cur?.feelsLike,
                humidityPct = cur?.humidity,
                windKmh = cur?.windSpeedMps?.let { it * 3.6 },
                weatherCode = cur?.weather?.firstOrNull()?.id?.owmToWmo() ?: 0,
                precipitationMm = cur?.rain?.oneHour,
                isDay = null,
                cloudCoverPct = cur?.clouds,
            ),
            minutely15 = ow.minutely?.map { it.precipitation ?: 0.0 },
            hourly = ow.hourly?.map {
                HourSlice(
                    time = it.dt?.let { d -> java.time.Instant.ofEpochSecond(d).toString() } ?: "",
                    temperatureC = it.temp,
                    precipProbabilityPct = it.pop?.let { p -> (p * 100).toInt() },
                    precipMm = it.rain?.oneHour,
                    weatherCode = it.weather?.firstOrNull()?.id?.owmToWmo(),
                )
            } ?: emptyList(),
        )
    }
}

// ---------------------------------------------------------------------------
// 3. WeatherAPI.com — free tier, requires key
// ---------------------------------------------------------------------------

internal data class WaResponse(
    val current: WaCurrent? = null,
    val forecast: WaForecast? = null,
)

internal data class WaCurrent(
    @SerializedName("temp_c") val tempC: Double = 0.0,
    @SerializedName("feelslike_c") val feelsLikeC: Double? = null,
    val humidity: Int? = null,
    @SerializedName("wind_kph") val windKph: Double? = null,
    val cloud: Int? = null,
    @SerializedName("is_day") val isDayRaw: Int? = null,
    val condition: WaCondition? = null,
)

internal data class WaCondition(val code: Int = 1000)
internal data class WaForecast(val forecastday: List<WaDay>? = null)
internal data class WaDay(val hour: List<WaHour>? = null)

internal data class WaHour(
    val time: String? = null,
    @SerializedName("temp_c") val tempC: Double? = null,
    @SerializedName("chance_of_rain") val chanceOfRain: Int? = null,
    @SerializedName("precip_mm") val precipMm: Double? = null,
    val condition: WaCondition? = null,
)

private fun waCodeToWmo(code: Int): Int = when (code) {
    1000 -> 0
    1003 -> 2
    1006, 1007 -> 3
    1009, 1030, 1135, 1147 -> 45
    1063, 1069, 1072 -> 51
    1150, 1153 -> 53
    1180, 1183 -> 61
    1186, 1189 -> 63
    1192, 1195 -> 65
    1198 -> 66
    1201 -> 67
    1204, 1207 -> 71
    1210, 1213 -> 73
    1216, 1219 -> 75
    1222, 1225 -> 77
    1237 -> 75
    1240, 1243, 1246 -> 80
    1249 -> 66
    1252 -> 67
    1255, 1258 -> 85
    1261, 1264 -> 86
    1273, 1276 -> 95
    1279, 1282 -> 95
    else -> 0
}

internal class WeatherApiComProvider : WeatherProvider {
    override val id = WeatherProviders.WEATHER_API_COM
    override val requiresApiKey = true

    override suspend fun fetch(lat: Double, lon: Double): WeatherSnapshot {
        val key = Settings.weatherApiKey
        check(key.isNotBlank()) { "WeatherAPI.com key missing — add it in Settings." }
        val url = "https://api.weatherapi.com/v1/forecast.json?key=$key&q=$lat,$lon&days=2&aqi=no&alerts=no"
        val wa = gson().fromJson(Http.get(url), WaResponse::class.java)
        val cur = wa.current
        return WeatherSnapshot(
            current = CurrentWeather(
                temperatureC = cur?.tempC ?: 0.0,
                apparentTemperatureC = cur?.feelsLikeC,
                humidityPct = cur?.humidity,
                windKmh = cur?.windKph,
                weatherCode = cur?.condition?.code?.let { waCodeToWmo(it) } ?: 0,
                precipitationMm = null,
                isDay = cur?.isDayRaw?.let { it == 1 },
                cloudCoverPct = cur?.cloud,
            ),
            minutely15 = null,
            hourly = wa.forecast?.forecastday?.flatMap { it.hour.orEmpty() }?.map {
                HourSlice(
                    time = it.time ?: "",
                    temperatureC = it.tempC,
                    precipProbabilityPct = it.chanceOfRain,
                    precipMm = it.precipMm,
                    weatherCode = it.condition?.code?.let { c -> waCodeToWmo(c) },
                )
            } ?: emptyList(),
        )
    }
}

internal fun gson(): com.google.gson.Gson = com.google.gson.Gson()