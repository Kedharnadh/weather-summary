package com.weathersummary.app.work

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import com.weathersummary.app.prefs.Settings

/**
 * AlarmManager-driven refresh so widget updates survive Doze and aggressive
 * battery optimizers (OnePlus/OxygenOS etc.) that defer WorkManager batches.
 * Runs the refresh inline (goAsync + IO coroutine) instead of handing back to
 * WorkManager, so the tick always produces a fresh widget. Re-arms itself.
 */
class AlarmRefreshReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION) return
        val result = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                WeatherRefreshWorker.refreshAndPersist(context)
            } catch (_: Exception) {
                // Keep stale cache; next tick retries. Setting lastError hides errors
                // from the widget so the previous text stays readable.
            }
            result.finish()
        }
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
            when {
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarm.canScheduleExactAlarms() ->
                    alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M -> {
                    // The "exact alarms" special app-access can still be revoked at any
                    // time; fall back to the inexact clock so the widget keeps ticking.
                    try {
                        alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
                    } catch (_: SecurityException) {
                        alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
                    }
                }
                else ->
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