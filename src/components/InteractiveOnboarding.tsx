import { useEffect, useState } from "react";
import {
  Sparkles,
  Check,
  Bell,
  Smartphone,
  Eye,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  HeartHandshake,
  ExternalLink,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useApp, type Profile } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  getNativeReelsStats,
  openNativeAccessibilitySettings,
  openNativeOverlaySettings,
  openNativeUsageSettings,
  openNativeNotificationSettings,
  type NativeReelsStats,
} from "@/lib/native-reels";

interface Props {
  onComplete: () => void;
  isInitial?: boolean;
}

export function InteractiveOnboarding({ onComplete, isInitial = false }: Props) {
  const t = useT();
  const { profile, setProfile, lang, setLang } = useApp();
  const isBn = lang === "bn";

  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState(profile?.name || "");
  const [goal, setGoal] = useState(profile?.goal || (isBn ? "৫ ওয়াক্ত নামাজ ও ডিজিটাল ডিটক্স" : "5 daily prayers & digital detox"));

  // Interactive Dummy Test State
  const [dummyPrayers, setDummyPrayers] = useState<Record<string, boolean>>({
    fajr: true,
    dhuhr: true,
    asr: false,
    maghrib: false,
    isha: false,
  });
  const [dummyHabitDone, setDummyHabitDone] = useState(false);
  const [testSuccessNotice, setTestSuccessNotice] = useState(false);

  // Live Native Permission Stats
  const [nativeStats, setNativeStats] = useState<NativeReelsStats>(() => getNativeReelsStats());

  const refreshPerms = () => {
    setNativeStats(getNativeReelsStats());
  };

  useEffect(() => {
    refreshPerms();
    const onFocus = () => refreshPerms();
    const onVis = () => {
      if (document.visibilityState === "visible") refreshPerms();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    const iv = setInterval(refreshPerms, 2000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(iv);
    };
  }, []);

  const totalDummyActions = 6;
  const dummyDoneCount =
    Object.values(dummyPrayers).filter(Boolean).length + (dummyHabitDone ? 1 : 0);
  const dummyProgressPct = Math.round((dummyDoneCount / totalDummyActions) * 100);

  const handleToggleDummyPrayer = (key: string) => {
    setDummyPrayers((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      setTestSuccessNotice(true);
      return next;
    });
  };

  const handleToggleDummyHabit = () => {
    setDummyHabitDone((prev) => {
      setTestSuccessNotice(true);
      return !prev;
    });
  };

  const handleFinish = () => {
    const finalProfile: Profile = {
      name: name.trim() || (isBn ? "মুসাফির" : "Seeker"),
      birth: profile?.birth || "",
      goal: goal.trim(),
    };
    setProfile(finalProfile);
    localStorage.setItem("noor_onboarding_completed", "true");
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-2xl overflow-y-auto">
      <div className="glass my-auto flex w-full max-w-lg flex-col gap-5 p-5 sm:p-7 shadow-2xl border-primary/30 animate-in fade-in zoom-in-95 duration-200">
        
        {/* TOP BAR: Language selector & step indicator */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary">
              {step}/4
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {step === 1 && (isBn ? "পরিচিতি ও প্রোফাইল" : "Welcome & Profile")}
              {step === 2 && (isBn ? "ইন্টারঅ্যাক্টিভ ডামি টেস্ট" : "Interactive Demo Test")}
              {step === 3 && (isBn ? "স্মার্ট পারমিশন গাইড" : "Smart Permissions")}
              {step === 4 && (isBn ? "সব প্রস্তুত!" : "Ready to Go!")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(isBn ? "en" : "bn")}
              className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition"
            >
              {isBn ? "English" : "বাংলা"}
            </button>
            {!isInitial && (
              <button
                type="button"
                onClick={onComplete}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* STEP 1: WELCOME & PROFILE */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-in fade-in">
            <div className="text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" />
                {isBn ? "নূর হ্যাবিট স্বাগতম" : "Welcome to Noor Habit"}
              </span>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {isBn ? "আপনার রুটিন ও আখিরাতের প্রস্তুতি" : "Your Daily Islamic Routine & Detox"}
              </h1>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? "নামাজ ট্র্যাকিং, স্মার্ট রিলস ডিটক্স, ফ্রেন্ডস লিডারবোর্ড এবং ইসলামিক হ্যাবিট একসাথে এক জায়গায়।"
                  : "Prayer tracking, smart reels detox, friends leaderboard, and daily habits in one place."}
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl bg-secondary/40 p-4 border border-border/70">
              <div>
                <label className="text-xs font-semibold text-foreground">
                  {isBn ? "আপনার নাম বা ডাকনাম" : "Your Name"}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isBn ? "যেমন: তানভীর হাসান" : "e.g. Tanvir"}
                  className="input mt-1.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">
                  {isBn ? "মূল লক্ষ্য (অপশনাল)" : "Main Goal (Optional)"}
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder={isBn ? "৫ ওয়াক্ত নামাজ ও ডিজিটাল ডিটক্স" : "5 daily prayers & digital detox"}
                  className="input mt-1.5 text-sm"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (name.trim()) setStep(2);
              }}
              disabled={!name.trim()}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-lg transition hover:opacity-90 disabled:opacity-50"
            >
              <span>{isBn ? "পরবর্তী: ডামি টেস্ট দেখুন" : "Next: Try Interactive Test"}</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        )}

        {/* STEP 2: INTERACTIVE DUMMY TEST */}
        {step === 2 && (
          <div className="flex flex-col gap-4 animate-in fade-in">
            <div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <CheckCircle2 className="size-3.5" />
                {isBn ? "হাতে-কলমে পরীক্ষা (Dummy Test)" : "Hands-on Dummy Test"}
              </span>
              <h2 className="mt-1 text-xl font-bold text-foreground">
                {isBn ? "নিচে ক্লিক করে টেস্ট করে দেখুন!" : "Tap below to test how Noor Habit works!"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {isBn
                  ? "নামাজের কার্ড বা অভ্যাসে ক্লিক করুন। দেখুন সম্পন্ন হওয়া লেখাগুলো সম্পূর্ণ স্পষ্ট ও সহজে পড়া যায়।"
                  : "Tap a prayer card or habit to see the crisp completion state without illegible strikethrough."}
              </p>
            </div>

            {/* LIVE DUMMY PROGRESS BAR */}
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">{isBn ? "আজকের রুটিন অগ্রগতি" : "Today's Routine Progress"}</span>
                <span className="text-primary font-mono">{dummyProgressPct}%</span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${dummyProgressPct}%` }}
                />
              </div>
            </div>

            {/* DUMMY PRAYERS */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isBn ? "১. ওয়াক্তের নামাজ টেস্ট করুন" : "1. Test Prayer Cards"}
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { k: "fajr", nameBn: "ফজর", nameEn: "Fajr", time: "05:08 AM" },
                  { k: "dhuhr", nameBn: "যোহর", nameEn: "Dhuhr", time: "12:05 PM" },
                  { k: "asr", nameBn: "আসর", nameEn: "Asr", time: "04:15 PM" },
                  { k: "maghrib", nameBn: "মাগরিব", nameEn: "Maghrib", time: "05:58 PM" },
                  { k: "isha", nameBn: "এশা", nameEn: "Isha", time: "07:15 PM" },
                ].map((item) => {
                  const done = dummyPrayers[item.k];
                  return (
                    <button
                      key={item.k}
                      type="button"
                      onClick={() => handleToggleDummyPrayer(item.k)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 text-xs transition active:scale-95",
                        done
                          ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20"
                          : "bg-secondary/70 hover:bg-secondary text-foreground"
                      )}
                    >
                      {done ? <Check className="size-4 stroke-[3]" /> : <span className="size-4 opacity-40">○</span>}
                      <span className="truncate text-[11px]">{isBn ? item.nameBn : item.nameEn}</span>
                      <span className="text-[9px] opacity-80 font-mono">{item.time}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DUMMY HABIT */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isBn ? "২. দৈনিক অভ্যাস টেস্ট করুন" : "2. Test Daily Habit"}
              </span>
              <div
                onClick={handleToggleDummyHabit}
                className={cn(
                  "flex items-center justify-between rounded-xl p-3 text-xs transition cursor-pointer border",
                  dummyHabitDone
                    ? "bg-primary/10 border-primary/40 text-foreground"
                    : "bg-secondary/50 border-border/80 hover:bg-secondary/70"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "grid size-6 place-items-center rounded-full border transition",
                      dummyHabitDone
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/60 text-transparent"
                    )}
                  >
                    <Check className="size-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-foreground">
                      {isBn ? "কুরআন তেলাওয়াত (১ পৃষ্ঠা)" : "Quran Recitation (1 page)"}
                    </span>
                    <p className="text-[10px] text-muted-foreground">06:00 AM</p>
                  </div>
                </div>

                {dummyHabitDone ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                    ✓ {isBn ? "সম্পন্ন" : "Done"}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">{isBn ? "ট্যাপ করুন" : "Tap"}</span>
                )}
              </div>
            </div>

            {testSuccessNotice && (
              <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-2 text-center text-xs text-emerald-400 font-medium animate-in fade-in">
                ✓ {isBn ? "দারুণ! লেখা সম্পূর্ণ স্পষ্ট এবং পড়া সহজ।" : "Great! Completed text stays crisp and easy to read."}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center justify-center gap-1 rounded-xl bg-secondary px-4 py-3 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                <ArrowLeft className="size-4" />
                <span>{isBn ? "পেছনে" : "Back"}</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow transition hover:opacity-90"
              >
                <span>{isBn ? "পরবর্তী: পারমিশন সেটআপ" : "Next: Setup Permissions"}</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SMART PERMISSIONS & REELS TRACKER */}
        {step === 3 && (
          <div className="flex flex-col gap-4 animate-in fade-in">
            <div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <ShieldCheck className="size-3.5" />
                {isBn ? "স্মার্ট পারমিশন গাইড" : "Smart Permissions Setup"}
              </span>
              <h2 className="mt-1 text-xl font-bold text-foreground">
                {isBn ? "স্মার্ট রিলস ও নোটিফিকেশন সুবিধা" : "Enable Smart Reels & Notification Features"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? "ইউটিউব শর্টস, ইনস্টাগ্রাম ও ফেসবুক রিলসে ২-৩ সেকেন্ডের বেশি সময় কাটালে স্বয়ংক্রিয়ভাবে কাউন্ট করতে নিচের পারমিশনগুলো প্রয়োজন।"
                  : "Required to accurately count reels watched for 2-3+ seconds on YouTube, Instagram and Facebook."}
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              
              {/* 1. Notifications */}
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/40 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-primary/20 text-primary">
                    <Bell className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">
                      {isBn ? "ওয়াক্তের ইনসিস্টেন্ট এলার্ম" : "Prayer Alarms & Notifications"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      {isBn ? "ওয়াক্ত শেষ হওয়ার আগেই সতর্কবার্তা" : "Alerts before prayer times pass"}
                    </p>
                  </div>
                </div>
                {nativeStats.hasNotifications ? (
                  <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-xs font-bold text-emerald-400">
                    {isBn ? "✓ সক্রিয়" : "✓ Active"}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openNativeNotificationSettings()}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:opacity-90 transition"
                  >
                    <span>{isBn ? "অনুমতি দিন" : "Grant"}</span>
                    <ExternalLink className="size-3" />
                  </button>
                )}
              </div>

              {/* 2. Accessibility Service (Reels Tracking) */}
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-primary/20 text-primary">
                    <Smartphone className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-foreground">
                        {isBn ? "রিলস ও শর্টস ট্র্যাকার" : "Smart Reels Tracker"}
                      </h3>
                      <span className="rounded bg-primary/20 px-1 py-0.2 text-[9px] font-bold text-primary">
                        2-3s Dwell
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {isBn ? "Accessibility Service চালু করুন" : "Enable Accessibility Service"}
                    </p>
                  </div>
                </div>
                {nativeStats.hasAccessibility ? (
                  <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-xs font-bold text-emerald-400">
                    {isBn ? "✓ সক্রিয়" : "✓ Active"}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openNativeAccessibilitySettings()}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:opacity-90 transition"
                  >
                    <span>{isBn ? "সেটিংস খুলুন" : "Open Settings"}</span>
                    <ExternalLink className="size-3" />
                  </button>
                )}
              </div>

              {/* 3. Display Over Other Apps (Floating Pill) */}
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/40 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-primary/20 text-primary">
                    <Eye className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">
                      {isBn ? "ভাসমান রিলস কাউন্টার" : "Floating Reels Counter Pill"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      {isBn ? "সোশ্যাল মিডিয়া স্ক্রিনের উপরে কাউন্ট দেখাবে" : "Small floating pill over social media"}
                    </p>
                  </div>
                </div>
                {nativeStats.hasOverlay ? (
                  <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-xs font-bold text-emerald-400">
                    {isBn ? "✓ সক্রিয়" : "✓ Active"}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openNativeOverlaySettings()}
                    className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition"
                  >
                    <span>{isBn ? "অনুমতি দিন" : "Grant Overlay"}</span>
                    <ExternalLink className="size-3" />
                  </button>
                )}
              </div>

              {/* 4. Usage Access (Screen On Time) */}
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/40 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-primary/20 text-primary">
                    <Clock className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">
                      {isBn ? "স্ক্রিন অন টাইম (SOT)" : "Screen On Time (SOT)"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      {isBn ? "দৈনিক মোট স্ক্রিন ব্যবহারের হিসাব" : "Daily device usage analytics"}
                    </p>
                  </div>
                </div>
                {nativeStats.hasUsage ? (
                  <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-xs font-bold text-emerald-400">
                    {isBn ? "✓ সক্রিয়" : "✓ Active"}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openNativeUsageSettings()}
                    className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition"
                  >
                    <span>{isBn ? "অনুমতি দিন" : "Grant Usage"}</span>
                    <ExternalLink className="size-3" />
                  </button>
                )}
              </div>

            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center justify-center gap-1 rounded-xl bg-secondary px-4 py-3 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                <ArrowLeft className="size-4" />
                <span>{isBn ? "পেছনে" : "Back"}</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow transition hover:opacity-90"
              >
                <span>{isBn ? "পরবর্তী ধাপ" : "Next Step"}</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: READY TO GO */}
        {step === 4 && (
          <div className="flex flex-col gap-4 text-center animate-in fade-in">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary/20 text-3xl text-primary animate-bounce">
              🕌
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground">
                {isBn ? "মাশাআল্লাহ, আপনি প্রস্তুত!" : "MashaAllah, You're Ready!"}
              </h2>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? "প্রতিদিন সময়মতো নামাজ আদায় করুন, অযথা রিলস স্ক্রল নিয়ন্ত্রণ করুন এবং ফ্রেন্ডস সেকশনে বন্ধুদের সাথে প্রতিদ্বন্দ্বিতা করুন।"
                  : "Keep your prayers on time, stay mindful of reels scrolling, and challenge your friends on the leaderboard."}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-secondary/30 p-3 text-left">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <HeartHandshake className="size-4 text-primary" />
                <span>{isBn ? "ফ্রেন্ডস সেকশন টিপস" : "Friends Section Tips"}</span>
              </div>
              <ul className="mt-1.5 list-inside list-disc text-[11px] text-muted-foreground space-y-1">
                <li>{isBn ? "লিডারবোর্ডে শুধুমাত্র আপনার ফ্রেন্ড লিস্টের সদস্যরা থাকবে।" : "Leaderboard only shows you and accepted friends."}</li>
                <li>{isBn ? "যেকোনো বন্ধুর নামের ওপর ক্লিক করে তার বিস্তারিত অ্যানালিটিক্স দেখতে পারবেন।" : "Tap any friend's row to view their detailed analytics."}</li>
                <li>{isBn ? "ওভারঅল, নামাজ, স্ক্রিন টাইম এবং রিলস কাউন্ট ফিল্টার দিয়ে র‍্যাংক দেখুন।" : "Filter by overall, prayers, screen time, or reels count."}</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-xl transition hover:opacity-90"
            >
              <span>{isBn ? "নূর হ্যাবিট শুরু করুন" : "Launch Noor Habit"}</span>
              <Sparkles className="size-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
