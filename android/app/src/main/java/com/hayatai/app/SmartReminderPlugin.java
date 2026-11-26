package com.hayatai.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Iterator;

@CapacitorPlugin(
    name = "SmartReminder",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { "android.permission.POST_NOTIFICATIONS" }
        )
    }
)
public class SmartReminderPlugin extends Plugin {

    public static final String PREFS_NAME = "hayat_smart_reminders";
    public static final String KEY_REMINDERS = "active_reminders";
    public static final String KEY_RESPONSES = "pending_responses";
    public static boolean isAppForeground = false;

    @Override
    public void handleOnResume() {
        super.handleOnResume();
        isAppForeground = true;
    }

    @Override
    public void handleOnPause() {
        super.handleOnPause();
        isAppForeground = false;
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        try {
            Context ctx = getContext();
            boolean notificationsGranted = NotificationManagerCompat.from(ctx).areNotificationsEnabled();
            boolean overlayGranted = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                overlayGranted = Settings.canDrawOverlays(ctx);
            } else {
                overlayGranted = true;
            }

            JSObject ret = new JSObject();
            ret.put("notificationsGranted", notificationsGranted);
            ret.put("overlayGranted", overlayGranted);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to check permissions: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= 33) {
                requestPermissionForAlias("notifications", call, "permissionCallback");
            } else {
                JSObject ret = new JSObject();
                ret.put("notificationsGranted", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
                call.resolve(ret);
            }
        } catch (Exception e) {
            call.reject("Failed to request notification permission: " + e.getMessage(), e);
        }
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("notificationsGranted", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        call.resolve(ret);
    }

