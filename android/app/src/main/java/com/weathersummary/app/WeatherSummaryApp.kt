package com.weathersummary.app

import android.app.Application
import com.weathersummary.app.prefs.Settings
import com.weathersummary.app.work.WeatherRefreshWorker

class WeatherSummaryApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Settings.init(this)
        WeatherRefreshWorker.schedule(this)
    }
}