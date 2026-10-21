import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Smartphone,
  Layers,
  Bell,
  Clock,
  ExternalLink,
  CheckCircle2,
  X,
} from "lucide-react";
import { useApp } from "@/lib/store";
import {
  getNativeReelsStats,
  refreshNativeReelsStats,
  isNativeAndroid,
  openNativeAccessibilitySettings,
  openNativeOverlaySettings,
  openNativeUsageSettings,
  openNativeNotificationSettings,
  type NativeReelsStats,
} from "@/lib/native-reels";
import { cn } from "@/lib/utils";

interface Props {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function SmartPermissionsModal({ forceOpen = false, onClose }: Props) {
  const lang = useApp((s) => s.lang);
  const isBn = lang === "bn";

  const [stats, setStats] = useState<NativeReelsStats>(() => getNativeReelsStats());
  const [isOpen, setIsOpen] = useState(false);

  const checkStatus = async () => {
    const current = await refreshNativeReelsStats();
    setStats(current);

    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // Check if user previously dismissed this prompt
    const isDismissed = typeof window !== "undefined" && localStorage.getItem("noor_permissions_dismissed") === "true";

    // If accessibility is already active, don't nag user
    if (current.hasAccessibility) {
      setIsOpen(false);
      return;
    }

    // Only auto-pop up on native app launch if critical accessibility is missing AND not dismissed
    if (isNativeAndroid() && !current.hasAccessibility && !isDismissed) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    checkStatus();

    const onFocus = () => checkStatus();
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkStatus();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = setInterval(checkStatus, 3000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
    };
  }, [forceOpen]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("noor_permissions_dismissed", "true");
    }
    setIsOpen(false);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="glass my-auto flex w-full max-w-md flex-col gap-4 rounded-3xl border border-primary/40 p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
              <ShieldAlert className="size-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {isBn ? "প্রয়োজনীয় সেটিংস চেক" : "Required Settings Check"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isBn
                  ? "রিলস ও এলার্ম চালু রাখতে নিচের সেটিংসগুলো অন করুন"
                  : "Enable these permissions for accurate reels & alerts"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Permission List */}
        <div className="flex flex-col gap-2.5">
          {/* 1. Accessibility Service */}
          <div
            className={cn(
              "flex items-center justify-between p-3 rounded-2xl border transition",
              stats.hasAccessibility
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-primary/30 bg-primary/5 hover:border-primary/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "grid size-9 place-items-center rounded-xl",
                  stats.hasAccessibility ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/20 text-primary"
                )}
              >
                <Smartphone className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {isBn ? "১. রিলস ট্র্যাকার (Accessibility)" : "1. Reels Tracker (Accessibility)"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.hasAccessibility
                    ? isBn
                      ? "সক্রিয় রয়েছে ✓"
                      : "Active & running ✓"
                    : isBn
                      ? "Downloaded apps থেকে Noor Habit অন করুন"
                      : "Turn ON from Downloaded apps"}
                </p>
              </div>
            </div>

            {stats.hasAccessibility ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <CheckCircle2 className="size-4" />
                {isBn ? "অন" : "ON"}
              </span>
            ) : (
              <button
                type="button"
                onClick={openNativeAccessibilitySettings}
                className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:opacity-90 active:scale-95 transition"
              >
                <span>{isBn ? "চালু করুন" : "Enable"}</span>
                <ExternalLink className="size-3" />
              </button>
            )}
          </div>

          {/* 2. Usage Stats (SOT) */}
          <div
            className={cn(
              "flex items-center justify-between p-3 rounded-2xl border transition",
              stats.hasUsage
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-border/60 bg-secondary/30 hover:border-primary/40"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "grid size-9 place-items-center rounded-xl",
                  stats.hasUsage ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary text-foreground"
                )}
              >
                <Clock className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {isBn ? "২. স্ক্রিন অন টাইম (Usage Access)" : "2. Screen On Time (Usage)"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.hasUsage
                    ? isBn
                      ? "সক্রিয় রয়েছে ✓"
                      : "Active ✓"
                    : isBn
                      ? "সঠিক স্ক্রিন টাইম ও অ্যাপের বিবরণ দেখতে অন করুন"
                      : "For accurate SOT & app breakdown"}
                </p>
              </div>
            </div>

            {stats.hasUsage ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <CheckCircle2 className="size-4" />
                {isBn ? "অন" : "ON"}
              </span>
            ) : (
              <button
                type="button"
                onClick={openNativeUsageSettings}
                className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                <span>{isBn ? "অন করুন" : "Enable"}</span>
                <ExternalLink className="size-3" />
              </button>
            )}
          </div>

          {/* 3. Floating Overlay */}
          <div
            className={cn(
              "flex items-center justify-between p-3 rounded-2xl border transition",
              stats.hasOverlay
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-border/60 bg-secondary/30 hover:border-primary/40"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "grid size-9 place-items-center rounded-xl",
                  stats.hasOverlay ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary text-foreground"
                )}
              >
                <Layers className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {isBn ? "৩. ফ্লোটিং রিলস কাউন্টার (Overlay)" : "3. Floating Reels Counter"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.hasOverlay
                    ? isBn
                      ? "সক্রিয় রয়েছে ✓"
                      : "Active ✓"
                    : isBn
                      ? "রিলসের পাশে ছোট কাউন্টার ডিসপ্লে (ঐচ্ছিক)"
                      : "Display counter over reels (Optional)"}
                </p>
              </div>
            </div>

            {stats.hasOverlay ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <CheckCircle2 className="size-4" />
                {isBn ? "অন" : "ON"}
              </span>
            ) : (
              <button
                type="button"
                onClick={openNativeOverlaySettings}
                className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                <span>{isBn ? "অন করুন" : "Enable"}</span>
                <ExternalLink className="size-3" />
              </button>
            )}
          </div>

          {/* 4. Notifications */}
          <div
            className={cn(
              "flex items-center justify-between p-3 rounded-2xl border transition",
              stats.hasNotifications
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-border/60 bg-secondary/30 hover:border-primary/40"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "grid size-9 place-items-center rounded-xl",
                  stats.hasNotifications ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary text-foreground"
                )}
              >
                <Bell className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {isBn ? "৪. নামাজ ও রিলস এলার্ম (Notification)" : "4. Prayer & Reels Alerts"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.hasNotifications
                    ? isBn
                      ? "অন রয়েছে ✓"
                      : "Enabled ✓"
                    : isBn
                      ? "সময়মতো এলার্ম পেতে নোটিফিকেশন অন করুন"
                      : "For on-time alarms & alerts"}
                </p>
              </div>
            </div>

            {stats.hasNotifications ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <CheckCircle2 className="size-4" />
                {isBn ? "অন" : "ON"}
              </span>
            ) : (
              <button
                type="button"
                onClick={openNativeNotificationSettings}
                className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                <span>{isBn ? "অন করুন" : "Enable"}</span>
                <ExternalLink className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 rounded-2xl bg-secondary py-3 text-xs font-bold text-foreground hover:bg-muted transition"
          >
            {isBn ? "পরে করব / বন্ধ করুন" : "Dismiss / Remind Later"}
          </button>
          <button
            type="button"
            onClick={checkStatus}
            className="rounded-2xl bg-primary px-4 py-3 text-xs font-bold text-primary-foreground shadow hover:opacity-90 active:scale-95 transition"
          >
            {isBn ? "রিফ্রেশ" : "Refresh"}
          </button>
        </div>
      </div>
    </div>
  );
}
