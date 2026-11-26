package com.hayatai.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

public class ReminderActionReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;

        String id = intent.getStringExtra("id");
        int notificationId = intent.getIntExtra("notificationId", id != null ? Math.abs(id.hashCode()) : 0);

        // Cancel the system notification
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(notificationId);
            }
        } catch (Exception ignored) {}

        // Dismiss floating overlay if showing
        ReminderOverlayHelper.dismissOverlay();

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
