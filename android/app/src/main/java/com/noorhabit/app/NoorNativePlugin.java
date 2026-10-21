package com.noorhabit.app;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class ReelsTrackingService extends AccessibilityService {

    private static final String TAG = "ReelsTrackingService";
    public static final String PREFS_NAME = "noor_reels_stats";
    public static final String KEY_REELS_TODAY = "reels_today";
    public static final String KEY_REELS_DATE = "reels_date";
    public static final String KEY_SOT_MINUTES = "sot_minutes";
    public static final String KEY_REELS_TIME_SECONDS = "reels_time_seconds";
    public static final String KEY_REELS_ALERT_LIMIT = "reels_alert_limit";
    public static final String KEY_REELS_ALERT_TRIGGERED_DATE = "reels_alert_triggered_date";
    public static final String KEY_PLATFORM_COUNTS = "platform_reel_counts";
    public static final String KEY_PLATFORM_TIME = "platform_reel_time_seconds";

    private static final String NOTIFICATION_CHANNEL_ID = "noor_reels_tracker_channel";
    private static final int NOTIFICATION_ID = 2001;
    private static final int ALERT_NOTIFICATION_ID = 2002;

    // 2.5 seconds dwell threshold for qualifying a reel
    private static final long REEL_DWELL_THRESHOLD_MS = 2500;

    // Supported social platforms
    private static final Set<String> SOCIAL_PACKAGES = new HashSet<>(Arrays.asList(
        "com.instagram.android",
        "com.instagram.lite",
        "com.google.android.youtube",
        "com.google.android.apps.youtube.mango",
        "com.facebook.katana",
        "com.facebook.lite",
                "com.zhiliaoapp.musically",
        "com.ss.android.ugc.trill"
    ));

    private FloatingReelsOverlay floatingOverlay;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private boolean inReelsSection = false;
    private boolean isCurrentReelCounted = false;
    private volatile String currentPlatform = "";
    private long lastReelStartTime = 0;
    private long lastScrollTime = 0;

    private static ReelsTrackingService instance;

    public static ReelsTrackingService getInstance() {
        return instance;
    }

    private final Runnable qualifyReelRunnable = new Runnable() {
        @Override
        public void run() {
            try {
                if (inReelsSection && !isCurrentReelCounted) {
                    isCurrentReelCounted = true;
                    final int newCount = incrementReelsCount();
                    incrementPlatformCount(currentPlatform);
                    
                    // Update overlay smoothly
                    handler.post(() -> {
                        try {
                            if (floatingOverlay != null && inReelsSection) {
                                floatingOverlay.updateCount(newCount);
                            }
                        } catch (Throwable ignored) {}
                    });

                    // Check if reels alert limit reached
                    checkReelsLimitAlert(newCount);
                }
            } catch (Throwable t) {
                Log.w(TAG, "Error in qualifyReelRunnable", t);
            }
        }
    };

    // Tracks continuous duration spent inside reels section
    private final Runnable reelsTimeTrackerRunnable = new Runnable() {
        @Override
        public void run() {
            try {
                if (inReelsSection) {
                    incrementReelsTime(2); // add 2 seconds
                    incrementPlatformTime(currentPlatform, 2);
                    handler.postDelayed(this, 2000);
                }
            } catch (Throwable ignored) {}
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        try {
            floatingOverlay = new FloatingReelsOverlay(this);
        } catch (Throwable t) {
            Log.e(TAG, "Failed to initialize FloatingReelsOverlay", t);
        }

        // Post a low-priority ongoing notification via NotificationManager (Safe on Android 12-15+)
        showOngoingNotification();
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        try {
            AccessibilityServiceInfo info = new AccessibilityServiceInfo();
            info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED | AccessibilityEvent.TYPE_VIEW_SCROLLED | AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED | AccessibilityEvent.TYPE_VIEW_SELECTED;
            info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
            info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS | AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
            info.packageNames = new String[] {
                "com.instagram.android",
                "com.instagram.lite",
                "com.google.android.youtube",
                "com.google.android.apps.youtube.mango",
                "com.facebook.katana",
                "com.facebook.lite",
                "com.zhiliaoapp.musically",
                "com.ss.android.ugc.trill",
                "com.zhiliaoapp.musically.go",
                "com.vanced.android.youtube"
            };
            info.notificationTimeout = 300;
            setServiceInfo(info);
        } catch (Throwable t) {
            Log.w(TAG, "Error applying service info configuration", t);
        }

        showOngoingNotification();
    }

    private void showOngoingNotification() {
        try {
            createNotificationChannelIfNeeded();

            Intent launchIntent = new Intent(this, MainActivity.class);
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int pendingFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                : PendingIntent.FLAG_UPDATE_CURRENT;
            PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, launchIntent, pendingFlags);

            int smallIcon = getResources().getIdentifier("ic_stat_icon_config_sample", "drawable", getPackageName());
            if (smallIcon == 0) {
                smallIcon = android.R.drawable.ic_popup_sync;
            }

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
                .setContentTitle("নূর হ্যাবিট ট্র্যাকার সক্রিয়")
                .setContentText("ডিজিটাল ডিটক্স ও স্মার্ট রিলস ট্র্যাকিং ব্যাকগ্রাউন্ডে চলছে")
                .setSmallIcon(smallIcon)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE);

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIFICATION_ID, builder.build());
            }
        } catch (Throwable t) {
            Log.w(TAG, "Notification show error", t);
        }
    }

    private void createNotificationChannelIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = new NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
                    "নূর রিলস ও ডিজিটাল ট্র্যাকার",
                    NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("পটভূমিতে রিলস ও ডিজিটাল অভ্যাস ট্র্যাকিং সচল রাখতে নোটিফিকেশন");
                channel.setShowBadge(false);
                channel.enableLights(false);
                channel.enableVibration(false);
                nm.createNotificationChannel(channel);

                NotificationChannel alertChannel = new NotificationChannel(
                    "noor_reels_alerts",
                    "⚠️ রিলস স্ক্রোলিং সতর্কতা",
                    NotificationManager.IMPORTANCE_HIGH
                );
                alertChannel.setDescription("রিলস দেখার লিমিট পার হলে এলার্ট নোটিফিকেশন");
                alertChannel.enableVibration(true);
                nm.createNotificationChannel(alertChannel);
            }
        }
    }

    @Override
    public void onDestroy() {
        instance = null;
        try {
            handler.removeCallbacks(qualifyReelRunnable);
            handler.removeCallbacks(reelsTimeTrackerRunnable);
            if (floatingOverlay != null) {
                floatingOverlay.hide();
            }
        } catch (Throwable ignored) {}
        super.onDestroy();
    }

    @Override
    public void onInterrupt() {
        try {
            handler.removeCallbacks(qualifyReelRunnable);
            handler.removeCallbacks(reelsTimeTrackerRunnable);
            if (floatingOverlay != null) {
                floatingOverlay.hide();
            }
        } catch (Throwable ignored) {}
    }

    private boolean isSystemOrIgnored(String pkg) {
        if (pkg == null) return true;
        if (pkg.equals("android") || pkg.equals("com.android.systemui")) return true;
        String lower = pkg.toLowerCase(Locale.US);
        return lower.contains("inputmethod") || lower.contains("keyboard") || lower.contains("ime") || lower.contains("launcher");
    }

    /**
     * Determines whether the user is strictly inside the Reels/Shorts section of the app.
     * Prevents the floating counter from appearing on home feed, search, direct messages, etc.
     */
    private boolean checkIsInsideReels(AccessibilityEvent event, String packageName) {
        if (packageName == null) return false;

        // 1. TikTok is exclusively short videos/reels
        if (packageName.equals("com.zhiliaoapp.musically") || packageName.equals("com.ss.android.ugc.trill") || packageName.equals("com.zhiliaoapp.musically.go")) {
                "com.vanced.android.youtube"
            return true;
        }

        CharSequence classNameSeq = event.getClassName();
        String className = classNameSeq != null ? classNameSeq.toString().toLowerCase(Locale.US) : "";
        CharSequence contentDescSeq = event.getContentDescription();
        String contentDesc = contentDescSeq != null ? contentDescSeq.toString().toLowerCase(Locale.US) : "";

        // 2. YouTube Shorts
        if (packageName.equals("com.google.android.youtube") || packageName.equals("com.google.android.apps.youtube.mango")) {
            if (className.contains("reel") || className.contains("short")) {
                return true;
            }
            if (contentDesc.contains("short") || contentDesc.contains("reel")) {
                return true;
            }
            // Check node tree safely without deep recursion
            AccessibilityNodeInfo source = null;
            try {
                source = event.getSource();
                if (source != null) {
                    List<AccessibilityNodeInfo> nodes = source.findAccessibilityNodeInfosByViewId("com.google.android.youtube:id/shorts_container");
                    if (nodes != null && !nodes.isEmpty()) {
                        for (AccessibilityNodeInfo n : nodes) n.recycle();
                        return true;
                    }
                    nodes = source.findAccessibilityNodeInfosByViewId("com.google.android.youtube:id/reel_recycler");
                    if (nodes != null && !nodes.isEmpty()) {
                        for (AccessibilityNodeInfo n : nodes) n.recycle();
                        return true;
                    }
                    nodes = source.findAccessibilityNodeInfosByViewId("com.google.android.youtube:id/reel_player_page_view");
                    if (nodes != null && !nodes.isEmpty()) {
                        for (AccessibilityNodeInfo n : nodes) n.recycle();
                        return true;
                    }
                }
            } catch (Throwable ignored) {
            } finally {
                if (source != null) {
                    try { source.recycle(); } catch (Throwable ignored) {}
                }
            }
            return containsShortVideoMarker(packageName);
        }

        // 3. Instagram Reels
        if (packageName.equals("com.instagram.android") || packageName.equals("com.instagram.lite")) {
            if (className.contains("clips") || className.contains("reel")) {
                return true;
            }
            AccessibilityNodeInfo source = null;
            try {
                source = event.getSource();
                if (source != null) {
                    List<AccessibilityNodeInfo> nodes = source.findAccessibilityNodeInfosByViewId("com.instagram.android:id/clips_viewer");
                    if (nodes != null && !nodes.isEmpty()) {
                        for (AccessibilityNodeInfo n : nodes) n.recycle();
                        return true;
                    }
                    nodes = source.findAccessibilityNodeInfosByViewId("com.instagram.android:id/clips_video_container");
                    if (nodes != null && !nodes.isEmpty()) {
                        for (AccessibilityNodeInfo n : nodes) n.recycle();
                        return true;
                    }
                }
            } catch (Throwable ignored) {
            } finally {
                if (source != null) {
                    try { source.recycle(); } catch (Throwable ignored) {}
                }
            }
            return containsShortVideoMarker(packageName);
        }

        // 4. Facebook Reels
        if (packageName.equals("com.facebook.katana") || packageName.equals("com.facebook.lite")) {
            if (className.contains("reel") || className.contains("fbshorts") || className.contains("shortsvideo")) {
                return true;
            }
            AccessibilityNodeInfo source = null;
            try {
                source = event.getSource();
                if (source != null) {
                    List<AccessibilityNodeInfo> nodes = source.findAccessibilityNodeInfosByViewId("com.facebook.katana:id/fb_shorts_container");
                    if (nodes != null && !nodes.isEmpty()) {
                        for (AccessibilityNodeInfo n : nodes) n.recycle();
                        return true;
                    }
                }
            } catch (Throwable ignored) {
            } finally {
                if (source != null) {
                    try { source.recycle(); } catch (Throwable ignored) {}
                }
            }
            return containsShortVideoMarker(packageName);
        }

        return false;
    }

    /** Bounded scan of active accessibility tree; avoids relying on one app-version-specific view ID. */
    private boolean containsShortVideoMarker(String packageName) {
        AccessibilityNodeInfo root = null;
        java.util.ArrayDeque<AccessibilityNodeInfo> queue = new java.util.ArrayDeque<>();
        try {
            root = getRootInActiveWindow();
            if (root == null) return false;
            queue.add(root);
            int visited = 0;
            boolean marker = false;
            boolean player = false;
            while (!queue.isEmpty() && visited++ < 220) {
                AccessibilityNodeInfo node = queue.removeFirst();
                try {
                    CharSequence id = node.getViewIdResourceName();
                    CharSequence cls = node.getClassName();
                    String idText = id == null ? "" : id.toString().toLowerCase(Locale.US);
                    String clsText = cls == null ? "" : cls.toString().toLowerCase(Locale.US);
                    if (idText.contains("short") || idText.contains("reel") || idText.contains("clip")) marker = true;
                    if (clsText.contains("reel") || clsText.contains("short") || clsText.contains("player")) player = true;
                    CharSequence text = node.getText();
                    CharSequence desc = node.getContentDescription();
                    String label = ((text == null ? "" : text.toString()) + " " + (desc == null ? "" : desc.toString())).toLowerCase(Locale.US);
                    if (packageName.contains("youtube")) {
                        if (label.contains("short") || label.contains("reel")) marker = true;
                    } else if (label.contains("reel") || label.contains("clip")) {
                        marker = true;
                    }
                    if (marker && player) return true;
                    for (int i = 0; i < node.getChildCount() && visited + queue.size() < 220; i++) {
                        AccessibilityNodeInfo child = node.getChild(i);
                        if (child != null) queue.addLast(child);
                    }
                } finally {
                    if (node != root) try { node.recycle(); } catch (Throwable ignored) {}
                }
            }
            return marker && player;
        } catch (Throwable t) {
            Log.d(TAG, "Short-video tree scan unavailable", t);
            return false;
        } finally {
            while (!queue.isEmpty()) try { queue.removeFirst().recycle(); } catch (Throwable ignored) {}
            if (root != null) try { root.recycle(); } catch (Throwable ignored) {}
        }
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        try {
            if (event == null) return;

            int eventType = event.getEventType();
            if (eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
                eventType != AccessibilityEvent.TYPE_VIEW_SCROLLED &&
                eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
                return;
            }

            CharSequence pkg = event.getPackageName();
            if (pkg == null) return;
            String packageName = pkg.toString();

            if (isSystemOrIgnored(packageName) || packageName.equals(getPackageName())) {
                return;
            }

            boolean isSocialTarget = SOCIAL_PACKAGES.contains(packageName);

            if (!isSocialTarget) {
                // User switched away from target apps
                if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && inReelsSection) {
                    exitReelsSection();
                }
                return;
            }

            // Handle reels detection & scroll tracking robustly
            currentPlatform = platformForPackage(packageName);

            if (inReelsSection) {
                // Already inside reels section:
                // Only re-verify exit on major window transitions
                if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
                    boolean stillInReels = checkIsInsideReels(event, packageName);
                    if (!stillInReels) {
                        exitReelsSection();
                        return;
                    }
                }

                // If user scrolled to next reel while in reels section:
                if (eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED) {
                    long now = SystemClock.uptimeMillis();
                    if (now - lastScrollTime > 650) { // debounce rapid flickers
                        lastScrollTime = now;
                        scheduleReelDwellTimer();
                    }
                }
            } else {
                // Not currently in reels section -> check if this event marks entry into reels
                boolean isInsideReelsNow = checkIsInsideReels(event, packageName);
                if (isInsideReelsNow) {
                    enterReelsSection();
                    if (eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED) {
                        lastScrollTime = SystemClock.uptimeMillis();
                        scheduleReelDwellTimer();
                    }
                }
            }
        } catch (Throwable t) {
            Log.e(TAG, "Safe catch in onAccessibilityEvent", t);
        }
    }

    private void enterReelsSection() {
        inReelsSection = true;
        final int currentCount = getReelsCountToday();
        handler.post(() -> {
            try {
                if (floatingOverlay != null && inReelsSection) {
                    floatingOverlay.show(currentCount);
                }
            } catch (Throwable ignored) {}
        });

        // Start duration tracker
        handler.removeCallbacks(reelsTimeTrackerRunnable);
        handler.postDelayed(reelsTimeTrackerRunnable, 2000);

        scheduleReelDwellTimer();
    }

    private void exitReelsSection() {
        inReelsSection = false;
        handler.removeCallbacks(qualifyReelRunnable);
        handler.removeCallbacks(reelsTimeTrackerRunnable);
        isCurrentReelCounted = false;

        handler.post(() -> {
            try {
                if (floatingOverlay != null) {
                    floatingOverlay.hide();
                }
            } catch (Throwable ignored) {}
        });
    }

    private void scheduleReelDwellTimer() {
        try {
            handler.removeCallbacks(qualifyReelRunnable);
            isCurrentReelCounted = false;
            handler.postDelayed(qualifyReelRunnable, REEL_DWELL_THRESHOLD_MS);
        } catch (Throwable t) {
            Log.w(TAG, "Error scheduling dwell timer", t);
        }
    }

    public synchronized int getReelsCountToday() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
            String savedDate = prefs.getString(KEY_REELS_DATE, "");

            if (!today.equals(savedDate)) {
                prefs.edit()
                        .putString(KEY_REELS_DATE, today)
                        .putInt(KEY_REELS_TODAY, 0)
                        .putInt(KEY_REELS_TIME_SECONDS, 0)
                        .apply();
                return 0;
            }

            return prefs.getInt(KEY_REELS_TODAY, 0);
        } catch (Throwable t) {
            return 0;
        }
    }

    public synchronized int incrementReelsCount() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
            String savedDate = prefs.getString(KEY_REELS_DATE, "");

            int current = 0;
            if (today.equals(savedDate)) {
                current = prefs.getInt(KEY_REELS_TODAY, 0);
            }

            int next = current + 1;
            SharedPreferences.Editor editor = prefs.edit()
                    .putString(KEY_REELS_DATE, today)
                    .putInt(KEY_REELS_TODAY, next);
            if (!today.equals(savedDate)) {
                editor.putString(KEY_PLATFORM_COUNTS, "{}").putString(KEY_PLATFORM_TIME, "{}").putInt(KEY_REELS_TIME_SECONDS, 0);
            }
            editor.apply();
            return next;
        } catch (Throwable t) {
            return 0;
        }
    }

    private synchronized void incrementReelsTime(int seconds) {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
            String savedDate = prefs.getString(KEY_REELS_DATE, "");

            int currentSec = 0;
            if (today.equals(savedDate)) {
                currentSec = prefs.getInt(KEY_REELS_TIME_SECONDS, 0);
            }
            prefs.edit()
                .putString(KEY_REELS_DATE, today)
                .putInt(KEY_REELS_TIME_SECONDS, currentSec + seconds)
                .apply();
        } catch (Throwable ignored) {}
    }

    private String platformForPackage(String packageName) {
        if (packageName == null) return "";
        if (packageName.contains("youtube")) return "youtube";
        if (packageName.contains("facebook") || packageName.equals("com.facebook.katana")) return "facebook";
        if (packageName.contains("instagram")) return "instagram";
        if (packageName.contains("musically") || packageName.contains("trill")) return "tiktok";
        return "";
    }

    private synchronized void incrementPlatformCount(String platform) {
        if (platform == null || platform.isEmpty()) return;
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
            if (!today.equals(prefs.getString(KEY_REELS_DATE, ""))) {
                prefs.edit().putString(KEY_REELS_DATE, today).putString(KEY_PLATFORM_COUNTS, "{}").putString(KEY_PLATFORM_TIME, "{}").apply();
            }
            org.json.JSONObject counts = new org.json.JSONObject(prefs.getString(KEY_PLATFORM_COUNTS, "{}"));
            counts.put(platform, counts.optInt(platform, 0) + 1);
            prefs.edit().putString(KEY_PLATFORM_COUNTS, counts.toString()).apply();
        } catch (Throwable t) { Log.w(TAG, "Platform count save failed", t); }
    }

    private synchronized void incrementPlatformTime(String platform, int seconds) {
        if (platform == null || platform.isEmpty()) return;
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
            if (!today.equals(prefs.getString(KEY_REELS_DATE, ""))) return;
            org.json.JSONObject times = new org.json.JSONObject(prefs.getString(KEY_PLATFORM_TIME, "{}"));
            times.put(platform, times.optInt(platform, 0) + seconds);
            prefs.edit().putString(KEY_PLATFORM_TIME, times.toString()).apply();
        } catch (Throwable t) { Log.w(TAG, "Platform time save failed", t); }
    }

    private void checkReelsLimitAlert(int newCount) {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            int limit = prefs.getInt(KEY_REELS_ALERT_LIMIT, 30); // default 30 reels
            if (limit <= 0) return;

            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
            String lastTriggeredDate = prefs.getString(KEY_REELS_ALERT_TRIGGERED_DATE, "");

            if (newCount >= limit && !today.equals(lastTriggeredDate)) {
                prefs.edit().putString(KEY_REELS_ALERT_TRIGGERED_DATE, today).apply();

                // Trigger Alert Notification with sound and vibration
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    Intent intent = new Intent(this, MainActivity.class);
                    intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    int pendingFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                        ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                        : PendingIntent.FLAG_UPDATE_CURRENT;
                    PendingIntent pi = PendingIntent.getActivity(this, 0, intent, pendingFlags);

                    Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

                    int smallIcon = getResources().getIdentifier("ic_stat_icon_config_sample", "drawable", getPackageName());
                    if (smallIcon == 0) smallIcon = android.R.drawable.ic_dialog_alert;

                    NotificationCompat.Builder alert = new NotificationCompat.Builder(this, "noor_reels_alerts")
                        .setContentTitle("⚠️ রিলস স্ক্রোলিং সীমা অতিক্রম!")
                        .setContentText("আপনি আজ " + newCount + "টি রিলস দেখে ফেলেছেন। এখন ফোন রেখে নামাজ বা প্রয়োজনীয় কাজে মনোযোগ দিন।")
                        .setStyle(new NotificationCompat.BigTextStyle()
                            .bigText("আপনি আজ " + newCount + "টি রিলস দেখে ফেলেছেন। আপনার মূল্যবান সময় অপচয় রোধ করতে এখন ফোন রাখুন এবং ইবাদত ও জরুরি অভ্যাসে মনোযোগ দিন।"))
                        .setSmallIcon(smallIcon)
                        .setSound(soundUri)
                        .setVibrate(new long[]{0, 400, 250, 400})
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setAutoCancel(true)
                        .setContentIntent(pi);

                    nm.notify(ALERT_NOTIFICATION_ID, alert.build());
                }
            }
        } catch (Throwable t) {
            Log.w(TAG, "Error checking reels limit alert", t);
        }
    }
}
