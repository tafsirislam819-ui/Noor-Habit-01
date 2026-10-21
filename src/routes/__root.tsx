import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  Send,
  Sparkles,
  Plus,
  History,
  Trash2,
  CheckCircle2,
  Moon,
  X,
  AlertCircle,
  Mic,
  MicOff,
  Flame,
} from "lucide-react";
import {
  useApp,
  type ChatMsg,
  type PrayerKey,
  PRAYER_NAMES_BN,
  today,
  formatAppTime,
} from "@/lib/store";
import { useT } from "@/lib/i18n";
import { getAiApiUrl } from "@/lib/ai-config";
import { cn } from "@/lib/utils";
import { Capacitor, CapacitorHttp } from "@capacitor/core";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "Noor AI — Islamic Routine & Habit Friend" },
      { name: "description", content: "Plan routines, track habits and prayers with intelligent AI friend." },
      { property: "og:title", content: "Noor AI — Islamic Routine & Habit Friend" },
      { property: "og:description", content: "Plan routines, track habits and prayers with intelligent AI friend." },
    ],
  }),
  component: AiPage,
});

/** Build ultra-compact, token-efficient context for Noor AI */
function buildCompactContext() {
  const s = useApp.getState();
  const todayStr = today();

  const prayers = s.prayers
    .map((p) => {
      const isDone = (p.doneDates || []).includes(todayStr);
      const name = PRAYER_NAMES_BN[p.key] || p.key;
      return `${name}(${p.time}):${isDone ? "আদায়" : "বাকি"}`;
    })
    .join(", ");

  const habits = s.items
    .filter((i) => i.kind === "habit")
    .slice(0, 5)
    .map((i) => {
      const isDone = (i.doneDates || []).includes(todayStr);
      return `${i.title}:${isDone ? "সম্পন্ন" : "বাকি"}`;
    })
    .join(", ");

  const memory = (s.aiMemory.learnedNotes || []).slice(-3).join(" | ");

  return `User: ${s.profile?.name || "Friend"}
Today (${todayStr})
Prayers: ${prayers}
Habits: ${habits || "None"}
Learned Memory: ${memory || "None"}`;
}

async function requestAiCompletion(
  messages: { role: string; content: string }[],
  lang: string
): Promise<string> {
  const url = getAiApiUrl();
  const payload = { messages, lang };

  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.post({
      url,
      headers: { "Content-Type": "application/json" },
      data: payload,
    });
    if (response.status >= 200 && response.status < 300) {
      const data = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
      if (data.error) throw new Error(data.error);
      return data.reply ?? "";
    }
    const errStr = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    throw new Error(`AI request error (${response.status}): ${errStr.slice(0, 100)}`);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `AI request error (${res.status})`);
  return data.reply ?? "";
}

