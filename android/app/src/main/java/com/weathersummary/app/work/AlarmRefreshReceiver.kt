package com.weathersummary.app.work

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import com.weathersummary.app.prefs.Settings

/**
 * AlarmManager-driven refresh so widget updates survive Doze and aggressive
 * battery optimizers (OnePlus/OxygenOS etc.) that defer WorkManager batches.
 * Uses an exact allow-while-idle alarm where permitted and re-arms itself after
 * each firing.
 */
class AlarmRefreshReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION) return
        WeatherRefreshWorker.refreshNow(context)
        schedule(context)
    }

    companion object {
        const val ACTION = "com.weathersummary.app.REFRESH_WIDGETS"
        private const val REQUEST_CODE = 4207

        fun schedule(context: Context) {
            val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val pi = pendingIntent(context)
            alarm.cancel(pi)
            val intervalMs = Settings.intervalMinutes.coerceAtLeast(15L) * 60_000L
            val triggerAt = System.currentTimeMillis() + intervalMs
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarm.canScheduleExactAlarms()) {
                alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
            } else {
                alarm.setInexactRepeating(AlarmManager.RTC_WAKEUP, triggerAt, intervalMs, pi)
            }
        }

        private fun pendingIntent(context: Context): PendingIntent =
            PendingIntent.getBroadcast(
                context, REQUEST_CODE,
                Intent(context, AlarmRefreshReceiver::class.java).setAction(ACTION),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
    }
}