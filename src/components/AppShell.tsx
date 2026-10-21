import { InteractiveOnboarding } from "@/components/InteractiveOnboarding";
import { SmartPermissionsModal } from "@/components/SmartPermissionsModal";
import { StatusBar } from "@capacitor/status-bar";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, ListChecks, Moon, BarChart3, Bot, Users, Settings, Clock } from "lucide-react";
import { useApp, today, PRAYERS, type Profile } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { showNow, startAlarmSound, stopAlarmSound, syncNativeSchedules, isNative, playTone } from "@/lib/notify";
import { supabase, syncStatsToCloud } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", icon: Home, k: "home" },
  { to: "/plan", icon: ListChecks, k: "plan" },
  { to: "/prayer", icon: Moon, k: "prayer" },
  { to: "/analytics", icon: BarChart3, k: "analytics" },
  { to: "/ai", icon: Bot, k: "ai" },
  { to: "/friends", icon: Users, k: "friends" },
  { to: "/settings", icon: Settings, k: "settings" },
] as const;

function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

function Onboarding() {
  const t = useT();
  const setProfile = useApp((s) => s.setProfile);
  const [p, setP] = useState<Profile>({ name: "", birth: "", goal: "" });
  const lang = useApp((s) => s.lang);
  const setLang = useApp((s) => s.setLang);
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <div className="flex justify-end">
        <button className="glass px-3 py-1 text-sm rounded-lg" onClick={() => setLang(lang === "bn" ? "en" : "bn")}>
          {lang === "bn" ? "English" : "বাংলা"}
        </button>
      </div>
      <div>
        <h1 className="text-4xl font-bold">{t("appName")}</h1>
        <p className="mt-2 text-muted-foreground">{t("welcome")}</p>
      </div>
      <form
        className="glass flex flex-col gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (p.name.trim()) setProfile(p);
        }}
      >
        <Field label={t("name")}>
          <input required value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} className="input" />
        </Field>
        <Field label={t("birth")}>
          <input type="date" value={p.birth} onChange={(e) => setP({ ...p, birth: e.target.value })} className="input" />
        </Field>
        <Field label={t("mainGoal")}>
          <input value={p.goal} onChange={(e) => setP({ ...p, goal: e.target.value })} className="input" />
        </Field>
        <button className="rounded-xl bg-primary py-3 font-semibold text-primary-foreground">{t("start")}</button>
      </form>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

interface Alarm {
  id: string;
  title: string;
  prayer?: (typeof PRAYERS)[number] | undefined;
}

function useScheduler(onAggressive: (a: Alarm) => void) {
  const t = useT();
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    const tick = () => {
      const s = useApp.getState();
      const d = new Date();
      const nowMin = d.getHours() * 60 + d.getMinutes();
      const day = today(d);

      // Strict rule: only items that HAVE a non-empty time
      const entries = [
        ...s.prayers
          .filter((p) => p.time && p.time.trim() !== "")
          .map((p) => ({
            id: "p-" + p.key,
            title: `${t("timeFor")}: ${t(p.key)}`,
            time: p.time,
            mode: p.notify,
            done: (p.doneDates || []).includes(day),
            prayer: p.key,
          })),
        ...s.items
          .filter((i) => i.time && i.time.trim() !== "")
          .map((i) => ({
            id: i.id,
            title: i.title,
            time: i.time,
            mode: i.notify,
            done: (i.doneDates || []).includes(day),
            prayer: undefined,
          })),
      ];

      if (!s.notificationsEnabled) return;

      for (const e of entries) {
        if (e.mode === "off" || !e.time || e.done) continue;
        const [h = 0, m = 0] = e.time.split(":").map(Number);
        const itemMin = h * 60 + m;
        const diff = nowMin - itemMin;
        if (diff !== 0) continue;

        const key = `${e.id}-${day}`;
        if (fired.current.has(key)) continue;
        fired.current.add(key);

        // Add to in-app notification center
        s.addAppNotification(
          e.prayer ? "prayer" : "reminder",
          e.title,
          s.lang === "bn" ? "নির্ধারিত সময় উপস্থিত হয়েছে।" : "Scheduled time has arrived."
        );

        showNow(e.title, "⏰");
        playTone(s.remindTone);

        if (e.mode === "aggressive") {
          onAggressive({ id: e.id, title: e.title, prayer: e.prayer });
        }
      }
    };

    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [t, onAggressive]);

  // native schedules
  const prayers = useApp((s) => s.prayers);
  const items = useApp((s) => s.items);
  useEffect(() => {
    if (!isNative()) return;
    const day = today();
    const notifsOn = useApp.getState().notificationsEnabled;
    syncNativeSchedules(
      prayers,
      items,
      (k) => t(k as never),
      (id) =>
        id.startsWith("p-")
          ? !!(prayers.find((p) => "p-" + p.key === id)?.doneDates || []).includes(day)
          : !!(items.find((i) => i.id === id)?.doneDates || []).includes(day),
      notifsOn
    ).catch(() => {});
  }, [prayers, items, t]);

  // Native notification action clicks (Mark done / Snooze directly from notification shade)
  useEffect(() => {
    if (!isNative()) return;
    let removeSub: (() => void) | undefined;
    (async () => {
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const handle = await LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
          const extra = (action.notification.extra as any) || {};
          const currentDay = today();
          if (action.actionId === "mark_done") {
            if (extra.prayerKey) {
              useApp.getState().markPrayer(extra.prayerKey, currentDay, true);
            } else if (extra.itemId) {
              useApp.getState().toggleItem(extra.itemId, currentDay);
            }
          } else if (action.actionId === "snooze") {
            const snoozeTarget = new Date(Date.now() + 15 * 60 * 1000);
            LocalNotifications.schedule({
              notifications: [
                {
                  id: Math.floor(Math.random() * 100000) + 60000,
                  title: `⏰ স্নুজ রিমাইন্ডার: ${action.notification.title}`,
                  body: action.notification.body,
                  schedule: { at: snoozeTarget, allowWhileIdle: true },
                  sound: "beep.wav",
                  channelId: action.notification.channelId || "prayer_channel_v2",
                  actionTypeId: action.notification.actionTypeId,
                  extra: action.notification.extra,
                },
              ],
            }).catch(() => {});
          }
        });
        removeSub = () => handle.remove();
      } catch (err) {
        console.warn("Could not register localNotificationActionPerformed listener:", err);
      }
    })();
    return () => {
      if (removeSub) removeSub();
    };
  }, []);
}

