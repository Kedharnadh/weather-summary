package com.weathersummary.app.work

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Re-schedules the refreshers after a reboot (WorkManager + alarm). */
class BootCompletedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == Intent.ACTION_MY_PACKAGE_REPLACED
        ) {
            WeatherRefreshWorker.schedule(context)
        }
    }
}