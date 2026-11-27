package com.hayatai.app;

import android.app.KeyguardManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONObject;

public class ReminderAlarmReceiver extends BroadcastReceiver {

    public static final String CHANNEL_ID = "hayat_smart_reminders";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();

        if (Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            rescheduleAllOnBoot(context);
            PersistentNotificationHelper.restoreIfEnabled(context);
            return;
        }

        String id = intent.getStringExtra("id");
        if (id == null) return;

        String title = intent.getStringExtra("title");
        if (title == null || title.isEmpty()) title = "تذكير حياة AI";

        String body = intent.getStringExtra("body");
        if (body == null) body = "";

        boolean repeatDaily = intent.getBooleanExtra("repeatDaily", false);
        boolean isQuestion = intent.getBooleanExtra("isQuestion", false);
        String yesLabel = intent.getStringExtra("yesLabel");
        if (yesLabel == null || yesLabel.isEmpty()) yesLabel = "نعم";

        String noLabel = intent.getStringExtra("noLabel");
        if (noLabel == null || noLabel.isEmpty()) noLabel = "لا";

        boolean showOverlay = intent.getBooleanExtra("showOverlay", true);
        String alertMode = intent.getStringExtra("alertMode");
        if (alertMode == null || alertMode.isEmpty()) alertMode = "notification";

        String soundUri = intent.getStringExtra("soundUri");
        int repeatCount = intent.getIntExtra("repeatCount", 1);
        int snoozeMinutes = intent.getIntExtra("snoozeMinutes", 5);

        boolean isAlarm = "alarm".equalsIgnoreCase(alertMode);

        // 1. Play continuous alarm sound if Alarm Mode is enabled
        if (isAlarm) {
            AlarmSoundManager.playAlarmSound(context, soundUri, repeatCount);
        }