function AiPage() {
  const t = useT();
  const {
    chat,
    chatSessions,
    activeSessionId,
    addChatMessage,
    createChatSession,
    switchChatSession,
    deleteChatSession,
    addItem,
    addGoal,
    addTodo,
    markPrayer,
    setAiMemory,
    aiMemory,
    profile,
    lang,
    timeFormat,
  } = useApp();

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Voice speech recognition state
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechLang, setSpeechLang] = useState<"bn-BD" | "en-US">("bn-BD");
  const recognitionRef = useRef<any>(null);
  const listeningRequestedRef = useRef(false);
  const recognitionRetryRef = useRef<number | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize textarea to expand on 2nd line and up to 4 lines
  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(el.scrollHeight, 120);
    el.style.height = `${Math.max(40, nextHeight)}px`;
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length, busy, interimTranscript]);

  // Setup Speech Recognition (Bangla bn-BD / fallback bn-IN)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = speechLang;

      rec.onstart = () => {
        setIsListening(true);
        setInterimTranscript("");
      };

      rec.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) {
            final += trans;
          } else {
            interim += trans;
          }
        }

        if (final) {
          const cleanFinal = final.trim();
          setInput((prev) => {
            if (!prev) return cleanFinal;
            if (prev.endsWith(cleanFinal)) return prev;
            return `${prev.trim()} ${cleanFinal}`;
          });
          setInterimTranscript("");
        } else if (interim) {
          setInterimTranscript(interim);
        }
      };

      rec.onerror = (e: any) => {
        console.warn("Speech recognition error:", e.error);
        if (e.error !== "no-speech" && e.error !== "aborted") {
          listeningRequestedRef.current = false;
          setIsListening(false);
        }
        setInterimTranscript("");
        if (e.error === "not-allowed") {
          setErr(
            lang === "bn"
              ? "মাইক্রোফোনের অনুমতি (Permission) প্রয়োজন। অনুগ্রহ করে অনুমতি দিন।"
              : "Microphone permission is required for voice input."
          );
        }
      };

      rec.onend = () => {
        setInterimTranscript("");
        if (listeningRequestedRef.current) {
          if (recognitionRetryRef.current !== null) window.clearTimeout(recognitionRetryRef.current);
          recognitionRetryRef.current = window.setTimeout(() => {
            if (!listeningRequestedRef.current) return;
            try { rec.start(); } catch { /* already restarting */ }
          }, 350);
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = rec;
    }

    return () => {
      listeningRequestedRef.current = false;
      if (recognitionRetryRef.current !== null) window.clearTimeout(recognitionRetryRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [speechLang]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setErr(
        lang === "bn"
          ? "আপনার ডিভাইসে স্পিচ রিকগনিশন সমর্থিত নয়।"
          : "Speech recognition is not supported on this device."
      );
      return;
    }

    if (isListening) {
      listeningRequestedRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      listeningRequestedRef.current = true;
      setErr("");
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Could not start recognition:", e);
      }
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;

    if (isListening && recognitionRef.current) {
      listeningRequestedRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }

    const userMsg: ChatMsg = { role: "user", content: text };
    addChatMessage(userMsg);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "40px";
    setBusy(true);
    setErr("");

    try {
      const currentHistory = [...chat, userMsg];

      // Token-conscious, natural Human Bangla companion prompt
      const systemPrompt = `তুমি 'নূর' (Noor) — ব্যবহারকারীর কাছের বিশ্বস্ত ইসলামিক অভ্যাস ও রুটিন বন্ধু (Friendly Companion)।
ভাষা: ব্যবহারকারী যে ভাষায় লিখেছেন বা বলেছেন, সেই ভাষায় সহজ ও আন্তরিকভাবে উত্তর দাও। বাংলা বললে বাংলায় উত্তর দাও; ইংরেজি বললে ইংরেজিতে উত্তর দাও। অডিও ট্রান্সক্রিপশন ভুল মনে হলে অনুমান করে উত্তর না দিয়ে ব্যবহারকারীকে কথাটি লিখে দিতে বলো।

গুরুত্বপূর্ণ ফিচার ও জ্ঞান (Features you know):
- অ্যাপে একটি পরীক্ষামূলক ডিজিটাল-ওয়েলবিইং ট্র্যাকার আছে, কিন্তু এটি এখনও সব অ্যাপের প্রকৃত Reels/Shorts ভিডিও নির্ভুলভাবে আলাদা করতে পারে—এমন নিশ্চয়তা নেই। কাউন্টার বা পারমিশন কাজ না করলে সমস্যা স্বীকার করো; সেটিংস অন করলেই নিশ্চিতভাবে ঠিক হবে এমন দাবি কোরো না। Android-এ Accessibility ও overlay অনুমতি ব্যবহারকারীকেই Settings-এ গিয়ে দিতে হয়।
- ট্র্যাকার যাচাই না করা পর্যন্ত নির্দিষ্টভাবে প্রতিটি Reel গোনা বা নির্ভুল Screen On Time দেখানোর দাবি কোরো না।

জরুরি নিয়ম:
1. শুভেচ্ছা ও সম্ভাষণ:
- প্রতি মেসেজের শুরুতে বারবার 'ওয়ালাইকুমুস সালাম' বা সালামের পুনরাবৃত্তি একদম করবে না!
- ব্যবহারকারী নিজে সালাম দিলে তখন হাসিমুখে উত্তর দাও, অন্যথায় সরাসরি কাজের কথায় আসো।
- ব্যবহারকারীকে 'স্যার' বা 'বস' জাতীয় অতিরিক্ত আনুষ্ঠানিকতায় ডাকবে না, একজন যত্নশীল বন্ধুর মতো কথা বলো।

2. মেসেজের পরিধি (Brevity & Conciseness):
- বড় বড় অনুচ্ছেদ বা লম্বা লেকচার নিষেধ!
- ১ থেকে ৩ বাক্যে সংক্ষিপ্ত, প্র্যাকটিক্যাল উত্তর দাও। যতটুকু দরকার ঠিক ততটুকু বলো।

3. অ্যাপে কাজ সম্পাদন (App Actions):
ব্যবহারকারী স্পষ্টভাবে অ্যাপে কোনো কাজ করতে বললেই শুধু একটিমাত্র action JSON ব্লক যুক্ত করবে। কাজটি নিশ্চিতভাবে না বুঝলে আগে প্রশ্ন করবে। JSON কখনো সাধারণ উত্তরের মধ্যে লিখবে না।
- অভ্যাস: \`\`\`action\n{"action":"ADD_ITEM","kind":"habit","title":"নাম","time":"HH:MM"}\n\`\`\`
- টাস্ক: \`\`\`action\n{"action":"ADD_ITEM","kind":"task","title":"নাম","time":"HH:MM"}\n\`\`\`
- লক্ষ্য: \`\`\`action\n{"action":"ADD_ITEM","kind":"goal","title":"লক্ষ্য","task":"প্রথম কাজ"}\n\`\`\`
- নামাজ চেক: \`\`\`action\n{"action":"MARK_PRAYER","prayer":"fajr"|"dhuhr"|"asr"|"maghrib"|"isha","done":true}\n\`\`\`
- অভ্যাস বা টাস্ক মুছতে: \`\`\`action\n{"action":"DELETE_ITEM","kind":"habit"|"task"|"goal","title":"সুনির্দিষ্ট নাম"}\n\`\`\`

USER CONTEXT:
${buildCompactContext()}`;

      // Token optimization: Send only last 5 messages
      const trimmedHistory = currentHistory.slice(-5).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const rawReply = await requestAiCompletion([
        { role: "system", content: systemPrompt },
        ...trimmedHistory,
      ], lang);

      if (!rawReply) {
        throw new Error(
          lang === "bn" ? "নূর থেকে কোনো উত্তর পাওয়া যায়নি।" : "Could not get response from Noor"
        );
      }

      // Strip every action block before saving or rendering the assistant message.
      let cleanContent = rawReply;
      let actionResult: { type: string; details: string } | null = null;
      const actionMatches = [...rawReply.matchAll(/```action\s*([\s\S]*?)\s*```/gi)];
      cleanContent = rawReply.replace(/```action[\s\S]*?```/gi, "").trim();
      for (const match of actionMatches) {
        try {
          const parsed = JSON.parse(match[1] ?? "{}");
          const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
          if (parsed.action === "ADD_ITEM" && title) {
            if (parsed.kind === "goal") {
              addGoal(title, parsed.deadline, parsed.task);
              actionResult = { type: "goal", details: title };
            } else if (parsed.kind === "task") {
              addTodo(title, today(), typeof parsed.time === "string" ? parsed.time : "");
              actionResult = { type: "task", details: title };
            } else if (parsed.kind === "habit") {
              addItem("habit", title, typeof parsed.time === "string" ? parsed.time : "");
              actionResult = { type: "habit", details: title };
            }
          } else if (parsed.action === "DELETE_ITEM" && title) {
            if (parsed.kind === "task") {
              useApp.getState().removeTodoByTitle(title);
              actionResult = { type: "task", details: title };
            } else if (parsed.kind === "habit") {
              useApp.getState().removeHabitByTitle(title);
              actionResult = { type: "habit", details: title };
            } else if (parsed.kind === "goal") {
              useApp.getState().removeGoalByTitle(title);
              actionResult = { type: "goal", details: title };
            }
          } else if (parsed.action === "MARK_PRAYER" && parsed.prayer && ["fajr", "dhuhr", "asr", "maghrib", "isha"].includes(parsed.prayer)) {
            markPrayer(parsed.prayer as PrayerKey, today(), parsed.done !== false);
            actionResult = { type: "prayer", details: PRAYER_NAMES_BN[parsed.prayer as PrayerKey] || parsed.prayer };
          }
        } catch (e) {
          console.warn("Failed to parse in-app action", e);
        }
      }
      if (!cleanContent) {
        cleanContent = actionResult
          ? (lang === "bn" ? "কাজটি সম্পন্ন করেছি।" : "Done.")
          : (lang === "bn" ? "উত্তরটি তৈরি করা যায়নি। আবার বলবেন?" : "I couldn't form a response. Please try again.");
      }

      addChatMessage({ role: "assistant", content: cleanContent });

      if (actionResult) {
        setActionNotice(
          lang === "bn"
            ? `✅ সম্পন্ন করা হয়েছে: ${actionResult.details}`
            : `✅ Action completed: ${actionResult.details}`
        );
        setTimeout(() => setActionNotice(null), 4000);
      }

      // Self-tuning adaptive friend: learn user preference notes (compact memory)
      if (text.length > 8 && !text.startsWith("http")) {
        const existingNotes = aiMemory.learnedNotes || [];
        const newNote = text.slice(0, 35);
        if (!existingNotes.includes(newNote)) {
          const updated = [...existingNotes.slice(-4), newNote];
          setAiMemory({ learnedNotes: updated });
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "AI is temporarily unavailable";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col max-w-full overflow-hidden select-none">
      {/* HEADER */}
      <header className="mb-2 flex items-center justify-between shrink-0 px-0.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-secondary/80 px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition shadow-sm"
          >
            <History className="size-3.5 text-primary" />
            <span>
              {lang === "bn" ? `আগের চ্যাট (${chatSessions.length})` : `History (${chatSessions.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => createChatSession()}
            className="flex items-center gap-1 rounded-xl bg-primary/10 border border-primary/30 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition shadow-sm"
          >
            <Plus className="size-3.5" />
            <span>{lang === "bn" ? "নতুন চ্যাট" : "New Chat"}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary">
            <Moon className="size-4 fill-primary" />
          </div>
          <span className="font-bold text-sm tracking-wide text-foreground">Noor AI</span>
        </div>
      </header>

      {/* ACTION BANNER */}
      {actionNotice && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-success/40 bg-success/15 px-3 py-1.5 text-xs font-semibold text-success animate-in fade-in shrink-0">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="truncate">{actionNotice}</span>
        </div>
      )}

      {/* CHAT MESSAGES CONTAINER (LOCKED AND SCROLLABLE WITHOUT SCREEN JITTER) */}
      <div
        style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
        className="no-scrollbar flex-1 min-h-0 space-y-3 overflow-y-auto px-1 py-1"
      >
        {chat.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <div className="relative mb-3 grid size-14 place-items-center rounded-3xl bg-primary/10 shadow-lg border border-primary/20">
              <Moon className="size-7 fill-primary text-primary" />
            </div>
            <p className="text-base font-bold text-foreground">
              {profile?.name ? `${profile.name}, ` : ""}
              {lang === "bn" ? "আমি নূর — আপনার বন্ধু!" : "I am Noor — your friend!"}
            </p>
            <p className="text-xs max-w-xs mt-1 leading-relaxed text-muted-foreground">
              {lang === "bn"
                ? "নামাজ, অভ্যাস বা টাস্ক নিয়ে কথা বলুন। বাংলায় মুখে বলেই যেকোনো কাজ করিয়ে নিতে পারেন।"
                : "Talk about prayers, habits or tasks. You can also use Bangla voice input!"}
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-sm">
              <button
                type="button"
                onClick={() =>
                  setInput(
                    lang === "bn"
                      ? "প্রতিদিন সকাল ৭টায় ৩০ মিনিট বই পড়ার অভ্যাস যুক্ত করো"
                      : "Add a habit: Read books daily at 7 AM"
                  )
                }
                className="rounded-xl border border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                ✨ {lang === "bn" ? "বই পড়ার অভ্যাস যোগ করো" : "Add reading habit"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setInput(
                    lang === "bn"
                      ? "আজকে আমার কোন কোন নামাজ বাকি আছে?"
                      : "Which prayers are pending today?"
                  )
                }
                className="rounded-xl border border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                🕌 {lang === "bn" ? "আজকের নামাজের হিসাব" : "Check pending prayers"}
              </button>
            </div>
          </div>
        )}

        {chat.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col max-w-[85%]",
              m.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div
              className={cn(
                "rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm break-words",
                m.role === "user"
                  ? "bg-primary text-primary-foreground font-medium rounded-br-xs"
                  : "glass text-foreground rounded-bl-xs border border-border/60"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {busy && (
          <div className="mr-auto flex items-center gap-2 rounded-2xl glass px-3.5 py-2 text-xs text-muted-foreground animate-pulse">
            <Sparkles className="size-3.5 text-primary animate-spin" />
            <span>{lang === "bn" ? "নূর লিখছে..." : "Noor is typing..."}</span>
          </div>
        )}

        {err && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{err}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* LIVE INTERIM VOICE TRANSCRIPT CHIP */}
      {isListening && (
        <div className="mb-1 flex items-center gap-2 rounded-xl bg-primary/15 border border-primary/40 px-3 py-1.5 text-xs text-primary animate-pulse shrink-0">
          <Mic className="size-3.5 animate-bounce" />
          <span className="font-medium truncate">
            {interimTranscript
              ? `🎙️ ${interimTranscript}`
              : lang === "bn"
              ? "শুনছি... বাংলায় বলুন..."
              : "Listening... speak now..."}
          </span>
        </div>
      )}

      {/* SMART MULTILINE MESSAGE INPUT AREA */}
      <div className="pt-1.5 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-1.5 rounded-2xl glass p-1.5 shadow-lg border border-border/60"
        >
          {/* VOICE INPUT BUTTON (MIC) & LANGUAGE SELECTOR */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggleListening}
              className={cn(
                "grid size-9.5 place-items-center rounded-xl transition shrink-0",
                isListening
                  ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30"
                  : "bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
              title={isListening ? "ভয়েস ইনপুট বন্ধ করুন" : speechLang === "bn-BD" ? "বাংলায় বলুন (Voice Input)" : "Speak English"}
            >
              {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => setSpeechLang((cur) => (cur === "bn-BD" ? "en-US" : "bn-BD"))}
              className="px-1.5 py-1 text-[10px] font-bold rounded-lg bg-secondary/60 hover:bg-secondary text-primary transition"
              title="ভয়েস ইনপুট ভাষা পরিবর্তন করুন"
            >
              {speechLang === "bn-BD" ? "বাংলা" : "EN"}
            </button>
          </div>

          {/* AUTO-EXPANDING MULTILINE TEXTAREA */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              isListening
                ? lang === "bn"
                  ? "শুনছি... বলুন..."
                  : "Listening..."
                : lang === "bn"
                ? "নূর-কে বলুন বা মাইকে কথা বলুন..."
                : "Ask Noor or speak..."
            }
            disabled={busy}
            className="flex-1 bg-transparent px-2.5 py-2 text-sm text-foreground outline-none resize-none overflow-y-auto leading-relaxed max-h-[120px] placeholder:text-muted-foreground/60 disabled:opacity-50 min-w-0"
          />

          {/* SEND BUTTON */}
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="grid size-9.5 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-30 transition shadow-md hover:opacity-90 shrink-0"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>

      {/* CHAT SESSIONS HISTORY MODAL */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="glass flex w-full max-w-md flex-col max-h-[80vh] rounded-3xl p-5 shadow-2xl border border-border/60">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <History className="size-5 text-primary" />
                <h3 className="font-bold text-base">{lang === "bn" ? "আগের চ্যাট সেশন" : "Chat History"}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="rounded-full p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
              {chatSessions.map((sess) => {
                const active = sess.id === activeSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => {
                      switchChatSession(sess.id);
                      setShowHistory(false);
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-xl p-3 cursor-pointer border transition",
                      active
                        ? "border-primary/60 bg-primary/10 text-primary font-medium"
                        : "border-border/30 bg-secondary/40 hover:bg-secondary text-foreground"
                    )}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="truncate text-sm font-semibold">{sess.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {sess.messages.length} {lang === "bn" ? "টি বার্তা" : "messages"} · {sess.createdAt}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChatSession(sess.id);
                      }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                      title={lang === "bn" ? "মুছে ফেলুন" : "Delete session"}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-border/30 text-center">
              <p className="text-[11px] text-muted-foreground">
                🔒 {lang === "bn" ? "সমস্ত আলোচনা আপনার ফোনেই নিরাপদে সংরক্ষিত।" : "All chat sessions are saved securely on your device."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
