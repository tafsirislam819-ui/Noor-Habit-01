package com.noorhabit.app;

import android.accessibilityservice.AccessibilityServiceInfo;
import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;
import android.util.Log;
import android.view.accessibility.AccessibilityManager;
import android.webkit.JavascriptInterface;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public class NoorNativeBridge {

    private static final String TAG = "NoorNativeBridge";
    private final Context context;

    public NoorNativeBridge(Context context) {
        this.context = context.getApplicationContext();
    }

    public static class AppUsageItem {
        public String packageName;
        public String appName;
        public int minutes;

        public AppUsageItem(String packageName, String appName, int minutes) {
            this.packageName = packageName;
            this.appName = appName;
            this.minutes = minutes;
        }
    }

    @JavascriptInterface
    public String getReelsStats() {
        try {
            SharedPreferences prefs = context.getSharedPreferences(ReelsTrackingService.PREFS_NAME, Context.MODE_PRIVATE);
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
            String savedDate = prefs.getString(ReelsTrackingService.KEY_REELS_DATE, "");

            int reelsToday = 0;
            int reelsTimeSeconds = 0;
            if (today.equals(savedDate)) {
                reelsToday = prefs.getInt(ReelsTrackingService.KEY_REELS_TODAY, 0);
                reelsTimeSeconds = prefs.getInt(ReelsTrackingService.KEY_REELS_TIME_SECONDS, 0);
            }
            int reelsTimeMinutes = reelsTimeSeconds / 60;
            int alertLimit = prefs.getInt(ReelsTrackingService.KEY_REELS_ALERT_LIMIT, 30);

            // Compute true Screen On Time and per-app usage
            List<AppUsageItem> appUsageList = new ArrayList<>();
            int sotMinutes = calculateAccurateSotAndAppUsage(appUsageList);

            if (sotMinutes <= 0) {
                sotMinutes = prefs.getInt(ReelsTrackingService.KEY_SOT_MINUTES, 0);
            } else {
                prefs.edit().putInt(ReelsTrackingService.KEY_SOT_MINUTES, sotMinutes).apply();
            }

            boolean hasAccessibility = isAccessibilityServiceEnabled();
            boolean hasOverlay = hasOverlayPermission();
            boolean hasUsage = hasUsageStatsPermission();
            boolean hasNotifications = hasNotificationPermission();

            JSONObject json = new JSONObject();
            json.put("reelsToday", reelsToday);
            json.put("sotMinutes", sotMinutes);
            json.put("reelsTimeMinutes", reelsTimeMinutes);
            json.put("reelsTimeSeconds", reelsTimeSeconds);
            json.put("reelsAlertLimit", alertLimit);
            try {
                json.put("platformReelCounts", new JSONObject(prefs.getString(ReelsTrackingService.KEY_PLATFORM_COUNTS, "{}")));
                json.put("platformReelTimeSeconds", new JSONObject(prefs.getString(ReelsTrackingService.KEY_PLATFORM_TIME, "{}")));
            } catch (Throwable ignored) {
                json.put("platformReelCounts", new JSONObject());
                json.put("platformReelTimeSeconds", new JSONObject());
            }
            json.put("hasAccessibility", hasAccessibility);
            json.put("hasOverlay", hasOverlay);
            json.put("hasUsage", hasUsage);
            json.put("hasNotifications", hasNotifications);

            JSONArray usageArray = new JSONArray();
            for (AppUsageItem item : appUsageList) {
                JSONObject obj = new JSONObject();
                obj.put("packageName", item.packageName);
                obj.put("appName", item.appName);
                obj.put("minutes", item.minutes);
                usageArray.put(obj);
            }
            json.put("appUsage", usageArray);

            return json.toString();
        } catch (Throwable t) {
            Log.e(TAG, "Error generating reels stats", t);
            return "{\"reelsToday\":0,\"sotMinutes\":0,\"hasAccessibility\":false,\"hasOverlay\":false,\"hasUsage\":false,\"hasNotifications\":false,\"appUsage\":[]}";
        }
    }

    @JavascriptInterface
    public String getAppUsageStats() {
        try {
            List<AppUsageItem> appUsageList = new ArrayList<>();
            int totalSot = calculateAccurateSotAndAppUsage(appUsageList);

            JSONObject json = new JSONObject();
            json.put("totalSotMinutes", totalSot);

            JSONArray arr = new JSONArray();
            for (AppUsageItem item : appUsageList) {
                JSONObject obj = new JSONObject();
                obj.put("packageName", item.packageName);
                obj.put("appName", item.appName);
                obj.put("minutes", item.minutes);
                arr.put(obj);
            }
            json.put("apps", arr);
            return json.toString();
        } catch (Throwable t) {
            return "{\"totalSotMinutes\":0,\"apps\":[]}";
        }
    }


    @JavascriptInterface
    public void setReelsThemeColor(String color) {
        try {
            if (color == null || !color.matches("#[0-9A-Fa-f]{6}")) return;
            context.getSharedPreferences(ReelsTrackingService.PREFS_NAME, Context.MODE_PRIVATE)
                .edit().putString("reels_theme_color", color).apply();
        } catch (Throwable ignored) {}
    }

    @JavascriptInterface
    public void setReelsAlertLimit(int limit) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(ReelsTrackingService.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putInt(ReelsTrackingService.KEY_REELS_ALERT_LIMIT, limit).apply();
        } catch (Throwable ignored) {}
    }

    @JavascriptInterface
    public int getReelsAlertLimit() {
        try {
            SharedPreferences prefs = context.getSharedPreferences(ReelsTrackingService.PREFS_NAME, Context.MODE_PRIVATE);
            return prefs.getInt(ReelsTrackingService.KEY_REELS_ALERT_LIMIT, 30);
        } catch (Throwable ignored) {
            return 30;
        }
    }

    @JavascriptInterface
    public boolean isAccessibilityServiceEnabled() {
        // 1. Direct active instance verification
        if (ReelsTrackingService.getInstance() != null) {
            return true;
        }

        // 2. Query AccessibilityManager for enabled services in this package
        try {
            AccessibilityManager am = (AccessibilityManager) context.getSystemService(Context.ACCESSIBILITY_SERVICE);
            if (am != null) {
                List<AccessibilityServiceInfo> runningServices = am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK);
                if (runningServices != null) {
                    for (AccessibilityServiceInfo service : runningServices) {
                        if (service.getId() != null && service.getId().contains(context.getPackageName())) {
                            return true;
                        }
                    }
                }
            }
        } catch (Throwable ignored) {}

        // 3. Query system settings as secondary check
        try {
            int accessibilityEnabled = Settings.Secure.getInt(
                context.getContentResolver(),
                Settings.Secure.ACCESSIBILITY_ENABLED
            );
            if (accessibilityEnabled == 1) {
                String settingValue = Settings.Secure.getString(
                    context.getContentResolver(),
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                );
                if (settingValue != null && settingValue.contains(context.getPackageName())) {
                    return true;
                }
            }
        } catch (Throwable ignored) {}

        return false;
    }

    @JavascriptInterface
    public boolean hasOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(context);
        }
        return true;
    }

    @JavascriptInterface
    public boolean hasUsageStatsPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
                if (appOps == null) return false;
                int mode = appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    context.getPackageName()
                );
                return mode == AppOpsManager.MODE_ALLOWED;
            } catch (Throwable ignored) {}
        }
        return false;
    }

    @JavascriptInterface
    public boolean hasNotificationPermission() {
        return NotificationManagerCompat.from(context).areNotificationsEnabled();
    }

    @JavascriptInterface
    public void openAccessibilitySettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Throwable t) {
            Log.e(TAG, "Failed to open accessibility settings", t);
        }
    }

    @JavascriptInterface
    public void openOverlaySettings() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + context.getPackageName())
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            }
        } catch (Throwable t) {
            try {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } catch (Throwable ignored) {}
        }
    }

    @JavascriptInterface
    public void openUsageSettings() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            }
        } catch (Throwable t) {
            Log.e(TAG, "Failed to open usage settings", t);
        }
    }

    @JavascriptInterface
    public void openNotificationSettings() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } else {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            }
        } catch (Throwable ignored) {}
    }

    @JavascriptInterface
    public void addMockReels(int count) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(ReelsTrackingService.PREFS_NAME, Context.MODE_PRIVATE);
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
            int current = prefs.getInt(ReelsTrackingService.KEY_REELS_TODAY, 0);
            prefs.edit()
                .putString(ReelsTrackingService.KEY_REELS_DATE, today)
                .putInt(ReelsTrackingService.KEY_REELS_TODAY, Math.max(0, current + count))
                .apply();
        } catch (Throwable ignored) {}
    }

    /**
     * Accurately calculates Screen On Time and per-app usage breakdown
     * matching Android's Digital Wellbeing system algorithm.
     */
    private int calculateAccurateSotAndAppUsage(List<AppUsageItem> outAppUsageList) {
        if (!hasUsageStatsPermission()) return 0;

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                UsageStatsManager usm = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
                if (usm == null) return 0;

                Calendar cal = Calendar.getInstance();
                cal.set(Calendar.HOUR_OF_DAY, 0);
                cal.set(Calendar.MINUTE, 0);
                cal.set(Calendar.SECOND, 0);
                cal.set(Calendar.MILLISECOND, 0);
                long startTime = cal.getTimeInMillis();
                long endTime = System.currentTimeMillis();

                // Get default launcher package to ignore desktop time
                Set<String> ignoredPackages = getIgnoredPackages();

                Map<String, Long> appDurationMap = new HashMap<>();

                // Method A: Exact UsageEvents iteration (Android Digital Wellbeing standard)
                UsageEvents events = usm.queryEvents(startTime, endTime);
                if (events != null) {
                    Map<String, Long> lastResumeTime = new HashMap<>();
                    UsageEvents.Event event = new UsageEvents.Event();

                    while (events.hasNextEvent()) {
                        events.getNextEvent(event);
                        String pkg = event.getPackageName();
                        if (pkg == null || ignoredPackages.contains(pkg)) continue;

                        int type = event.getEventType();
                        long ts = event.getTimeStamp();

                        if (type == UsageEvents.Event.ACTIVITY_RESUMED || type == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                            lastResumeTime.put(pkg, ts);
                        } else if (type == UsageEvents.Event.ACTIVITY_PAUSED || type == UsageEvents.Event.MOVE_TO_BACKGROUND) {
                            Long resumeTs = lastResumeTime.remove(pkg);
                            if (resumeTs != null && ts > resumeTs) {
                                long diff = ts - resumeTs;
                                // Ignore absurd anomalies greater than 6 hours
                                if (diff < 6 * 3600 * 1000) {
                                    long cur = appDurationMap.containsKey(pkg) ? appDurationMap.get(pkg) : 0;
                                    appDurationMap.put(pkg, cur + diff);
                                }
                            }
                        }
                    }

                    // For app currently in foreground right now
                    for (Map.Entry<String, Long> entry : lastResumeTime.entrySet()) {
                        long diff = endTime - entry.getValue();
                        if (diff > 0 && diff < 3600 * 1000) {
                            String pkg = entry.getKey();
                            long cur = appDurationMap.containsKey(pkg) ? appDurationMap.get(pkg) : 0;
                            appDurationMap.put(pkg, cur + diff);
                        }
                    }
                }

                // Method B: Fallback if UsageEvents was empty
                if (appDurationMap.isEmpty()) {
                    Map<String, UsageStats> statsMap = usm.queryAndAggregateUsageStats(startTime, endTime);
                    if (statsMap != null) {
                        for (Map.Entry<String, UsageStats> entry : statsMap.entrySet()) {
                            String pkg = entry.getKey();
                            if (ignoredPackages.contains(pkg)) continue;
                            long totalTime = entry.getValue().getTotalTimeInForeground();
                            if (totalTime > 0) {
                                appDurationMap.put(pkg, totalTime);
                            }
                        }
                    }
                }

                PackageManager pm = context.getPackageManager();
                long totalForegroundMs = 0;

                for (Map.Entry<String, Long> entry : appDurationMap.entrySet()) {
                    long durationMs = entry.getValue();
                    if (durationMs >= 60 * 1000) { // at least 1 minute
                        totalForegroundMs += durationMs;
                        int mins = (int) (durationMs / (60 * 1000));
                        String appName = getFriendlyAppName(pm, entry.getKey());
                        outAppUsageList.add(new AppUsageItem(entry.getKey(), appName, mins));
                    }
                }

                // Sort apps by duration descending
                Collections.sort(outAppUsageList, new Comparator<AppUsageItem>() {
                    @Override
                    public int compare(AppUsageItem a, AppUsageItem b) {
                        return Integer.compare(b.minutes, a.minutes);
                    }
                });

                return (int) (totalForegroundMs / (60 * 1000));
            }
        } catch (Throwable t) {
            Log.e(TAG, "Error calculating SOT and App Usage", t);
        }
        return 0;
    }

    private String getFriendlyAppName(PackageManager pm, String packageName) {
        if (packageName == null) return "App";
        try {
            ApplicationInfo ai = pm.getApplicationInfo(packageName, 0);
            CharSequence label = pm.getApplicationLabel(ai);
            if (label != null && label.length() > 0) {
                return label.toString();
            }
        } catch (Throwable ignored) {}

        // Friendly name fallbacks for common apps
        if (packageName.equals("com.google.android.youtube") || packageName.equals("com.google.android.apps.youtube.mango")) return "YouTube";
        if (packageName.equals("com.instagram.lite")) return "Instagram Lite";
        if (packageName.equals("com.facebook.lite")) return "Facebook Lite";
        if (packageName.equals("com.ss.android.ugc.trill")) return "TikTok";
        if (packageName.equals("com.facebook.katana")) return "Facebook";
        if (packageName.equals("com.instagram.android")) return "Instagram";
        if (packageName.equals("com.whatsapp")) return "WhatsApp";
        if (packageName.equals("com.zhiliaoapp.musically")) return "TikTok";
        if (packageName.equals("com.android.chrome")) return "Chrome";
        if (packageName.equals("com.facebook.orca")) return "Messenger";
        if (packageName.equals("org.telegram.messenger")) return "Telegram";
        if (packageName.equals("com.google.android.apps.messaging")) return "Messages";
        if (packageName.equals(context.getPackageName())) return "Noor Habit";

        return packageName;
    }

    private Set<String> getIgnoredPackages() {
        Set<String> set = new HashSet<>();
        set.add("android");
        set.add("com.android.systemui");
        set.add("com.google.android.inputmethod.latin");
        set.add("com.touchtype.swiftkey");
        set.add("com.samsung.android.honeyboard");

        // Add default launcher package
        try {
            Intent homeIntent = new Intent(Intent.ACTION_MAIN);
            homeIntent.addCategory(Intent.CATEGORY_HOME);
            PackageManager pm = context.getPackageManager();
            ResolveInfo resolveInfo = pm.resolveActivity(homeIntent, PackageManager.MATCH_DEFAULT_ONLY);
            if (resolveInfo != null && resolveInfo.activityInfo != null) {
                set.add(resolveInfo.activityInfo.packageName);
            }
        } catch (Throwable ignored) {}

        return set;
    }
}
