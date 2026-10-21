import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Volume2, Clock, Check, Bell, Sparkles } from "lucide-react";
import {
  useApp,
  THEMES,
  formatAppTime,
  type Profile,
  type TimeFormat,
  type RemindTone,
  type AggressiveTone,
} from "@/lib/store";
import { useT } from "@/lib/i18n";
import { NotifyToggle } from "@/components/NotifyToggle";
import { Field } from "@/components/AppShell";
import { requestPermission, playTone } from "@/lib/notify";
import { APP_VERSION, checkForUpdate, openUpdate, type UpdateInfo } from "@/lib/update";
import { cn } from "@/lib/utils";
import { getNativeReelsStats, setNativeReelsAlertLimit, setNativeReelsThemeColor } from "@/lib/native-reels";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Noor Habit" },
      { name: "description", content: "Notifications, themes, language, time format and updates." },
      { property: "og:title", content: "Settings — Noor Habit" },
      { property: "og:description", content: "Notifications, themes, language, time format and updates." },
    ],
  }),
  component: SettingsPage,
});

const SWATCH: Record<string, string> = {
  midnight: "oklch(0.62 0.2 280)",
  aurora: "oklch(0.75 0.14 185)",
  ember: "oklch(0.72 0.19 50)",
  rose: "oklch(0.7 0.19 0)",
  emerald: "oklch(0.74 0.16 160)",
  light: "oklch(0.95 0.02 270)",
};