/** ELEGANT APP SPLASH ANIMATION */
function SplashAnimation({ show, onFinish }: { show: boolean; onFinish: () => void }) {
  const [fading, setFading] = useState(false);
  const lang = useApp((s) => s.lang);

  useEffect(() => {
    if (show) {
      setFading(false);
      const timer1 = setTimeout(() => setFading(true), 1200);
      const timer2 = setTimeout(() => {
        onFinish();
      }, 1500);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [show, onFinish]);

  if (!show) return null;

  return (
    <div
      onClick={onFinish}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-300 cursor-pointer",
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      <div className="relative flex flex-col items-center">
        {/* Glowing Aura Ring */}
        <div className="absolute -inset-4 rounded-full bg-primary/20 blur-xl animate-pulse" />

        {/* Crescent Moon Container */}
        <div className="relative grid size-20 place-items-center rounded-3xl bg-primary/10 border border-primary/30 shadow-2xl animate-in zoom-in-75 duration-400">
          <Moon className="size-10 fill-primary text-primary transition-transform duration-700" />
        </div>

        {/* Title & Slogan */}
        <h1 className="mt-4 text-2xl font-black tracking-wide text-foreground">
          Noor Habit
        </h1>
        <p className="mt-1 text-xs font-medium text-primary tracking-widest uppercase">
          {lang === "bn" ? "ইসলামিক লাইফস্টাইল ও অভ্যাস ট্র্যাকার" : "Islamic Lifestyle & Habit Tracker"}
        </p>

        {/* Subtle indicator */}
        <div className="mt-5 flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-primary animate-ping" />
          <span className="text-[11px] text-muted-foreground">
            {lang === "bn" ? "প্রস্তুত হচ্ছে..." : "Loading..."}
          </span>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const profile = useApp((s) => s.profile);
  const theme = useApp((s) => s.theme);
  const lang = useApp((s) => s.lang);
  const t = useT();
  const loc = useLocation();
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const markPrayer = useApp((s) => s.markPrayer);
  const toggleItem = useApp((s) => s.toggleItem);
  const earlyCheckWarning = useApp((s) => s.earlyCheckWarning);
  const setEarlyCheckWarning = useApp((s) => s.setEarlyCheckWarning);

  // App Startup Splash (only once on launch)
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
    document.documentElement.lang = lang;
  }, [theme, lang]);

  // Set native status bar overlay on mount
  useEffect(() => {
    if (isNative()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    }
  }, []);

  const onAggr = useRef((a: Alarm) => {
    setAlarm(a);
    startAlarmSound();
  }).current;
  useScheduler(onAggr);

  // Auto sync to cloud when state changes
  const prayers = useApp((s) => s.prayers);
  const items = useApp((s) => s.items);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        let st = 0;
        const d = new Date();
        for (let i = 0; i < 60; i++) {
          const prev = new Date();
          prev.setDate(d.getDate() - (i + 1));
          const z = new Date(prev.getTime() - prev.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
          if (prayers.every((p) => (p.doneDates || []).includes(z))) st++;
          else break;
        }
        const todayStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        if (prayers.every((p) => (p.doneDates || []).includes(todayStr))) st++;

        syncStatsToCloud(data.user, profile?.name || "", prayers, items, st);
      }
    });
  }, [prayers, items, profile]);

  if (!hydrated) return null;
  const onboardingCompleted = typeof window !== "undefined" && localStorage.getItem("noor_onboarding_completed") === "true";
  if (!profile || !onboardingCompleted) {
    return <InteractiveOnboarding onComplete={() => {}} isInitial={true} />;
  }

  const confirm = async () => {
    if (alarm) {
      if (alarm.prayer) markPrayer(alarm.prayer, today(), true);
      else toggleItem(alarm.id);
    }
    stopAlarmSound();
    setAlarm(null);
    if (isNative()) {
      const s = useApp.getState();
      await syncNativeSchedules(s.prayers, s.items, (k) => t(k as never), () => true).catch(() => {});
    }
  };

  const isAiRoute = loc.pathname === "/ai";

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl md:gap-4 md:p-4">
      {/* APP SPLASH ANIMATION */}
      <SplashAnimation show={showSplash} onFinish={() => setShowSplash(false)} />

      {/* SIDEBAR NAVIGATION (DESKTOP) */}
      <nav className="glass sticky top-4 hidden h-[calc(100dvh-2rem)] w-20 flex-col items-center gap-2 py-4 md:flex">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            title={t(n.k)}
            className={cn(
              "grid size-11 place-items-center rounded-xl text-muted-foreground transition hover:text-foreground",
              loc.pathname === n.to && "glow-on text-primary"
            )}
          >
            <n.icon className="size-5" />
          </Link>
        ))}
      </nav>

      {/* MAIN CONTENT AREA */}
      <main
        className={cn(
          "flex-1 px-4 pt-[max(3rem,calc(env(safe-area-inset-top,0px)+1.5rem))] md:pt-4 md:pb-8 w-full",
          isAiRoute ? "pb-20 h-[100dvh] overflow-hidden flex flex-col" : "pb-36"
        )}
      >
        {children}
      </main>

      {/* BOTTOM NAVIGATION (MOBILE) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around px-2 pt-2.5 border-t border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl md:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 14px))" }}
      >
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] text-muted-foreground transition",
              loc.pathname === n.to && "glow-on text-primary"
            )}
          >
            <n.icon className="size-5" />
            {t(n.k)}
          </Link>
        ))}
      </nav>

      {/* AGGRESSIVE ALARM MODAL */}
      {alarm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-6 backdrop-blur-xl animate-in fade-in">
          <div className="glass flex w-full max-w-sm flex-col items-center gap-5 p-8 text-center shadow-2xl">
            <div className="glow-on grid size-20 animate-pulse place-items-center rounded-full text-4xl">🔔</div>
            <h2 className="text-2xl font-bold">{alarm.title}</h2>
            <button
              onClick={confirm}
              className="w-full rounded-xl bg-primary py-4 text-lg font-semibold text-primary-foreground shadow-lg hover:opacity-90 transition"
            >
              {alarm.prayer ? t("iPrayed") : "✓"}
            </button>
          </div>
        </div>
      )}

      {/* SMART SYSTEM PERMISSIONS CHECKER MODAL */}
      <SmartPermissionsModal />

      {/* EARLY CHECK TIME RESTRICTION MODAL */}
      {earlyCheckWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl p-6 text-center shadow-2xl border border-primary/30">
            <div className="relative grid size-16 place-items-center rounded-2xl bg-amber-500/15 text-amber-500 shadow-inner">
              <Clock className="size-8 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-foreground">
                {lang === "bn" ? "সময়ের পূর্বে চেক করা যাবে না" : "Cannot Check Before Time"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed px-2">
                {earlyCheckWarning.message}
              </p>
            </div>
            <div className="rounded-xl bg-secondary/60 px-3 py-1.5 border border-border/40 text-xs font-medium text-foreground">
              ⏰ {lang === "bn" ? "নির্ধারিত সময়:" : "Scheduled Time:"}{" "}
              <span className="text-primary font-bold">{earlyCheckWarning.scheduledTime}</span>
            </div>
            <button
              type="button"
              onClick={() => setEarlyCheckWarning(null)}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-md hover:opacity-90 transition active:scale-[0.98]"
            >
              {lang === "bn" ? "ঠিক আছে, বুঝতে পেরেছি" : "Got it"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