        // 2. Check lock/screen state to prevent duplicate notifications
        KeyguardManager keyguardManager = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);

        boolean isLocked = keyguardManager != null && keyguardManager.isKeyguardLocked();
        boolean isInteractive = powerManager != null && powerManager.isInteractive();
        boolean hasOverlayPerm = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context);

        if (isInteractive && !isLocked) {
            // Case A: Phone is UNLOCKED & screen is ON (user is inside Hayat AI or using another app)
            if (showOverlay && hasOverlayPerm) {
                // Show ONLY the floating overlay alert
                ReminderOverlayHelper.showOverlay(context, id, title, body, isQuestion, yesLabel, noLabel,
                        alertMode, soundUri, repeatCount, snoozeMinutes);
            } else {
                // Fallback to status-bar notification only if overlay permission is not granted
                postSystemNotification(context, id, title, body, isQuestion, yesLabel, noLabel,
                        alertMode, soundUri, repeatCount, snoozeMinutes);
            }
        } else {
            // Case B: Phone is LOCKED or screen is OFF
            // Show ONLY status-bar / lock-screen notification (do NOT stack unseen overlay behind lockscreen)
            postSystemNotification(context, id, title, body, isQuestion, yesLabel, noLabel,
                    alertMode, soundUri, repeatCount, snoozeMinutes);
        }

        // 3. Reschedule for next day if repeatDaily
        if (repeatDaily) {
            long nextTrigger = System.currentTimeMillis() + 24L * 60 * 60 * 1000;
            SmartReminderPlugin.scheduleAlarm(context, id, title, body, nextTrigger, true,
                    isQuestion, yesLabel, noLabel, showOverlay, alertMode, soundUri, repeatCount, snoozeMinutes);
        }
    }

    private void postSystemNotification(Context context, String id, String title, String body,
                                        boolean isQuestion, String yesLabel, String noLabel,
                                        String alertMode, String soundUri, int repeatCount, int snoozeMinutes) {
        try {
            createNotificationChannel(context);
            int notifId = Math.abs(id.hashCode());

            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            openIntent.putExtra("reminderId", id);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent openPending = PendingIntent.getActivity(context, notifId, openIntent, flags);

            boolean isAlarm = "alarm".equalsIgnoreCase(alertMode);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_stat_hayat)
                    .setContentTitle((isAlarm ? "⏰ " : "🔔 ") + title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(isAlarm ? NotificationCompat.CATEGORY_ALARM : NotificationCompat.CATEGORY_REMINDER)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setContentIntent(openPending);

            if (!isAlarm) {
                Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                builder.setSound(defaultSoundUri)
                       .setVibrate(new long[]{0, 250, 250, 250});
            } else {
                builder.setOngoing(true);
            }

            if (isAlarm) {
                // Stop Alarm Action button
                Intent stopIntent = new Intent(context, ReminderActionReceiver.class);
                stopIntent.setAction(ReminderActionReceiver.ACTION_STOP_ALARM);
                stopIntent.putExtra("id", id);
                stopIntent.putExtra("notificationId", notifId);
                PendingIntent stopPending = PendingIntent.getBroadcast(context, notifId * 10 + 5, stopIntent, flags);
                builder.addAction(0, "إيقاف المنبه", stopPending);

                // Snooze Action button
                if (snoozeMinutes > 0) {
                    Intent snoozeIntent = new Intent(context, ReminderActionReceiver.class);
                    snoozeIntent.setAction(ReminderActionReceiver.ACTION_SNOOZE_ALARM);
                    snoozeIntent.putExtra("id", id);
                    snoozeIntent.putExtra("notificationId", notifId);
                    snoozeIntent.putExtra("title", title);
                    snoozeIntent.putExtra("body", body);
                    snoozeIntent.putExtra("alertMode", alertMode);
                    snoozeIntent.putExtra("soundUri", soundUri);
                    snoozeIntent.putExtra("repeatCount", repeatCount);
                    snoozeIntent.putExtra("snoozeMinutes", snoozeMinutes);
                    PendingIntent snoozePending = PendingIntent.getBroadcast(context, notifId * 10 + 6, snoozeIntent, flags);
                    builder.addAction(0, "غفوة (" + snoozeMinutes + " د)", snoozePending);
                }
            } else if (isQuestion) {
                // Yes Action
                Intent yesIntent = new Intent(context, ReminderActionReceiver.class);
                yesIntent.setAction("com.hayatai.app.ACTION_REMINDER_YES");
                yesIntent.putExtra("id", id);
                yesIntent.putExtra("notificationId", notifId);
                PendingIntent yesPending = PendingIntent.getBroadcast(context, notifId * 10 + 1, yesIntent, flags);
                builder.addAction(0, yesLabel, yesPending);

                // No Action
                Intent noIntent = new Intent(context, ReminderActionReceiver.class);
                noIntent.setAction("com.hayatai.app.ACTION_REMINDER_NO");
                noIntent.putExtra("id", id);
                noIntent.putExtra("notificationId", notifId);
                PendingIntent noPending = PendingIntent.getBroadcast(context, notifId * 10 + 2, noIntent, flags);
                builder.addAction(0, noLabel, noPending);
            }

            NotificationManagerCompat manager = NotificationManagerCompat.from(context);
            if (manager.areNotificationsEnabled()) {
                manager.notify(notifId, builder.build());
            }
        } catch (Exception ignored) {}
    }

    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "تذكيرات حياة AI الذكية";
            String description = "إشعارات وتنبيهات العادات والفضفضة والصحة النفسية";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableLights(true);
            channel.setLightColor(Color.parseColor("#4E685B"));
            channel.enableVibration(true);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private void rescheduleAllOnBoot(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(SmartReminderPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(SmartReminderPlugin.KEY_REMINDERS, "{}");
            JSONObject all = new JSONObject(raw);

            long now = System.currentTimeMillis();
            java.util.Iterator<String> keys = all.keys();
            while (keys.hasNext()) {
                String id = keys.next();
                JSONObject obj = all.getJSONObject(id);

                long trigger = obj.getLong("triggerAtMillis");
                boolean repeatDaily = obj.optBoolean("repeatDaily", false);

                if (trigger <= now) {
                    if (repeatDaily) {
                        while (trigger <= now) {
                            trigger += 24L * 60 * 60 * 1000;
                        }
                    } else {
                        continue;
                    }
                }

                String title = obj.optString("title", "تذكير حياة AI");
                String body = obj.optString("body", "");
                boolean isQuestion = obj.optBoolean("isQuestion", false);
                String yesLabel = obj.optString("yesLabel", "نعم");
                String noLabel = obj.optString("noLabel", "لا");
                boolean showOverlay = obj.optBoolean("showOverlay", true);
                String alertMode = obj.optString("alertMode", "notification");
                String soundUri = obj.optString("soundUri", "");
                int repeatCount = obj.optInt("repeatCount", 1);
                int snoozeMinutes = obj.optInt("snoozeMinutes", 5);

                SmartReminderPlugin.scheduleAlarm(context, id, title, body, trigger, repeatDaily,
                        isQuestion, yesLabel, noLabel, showOverlay, alertMode, soundUri, repeatCount, snoozeMinutes);
            }
        } catch (Exception ignored) {}
    }
}