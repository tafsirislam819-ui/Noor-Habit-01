import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Check,
  Bell,
  CheckCircle2,
  Target,
  ListTodo,
  Sparkles,
  ChevronRight,
  Flame,
  X,
  Clock,
  Smartphone,
  Eye,
  ShieldCheck,
  Play,
  HelpCircle,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { SmartPermissionsModal } from "@/components/SmartPermissionsModal";
import {
  useApp,
  today,
  formatAppTime,
  type PrayerKey,
  type Goal,
} from "@/lib/store";
import { useT } from "@/lib/i18n";
import { NotifyToggle } from "@/components/NotifyToggle";
import { requestPermission } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  getNativeReelsStats,
  triggerMockReel,
  openNativeAccessibilitySettings,
  openNativeOverlaySettings,
  openNativeUsageSettings,
  type NativeReelsStats,
} from "@/lib/native-reels";
import { InteractiveOnboarding } from "@/components/InteractiveOnboarding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Noor Habit — Daily Prayers, Goals & Habits" },
      { name: "description", content: "Track namaz, actionable goals, daily habits and to-do lists." },
      { property: "og:title", content: "Noor Habit — Daily Prayers, Goals & Habits" },
      { property: "og:description", content: "Track namaz, actionable goals, daily habits and to-do lists." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const t = useT();
  const {
    profile,
    items,
    prayers,
    goals,
    todos,
    markPrayer,
    toggleItem,
    setItemNotify,
    toggleGoalSubTask,
    toggleTodo,
    appNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    timeFormat,
    lang,
  } = useApp();

  const d = today();
  const isBn = lang === "bn";
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showPermsModal, setShowPermsModal] = useState(false);

  // Native Reels and SOT Tracker State
  const [reelsStats, setReelsStats] = useState<NativeReelsStats>(() => getNativeReelsStats());

  useEffect(() => {
    const updateStats = () => {
      setReelsStats(getNativeReelsStats());
    };
    updateStats();
    const interval = setInterval(updateStats, 2000);
    window.addEventListener("focus", updateStats);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", updateStats);
    };
  }, []);

  const handleMockReel = () => {
    triggerMockReel();
    setTimeout(() => {
      setReelsStats(getNativeReelsStats());
    }, 100);
  };

  // Daily Calculations
  const habits = useMemo(() => (items || []).filter((i) => i.kind === "habit"), [items]);
  const safePrayers = prayers || [];
  const safeGoals = goals || [];
  const safeTodos = todos || [];
  const safeAppNotifications = (appNotifications || []).filter((n) => n && typeof n.title === "string" && n.title.trim() !== "");

  const prayedCount = safePrayers.filter((p) => (p?.doneDates || []).includes(d)).length;
  const habitsCount = habits.filter((h) => (h?.doneDates || []).includes(d)).length;

  // Subtasks across goals
  const allGoalSubTasks = useMemo(() => {
    return safeGoals.flatMap((g) => (g?.subTasks || []).map((st) => ({ ...st, goalId: g.id, goalTitle: g.title })));
  }, [safeGoals]);
  const goalSubTasksDoneCount = allGoalSubTasks.filter((st) => (st?.doneDates || []).includes(d)).length;

  const totalActionsToday = safePrayers.length + habits.length + allGoalSubTasks.length;
  const doneActionsToday = prayedCount + habitsCount + goalSubTasksDoneCount;
  const pct = totalActionsToday ? Math.round((doneActionsToday / totalActionsToday) * 100) : 0;

  const unreadNotifs = useMemo(
    () => safeAppNotifications.filter((n) => !n.read).length,
    [safeAppNotifications]
  );

  return (
    <div className="flex flex-col gap-5">
      {/* HEADER WITH NOTIFICATION BELL & TUTORIAL BUTTON */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{t("hello")} 👋</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {profile?.name || (lang === "bn" ? "প্রিয় মুসলিম ভাই/বোন" : "Welcome")}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* TUTORIAL / DUMMY TEST BUTTON */}
          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-secondary/80 hover:bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition shadow-sm"
            title={isBn ? "অ্যাপ টিউটোরিয়াল ও ডামি টেস্ট" : "Tutorial & Demo Test"}
          >
            <HelpCircle className="size-4 text-primary" />
            <span className="hidden sm:inline">{isBn ? "টিউটোরিয়াল" : "Tutorial"}</span>
          </button>

          {/* NOTIFICATION BELL */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="relative grid size-10 place-items-center rounded-2xl bg-secondary/80 hover:bg-secondary text-foreground transition shadow-sm"
              title={t("notifications")}
            >
              <Bell className="size-5" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse shadow">
                  {unreadNotifs > 9 ? "9+" : unreadNotifs}
                </span>
              )}
            </button>

            {/* NOTIFICATION POPOVER */}
            {showNotifPanel && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]" 
                  onClick={() => setShowNotifPanel(false)} 
                />
                <div className="absolute right-0 top-12 z-50 w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl bg-card/95 backdrop-blur-2xl p-4 shadow-2xl border border-border/80 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Bell className="size-4 text-primary" />
                      <h3 className="text-sm font-bold">{t("notifications")}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadNotifs > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-[11px] text-primary hover:underline font-medium"
                        >
                          {lang === "bn" ? "সব পড়ুন" : "Mark all read"}
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifPanel(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="no-scrollbar max-h-72 space-y-2 overflow-y-auto">
                    {safeAppNotifications.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        {t("noNotifs")}
                      </p>
                    ) : (
                      safeAppNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markNotificationRead(notif.id)}
                          className={cn(
                            "rounded-xl p-2.5 transition cursor-pointer text-xs",
                            notif.read ? "bg-muted/20 opacity-70" : "bg-primary/10 border border-primary/30"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">{notif.title}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{notif.createdAt}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                            {notif.body}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {safeAppNotifications.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/30 text-center">
                      <button
                        onClick={clearNotifications}
                        className="text-[10px] text-muted-foreground hover:text-destructive transition"
                      >
                        {lang === "bn" ? "সকল নোটিফিকেশন মুছুন" : "Clear all notifications"}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* TODAY'S OVERALL PROGRESS CARD */}
      <section className="glass flex items-center gap-5 p-5">
        <div className="relative grid size-24 place-items-center shrink-0">
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${pct * 0.974} 100`}
            />
          </svg>
          <span className="text-2xl font-black">{pct}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-medium">{t("todayProgress")}</p>
          <div className="mt-1.5 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-lg bg-secondary px-2.5 py-1">
              🕌 {prayedCount}/৫ {t("prayer")}
            </span>
            <span className="rounded-lg bg-secondary px-2.5 py-1">
              ✨ {habitsCount}/{habits.length} {t("habits")}
            </span>
            {allGoalSubTasks.length > 0 && (
              <span className="rounded-lg bg-secondary px-2.5 py-1">
                🎯 {goalSubTasksDoneCount}/{allGoalSubTasks.length} {t("goals")}
              </span>
            )}
          </div>
          {profile?.goal && (
            <p className="mt-2 text-xs text-primary font-medium truncate">
              🎯 {profile.goal}
            </p>
          )}
        </div>
      </section>

      {/* SMART REELS & DIGITAL DETOX CARD */}
      <section className="glass relative overflow-hidden p-4">
        {(!reelsStats.hasAccessibility || !reelsStats.hasOverlay) && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl bg-amber-500/15 border border-amber-500/40 p-3 shadow-sm animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground">
                  {isBn ? "রিলস ও ভাসমান কাউন্টার চালু করতে অনুমতি প্রয়োজন" : "Permissions required for Reels Tracker"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isBn ? "সিস্টেম সেটিংসে গিয়ে পারমিশন অন করুন" : "Enable Accessibility & Overlay permissions"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPermsModal(true)}
              className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-black shadow hover:bg-amber-400 active:scale-95 transition shrink-0"
            >
              {isBn ? "অন করুন ↗" : "Enable ↗"}
            </button>
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-xl bg-primary/20 text-primary">
              <Smartphone className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-foreground">
                  {isBn ? "স্মার্ট রিলস ও ডিজিটাল ডিটক্স" : "Smart Reels & Digital Detox"}
                </h2>
                <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                  3s Dwell
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {isBn ? "ইউটিউব শর্টস, ইনস্টাগ্রাম ও ফেসবুক রিলস" : "YouTube Shorts, Instagram & FB Reels"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMockReel}
            className="flex items-center gap-1 rounded-lg bg-secondary/80 hover:bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground transition active:scale-95"
            title={isBn ? "টেস্ট কাউন্ট যোগ করুন" : "Add test reel"}
          >
            <Play className="size-3 text-primary" />
            <span>{isBn ? "রিলস টেস্ট (+১)" : "Test (+1)"}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {/* REELS COUNT */}
          <div className="rounded-xl border border-border/70 bg-secondary/40 p-3">
            <span className="text-[10px] font-medium text-muted-foreground">
              {isBn ? "আজকের রিলস সংখ্যা" : "Reels Watched Today"}
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground font-mono">
                {reelsStats.reelsToday}
              </span>
              <span className="text-xs text-muted-foreground">{isBn ? "টি" : "reels"}</span>
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground">
              {isBn ? "৩ সেকেন্ড বা তার বেশি সময় দেখলে কাউন্ট" : "Counts if viewed for 3s+"}
            </p>
          </div>

          {/* FLOATING OVERLAY STATUS */}
          <div className="rounded-xl border border-border/70 bg-secondary/40 p-3">
            <span className="text-[10px] font-medium text-muted-foreground">
              {isBn ? "স্ক্রিনে ভাসমান কাউন্টার" : "Floating Overlay Pill"}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground">
                {reelsStats.hasOverlay ? (isBn ? "সক্রিয় ✓" : "Active ✓") : (isBn ? "অনুমতি দরকার" : "Permission Needed")}
              </span>
            </div>
            <button
              type="button"
              onClick={openNativeOverlaySettings}
              className="mt-1 text-[10px] text-primary hover:underline"
            >
              {isBn ? "ওভারলে সেটিংস ↗" : "Overlay Settings ↗"}
            </button>
          </div>

          {/* SCREEN ON TIME & ACCESSIBILITY */}
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-border/70 bg-secondary/40 p-3">
            <span className="text-[10px] font-medium text-muted-foreground">
              {isBn ? "অ্যাক্সেসিবিলিটি সার্ভিস" : "Accessibility Service"}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground">
                {reelsStats.hasAccessibility ? (isBn ? "ট্র্যাকিং অন ✓" : "Tracking On ✓") : (isBn ? "চালু করুন" : "Enable Service")}
              </span>
            </div>
            <button
              type="button"
              onClick={openNativeAccessibilitySettings}
              className="mt-1 text-[10px] text-primary hover:underline"
            >
              {isBn ? "সার্ভিস সেটিংস ↗" : "Service Settings ↗"}
            </button>
          </div>
        </div>
      </section>

      {/* 1. 5 DAILY PRAYERS QUICK TRACKER */}
      <section className="glass p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-base">🕌</span>
            <h2 className="font-bold text-sm">{t("prayer")}</h2>
          </div>
          <Link to="/prayer" className="text-xs text-primary hover:underline flex items-center gap-0.5">
            {lang === "bn" ? "বিস্তারিত" : "Details"} <ChevronRight className="size-3" />
          </Link>
        </div>

        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {safePrayers.map((p) => {
            const ok = (p?.doneDates || []).includes(d);
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => markPrayer(p.key)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-3 px-1 text-xs transition select-none",
                  ok
                    ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 ring-1 ring-primary/40"
                    : "bg-secondary/70 hover:bg-secondary text-foreground"
                )}
              >
                {ok ? <Check className="size-4 stroke-[3]" /> : <span className="size-4 opacity-40">○</span>}
                <span className="truncate">{t(p.key)}</span>
                <span className="text-[10px] opacity-85 font-mono">
                  {formatAppTime(p.time, timeFormat, lang)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. GOALS & LINKED DAILY TASKS */}
      <section className="glass p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Target className="size-4 text-primary" />
            <h2 className="font-bold text-sm">{t("goals")} ({goals.length})</h2>
          </div>
          <Link to="/plan" className="text-xs text-primary hover:underline flex items-center gap-0.5">
            + {t("add")} <ChevronRight className="size-3" />
          </Link>
        </div>

        {goals.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">
            {lang === "bn" ? "কোনো লক্ষ্য যুক্ত করা হয়নি।" : "No goals created yet."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {goals.map((g) => {
              const subTasksTodayDone = g.subTasks.filter((st) => st.doneDates.includes(d)).length;
              return (
                <div key={g.id} className="rounded-xl border border-primary/20 bg-secondary/30 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-foreground">{g.title}</h3>
                      {g.deadline && (
                        <span className="text-[10px] text-muted-foreground">
                          {lang === "bn" ? `টার্গেট: ${g.deadline}` : `Target: ${g.deadline}`}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-primary">
                      {subTasksTodayDone}/{g.subTasks.length} {lang === "bn" ? "আজকের টাস্ক" : "tasks today"}
                    </span>
                  </div>

                  {/* Daily action tasks under this goal */}
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    {g.subTasks.map((st) => {
                      const isDone = (st?.doneDates || []).includes(d);
                      return (
                        <div
                          key={st.id}
                          onClick={() => toggleGoalSubTask(g.id, st.id)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg p-2.5 text-xs transition cursor-pointer border",
                            isDone
                              ? "bg-primary/10 border-primary/30 text-foreground"
                              : "bg-card/40 hover:bg-card border-transparent"
                          )}
                        >
                          <div
                            className={cn(
                              "grid size-5 shrink-0 place-items-center rounded-full border transition",
                              isDone
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/60"
                            )}
                          >
                            {isDone && <Check className="size-3.5 stroke-[3]" />}
                          </div>
                          <span className={cn("truncate flex-1 text-xs font-semibold text-foreground")}>
                            {st.title}
                          </span>
                          {isDone ? (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                              ✓ {isBn ? "সম্পন্ন" : "Done"}
                            </span>
                          ) : st.time ? (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {formatAppTime(st.time, timeFormat, lang)}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. DAILY HABITS */}
      <section className="glass p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" />
            <h2 className="font-bold text-sm">{t("habits")} ({habits.length})</h2>
          </div>
          <Link to="/plan" className="text-xs text-primary hover:underline flex items-center gap-0.5">
            + {t("add")} <ChevronRight className="size-3" />
          </Link>
        </div>

        {habits.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {habits.map((i) => {
              const ok = i.doneDates.includes(d);
              return (
                <li
                  key={i.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl p-2.5 border transition",
                    ok
                      ? "bg-primary/10 border-primary/30 text-foreground"
                      : "bg-secondary/50 border-transparent text-foreground"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(i.id)}
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border transition",
                      ok
                        ? "border-transparent bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                        : "border-border/80"
                    )}
                  >
                    {ok && <Check className="size-3.5 stroke-[3]" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs truncate font-semibold text-foreground")}>
                      {i.title}
                    </p>
                    {i.time && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {formatAppTime(i.time, timeFormat, lang)}
                      </p>
                    )}
                  </div>
                  {ok && (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                      ✓ {isBn ? "সম্পন্ন" : "Done"}
                    </span>
                  )}
                  <NotifyToggle
                    mode={i.notify}
                    hasTime={!!i.time.trim()}
                    onChange={(m) => {
                      setItemNotify(i.id, m);
                      if (m !== "off") requestPermission();
                    }}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 4. TODAY'S TO-DO LIST (ONE-TIME TASKS) */}
      <section className="glass p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ListTodo className="size-4 text-primary" />
            <h2 className="font-bold text-sm">{t("todoList")}</h2>
          </div>
          <Link to="/plan" className="text-xs text-primary hover:underline flex items-center gap-0.5">
            + {t("add")} <ChevronRight className="size-3" />
          </Link>
        </div>

        {safeTodos.filter((td) => !td.completed).length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">
            {lang === "bn" ? "কোনো পেন্ডিং টু-ডু নেই।" : "No pending to-do items."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {safeTodos
              .filter((td) => !td.completed)
              .map((td) => (
                <div
                  key={td.id}
                  onClick={() => toggleTodo(td.id)}
                  className="flex items-center gap-3 rounded-xl bg-secondary/50 p-2.5 transition cursor-pointer hover:bg-secondary/70 border border-transparent"
                >
                  <div className="grid size-6 shrink-0 place-items-center rounded-full border border-muted-foreground/60">
                    {td.completed && <Check className="size-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate text-foreground">{td.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      {td.dueDate && <span>📅 {td.dueDate}</span>}
                      {td.time && <span>⏰ {formatAppTime(td.time, timeFormat, lang)}</span>}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* INTERACTIVE ONBOARDING / TUTORIAL MODAL */}
      <SmartPermissionsModal forceOpen={showPermsModal} onClose={() => setShowPermsModal(false)} />

      {showTutorial && (
        <InteractiveOnboarding
          onComplete={() => setShowTutorial(false)}
          isInitial={false}
        />
      )}
    </div>
  );
}
