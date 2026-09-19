package com.weathersummary.app.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Air
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.weathersummary.app.data.WeatherCodes
import com.weathersummary.app.data.HourSlice
import com.weathersummary.app.data.WeatherSnapshot
import com.weathersummary.app.data.WeatherFacts

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WeatherScreen(
    state: WeatherUiState,
    onRefresh: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Weather Summary") },
                navigationIcon = {
                    IconButton(onClick = onRefresh) {
                        if (state.loading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = Color.White,
                            )
                        } else {
                            Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                        }
                    }
                },
                actions = {
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White,
                    actionIconContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                ),
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { CurrentConditions(state) }
            item { SummaryCard(state) }
            if (state.error != null) {
                item {
                    Text(
                        text = state.error,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
            if (state.snapshot?.hourly?.isNotEmpty() == true) {
                item {
                    Text(
                        "Next 24 hours",
                        fontWeight = FontWeight.SemiBold,
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
                items(state.snapshot.hourly.take(24)) { hour ->
                    HourRow(hour)
                }
            }
        }
    }
}

@Composable
private fun CurrentConditions(state: WeatherUiState) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Image(
            painter = painterResource(WeatherCodes.iconRes(state.weatherCode, state.isDay)),
            contentDescription = state.condition,
            modifier = Modifier.size(96.dp),
        )
        val temp = if (state.tempC.isFinite()) "${Math.round(state.tempC)}°" else "--°"
        Text(
            temp,
            fontSize = 64.sp,
            fontWeight = FontWeight.Light,
            color = MaterialTheme.colorScheme.primary,
        )
        Text(state.condition.ifBlank { "Fetching forecast…" }, style = MaterialTheme.typography.titleMedium)
        state.facts?.feelsC?.let {
            Text(
                "Feels like ${Math.round(it)}°",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            Metric(Icons.Default.WaterDrop, humidityText(state), "Humidity")
            Metric(Icons.Default.Air, windText(state), "Wind")
            Metric(Icons.Default.Cloud, cloudText(state), "Cloud")
        }
        if (state.updatedAtMs > 0) {
            Text(
                "Updated ${relativeTime(state.updatedAtMs)}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 10.dp),
            )
        }
    }
}

private fun humidityText(state: WeatherUiState): String {
    val h = state.facts?.humidityPct ?: state.snapshot?.current?.humidityPct ?: return "--"
    return "$h%"
}

private fun windText(state: WeatherUiState): String {
    val w = state.facts?.windKmh ?: state.snapshot?.current?.windKmh ?: return "--"
    return "${Math.round(w)} km/h"
}

private fun cloudText(state: WeatherUiState): String {
    val c = state.snapshot?.current?.cloudCoverPct ?: return "--"
    return "$c%"
}

@Composable
private fun Metric(icon: ImageVector, value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(
            icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
        )
        Text(value, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SummaryCard(state: WeatherUiState) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
        ),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
        ) {
            Text(
                "Brief",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
            Text(
                state.summary.ifBlank {
                    if (state.tempC.isFinite()) "Loading summary…" else "No data yet — refresh."
                },
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
                modifier = Modifier.padding(top = 6.dp),
                textAlign = TextAlign.Start,
            )
        }
    }
}

@Composable
private fun HourRow(hour: HourSlice) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            hourLabel(hour.time),
            modifier = Modifier.width(56.dp),
            style = MaterialTheme.typography.bodyMedium,
        )
        Box(modifier = Modifier.width(32.dp), contentAlignment = Alignment.CenterStart) {
            hour.weatherCode?.let { code ->
                Image(
                    painter = painterResource(WeatherCodes.iconRes(code, null)),
                    contentDescription = null,
                    modifier = Modifier.size(22.dp),
                )
            }
        }
        Spacer(Modifier.width(8.dp))
        Box(modifier = Modifier.weight(1f)) {
            hour.temperatureC?.let {
                Text("${Math.round(it)}°", fontWeight = FontWeight.Medium)
            }
        }
        if (hour.precipProbabilityPct != null && hour.precipProbabilityPct > 0) {
            Text(
                "${hour.precipProbabilityPct}%",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
}

private fun hourLabel(time: String): String {
    return try {
        java.time.LocalDateTime.parse(time).let { "%02d:00".format(it.hour) }
    } catch (e: Exception) {
        try {
            java.time.OffsetDateTime.parse(time).let { "%02d:00".format(it.hour) }
        } catch (e2: Exception) {
            time.substringAfterLast('T').take(5)
        }
    }
}

private fun relativeTime(epochMs: Long): String {
    val diff = (System.currentTimeMillis() - epochMs) / 1000
    return when {
        diff < 60 -> "just now"
        diff < 3600 -> "${diff / 60} min ago"
        else -> "${diff / 3600} h ago"
    }
}

@Preview(showBackground = true)
@Composable
private fun WeatherScreenPreview() {
    WeatherScreen(
        state = WeatherUiState(
            tempC = 27.5,
            condition = "Partly cloudy",
            weatherCode = 2,
            summary = "Rain starting in ~20 min, umbrella time.",
            facts = WeatherFacts(
                tempC = 27.5, feelsC = 29.0, conditionLabel = "Partly cloudy",
                isRainingNow = false, rainStartInMin = 20, rainStopInMin = null,
                precipNextHourMm = 0.1, maxChanceRain24h = 60 to "19:00",
                peakTemp24h = 31.0 to "15:00", windKmh = 14.0, humidityPct = 55,
            ),
            snapshot = WeatherSnapshot(
                current = com.weathersummary.app.data.CurrentWeather(
                    temperatureC = 27.5, apparentTemperatureC = 29.0,
                    humidityPct = 55, windKmh = 14.0, weatherCode = 2,
                ),
                hourly = listOf(HourSlice("2026-09-20T14:00", 27.5, 60, 0.0, 61)),
            ),
        ),
        onRefresh = {},
        onOpenSettings = {},
    )
}