    @PluginMethod
    public void openOverlayPermissionSettings(PluginCall call) {
        try {
            Context ctx = getContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + ctx.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
                call.resolve();
            } else {
                call.resolve();
            }
        } catch (Exception e) {
            call.reject("Failed to open overlay settings: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void scheduleReminder(PluginCall call) {
        try {
            Context ctx = getContext();
            String id = call.getString("id");
            String title = call.getString("title", "تذكير حياة AI");
            String body = call.getString("body", "");
            Long triggerAtMillis = call.getLong("triggerAtMillis");
            Boolean repeatDaily = call.getBoolean("repeatDaily", false);
            Boolean isQuestion = call.getBoolean("isQuestion", false);
            String yesLabel = call.getString("yesLabel", "نعم");
            String noLabel = call.getString("noLabel", "لا");
            Boolean showOverlay = call.getBoolean("showOverlay", true);

            if (id == null || id.trim().isEmpty()) {
                call.reject("Reminder id is required");
                return;
            }

            if (triggerAtMillis == null || triggerAtMillis <= System.currentTimeMillis()) {
                if (triggerAtMillis == null) {
                    triggerAtMillis = System.currentTimeMillis() + 5000;
                } else if (repeatDaily != null && repeatDaily) {
                    // Advance to next day if in past
                    while (triggerAtMillis <= System.currentTimeMillis()) {
                        triggerAtMillis += 24L * 60 * 60 * 1000;
                    }
                }
            }

            // Save to SharedPreferences
            saveReminderMeta(ctx, id, title, body, triggerAtMillis, repeatDaily, isQuestion, yesLabel, noLabel, showOverlay);

            // Schedule with AlarmManager
            scheduleAlarm(ctx, id, title, body, triggerAtMillis, repeatDaily, isQuestion, yesLabel, noLabel, showOverlay);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("id", id);
            ret.put("scheduledAt", triggerAtMillis);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to schedule reminder: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void cancelReminder(PluginCall call) {
        try {
            String id = call.getString("id");
            if (id == null) {
                call.reject("id is required");
                return;
            }

            Context ctx = getContext();
            cancelAlarm(ctx, id);
            removeReminderMeta(ctx, id);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("id", id);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to cancel reminder: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void triggerTestReminder(PluginCall call) {
        try {
            Context ctx = getContext();
            String id = "test_" + System.currentTimeMillis();
            String title = call.getString("title", "هل شربت الماء الآن؟ 💧");
            String body = call.getString("body", "تذكير صحي عائم من حياة AI");
            long triggerAtMillis = System.currentTimeMillis() + 5000;
            boolean isQuestion = call.getBoolean("isQuestion", true);
            String yesLabel = call.getString("yesLabel", "نعم، شربت");
            String noLabel = call.getString("noLabel", "ليس بعد");
            boolean showOverlay = call.getBoolean("showOverlay", true);

            scheduleAlarm(ctx, id, title, body, triggerAtMillis, false, isQuestion, yesLabel, noLabel, showOverlay);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("id", id);
            ret.put("delaySeconds", 5);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to trigger test reminder: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void consumePendingResponses(PluginCall call) {
        try {
            Context ctx = getContext();
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY_RESPONSES, "[]");
            JSONArray array = new JSONArray(raw);

            // Clear stored responses
            prefs.edit().putString(KEY_RESPONSES, "[]").apply();

            JSArray result = new JSArray();
            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                JSObject item = new JSObject();
                item.put("reminderId", obj.optString("reminderId"));
                item.put("answer", obj.optString("answer"));
                item.put("answeredAt", obj.optLong("answeredAt"));
                result.put(item);
            }

            JSObject ret = new JSObject();
            ret.put("responses", result);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to consume pending responses: " + e.getMessage(), e);
        }
    }

    public static void scheduleAlarm(Context ctx, String id, String title, String body,
                                    long triggerAtMillis, boolean repeatDaily, boolean isQuestion,
                                    String yesLabel, String noLabel, boolean showOverlay) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent intent = new Intent(ctx, ReminderAlarmReceiver.class);
        intent.setAction("com.hayatai.app.ACTION_REMINDER_ALARM");
        intent.putExtra("id", id);
        intent.putExtra("title", title);
        intent.putExtra("body", body);
        intent.putExtra("repeatDaily", repeatDaily);
        intent.putExtra("isQuestion", isQuestion);
        intent.putExtra("yesLabel", yesLabel);
        intent.putExtra("noLabel", noLabel);
        intent.putExtra("showOverlay", showOverlay);

        int requestCode = Math.abs(id.hashCode());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getBroadcast(ctx, requestCode, intent, flags);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
            }
        } catch (SecurityException se) {
            // Safe fallback without exact alarm permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
            } else {
                am.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
            }
        }
    }

    public static void cancelAlarm(Context ctx, String id) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent intent = new Intent(ctx, ReminderAlarmReceiver.class);
        intent.setAction("com.hayatai.app.ACTION_REMINDER_ALARM");
        int requestCode = Math.abs(id.hashCode());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getBroadcast(ctx, requestCode, intent, flags);
        am.cancel(pi);
    }

    private static void saveReminderMeta(Context ctx, String id, String title, String body,
                                        long triggerAtMillis, boolean repeatDaily, boolean isQuestion,
                                        String yesLabel, String noLabel, boolean showOverlay) {
        try {
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY_REMINDERS, "{}");
            JSONObject all = new JSONObject(raw);

            JSONObject r = new JSONObject();
            r.put("id", id);
            r.put("title", title);
            r.put("body", body);
            r.put("triggerAtMillis", triggerAtMillis);
            r.put("repeatDaily", repeatDaily);
            r.put("isQuestion", isQuestion);
            r.put("yesLabel", yesLabel);
            r.put("noLabel", noLabel);
            r.put("showOverlay", showOverlay);

            all.put(id, r);
            prefs.edit().putString(KEY_REMINDERS, all.toString()).apply();
        } catch (Exception ignored) {}
    }

    private static void removeReminderMeta(Context ctx, String id) {
        try {
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY_REMINDERS, "{}");
            JSONObject all = new JSONObject(raw);
            all.remove(id);
            prefs.edit().putString(KEY_REMINDERS, all.toString()).apply();
        } catch (Exception ignored) {}
    }
}
