package com.hayatai.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

/**
 * Manages alarm sound playback using USAGE_ALARM.
 * Handles repeat counts and stopping playback.
 */
public final class AlarmSoundManager {
    private static MediaPlayer activeMediaPlayer = null;
    private static int currentPlayCount = 0;
    private static int maxRepeatCount = 1; // 1, 3, 5, or -1 for continuous

    private AlarmSoundManager() {}

    public static synchronized void playAlarmSound(final Context context, String soundUriStr, int repeatCount) {
        stopAlarmSound();
        maxRepeatCount = repeatCount <= 0 ? -1 : repeatCount;
        currentPlayCount = 0;

        Uri soundUri = null;
        if (soundUriStr != null && !soundUriStr.trim().isEmpty()) {
            try {
                soundUri = Uri.parse(soundUriStr.trim());
            } catch (Exception ignored) {}
        }
        if (soundUri == null) {
            soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (soundUri == null) {
                soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
        }

        try {
            final MediaPlayer player = new MediaPlayer();
            player.setDataSource(context.getApplicationContext(), soundUri);
            AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            player.setAudioAttributes(attributes);
            player.setAudioStreamType(AudioManager.STREAM_ALARM);
            player.setLooping(false);

            final Uri finalUri = soundUri;
            player.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
                @Override
                public void onCompletion(MediaPlayer mp) {
                    currentPlayCount++;
                    if (maxRepeatCount == -1 || currentPlayCount < maxRepeatCount) {
                        try {
                            mp.seekTo(0);
                            mp.start();
                        } catch (Exception e) {
                            stopAlarmSound();
                        }
                    } else {
                        stopAlarmSound();
                    }
                }
            });

            player.setOnErrorListener(new MediaPlayer.OnErrorListener() {
                @Override
                public boolean onError(MediaPlayer mp, int what, int extra) {
                    stopAlarmSound();
                    return true;
                }
            });

            player.prepare();
            player.start();
            activeMediaPlayer = player;
        } catch (Exception e) {
            // Fallback to default ringtone if custom URI fails (e.g. permission revoked)
            try {
                Uri fallback = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (fallback != null) {
                    MediaPlayer player = new MediaPlayer();
                    player.setDataSource(context.getApplicationContext(), fallback);
                    player.setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build());
                    player.prepare();
                    player.start();
                    activeMediaPlayer = player;
                }
            } catch (Exception ignored) {}
        }
    }

    public static synchronized void stopAlarmSound() {
        if (activeMediaPlayer != null) {
            try {
                if (activeMediaPlayer.isPlaying()) {
                    activeMediaPlayer.stop();
                }
                activeMediaPlayer.release();
            } catch (Exception ignored) {}
            activeMediaPlayer = null;
        }
    }

    public static synchronized boolean isPlaying() {
        try {
            return activeMediaPlayer != null && activeMediaPlayer.isPlaying();
        } catch (Exception e) {
            return false;
        }
    }
}