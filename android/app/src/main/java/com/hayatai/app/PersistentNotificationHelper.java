package com.hayatai.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/** Owns the persistent Android lock-screen quick-access notification. */
public final class PersistentNotificationHelper {
    public static final String PREFS_NAME = "hayat_lockscreen_quick";
    public static final String KEY_ENABLED = "enabled";
    public static final String KEY_TITLE = "title";
    public static final String KEY_BODY = "body";
    public static final String KEY_WRITE_LABEL = "writeLabel";
    public static final String KEY_VOICE_LABEL = "voiceLabel";
    public static final String CHANNEL_ID = "hayat_lockscreen_quick";
    public static final int NOTIFICATION_ID = 4817;

    private PersistentNotificationHelper() {}

    public static void setEnabled(Context context, boolean enabled, String title, String body,
                                   String writeLabel, String voiceLabel) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putBoolean(KEY_ENABLED, enabled)
                .putString(KEY_TITLE, safe(title, "حياة AI"))
                .putString(KEY_BODY, safe(body, "كتابة وفضفضة سريعة من شاشة القفل"))
                .putString(KEY_WRITE_LABEL, safe(writeLabel, "كتابة سريعة"))
                .putString(KEY_VOICE_LABEL, safe(voiceLabel, "فضفضة صوتية"))
                .apply();
        if (enabled) show(context);
        else cancel(context);
    }

    public static boolean isEnabled(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false);
    }

    public static void restoreIfEnabled(Context context) {
        if (isEnabled(context)) show(context);
    }

    public static void show(Context context) {
        if (!isEnabled(context)) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        createChannel(context);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;

        Intent open = new Intent(context, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPending = PendingIntent.getActivity(context, 48170, open, flags);

        PendingIntent write = actionPending(context, "write", 48171, flags);
        PendingIntent voice = actionPending(context, "voice", 48172, flags);

        Notification notification = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_hayat)
                .setContentTitle(prefs.getString(KEY_TITLE, "حياة AI"))
                .setContentText(prefs.getString(KEY_BODY, "كتابة وفضفضة سريعة من شاشة القفل"))
                .setContentIntent(openPending)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .addAction(0, prefs.getString(KEY_WRITE_LABEL, "كتابة سريعة"), write)
                .addAction(0, prefs.getString(KEY_VOICE_LABEL, "فضفضة صوتية"), voice)
                .build();

        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (manager.areNotificationsEnabled()) manager.notify(NOTIFICATION_ID, notification);
    }

    public static void cancel(Context context) {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID);
    }

    private static PendingIntent actionPending(Context context, String action, int requestCode, int flags) {
        Intent intent = new Intent(context, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra("hayat_quick_action", action);
        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }

    private static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "اختصارات حياة AI", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("اختصارات الكتابة والفضفضة من شاشة القفل");
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private static String safe(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value;
    }
}
