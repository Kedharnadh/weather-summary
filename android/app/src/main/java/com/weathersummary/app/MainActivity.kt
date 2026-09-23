package com.weathersummary.app

import android.Manifest
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.view.Window
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.weathersummary.app.prefs.Settings
import com.weathersummary.app.ui.SettingsScreen
import com.weathersummary.app.ui.WeatherScreen
import com.weathersummary.app.ui.WeatherViewModel
import com.weathersummary.app.ui.theme.WeatherTheme

class MainActivity : ComponentActivity() {

    private val viewModel: WeatherViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            WeatherTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    WeatherApp(viewModel)
                }
            }
        }
    }
}

@Composable
private fun WeatherApp(viewModel: WeatherViewModel) {
    val nav = rememberNavController()
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val activity = LocalContext.current as? MainActivity

    // Keep system-bar icons legible when the theme is toggled from Settings.
    val dark = when (Settings.themeMode) {
        Settings.THEME_LIGHT -> false
        Settings.THEME_SYSTEM ->
            (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
                Configuration.UI_MODE_NIGHT_YES
        else -> true
    }
    LaunchedEffect(dark) {
        activity?.let { applySystemBarsToWindow(it.window, dark) }
    }

    var foregroundGranted by remember { mutableStateOf(false) }

    fun hasBackgroundLocation(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED

    val backgroundLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        // Background location is only used for fresher GPS fixes while the app is closed.
        viewModel.onLocationPermissionResult(
            grants[Manifest.permission.ACCESS_BACKGROUND_LOCATION] == true || foregroundGranted
        )
    }

    val foregroundLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        foregroundGranted = grants[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            grants[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (foregroundGranted && !hasBackgroundLocation()) {
            // Android 10+: background location must be asked in a separate dialog.
            backgroundLauncher.launch(arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION))
        } else {
            viewModel.onLocationPermissionResult(foregroundGranted)
        }
    }

    LaunchedEffect(state.needsLocationPermission) {
        if (state.needsLocationPermission) {
            foregroundLauncher.launch(
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
            )
        }
    }

    NavHost(navController = nav, startDestination = "weather") {
        composable("weather") {
            WeatherScreen(
                state = state,
                onRefresh = viewModel::refresh,
                onOpenSettings = { nav.navigate("settings") },
            )
        }
        composable("settings") {
            SettingsScreen(
                onBack = { nav.popBackStack() },
                onSaved = viewModel::onSettingsSaved,
            )
        }
    }
}

private fun applySystemBarsToWindow(window: Window, dark: Boolean) {
    val controller = WindowInsetsControllerCompat(window, window.decorView)
    controller.isAppearanceLightStatusBars = !dark
    controller.isAppearanceLightNavigationBars = !dark
}