package com.weathersummary.app.work

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Re-schedules the periodic worker after a reboot. */
class BootCompletedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            WeatherRefreshWorker.schedule(context)
        }
    }
}