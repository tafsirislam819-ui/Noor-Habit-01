import { Capacitor, registerPlugin } from "@capacitor/core";

export interface AppUsageItem {
  packageName: string;
  appName: string;
  minutes: number;
}

export interface NativeReelsStats {
  reelsToday: number;
  sotMinutes: number;
  reelsTimeMinutes?: number;
  reelsTimeSeconds?: number;
  reelsAlertLimit?: number;
  hasAccessibility: boolean;
  hasOverlay: boolean;
  hasUsage: boolean;
  hasNotifications?: boolean;
  appUsage?: AppUsageItem[];
  platformReelCounts?: Record<string, number>;
  platformReelTimeSeconds?: Record<string, number>;
}

type NoorNativePluginApi = {
  getReelsStats: () => Promise<NativeReelsStats>;
  getAppUsageStats: () => Promise<{ totalSotMinutes: number; apps: AppUsageItem[] }>;
  setReelsAlertLimit: (options: { limit: number }) => Promise<void>;
  setReelsThemeColor: (options: { color: string }) => Promise<void>;
  getReelsAlertLimit: () => Promise<{ limit: number }>;
  openAccessibilitySettings: () => Promise<void>;
  openOverlaySettings: () => Promise<void>;
  openUsageSettings: () => Promise<void>;
  openNotificationSettings: () => Promise<void>;
  addMockReels: (options: { count: number }) => Promise<void>;
};

const NoorNativePlugin = registerPlugin<NoorNativePluginApi>("NoorNative");

declare global {
  interface Window {
    NoorNative?: {
      getReelsStats: () => string;
      getAppUsageStats?: () => string;
      setReelsAlertLimit?: (limit: number) => void;
      setReelsThemeColor?: (color: string) => void;
      getReelsAlertLimit?: () => number;
      openAccessibilitySettings: () => void;
      openOverlaySettings: () => void;
      openUsageSettings: () => void;
      openNotificationSettings: () => void;
      addMockReels: (count: number) => void;
      isAccessibilityServiceEnabled?: () => boolean;
      hasOverlayPermission?: () => boolean;
      hasUsageStatsPermission?: () => boolean;
      hasNotificationPermission?: () => boolean;
    };
  }
}

export function isNativeAndroid(): boolean {
  if (typeof window === "undefined") return false;
  return (
    Capacitor.isNativePlatform() ||
    Capacitor.getPlatform() === "android" ||
    typeof window.NoorNative !== "undefined"
  );
}

// In-memory cached stats
let cachedStats: NativeReelsStats = {
  reelsToday: 0,
  sotMinutes: 0,
  reelsTimeMinutes: 0,
  reelsTimeSeconds: 0,
  reelsAlertLimit: 30,
  hasAccessibility: false,
  hasOverlay: false,
  hasUsage: false,
  hasNotifications: false,
  appUsage: [],
  platformReelCounts: {},
  platformReelTimeSeconds: {},
};

export function getNativeReelsStats(): NativeReelsStats {
  if (typeof window === "undefined") return cachedStats;

  // 1. Direct JavascriptInterface check (Synchronous & fastest)
  if (window.NoorNative?.getReelsStats) {
    try {
      const res = window.NoorNative.getReelsStats();
      if (res) {
        const parsed = JSON.parse(res);
        cachedStats = {
          ...cachedStats,
          ...parsed,
          reelsToday: Number(parsed.reelsToday ?? 0),
          sotMinutes: Number(parsed.sotMinutes ?? 0),
          reelsTimeMinutes: Number(parsed.reelsTimeMinutes ?? 0),
          reelsTimeSeconds: Number(parsed.reelsTimeSeconds ?? 0),
          reelsAlertLimit: Number(parsed.reelsAlertLimit ?? 30),
          hasAccessibility: Boolean(parsed.hasAccessibility),
          hasOverlay: Boolean(parsed.hasOverlay),
          hasUsage: Boolean(parsed.hasUsage),
          hasNotifications: Boolean(parsed.hasNotifications),
          appUsage: Array.isArray(parsed.appUsage) ? parsed.appUsage : cachedStats.appUsage ?? [],
          platformReelCounts: parsed.platformReelCounts || cachedStats.platformReelCounts || {},
          platformReelTimeSeconds: parsed.platformReelTimeSeconds || cachedStats.platformReelTimeSeconds || {},
        };
        return cachedStats;
      }
    } catch (e) {
      console.warn("Could not parse native reels stats:", e);
    }
  }

  // 2. Capacitor Plugins bridge check (Asynchronous background refresh)
  const capPlugin = NoorNativePlugin;
  if (capPlugin?.getReelsStats) {
    capPlugin
      .getReelsStats()
      .then((data: any) => {
        if (data) {
          cachedStats = {
            ...cachedStats,
            ...data,
            reelsToday: Number(data.reelsToday ?? 0),
            sotMinutes: Number(data.sotMinutes ?? 0),
            reelsTimeMinutes: Number(data.reelsTimeMinutes ?? 0),
            reelsTimeSeconds: Number(data.reelsTimeSeconds ?? 0),
            reelsAlertLimit: Number(data.reelsAlertLimit ?? 30),
            hasAccessibility: Boolean(data.hasAccessibility),
            hasOverlay: Boolean(data.hasOverlay),
            hasUsage: Boolean(data.hasUsage),
            hasNotifications: Boolean(data.hasNotifications),
            appUsage: Array.isArray(data.appUsage) ? data.appUsage : cachedStats.appUsage ?? [],
            platformReelCounts: data.platformReelCounts || cachedStats.platformReelCounts || {},
            platformReelTimeSeconds: data.platformReelTimeSeconds || cachedStats.platformReelTimeSeconds || {},
          };
        }
      })
      .catch(() => {});
  }

  return cachedStats;
}

