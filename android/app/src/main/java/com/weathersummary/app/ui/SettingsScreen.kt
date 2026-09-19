package com.weathersummary.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.weathersummary.app.data.WeatherProviders
import com.weathersummary.app.prefs.Settings
import com.weathersummary.app.work.WeatherRefreshWorker
import androidx.compose.ui.platform.LocalContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onBack: () -> Unit, onSaved: () -> Unit) {
    val context = LocalContext.current

    var weatherProvider by rememberSaveable { mutableStateOf(Settings.weatherProvider) }
    var owmKey by rememberSaveable { mutableStateOf(Settings.openWeatherApiKey) }
    var waKey by rememberSaveable { mutableStateOf(Settings.weatherApiKey) }
    var windyKey by rememberSaveable { mutableStateOf(Settings.windyApiKey) }

    var aiProvider by rememberSaveable { mutableStateOf(Settings.aiProvider) }
    var geminiKey by rememberSaveable { mutableStateOf(Settings.geminiApiKey) }
    var geminiModel by rememberSaveable { mutableStateOf(Settings.geminiModel) }
    var ollamaUrl by rememberSaveable { mutableStateOf(Settings.ollamaUrl) }
    var ollamaModel by rememberSaveable { mutableStateOf(Settings.ollamaModel) }
    var haUrl by rememberSaveable { mutableStateOf(Settings.haUrl) }
    var haToken by rememberSaveable { mutableStateOf(Settings.haToken) }

    var sentenceMode by rememberSaveable { mutableStateOf(Settings.sentenceMode) }
    var theme by rememberSaveable { mutableStateOf(Settings.themeMode) }
    var useGps by rememberSaveable { mutableStateOf(Settings.useGps) }
    var lat by rememberSaveable { mutableStateOf(Settings.latitude.toString()) }
    var lon by rememberSaveable { mutableStateOf(Settings.longitude.toString()) }
    var pushHa by rememberSaveable { mutableStateOf(Settings.pushToHA) }
    var interval by rememberSaveable { mutableStateOf(Settings.intervalMinutes.toString()) }
    var widgetTransparent by rememberSaveable { mutableStateOf(Settings.widgetTransparent) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary),
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            SectionHeader("Theme")
            listOf(
                Triple(Settings.THEME_DARK, "Dark", "Default — battery friendly"),
                Triple(Settings.THEME_LIGHT, "Light", "Bright, classic look"),
                Triple(Settings.THEME_SYSTEM, "System", "Follow the phone's setting"),
            ).forEach { (id, label, sub) ->
                OptionRow("$label — $sub", id == theme) { theme = id }
            }

            SectionHeader("Weather provider")

            listOf(
                Pair(WeatherProviders.OPEN_METEO, "Open-Meteo (no key)"),
                Pair(WeatherProviders.OPEN_WEATHER_MAP, "OpenWeatherMap (free key)"),
                Pair(WeatherProviders.WEATHER_API_COM, "WeatherAPI.com (free key)"),
                Pair(WeatherProviders.WINDY, "Windy (free key, 3-hourly rain)"),
            ).forEach { (id, label) ->
                OptionRow(label, id == weatherProvider) { weatherProvider = id }
            }
            if (weatherProvider == WeatherProviders.OPEN_WEATHER_MAP) {
                SecretField(owmKey, "OpenWeatherMap appid") { owmKey = it }
            }
            if (weatherProvider == WeatherProviders.WEATHER_API_COM) {
                SecretField(waKey, "WeatherAPI.com key") { waKey = it }
            }
            if (weatherProvider == WeatherProviders.WINDY) {
                SecretField(windyKey, "Windy API key") { windyKey = it }
                Text(
                    "Free tier serves shuffled test data. Key at windy.com/docs/api.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }

            SectionHeader("AI provider")
            listOf(
                Triple(Settings.AI_GEMINI, "Gemini (free tier)", "Key from aistudio.google.com/apikey"),
                Triple(Settings.AI_OLLAMA, "Ollama", "Your own server or HA add-on"),
                Triple(Settings.AI_HOME_ASSISTANT, "Home Assistant", "Use the LLM configured in HA"),
            ).forEach { (id, label, sub) ->
                OptionRow(label + " — " + sub, id == aiProvider) { aiProvider = id }
            }
            when (aiProvider) {
                Settings.AI_GEMINI -> {
                    SecretField(geminiKey, "Gemini API key") { geminiKey = it }
                    OutlinedTextField(
                        value = geminiModel,
                        onValueChange = { geminiModel = it },
                        label = { Text("Model (default gemini-3.8-flash)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                Settings.AI_OLLAMA -> {
                    OutlinedTextField(
                        value = ollamaUrl,
                        onValueChange = { ollamaUrl = it },
                        label = { Text("Ollama base URL (e.g. http://192.168.1.5:11434)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = ollamaModel,
                        onValueChange = { ollamaModel = it },
                        label = { Text("Model (default llama3.2)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                Settings.AI_HOME_ASSISTANT -> {
                    OutlinedTextField(
                        value = haUrl,
                        onValueChange = { haUrl = it },
                        label = { Text("Home Assistant URL (e.g. http://192.168.1.5:8123)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    SecretField(haToken, "Long-lived access token") { haToken = it }
                    Text(
                        "Install the weather_summary integration in HA and it exposes " +
                            "POST /api/weather_summary/generate used here.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            SectionHeader("Sentence")
            OptionRow(
                "Long (≤ 240 chars)", sentenceMode == Settings.SENTENCE_LONG,
            ) { sentenceMode = Settings.SENTENCE_LONG }
            OptionRow(
                "Short (≤ 100 chars)", sentenceMode == Settings.SENTENCE_SHORT,
            ) { sentenceMode = Settings.SENTENCE_SHORT }
            OptionRow(
                "Tiny (≤ 60 chars — best for the widget)", sentenceMode == Settings.SENTENCE_TINY,
            ) { sentenceMode = Settings.SENTENCE_TINY }

            SectionHeader("Location")
            SwitchRow("Use my location (GPS)", useGps, { useGps = it })
            if (!useGps) {
                OutlinedTextField(
                    value = lat,
                    onValueChange = { lat = it },
                    label = { Text("Latitude") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = lon,
                    onValueChange = { lon = it },
                    label = { Text("Longitude") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            SectionHeader("Home Assistant")
            SwitchRow(
                "Push latest forecast + sentence to HA (REST)",
                pushHa,
                { pushHa = it },
                sub = "Requires HA URL + token above (or the AI=HA provider).",
            )

            SectionHeader("Widgets")
            SwitchRow(
                "Transparent widget background",
                widgetTransparent,
                { widgetTransparent = it },
                sub = "Modern glassy look — try with a vivid wallpaper. Applies to all 3 widgets.",
            )
            Text(
                "Add widgets: long-press home → Widgets → Weather Summary (current + text, text only, or current only).",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            SectionHeader("Refresh")
            OutlinedTextField(
                value = interval,
                onValueChange = { interval = it },
                label = { Text("Minutes between background refreshes (15–240)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            Button(
                onClick = {
                    Settings.weatherProvider = weatherProvider
                    Settings.openWeatherApiKey = owmKey.trim()
                    Settings.weatherApiKey = waKey.trim()
                    Settings.windyApiKey = windyKey.trim()
                    Settings.aiProvider = aiProvider
                    Settings.geminiApiKey = geminiKey.trim()
                    Settings.geminiModel = geminiModel.trim()
                    Settings.ollamaUrl = ollamaUrl.trim()
                    Settings.ollamaModel = ollamaModel.trim()
                    Settings.haUrl = haUrl.trim()
                    Settings.haToken = haToken.trim()
                    Settings.sentenceMode = sentenceMode
                    Settings.themeMode = theme
                    Settings.useGps = useGps
                    Settings.latitude = lat.toDoubleOrNull() ?: Settings.latitude
                    Settings.longitude = lon.toDoubleOrNull() ?: Settings.longitude
                    Settings.pushToHA = pushHa
                    Settings.intervalMinutes = (interval.toLongOrNull() ?: 15L).coerceIn(15L, 240L)
                    Settings.widgetTransparent = widgetTransparent
                    WeatherRefreshWorker.schedule(context)
                    com.weathersummary.app.widget.WeatherWidgetBase.updateAll(context)
                    onSaved()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp, bottom = 24.dp),
            ) {
                Text("Save & refresh", modifier = Modifier.padding(4.dp))
            }
        }
    }
}

@Composable
private fun SectionHeader(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(top = 14.dp, bottom = 2.dp),
    )
}

@Composable
private fun OptionRow(label: String, selected: Boolean, onSelect: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .selectable(selected = selected, onClick = onSelect)
            .padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RadioButton(selected = selected, onClick = onSelect)
        Text(label, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(start = 6.dp))
    }
}

@Composable
private fun SwitchRow(label: String, checked: Boolean, onChange: (Boolean) -> Unit, sub: String? = null) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.bodyMedium)
            if (sub != null) {
                Text(
                    sub,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Switch(checked = checked, onCheckedChange = onChange)
    }
}

@Composable
private fun SecretField(value: String, label: String, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
    )
}