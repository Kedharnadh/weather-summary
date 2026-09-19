package com.weathersummary.app

import android.Manifest
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.os.Bundle
import android.view.View
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
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
        applyThemeToWindow()
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

    private fun applyThemeToWindow() {
        val dark = when (Settings.themeMode) {
            Settings.THEME_LIGHT -> false
            Settings.THEME_SYSTEM -> (resources.configuration.uiMode and
                android.content.res.Configuration.UI_MODE_NIGHT_MASK) ==
                android.content.res.Configuration.UI_MODE_NIGHT_YES
            else -> true
        }
        val decor = window.decorView
        if (dark) {
            decor.systemUiVisibility = decor.systemUiVisibility and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
            window.navigationBarColor = Color.rgb(22, 32, 45)
        } else {
            decor.systemUiVisibility = decor.systemUiVisibility or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            window.navigationBarColor = Color.WHITE
        }
        window.setBackgroundDrawable(ColorDrawable(if (dark) Color.rgb(14, 22, 32) else Color.rgb(247, 250, 255)))
    }
}

@Composable
private fun WeatherApp(viewModel: WeatherViewModel) {
    val nav = rememberNavController()
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    var foregroundGranted by remember { mutableStateOf(false) }

    fun hasBackgroundLocation(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED

    val backgroundLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) {
        viewModel.onLocationPermissionResult(foregroundGranted)
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