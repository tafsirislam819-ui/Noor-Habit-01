package com.noorhabit.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentResolver;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register native plugin with Capacitor before calling super.onCreate
        registerPlugin(NoorNativePlugin.class);
        super.onCreate(savedInstanceState);

        createNotificationChannels();
        setupNativeFeatures();
        requestInitialSystemPermissions();
    }

    private void setupNativeFeatures() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            try {
                // Direct synchronous injection of JavascriptInterface
                webView.addJavascriptInterface(new NoorNativeBridge(this), "NoorNative");

            } catch (Exception e) {
                Log.e(TAG, "Failed to inject NoorNative interface", e);
            }
        }
    }

    private void requestInitialSystemPermissions() {
        // Prompt for Android 13+ Notification permission on launch
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager == null) return;

            AudioAttributes alarmAudioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build();

            Uri soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/raw/beep");

            // 1. Aggressive Alarm Channel (High priority, bypass DND, ALARM stream)
            NotificationChannel aggrChannel = new NotificationChannel(
                "aggressive_channel",
                "🚨 Aggressive Prayer & Habit Alarms",
                NotificationManager.IMPORTANCE_HIGH
            );
            aggrChannel.setDescription("Insistent alarms for prayers and critical habits (plays even on silent)");
            aggrChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            aggrChannel.enableVibration(true);
            aggrChannel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 800, 200, 1000});
            try { aggrChannel.setBypassDnd(true); } catch (Exception ignored) {}
            aggrChannel.setSound(soundUri, alarmAudioAttributes);
            notificationManager.createNotificationChannel(aggrChannel);

            NotificationChannel aggrChannelV2 = new NotificationChannel(
                "aggressive_channel_v2",
                "🚨 Aggressive Prayer Alarms (Loud)",
                NotificationManager.IMPORTANCE_HIGH
            );
            aggrChannelV2.setDescription("Insistent alarms for prayers and critical habits (plays even on silent)");
            aggrChannelV2.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            aggrChannelV2.enableVibration(true);
            aggrChannelV2.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 800, 200, 1000});
            try { aggrChannelV2.setBypassDnd(true); } catch (Exception ignored) {}
            aggrChannelV2.setSound(soundUri, alarmAudioAttributes);
            notificationManager.createNotificationChannel(aggrChannelV2);

            // 2. Normal Prayer Reminder Channel
            AudioAttributes prayerAudioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .build();

            NotificationChannel prayerChannel = new NotificationChannel(
                "prayer_channel",
                "🕌 Prayer & Habit Reminders",
                NotificationManager.IMPORTANCE_HIGH
            );
            prayerChannel.setDescription("Daily prayer times and scheduled habit reminders");
            prayerChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            prayerChannel.enableVibration(true);
            prayerChannel.setSound(soundUri, prayerAudioAttributes);
            notificationManager.createNotificationChannel(prayerChannel);

            NotificationChannel prayerChannelV2 = new NotificationChannel(
                "prayer_channel_v2",
                "🕌 Prayer & Habit Reminders",
                NotificationManager.IMPORTANCE_HIGH
            );
            prayerChannelV2.setDescription("Daily prayer times and scheduled habit reminders");
            prayerChannelV2.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            prayerChannelV2.enableVibration(true);
            prayerChannelV2.setSound(soundUri, prayerAudioAttributes);
            notificationManager.createNotificationChannel(prayerChannelV2);
        }
    }
}