function SettingsPage() {
  const t = useT();
  const s = useApp();
  const [p, setP] = useState<Profile>(s.profile ?? { name: "", birth: "", goal: "" });
  const [upd, setUpd] = useState<UpdateInfo | null | "none" | "err">(null);
  const [savedBanner, setSavedBanner] = useState(false);
  const [reelsLimit, setReelsLimit] = useState(() => getNativeReelsStats().reelsAlertLimit ?? 30);
  const [reelsLimitDraft, setReelsLimitDraft] = useState(() => String(getNativeReelsStats().reelsAlertLimit ?? 30));
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [avatarZoom, setAvatarZoom] = useState(s.profile?.avatarZoom ?? 1);
  const themeHex: Record<string, string> = { midnight: "#8B5CF6", aurora: "#34D399", ember: "#F97316", rose: "#F43F5E", emerald: "#10B981", light: "#6366F1" };

  const remindToneOptions: { id: RemindTone; labelBn: string; labelEn: string }[] = [
    { id: "gentle_bell", labelBn: "শান্ত ঘণ্টার ধ্বনি (Gentle Bell)", labelEn: "Gentle Bell" },
    { id: "soft_chime", labelBn: "মধুর ঝংকার (Soft Chime)", labelEn: "Soft Chime" },
    { id: "mellow_beep", labelBn: "মৃদু বিপ (Mellow Beep)", labelEn: "Mellow Beep" },
  ];

  const aggressiveToneOptions: { id: AggressiveTone; labelBn: string; labelEn: string }[] = [
    { id: "pulse_radar", labelBn: "পালস রাডার (Pulse Radar)", labelEn: "Pulse Radar" },
    { id: "continuous_alarm", labelBn: "সাইরেন অ্যালার্ম (Continuous Siren)", labelEn: "Continuous Siren" },
    { id: "urgent_ping", labelBn: "জরুরি সংকেত (Urgent Ping)", labelEn: "Urgent Ping" },
  ];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (p.name.trim()) {
      s.setProfile(p);
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 2500);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-3xl font-bold">{t("settings")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {s.lang === "bn"
            ? "সময় ফরম্যাট, নোটিফিকেশন টোন, থিম ও ভাষা পছন্দমতো সাজান"
            : "Customize time format, notification tones, themes and language"}
        </p>
      </header>

      {/* 1. TIME FORMAT (12-HOUR vs 24-HOUR) */}
      <section className="glass p-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="size-4 text-primary" />
          <h2 className="font-semibold text-base">{t("timeFormat")}</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {s.lang === "bn"
            ? "অ্যাপের প্রতিটি পৃষ্ঠায় নামাজের সময় ও রিমাইন্ডার এই ফরম্যাটে প্রদর্শিত হবে।"
            : "Prayer times and reminders across the app will follow this format."}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => s.setTimeFormat("12h")}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl p-3.5 border transition",
              s.timeFormat === "12h"
                ? "border-primary glow-on bg-primary/10 text-primary font-bold"
                : "border-border/60 bg-secondary/60 hover:bg-secondary"
            )}
          >
            <span className="text-sm font-semibold">12-Hour (AM/PM)</span>
            <span className="text-xs text-muted-foreground mt-1">
              {s.lang === "bn" ? "১২ ঘণ্টা ফরম্যাট" : "12-hour format"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => s.setTimeFormat("24h")}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl p-3.5 border transition",
              s.timeFormat === "24h"
                ? "border-primary glow-on bg-primary/10 text-primary font-bold"
                : "border-border/60 bg-secondary/60 hover:bg-secondary"
            )}
          >
            <span className="text-sm font-semibold">24-Hour</span>
            <span className="text-xs text-muted-foreground mt-1">
              {s.lang === "bn" ? "২৪ ঘণ্টা ফরম্যাট" : "24-hour format"}
            </span>
          </button>
        </div>
      </section>

      {/* 2. TONE SETTINGS (REMIND TONE & AGGRESSIVE TONE) */}
      <section className="glass p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Volume2 className="size-4 text-primary" />
          <h2 className="font-semibold text-base">{t("toneSettings")}</h2>
        </div>

        {/* Remind Tone */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("remindTone")}
          </label>
          <div className="mt-2 grid grid-cols-1 gap-2">
            {remindToneOptions.map((opt) => {
              const active = s.remindTone === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => { s.setRemindTone(opt.id); playTone(opt.id); }}
                  className={cn(
                    "flex items-center justify-between rounded-xl p-3 cursor-pointer border transition",
                    active
                      ? "border-primary/60 bg-primary/10"
                      : "border-border/40 bg-secondary/40 hover:bg-secondary"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "grid size-4 place-items-center rounded-full border",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                      )}
                    >
                      {active && <Check className="size-3" />}
                    </div>
                    <span className="text-sm font-medium">
                      {s.lang === "bn" ? opt.labelBn : opt.labelEn}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playTone(opt.id);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition"
                    title={s.lang === "bn" ? "শব্দ শুনুন" : "Play preview"}
                  >
                    <Volume2 className="size-3.5" />
                    <span>{s.lang === "bn" ? "টেস্ট করুন" : "Play"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aggressive Alert Tone */}
        <div className="pt-2 border-t border-border/30">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("aggressiveTone")}
          </label>
          <div className="mt-2 grid grid-cols-1 gap-2">
            {aggressiveToneOptions.map((opt) => {
              const active = s.aggressiveTone === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => { s.setAggressiveTone(opt.id); playTone(opt.id); }}
                  className={cn(
                    "flex items-center justify-between rounded-xl p-3 cursor-pointer border transition",
                    active
                      ? "border-warning/60 bg-warning/10"
                      : "border-border/40 bg-secondary/40 hover:bg-secondary"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "grid size-4 place-items-center rounded-full border",
                        active ? "border-warning bg-warning text-warning-foreground" : "border-muted-foreground"
                      )}
                    >
                      {active && <Check className="size-3" />}
                    </div>
                    <span className="text-sm font-medium">
                      {s.lang === "bn" ? opt.labelBn : opt.labelEn}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playTone(opt.id);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition"
                    title={s.lang === "bn" ? "শব্দ শুনুন" : "Play preview"}
                  >
                    <Volume2 className="size-3.5" />
                    <span>{s.lang === "bn" ? "টেস্ট করুন" : "Play"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. PRAYER NOTIFICATIONS */}
      <section className="glass flex flex-col gap-3 p-5">
        <h2 className="font-semibold text-base">{t("prayerNotif")}</h2>
        <div className="flex flex-col gap-2">
          {s.prayers.map((pr) => (
            <div
              key={pr.key}
              className="flex items-center justify-between gap-2.5 rounded-xl bg-secondary/40 p-2.5 border border-border/40 min-w-0"
            >
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-medium text-sm text-foreground truncate">{t(pr.key)}</span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {formatAppTime(pr.time, s.timeFormat, s.lang)}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="time"
                  value={pr.time}
                  onChange={(e) => s.setPrayer(pr.key, { time: e.target.value })}
                  className="w-20 rounded-lg border border-input bg-muted/70 py-1 px-1.5 text-xs font-mono text-center outline-none shrink-0 text-foreground"
                />
                <NotifyToggle
                  mode={pr.notify}
                  hasTime={!!pr.time.trim()}
                  onChange={(m) => {
                    s.setPrayer(pr.key, { notify: m });
                    if (m !== "off") requestPermission();
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          🔔 {t("normalDesc")} · 🚨 {t("aggrDesc")}
        </p>
      </section>

      {/* 4. THEME */}
      <section className="glass p-5">
        <h2 className="mb-3 font-semibold text-base">{t("theme")}</h2>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((th) => (
            <button
              key={th}
              onClick={() => { s.setTheme(th); setNativeReelsThemeColor(themeHex[th] ?? "#8B5CF6"); }}
              className={cn(
                "flex items-center gap-2 rounded-xl bg-secondary p-3 text-sm capitalize transition",
                s.theme === th && "ring-2 ring-primary glow-on"
              )}
            >
              <span className="size-4 rounded-full shadow-sm" style={{ background: SWATCH[th] }} />
              {th}
            </button>
          ))}
        </div>
      </section>

      {/* 5. LANGUAGE */}
      <section className="glass p-5">
        <h2 className="mb-3 font-semibold text-base">{t("language")}</h2>
        <div className="flex gap-2">
          {(["bn", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => s.setLang(l)}
              className={cn(
                "flex-1 rounded-xl py-3 font-medium transition",
                s.lang === l ? "glow-on bg-primary text-primary-foreground font-bold" : "bg-secondary"
              )}
            >
              {l === "bn" ? "বাংলা" : "English"}
            </button>
          ))}
        </div>
      </section>

      {/* REELS SCROLLING ALERT */}
      <section className="glass flex flex-col gap-3 p-5">
        <div>
          <h2 className="font-semibold text-base">{s.lang === "bn" ? "রিলস স্ক্রলিং সতর্কতা" : "Reels scrolling alert"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {s.lang === "bn" ? "আজকের রিলস কাউন্ট এই সীমায় পৌঁছালে সতর্কতা দেখাবে।" : "Get an alert when today’s counted reels reach this limit."}
          </p>
        </div>
        <Field label={s.lang === "bn" ? "দৈনিক রিলস সীমা" : "Daily reels limit"}>
          <input
            type="number" min={1} max={500} inputMode="numeric" className="input" value={reelsLimitDraft}
            onChange={(e) => setReelsLimitDraft(e.target.value)}
            onBlur={() => {
              const parsed = Number.parseInt(reelsLimitDraft, 10);
              const value = Math.max(1, Math.min(500, Number.isFinite(parsed) ? parsed : reelsLimit));
              setReelsLimit(value);
              setReelsLimitDraft(String(value));
              setNativeReelsAlertLimit(value);
            }}
          />
        </Field>
      </section>

      {/* 6. PROFILE */}
      <form className="glass flex flex-col gap-3 p-5" onSubmit={handleSaveProfile}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">{t("profile")}</h2>
          {savedBanner && (
            <span className="text-xs text-success flex items-center gap-1 font-semibold animate-in fade-in">
              <Check className="size-3.5" />
              {s.lang === "bn" ? "সংরক্ষিত হয়েছে!" : "Saved successfully!"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => p.avatar && setAvatarPreviewOpen(true)} aria-label={s.lang === "bn" ? "প্রোফাইল ছবি দেখুন" : "View profile picture"} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Avatar className="size-16 border border-border">
              {p.avatar ? <AvatarImage src={p.avatar} alt={p.name || "Profile"} style={{ transform: `scale(${p.avatarZoom ?? avatarZoom})` }} /> : null}
              <AvatarFallback className="bg-secondary text-lg">{p.name?.trim()?.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold hover:bg-muted transition">
            <Camera className="size-4" />
            {p.avatar ? (s.lang === "bn" ? "ছবি বদলান" : "Change photo") : (s.lang === "bn" ? "প্রোফাইল ছবি যোগ করুন" : "Add profile picture")}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (!file.type.startsWith("image/")) return;
                if (file.size > 5 * 1024 * 1024) {
                  window.alert(s.lang === "bn" ? "ছবিটি ৫ এমবির চেয়ে ছোট হতে হবে" : "Choose an image smaller than 5 MB");
                  event.target.value = "";
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => { setP((prev) => ({ ...prev, avatar: String(reader.result || "") })); setAvatarZoom(1); setP(prev => ({ ...prev, avatarZoom: 1 })); };
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {p.avatar && <label className="flex items-center gap-2 text-xs text-muted-foreground" title={s.lang === "bn" ? "প্রিভিউতে জুম সামঞ্জস্য করুন" : "Adjust preview zoom"}>
            <ZoomIn className="size-4 shrink-0" />
            <input aria-label={s.lang === "bn" ? "ছবির জুম" : "Photo zoom"} type="range" min="1" max="2.5" step="0.05" value={avatarZoom} onChange={(e) => (value => { setAvatarZoom(value); setP(prev => ({ ...prev, avatarZoom: value })); })(Number(e.target.value))} className="w-20 accent-[var(--primary)]" />
          </label>}
        </div>
        <Field label={t("name")}>
          <input
            className="input"
            value={p.name}
            onChange={(e) => setP({ ...p, name: e.target.value })}
            placeholder={s.lang === "bn" ? "আপনার নাম" : "Your Name"}
          />
        </Field>
        <Field label={t("birth")}>
          <input
            type="date"
            className="input"
            value={p.birth}
            onChange={(e) => setP({ ...p, birth: e.target.value })}
          />
        </Field>
        <Field label={t("mainGoal")}>
          <input
            className="input"
            value={p.goal}
            onChange={(e) => setP({ ...p, goal: e.target.value })}
            placeholder={
              s.lang === "bn" ? "আপনার মূল লক্ষ্য লিখুন" : "Your main goal"
            }
          />
        </Field>
        <button className="rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 transition">
          {t("save")}
        </button>
      </form>

      <Dialog open={avatarPreviewOpen} onOpenChange={setAvatarPreviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{s.lang === "bn" ? "প্রোফাইল ছবি" : "Profile picture"}</DialogTitle><DialogDescription>{s.lang === "bn" ? "জুম স্লাইডার দিয়ে ছবির ফ্রেম সামঞ্জস্য করুন।" : "Adjust the photo framing with the zoom slider."}</DialogDescription></DialogHeader>
          {p.avatar && <div className="mx-auto size-64 overflow-hidden rounded-full border border-border bg-secondary"><img src={p.avatar} alt={p.name || "Profile"} className="size-full object-cover" style={{ transform: `scale(${p.avatarZoom ?? avatarZoom})` }} /></div>}
          <label className="flex items-center gap-3 text-sm"><ZoomIn className="size-4" /><input aria-label="Photo zoom" type="range" min="1" max="2.5" step="0.05" value={avatarZoom} onChange={(e) => (value => { setAvatarZoom(value); setP(prev => ({ ...prev, avatarZoom: value })); })(Number(e.target.value))} className="flex-1 accent-[var(--primary)]" /></label>
        </DialogContent>
      </Dialog>

      {/* 7. APP UPDATE */}
      <section className="glass flex flex-col gap-2 p-5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">Noor Habit</span>
          <span className="text-xs text-muted-foreground font-mono">v{APP_VERSION}</span>
        </div>
        <button
          onClick={async () => {
            try {
              setUpd((await checkForUpdate()) ?? "none");
            } catch {
              setUpd("err");
            }
          }}
          className="rounded-xl bg-secondary py-2.5 text-xs font-semibold hover:bg-muted transition"
        >
          {t("checkUpdate")}
        </button>
        {upd === "none" && <p className="text-xs text-success mt-1">{t("upToDate")}</p>}
        {upd === "err" && <p className="text-xs text-destructive mt-1">{t("offlineAi")}</p>}
        {upd && typeof upd === "object" && (
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-xs font-semibold">{t("updateAvail")}: v{upd.version}</p>
            <button
              onClick={() => openUpdate(upd)}
              className="rounded-xl bg-primary py-2.5 font-semibold text-primary-foreground"
            >
              {t("download")}
            </button>
          </div>
        )}
      </section>
      <footer className="pb-2 pt-1 text-center text-xs text-muted-foreground" aria-label="App credit">Made by Tasrif Islam</footer>
    </div>
  );
}