export async function refreshNativeReelsStats(): Promise<NativeReelsStats> {
  if (typeof window !== "undefined" && window.NoorNative?.getReelsStats) {
    try {
      const parsed = JSON.parse(window.NoorNative.getReelsStats());
      cachedStats = {
        ...cachedStats,
        ...parsed,
        reelsToday: Number(parsed.reelsToday ?? 0),
        sotMinutes: Number(parsed.sotMinutes ?? 0),
        reelsTimeMinutes: Number(parsed.reelsTimeMinutes ?? 0),
        reelsTimeSeconds: Number(parsed.reelsTimeSeconds ?? 0),
        reelsAlertLimit: Number(parsed.reelsAlertLimit ?? 30),
        hasAccessibility: Boolean(parsed.hasAccessibility),
        hasOverlay: Boolean(parsed.hasOverlay),
        hasUsage: Boolean(parsed.hasUsage),
        hasNotifications: Boolean(parsed.hasNotifications),
        appUsage: Array.isArray(parsed.appUsage) ? parsed.appUsage : cachedStats.appUsage ?? [],
          platformReelCounts: parsed.platformReelCounts || cachedStats.platformReelCounts || {},
          platformReelTimeSeconds: parsed.platformReelTimeSeconds || cachedStats.platformReelTimeSeconds || {},
      };
      return cachedStats;
    } catch {}
  }
  if (isNativeAndroid()) {
    try {
      const data = await NoorNativePlugin.getReelsStats();
      cachedStats = {
        ...cachedStats,
        ...data,
        reelsToday: Number(data.reelsToday ?? 0),
        sotMinutes: Number(data.sotMinutes ?? 0),
        reelsTimeMinutes: Number(data.reelsTimeMinutes ?? 0),
        reelsTimeSeconds: Number(data.reelsTimeSeconds ?? 0),
        reelsAlertLimit: Number(data.reelsAlertLimit ?? 30),
        hasAccessibility: Boolean(data.hasAccessibility),
        hasOverlay: Boolean(data.hasOverlay),
        hasUsage: Boolean(data.hasUsage),
        hasNotifications: Boolean(data.hasNotifications),
        appUsage: Array.isArray(data.appUsage) ? data.appUsage : cachedStats.appUsage ?? [],
            platformReelCounts: data.platformReelCounts || cachedStats.platformReelCounts || {},
            platformReelTimeSeconds: data.platformReelTimeSeconds || cachedStats.platformReelTimeSeconds || {},
      };
    } catch {}
  }
  return cachedStats;
}

export function setNativeReelsAlertLimit(limit: number) {
  if (typeof window === "undefined") return;
  cachedStats.reelsAlertLimit = limit;
  try {
    localStorage.setItem("noor_reels_alert_limit", String(limit));
  } catch {}

  if (window.NoorNative?.setReelsAlertLimit) {
    window.NoorNative.setReelsAlertLimit(limit);
    return;
  }
  const capPlugin = NoorNativePlugin;
  if (capPlugin?.setReelsAlertLimit) {
    capPlugin.setReelsAlertLimit({ limit }).catch(() => {});
  }
}

export function openNativeAccessibilitySettings() {
  if (typeof window === "undefined") return;
  if (window.NoorNative?.openAccessibilitySettings) {
    window.NoorNative.openAccessibilitySettings();
    return;
  }
  const capPlugin = NoorNativePlugin;
  if (capPlugin?.openAccessibilitySettings) {
    capPlugin.openAccessibilitySettings().catch(() => {});
  }
}

export function openNativeOverlaySettings() {
  if (typeof window === "undefined") return;
  if (window.NoorNative?.openOverlaySettings) {
    window.NoorNative.openOverlaySettings();
    return;
  }
  const capPlugin = NoorNativePlugin;
  if (capPlugin?.openOverlaySettings) {
    capPlugin.openOverlaySettings().catch(() => {});
  }
}

export function openNativeUsageSettings() {
  if (typeof window === "undefined") return;
  if (window.NoorNative?.openUsageSettings) {
    window.NoorNative.openUsageSettings();
    return;
  }
  const capPlugin = NoorNativePlugin;
  if (capPlugin?.openUsageSettings) {
    capPlugin.openUsageSettings().catch(() => {});
  }
}

export function openNativeNotificationSettings() {
  if (typeof window === "undefined") return;
  if (window.NoorNative?.openNotificationSettings) {
    window.NoorNative.openNotificationSettings();
    return;
  }
  const capPlugin = NoorNativePlugin;
  if (capPlugin?.openNotificationSettings) {
    capPlugin.openNotificationSettings().catch(() => {});
  } else if ("Notification" in window) {
    Notification.requestPermission();
  }
}

export function triggerMockReel() {
  if (typeof window === "undefined") return;
  if (window.NoorNative?.addMockReels) {
    window.NoorNative.addMockReels(1);
    return;
  }
  const capPlugin = NoorNativePlugin;
  if (capPlugin?.addMockReels) {
    capPlugin.addMockReels({ count: 1 }).catch(() => {});
  } else {
    // Web fallback for testing in browser
    cachedStats.reelsToday = (cachedStats.reelsToday || 0) + 1;
    cachedStats.reelsTimeMinutes = (cachedStats.reelsTimeMinutes || 0) + 1;
  }
}


export function setNativeReelsThemeColor(color: string): void {
  if (typeof window === "undefined") return;
  try {
    if (window.NoorNative?.setReelsThemeColor) window.NoorNative.setReelsThemeColor(color);
    else if (Capacitor.isNativePlatform()) void NoorNativePlugin.setReelsThemeColor({ color });
  } catch { /* optional native theme sync */ }
}
