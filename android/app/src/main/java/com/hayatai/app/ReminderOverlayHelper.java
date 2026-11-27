package com.hayatai.app;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

public class ReminderOverlayHelper {

    private static View activeOverlayView = null;
    private static WindowManager activeWindowManager = null;

    public static synchronized void showOverlay(final Context context, final String id,
                                               final String title, final String body,
                                               final boolean isQuestion, final String yesLabel,
                                               final String noLabel) {
        showOverlay(context, id, title, body, isQuestion, yesLabel, noLabel, "notification", null, 1, 5);
    }

    public static synchronized void showOverlay(final Context context, final String id,
                                               final String title, final String body,
                                               final boolean isQuestion, final String yesLabel,
                                               final String noLabel, final String alertMode,
                                               final String soundUri, final int repeatCount,
                                               final int snoozeMinutes) {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                try {
                    dismissOverlay();

                    final WindowManager wm = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
                    if (wm == null) return;

                    int layoutType;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
                    } else {
                        layoutType = WindowManager.LayoutParams.TYPE_PHONE;
                    }

                    int flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                            | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;

                    final WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                            WindowManager.LayoutParams.MATCH_PARENT,
                            WindowManager.LayoutParams.WRAP_CONTENT,
                            layoutType,
                            flags,
                            PixelFormat.TRANSLUCENT
                    );

                    params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
                    params.x = 0;
                    params.y = dpToPx(context, 20);

                    // Root container
                    final FrameLayout root = new FrameLayout(context);
                    int rootPadding = dpToPx(context, 16);
                    root.setPadding(rootPadding, 0, rootPadding, 0);

                    // Card container
                    LinearLayout card = new LinearLayout(context);
                    card.setOrientation(LinearLayout.VERTICAL);
                    card.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

