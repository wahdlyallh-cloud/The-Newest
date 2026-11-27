package com.hayatai.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/** Owns the persistent Android lock-screen 4-action quick-access notification widget. */
public final class PersistentNotificationHelper {
    public static final String PREFS_NAME = "hayat_lockscreen_quick";
    public static final String KEY_ENABLED = "enabled";
    public static final String KEY_TITLE = "title";
    public static final String KEY_WRITE_LABEL = "writeLabel";
    public static final String KEY_VOICE_LABEL = "voiceLabel";
    public static final String KEY_MOOD_LABEL = "moodLabel";
    public static final String KEY_ADVISOR_LABEL = "advisorLabel";

    // Changing channel ID is required because Android caches old channel importance
    public static final String CHANNEL_ID = "hayat_lockscreen_quick_v2";
    public static final int NOTIFICATION_ID = 4817;

    private PersistentNotificationHelper() {}

    public static void setEnabled(Context context, boolean enabled, String title,
                                   String writeLabel, String voiceLabel, String moodLabel, String advisorLabel) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putBoolean(KEY_ENABLED, enabled)
                .putString(KEY_TITLE, safe(title, "حياة AI — وصول سريع"))
                .putString(KEY_WRITE_LABEL, safe(writeLabel, "كتابة"))
                .putString(KEY_VOICE_LABEL, safe(voiceLabel, "تسجيل صوتي"))
                .putString(KEY_MOOD_LABEL, safe(moodLabel, "مزاج"))
                .putString(KEY_ADVISOR_LABEL, safe(advisorLabel, "مستشار"))
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
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPending = PendingIntent.getActivity(context, 48170, open, flags);

        PendingIntent writePending = actionPending(context, "write", 48171, flags);
        PendingIntent voicePending = actionPending(context, "voice", 48172, flags);
        PendingIntent moodPending = actionPending(context, "mood", 48173, flags);
        PendingIntent advisorPending = actionPending(context, "advisor", 48174, flags);

        String pkg = context.getPackageName();
        RemoteViews customView = new RemoteViews(pkg, R.layout.notification_lockscreen_quick);
        String titleStr = prefs.getString(KEY_TITLE, "حياة AI — وصول سريع");
        customView.setTextViewText(R.id.quick_notif_title, titleStr);
        customView.setTextViewText(R.id.txt_quick_write, prefs.getString(KEY_WRITE_LABEL, "كتابة"));
        customView.setTextViewText(R.id.txt_quick_voice, prefs.getString(KEY_VOICE_LABEL, "تسجيل صوتي"));
        customView.setTextViewText(R.id.txt_quick_mood, prefs.getString(KEY_MOOD_LABEL, "مزاج"));
        customView.setTextViewText(R.id.txt_quick_advisor, prefs.getString(KEY_ADVISOR_LABEL, "مستشار"));

        customView.setOnClickPendingIntent(R.id.btn_quick_write, writePending);
        customView.setOnClickPendingIntent(R.id.btn_quick_voice, voicePending);
        customView.setOnClickPendingIntent(R.id.btn_quick_mood, moodPending);
        customView.setOnClickPendingIntent(R.id.btn_quick_advisor, advisorPending);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_hayat)
                .setContentTitle(titleStr)
                .setContentIntent(openPending)
                .setCustomContentView(customView)
                .setCustomBigContentView(customView)
                .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_STATUS);

        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (manager.areNotificationsEnabled()) {
            manager.notify(NOTIFICATION_ID, builder.build());
        }
    }

    public static void cancel(Context context) {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID);
    }

    private static PendingIntent actionPending(Context context, String action, int requestCode, int flags) {
        Intent intent = new Intent(context, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra("hayat_quick_action", action);
        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }

    private static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "اختصارات حياة AI لشاشة القفل", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("شريط اختصارات الوصول السريع من شاشة القفل");
            channel.setSound(null, null);
            channel.enableVibration(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.setShowBadge(false);
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private static String safe(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value;
    }
}