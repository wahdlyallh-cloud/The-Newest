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

/** Owns the persistent four-action Blomeo lock-screen quick-access notification. */
public final class PersistentNotificationHelper {
    public static final String PREFS_NAME = "hayat_lockscreen_quick";
    public static final String KEY_ENABLED = "enabled";
    public static final String KEY_TITLE = "title";
    public static final String KEY_WRITE_LABEL = "writeLabel";
    public static final String KEY_VOICE_LABEL = "voiceLabel";
    public static final String KEY_MOOD_LABEL = "moodLabel";
    public static final String KEY_ADVISOR_LABEL = "advisorLabel";
    public static final String CHANNEL_ID = "blomeo_lockscreen_shortcuts";
    public static final int NOTIFICATION_ID = 4817;

    private PersistentNotificationHelper() {}

    public static void setEnabled(Context context, boolean enabled, String title,
                                  String writeLabel, String voiceLabel, String moodLabel, String advisorLabel) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_ENABLED, enabled)
                .putString(KEY_TITLE, safe(title, "Blomeo — وصول سريع"))
                .putString(KEY_WRITE_LABEL, safe(writeLabel, "تدوين سريع"))
                .putString(KEY_VOICE_LABEL, safe(voiceLabel, "فضفضة صوتية"))
                .putString(KEY_MOOD_LABEL, safe(moodLabel, "تسجيل سريع"))
                .putString(KEY_ADVISOR_LABEL, safe(advisorLabel, "المستشار")).apply();
        if (enabled) show(context); else cancel(context);
    }

    public static boolean isEnabled(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false);
    }

    public static void restoreIfEnabled(Context context) { if (isEnabled(context)) show(context); }

    public static void show(Context context) {
        if (!isEnabled(context)) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        createChannel(context);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        Intent open = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPending = PendingIntent.getActivity(context, 100, open, flags);
        PendingIntent write = actionPending(context, "new_diary", 101, flags);
        PendingIntent voice = actionPending(context, "voice", 102, flags);
        PendingIntent advisor = actionPending(context, "advisor", 103, flags);
        PendingIntent checkin = actionPending(context, "quick_checkin", 104, flags);
        String title = prefs.getString(KEY_TITLE, "Blomeo — وصول سريع");
        RemoteViews view = new RemoteViews(context.getPackageName(), R.layout.blomeo_lockscreen_bar);
        view.setTextViewText(R.id.quick_notif_title, title);
        view.setTextViewText(R.id.txt_quick_write, prefs.getString(KEY_WRITE_LABEL, "تدوين سريع"));
        view.setTextViewText(R.id.txt_quick_voice, prefs.getString(KEY_VOICE_LABEL, "فضفضة صوتية"));
        view.setTextViewText(R.id.txt_quick_advisor, prefs.getString(KEY_ADVISOR_LABEL, "المستشار"));
        view.setTextViewText(R.id.txt_quick_mood, prefs.getString(KEY_MOOD_LABEL, "تسجيل سريع"));
        view.setOnClickPendingIntent(R.id.btn_quick_write, write);
        view.setOnClickPendingIntent(R.id.btn_quick_voice, voice);
        view.setOnClickPendingIntent(R.id.btn_quick_advisor, advisor);
        view.setOnClickPendingIntent(R.id.btn_quick_mood, checkin);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_hayat).setContentTitle(title).setContentIntent(openPending)
                .setCustomContentView(view).setCustomBigContentView(view)
                .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC).setOngoing(true).setOnlyAlertOnce(true)
                .setSilent(true).setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_STATUS);
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (manager.areNotificationsEnabled()) {
            try { manager.notify(NOTIFICATION_ID, builder.build()); }
            catch (SecurityException ignored) { /* Android 13+ notifications are denied. */ }
        }
    }

    public static void cancel(Context context) { NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID); }

    private static PendingIntent actionPending(Context context, String action, int requestCode, int flags) {
        Intent intent = new Intent(context, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra("blomeo_shortcut_action", action);
        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }

    private static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Blomeo lock-screen shortcuts", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Quiet quick access to Blomeo from the lock screen");
            channel.setSound(null, null);
            channel.enableVibration(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.setShowBadge(false);
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private static String safe(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value;
    }
}