                    // Card background with rounded corners and border
                    GradientDrawable bg = new GradientDrawable();
                    bg.setColor(Color.parseColor("#FFFFFF"));
                    bg.setCornerRadius(dpToPx(context, 20));
                    boolean isAlarm = "alarm".equalsIgnoreCase(alertMode);
                    bg.setStroke(dpToPx(context, 2), isAlarm ? Color.parseColor("#C5221F") : Color.parseColor("#4E685B"));
                    card.setBackground(bg);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        card.setElevation(dpToPx(context, 10));
                    }
                    int cardPad = dpToPx(context, 16);
                    card.setPadding(cardPad, cardPad, cardPad, cardPad);

                    // Header row (Title + Close button)
                    LinearLayout header = new LinearLayout(context);
                    header.setOrientation(LinearLayout.HORIZONTAL);
                    header.setGravity(Gravity.CENTER_VERTICAL);
                    header.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

                    TextView titleTv = new TextView(context);
                    titleTv.setText((isAlarm ? "⏰ " : "🔔 ") + title);
                    titleTv.setTextColor(Color.parseColor("#2B3E50"));
                    titleTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
                    titleTv.setTypeface(titleTv.getTypeface(), Typeface.BOLD);
                    LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
                    header.addView(titleTv, titleLp);

                    // Close '✕' button
                    TextView closeBtn = new TextView(context);
                    closeBtn.setText("✕");
                    closeBtn.setTextColor(Color.parseColor("#888888"));
                    closeBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
                    closeBtn.setTypeface(closeBtn.getTypeface(), Typeface.BOLD);
                    closeBtn.setPadding(dpToPx(context, 8), dpToPx(context, 4), dpToPx(context, 8), dpToPx(context, 4));
                    closeBtn.setOnClickListener(new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {
                            AlarmSoundManager.stopAlarmSound();
                            cancelNotification(context, id);
                            dismissOverlay();
                        }
                    });
                    header.addView(closeBtn);

                    card.addView(header);

                    // Body
                    if (body != null && !body.trim().isEmpty()) {
                        TextView bodyTv = new TextView(context);
                        bodyTv.setText(body);
                        bodyTv.setTextColor(Color.parseColor("#555555"));
                        bodyTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
                        LinearLayout.LayoutParams bodyLp = new LinearLayout.LayoutParams(
                                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                        bodyLp.topMargin = dpToPx(context, 8);
                        card.addView(bodyTv, bodyLp);
                    }

                    // Actions Row
                    if (isAlarm) {
                        // Alarm Mode buttons: Stop & Snooze
                        LinearLayout actionsRow = new LinearLayout(context);
                        actionsRow.setOrientation(LinearLayout.HORIZONTAL);
                        actionsRow.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
                        LinearLayout.LayoutParams rowLp = new LinearLayout.LayoutParams(
                                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                        rowLp.topMargin = dpToPx(context, 14);
                        actionsRow.setLayoutParams(rowLp);

                        // Stop Alarm Button (Red)
                        Button stopBtn = new Button(context);
                        stopBtn.setText("إيقاف المنبه");
                        stopBtn.setTextColor(Color.WHITE);
                        stopBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
                        stopBtn.setTypeface(stopBtn.getTypeface(), Typeface.BOLD);
                        GradientDrawable stopBg = new GradientDrawable();
                        stopBg.setColor(Color.parseColor("#C5221F"));
                        stopBg.setCornerRadius(dpToPx(context, 12));
                        stopBtn.setBackground(stopBg);
                        LinearLayout.LayoutParams stopLp = new LinearLayout.LayoutParams(0, dpToPx(context, 40), 1.0f);
                        stopLp.leftMargin = dpToPx(context, 6);
                        stopBtn.setLayoutParams(stopLp);
                        stopBtn.setOnClickListener(new View.OnClickListener() {
                            @Override
                            public void onClick(View v) {
                                AlarmSoundManager.stopAlarmSound();
                                cancelNotification(context, id);
                                ReminderActionReceiver.recordResponse(context, id, "alarm_stopped");
                                dismissOverlay();
                            }
                        });
                        actionsRow.addView(stopBtn);

                        // Snooze Button (Orange / Amber)
                        if (snoozeMinutes > 0) {
                            Button snoozeBtn = new Button(context);
                            snoozeBtn.setText("غفوة (" + snoozeMinutes + " د)");
                            snoozeBtn.setTextColor(Color.parseColor("#B45309"));
                            snoozeBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
                            snoozeBtn.setTypeface(snoozeBtn.getTypeface(), Typeface.BOLD);
                            GradientDrawable snoozeBg = new GradientDrawable();
                            snoozeBg.setColor(Color.parseColor("#FEF3C7"));
                            snoozeBg.setCornerRadius(dpToPx(context, 12));
                            snoozeBg.setStroke(dpToPx(context, 1), Color.parseColor("#FCD34D"));
                            snoozeBtn.setBackground(snoozeBg);
                            LinearLayout.LayoutParams snoozeLp = new LinearLayout.LayoutParams(0, dpToPx(context, 40), 1.0f);
                            snoozeBtn.setLayoutParams(snoozeLp);
                            snoozeBtn.setOnClickListener(new View.OnClickListener() {
                                @Override
                                public void onClick(View v) {
                                    AlarmSoundManager.stopAlarmSound();
                                    cancelNotification(context, id);
                                    triggerSnoozeFromOverlay(context, id, title, body, alertMode, soundUri, repeatCount, snoozeMinutes);
                                    dismissOverlay();
                                }
                            });
                            actionsRow.addView(snoozeBtn);
                        }

                        card.addView(actionsRow);

                    } else if (isQuestion) {
                        LinearLayout actionsRow = new LinearLayout(context);
                        actionsRow.setOrientation(LinearLayout.HORIZONTAL);
                        actionsRow.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
                        LinearLayout.LayoutParams rowLp = new LinearLayout.LayoutParams(
                                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                        rowLp.topMargin = dpToPx(context, 14);
                        actionsRow.setLayoutParams(rowLp);

                        // Yes button (Green accent)
                        Button yesBtn = new Button(context);
                        yesBtn.setText(yesLabel);
                        yesBtn.setTextColor(Color.WHITE);
                        yesBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
                        yesBtn.setTypeface(yesBtn.getTypeface(), Typeface.BOLD);
                        GradientDrawable yesBg = new GradientDrawable();
                        yesBg.setColor(Color.parseColor("#2E7D32"));
                        yesBg.setCornerRadius(dpToPx(context, 12));
                        yesBtn.setBackground(yesBg);
                        LinearLayout.LayoutParams yesLp = new LinearLayout.LayoutParams(0, dpToPx(context, 40), 1.0f);
                        yesLp.leftMargin = dpToPx(context, 6);
                        yesBtn.setLayoutParams(yesLp);
                        yesBtn.setOnClickListener(new View.OnClickListener() {
                            @Override
                            public void onClick(View v) {
                                cancelNotification(context, id);
                                ReminderActionReceiver.recordResponse(context, id, "yes");
                                dismissOverlay();
                            }
                        });
                        actionsRow.addView(yesBtn);

                        // No button (Neutral/Red accent)
                        Button noBtn = new Button(context);
                        noBtn.setText(noLabel);
                        noBtn.setTextColor(Color.parseColor("#C5221F"));
                        noBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
                        noBtn.setTypeface(noBtn.getTypeface(), Typeface.BOLD);
                        GradientDrawable noBg = new GradientDrawable();
                        noBg.setColor(Color.parseColor("#FCE8E6"));
                        noBg.setCornerRadius(dpToPx(context, 12));
                        noBg.setStroke(dpToPx(context, 1), Color.parseColor("#F5C2C7"));
                        noBtn.setBackground(noBg);
                        LinearLayout.LayoutParams noLp = new LinearLayout.LayoutParams(0, dpToPx(context, 40), 1.0f);
                        noBtn.setLayoutParams(noLp);
                        noBtn.setOnClickListener(new View.OnClickListener() {
                            @Override
                            public void onClick(View v) {
                                cancelNotification(context, id);
                                ReminderActionReceiver.recordResponse(context, id, "no");
                                dismissOverlay();
                            }
                        });
                        actionsRow.addView(noBtn);

                        card.addView(actionsRow);
                    } else {
                        // Plain reminder tap card to dismiss
                        card.setOnClickListener(new View.OnClickListener() {
                            @Override
                            public void onClick(View v) {
                                cancelNotification(context, id);
                                dismissOverlay();
                            }
                        });
                    }

                    root.addView(card, new FrameLayout.LayoutParams(
                            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT));

                    wm.addView(root, params);
                    activeOverlayView = root;
                    activeWindowManager = wm;

                } catch (Exception ignored) {}
            }
        });
    }

    private static void triggerSnoozeFromOverlay(Context context, String id, String title, String body,
                                                String alertMode, String soundUri, int repeatCount, int snoozeMinutes) {
        Intent intent = new Intent(context, ReminderActionReceiver.class);
        intent.setAction(ReminderActionReceiver.ACTION_SNOOZE_ALARM);
        intent.putExtra("id", id);
        intent.putExtra("title", title);
        intent.putExtra("body", body);
        intent.putExtra("alertMode", alertMode);
        intent.putExtra("soundUri", soundUri);
        intent.putExtra("repeatCount", repeatCount);
        intent.putExtra("snoozeMinutes", snoozeMinutes);
        context.sendBroadcast(intent);
    }

    public static synchronized void dismissOverlay() {
        if (activeOverlayView != null && activeWindowManager != null) {
            try {
                activeWindowManager.removeView(activeOverlayView);
            } catch (Exception ignored) {}
            activeOverlayView = null;
            activeWindowManager = null;
        }
    }

    private static void cancelNotification(Context context, String id) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && id != null) {
                nm.cancel(Math.abs(id.hashCode()));
            }
        } catch (Exception ignored) {}
    }

    private static int dpToPx(Context context, int dp) {
        return (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, dp, context.getResources().getDisplayMetrics());
    }
}