package com.weathersummary.app.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.weathersummary.app.data.CurrentWeather
import com.weathersummary.app.data.WeatherFacts
import com.weathersummary.app.data.WeatherRepository
import com.weathersummary.app.data.WeatherSnapshot
import com.weathersummary.app.prefs.Settings
import com.weathersummary.app.widget.WeatherWidgetBase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class WeatherUiState(
    val loading: Boolean = false,
    val needsLocationPermission: Boolean = false,
    val error: String? = null,
    val snapshot: WeatherSnapshot? = null,
    val facts: WeatherFacts? = null,
    val summary: String = "",
    val tempC: Double = Double.NaN,
    val condition: String = "",
    val weatherCode: Int = 0,
    val isDay: Boolean? = null,
    val updatedAtMs: Long = 0,
    val aiError: String? = null,
) {
    val hasData: Boolean get() = summary.isNotBlank() || tempC.isFinite()
}

class WeatherViewModel(app: Application) : AndroidViewModel(app) {

    private val _state = MutableStateFlow(WeatherUiState())
    val state: StateFlow<WeatherUiState> = _state.asStateFlow()

    init {
        // Show last cached data instantly (and as fully as possible), then refresh.
        val hasCache = Settings.cachedUpdatedAtMs > 0
        val temp = Settings.cachedTempC.let { if (it.isFinite()) it else 0.0 }
        val feels = Settings.cachedFeelsC.takeIf { it.isFinite() }
        val wind = Settings.cachedWindKmh.takeIf { it.isFinite() }
        val hum = Settings.cachedHumidityPct.takeIf { it >= 0 }
        val cloud = Settings.cachedCloudPct.takeIf { it >= 0 }
        _state.update {
            it.copy(
                summary = Settings.cachedSummary,
                tempC = Settings.cachedTempC,
                condition = Settings.cachedCondition,
                weatherCode = Settings.cachedWeatherCode,
                isDay = Settings.cachedIsDay,
                updatedAtMs = Settings.cachedUpdatedAtMs,
                facts = if (hasCache) WeatherFacts(
                    tempC = temp,
                    feelsC = feels,
                    conditionLabel = Settings.cachedCondition,
                    isRainingNow = false,
                    rainStartInMin = null,
                    rainStopInMin = null,
                    precipNextHourMm = 0.0,
                    maxChanceRain24h = null,
                    peakTemp24h = null,
                    windKmh = wind,
                    humidityPct = hum,
                ) else null,
                snapshot = if (hasCache) WeatherSnapshot(
                    current = CurrentWeather(
                        temperatureC = temp,
                        humidityPct = hum,
                        windKmh = wind,
                        weatherCode = Settings.cachedWeatherCode,
                        isDay = Settings.cachedIsDay,
                        cloudCoverPct = cloud,
                    )
                ) else null,
            )
        }
        refresh()
    }

    fun refresh() {
        if (_state.value.loading) return
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            try {
                val result = WeatherRepository.refresh(getApplication())
                Settings.cachedSummary = result.summary
                Settings.cachedTempC = result.snapshot.current.temperatureC
                Settings.cachedCondition = result.facts.conditionLabel
                Settings.cachedWeatherCode = result.snapshot.current.weatherCode
                Settings.cachedIsDay = result.snapshot.current.isDay
                Settings.cachedUpdatedAtMs = System.currentTimeMillis()
                Settings.lastError = ""
                Settings.cachedFeelsC = result.facts.feelsC ?: Double.NaN
                Settings.cachedWindKmh = result.facts.windKmh ?: Double.NaN
                Settings.cachedHumidityPct = result.facts.humidityPct ?: -1
                Settings.cachedCloudPct = result.snapshot.current.cloudCoverPct ?: -1
                WeatherWidgetBase.updateAll(getApplication())
                _state.update {
                    it.copy(
                        loading = false,
                        snapshot = result.snapshot,
                        facts = result.facts,
                        summary = result.summary,
                        tempC = result.snapshot.current.temperatureC,
                        condition = result.facts.conditionLabel,
                        weatherCode = result.snapshot.current.weatherCode,
                        isDay = result.snapshot.current.isDay,
                        updatedAtMs = System.currentTimeMillis(),
                        error = null,
                        aiError = Settings.lastAiError.ifBlank { null },
                    )
                }
            } catch (e: Exception) {
                val msg = e.message ?: "Unexpected error"
                Settings.lastError = msg
                _state.update {
                    it.copy(
                        loading = false,
                        needsLocationPermission = msg.contains("permission", ignoreCase = true),
                        error = msg,
                    )
                }
            }
        }
    }

    fun onLocationPermissionResult(granted: Boolean) {
        if (granted) refresh() else {
            _state.update { it.copy(needsLocationPermission = false, error = "Location denied — enable it or set a fixed location in Settings.") }
        }
    }

    fun onSettingsSaved() {
        refresh()
    }
}