package com.weathersummary.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.weathersummary.app.prefs.Settings

private val LightColors = lightColorScheme(
    primary = Color(0xFF2E6FDB),
    onPrimary = Color.White,
    secondary = Color(0xFF4DA6FF),
    background = Color(0xFFF7FAFF),
    surface = Color.White,
    onBackground = Color(0xFF12233B),
    onSurface = Color(0xFF12233B),
    onSurfaceVariant = Color(0xFF5A6B80),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF4DA6FF),
    onPrimary = Color(0xFF00285E),
    secondary = Color(0xFF7FC3FF),
    background = Color(0xFF0E1620),
    surface = Color(0xFF16202D),
    onBackground = Color(0xFFE3ECF6),
    onSurface = Color(0xFFE3ECF6),
    onSurfaceVariant = Color(0xFF9FB0C2),
)

@Composable
fun WeatherTheme(content: @Composable () -> Unit) {
    val dark = when (Settings.themeMode) {
        Settings.THEME_LIGHT -> false
        Settings.THEME_SYSTEM -> isSystemInDarkTheme()
        else -> true
    }
    MaterialTheme(
        colorScheme = if (dark) DarkColors else LightColors,
        content = content,
    )
}