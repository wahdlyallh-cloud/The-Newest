package com.hayatai.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
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

        // 1. Post Android Heads-up System Notification
        postSystemNotification(context, id, title, body, isQuestion, yesLabel, noLabel);

        // 2. Cross-App Floating Interactive Overlay (only if not foreground and overlay permission is granted)
        if (showOverlay && !SmartReminderPlugin.isAppForeground) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)) {
                ReminderOverlayHelper.showOverlay(context, id, title, body, isQuestion, yesLabel, noLabel);
            }
        }

        // 3. Reschedule for next day if repeatDaily
        if (repeatDaily) {
            long nextTrigger = System.currentTimeMillis() + 24L * 60 * 60 * 1000;
            SmartReminderPlugin.scheduleAlarm(context, id, title, body, nextTrigger, true, isQuestion, yesLabel, noLabel, showOverlay);
        }
    }

    private void postSystemNotification(Context context, String id, String title, String body,
                                        boolean isQuestion, String yesLabel, String noLabel) {
        try {
            createNotificationChannel(context);

            int notifId = Math.abs(id.hashCode());

            // Open MainActivity on tap
            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            openIntent.putExtra("reminderId", id);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent openPending = PendingIntent.getActivity(context, notifId, openIntent, flags);

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_stat_hayat)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setAutoCancel(true)
                    .setSound(defaultSoundUri)
                    .setVibrate(new long[]{0, 250, 250, 250})
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_REMINDER)
                    .setContentIntent(openPending);

            if (isQuestion) {
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
            String description = "إشعارات وتذكيرات العادات والفضفضة والصحة النفسية";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableLights(true);
            channel.setLightColor(Color.parseColor("#4E685B"));
            channel.enableVibration(true);

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
            for (java.util.Iterator<String> it = all.keys(); it.hasNext(); ) {
                String key = it.next();
                JSONObject r = all.getJSONObject(key);
                String id = r.optString("id");
                String title = r.optString("title", "تذكير حياة AI");
                String body = r.optString("body", "");
                long triggerAtMillis = r.optLong("triggerAtMillis");
                boolean repeatDaily = r.optBoolean("repeatDaily", false);
                boolean isQuestion = r.optBoolean("isQuestion", false);
                String yesLabel = r.optString("yesLabel", "نعم");
                String noLabel = r.optString("noLabel", "لا");
                boolean showOverlay = r.optBoolean("showOverlay", true);

                if (triggerAtMillis <= now) {
                    if (repeatDaily) {
                        while (triggerAtMillis <= now) {
                            triggerAtMillis += 24L * 60 * 60 * 1000;
                        }
                    } else {
                        continue;
                    }
                }
                SmartReminderPlugin.scheduleAlarm(context, id, title, body, triggerAtMillis, repeatDaily, isQuestion, yesLabel, noLabel, showOverlay);
            }
        } catch (Exception ignored) {}
    }
}
