package com.hayatai.app;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

public class ReminderActionReceiver extends BroadcastReceiver {

    public static final String ACTION_STOP_ALARM = "com.hayatai.app.ACTION_STOP_ALARM";
    public static final String ACTION_SNOOZE_ALARM = "com.hayatai.app.ACTION_SNOOZE_ALARM";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;

        String id = intent.getStringExtra("id");
        int notificationId = intent.getIntExtra("notificationId", id != null ? Math.abs(id.hashCode()) : 0);

        // Stop active alarm sound if playing
        AlarmSoundManager.stopAlarmSound();

        // Cancel the system notification
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(notificationId);
            }
        } catch (Exception ignored) {}

        // Dismiss floating overlay if showing
        ReminderOverlayHelper.dismissOverlay();

        if (ACTION_STOP_ALARM.equals(action)) {
            if (id != null) recordResponse(context, id, "alarm_stopped");
            return;
        }

        if (ACTION_SNOOZE_ALARM.equals(action)) {
            int snoozeMinutes = intent.getIntExtra("snoozeMinutes", 5);
            if (snoozeMinutes <= 0) snoozeMinutes = 5;

            String title = intent.getStringExtra("title");
            if (title == null || title.isEmpty()) title = "غفوة: تذكير حياة AI";
            String body = intent.getStringExtra("body");
            if (body == null) body = "";
            String alertMode = intent.getStringExtra("alertMode");
            String soundUri = intent.getStringExtra("soundUri");
            int repeatCount = intent.getIntExtra("repeatCount", 3);

            long triggerAt = System.currentTimeMillis() + (long) snoozeMinutes * 60 * 1000;
            scheduleSnooze(context, id, title, body, triggerAt, alertMode, soundUri, repeatCount, snoozeMinutes);

            if (id != null) recordResponse(context, id, "snoozed_" + snoozeMinutes + "min");
            return;
        }

        String answer = null;
        if ("com.hayatai.app.ACTION_REMINDER_YES".equals(action)) {
            answer = "yes";
        } else if ("com.hayatai.app.ACTION_REMINDER_NO".equals(action)) {
            answer = "no";
        } else if ("com.hayatai.app.ACTION_REMINDER_DISMISS".equals(action)) {
            answer = "dismissed";
        }

        if (id != null && answer != null) {
            recordResponse(context, id, answer);
        }
    }

    private static void scheduleSnooze(Context context, String id, String title, String body,
                                       long triggerAt, String alertMode, String soundUri, int repeatCount, int snoozeMinutes) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            Intent intent = new Intent(context, ReminderAlarmReceiver.class);
            intent.setAction("com.hayatai.app.ACTION_REMINDER_ALARM");
            intent.putExtra("id", id);
            intent.putExtra("title", title);
            intent.putExtra("body", body);
            intent.putExtra("repeatDaily", false);
            intent.putExtra("isQuestion", false);
            intent.putExtra("showOverlay", true);
            intent.putExtra("alertMode", alertMode != null ? alertMode : "alarm");
            intent.putExtra("soundUri", soundUri != null ? soundUri : "");
            intent.putExtra("repeatCount", repeatCount);
            intent.putExtra("snoozeMinutes", snoozeMinutes);

            int requestCode = Math.abs(id.hashCode()) + 999;
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pi = PendingIntent.getBroadcast(context, requestCode, intent, flags);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            }
        } catch (Exception ignored) {}
    }

    public static void recordResponse(Context context, String id, String answer) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(SmartReminderPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(SmartReminderPlugin.KEY_RESPONSES, "[]");
            JSONArray array = new JSONArray(raw);

            JSONObject item = new JSONObject();
            item.put("reminderId", id);
            item.put("answer", answer);
            item.put("answeredAt", System.currentTimeMillis());

            array.put(item);
            prefs.edit().putString(SmartReminderPlugin.KEY_RESPONSES, array.toString()).apply();
        } catch (Exception ignored) {}
    }
}