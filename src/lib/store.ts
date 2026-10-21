import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotifyMode = "off" | "normal" | "aggressive";
export type ItemKind = "habit" | "goal" | "task";
export type Lang = "bn" | "en";
export const THEMES = ["midnight", "aurora", "ember", "rose", "emerald", "light"] as const;
export type Theme = (typeof THEMES)[number];
export const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerKey = (typeof PRAYERS)[number];

export const PRAYER_NAMES_BN: Record<PrayerKey, string> = {
  fajr: "ফজর",
  dhuhr: "যোহর",
  asr: "আসর",
  maghrib: "মাগরিব",
  isha: "ইশা",
};

export type TimeFormat = "12h" | "24h";
export type RemindTone = "gentle_bell" | "soft_chime" | "mellow_beep";
export type AggressiveTone = "continuous_alarm" | "pulse_radar" | "urgent_ping";

export interface Item {
  id: string;
  kind: ItemKind;
  title: string;
  time: string; // HH:MM, "" = no reminder
  notify: NotifyMode;
  doneDates: string[];
  createdAt: string;
}

export interface GoalSubTask {
  id: string;
  title: string;
  time?: string;
  doneDates: string[]; // daily completion dates
}

export interface Goal {
  id: string;
  title: string;
  deadline?: string; // target duration e.g. "1 week" or date "2026-10-27"
  subTasks: GoalSubTask[];
  createdAt: string;
}

export interface TodoItem {
  id: string;
  title: string;
  dueDate?: string;
  time?: string;
  notify: NotifyMode;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface Prayer {
  key: PrayerKey;
  time: string;
  notify: NotifyMode;
  doneDates: string[];
}

export interface Profile {
  name: string;
  birth: string;
  goal: string;
  avatar?: string;
  avatarZoom?: number;
}

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  actionDone?: {
    type: string;
    details: string;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMsg[];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AiMemory {
  tone: string;
  preferences: string[];
  learnedNotes: string[];
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: "prayer" | "goal" | "friend" | "streak" | "system" | "reminder";
  createdAt: string;
  read: boolean;
}

export interface EarlyCheckWarning {
  title: string;
  scheduledTime: string;
  message: string;
}

export const today = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

const uid = () => Math.random().toString(36).slice(2, 10);
export const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let res = "NOOR-";
  for (let i = 0; i < 6; i++) {
    res += chars[Math.floor(Math.random() * chars.length)];
  }
  return res;
};

/** Convert 24h HH:MM to user-preferred 12h or 24h format */
export function formatAppTime(timeStr: string, format: TimeFormat = "12h", lang: Lang = "bn"): string {
  if (!timeStr || !timeStr.includes(":")) return timeStr || "";
  if (format === "24h") return timeStr;

  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return timeStr;

  const isPM = h >= 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = m < 10 ? `0${m}` : `${m}`;

  if (lang === "en") {
    return `${h12}:${mm} ${isPM ? "PM" : "AM"}`;
  }

  // Smart natural Bengali time
  const period = h < 5 ? "ভোর" : h < 12 ? "সকাল" : h < 15 ? "দুপুর" : h < 18 ? "বিকাল" : "রাত";
  return `${period} ${h12}:${mm}`;
}

/** Check whether user is attempting to mark an item complete before its scheduled time */
export function isEarlyCheck(
  title: string,
  timeStr: string | undefined,
  alreadyDone: boolean,
  checkDate: string = today(),
  lang: Lang = "bn",
  timeFormat: TimeFormat = "12h"
): { isEarly: boolean; message: string; scheduledTime: string } {
  // 1. Unchecking is always allowed
  if (alreadyDone) {
    return { isEarly: false, message: "", scheduledTime: "" };
  }

  // 2. Marking for past days is allowed
  const todayStr = today();
  if (checkDate < todayStr) {
    return { isEarly: false, message: "", scheduledTime: "" };
  }

  // 3. If no scheduled time, allow anytime
  if (!timeStr || !timeStr.trim() || !timeStr.includes(":")) {
    return { isEarly: false, message: "", scheduledTime: "" };
  }

  const [hStr, mStr] = timeStr.split(":");
  const scheduledHour = parseInt(hStr, 10);
  const scheduledMin = parseInt(mStr, 10);
  if (isNaN(scheduledHour) || isNaN(scheduledMin)) {
    return { isEarly: false, message: "", scheduledTime: "" };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduledMinutes = scheduledHour * 60 + scheduledMin;

  // 4. If current time is strictly earlier than scheduled time
  if (currentMinutes < scheduledMinutes) {
    const formatted = formatAppTime(timeStr, timeFormat, lang);
    const msg =
      lang === "bn"
        ? `🕌 এখনো "${title}"-এর নির্ধারিত সময় হয়নি। ওয়াক্ত হলে (${formatted}) ইনশাআল্লাহ চেক দিতে পারবেন।`
        : `⏰ It is not time for "${title}" yet. You can mark it after ${formatted}.`;
    return { isEarly: true, message: msg, scheduledTime: formatted };
  }

  return { isEarly: false, message: "", scheduledTime: "" };
}

interface State {
  profile: Profile | null;
  lang: Lang;
  theme: Theme;
  timeFormat: TimeFormat;
  remindTone: RemindTone;
  aggressiveTone: AggressiveTone;

  items: Item[];
  goals: Goal[];
  todos: TodoItem[];
  prayers: Prayer[];

  chat: ChatMsg[];
  chatSessions: ChatSession[];
  activeSessionId: string;

  authUser: AuthUser | null;
  userFriendCode: string;
  aiMemory: AiMemory;
  hijriOffset: number;
  notificationsEnabled: boolean;
  appNotifications: AppNotification[];
  earlyCheckWarning: EarlyCheckWarning | null;

  setProfile: (p: Profile) => void;
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  setTimeFormat: (tf: TimeFormat) => void;
  setRemindTone: (rt: RemindTone) => void;
  setAggressiveTone: (at: AggressiveTone) => void;
  setEarlyCheckWarning: (w: EarlyCheckWarning | null) => void;

  // Habits & generic items
  addItem: (kind: ItemKind, title: string, time: string) => void;
  removeItem: (id: string) => void;
  toggleItem: (id: string, date?: string) => void;
  setItemNotify: (id: string, mode: NotifyMode) => void;
  setItemTime: (id: string, time: string) => void;

  // Goals with daily actionable tasks
  addGoal: (title: string, deadline?: string, initialSubTaskTitle?: string) => void;
  removeGoal: (id: string) => void;
  addGoalSubTask: (goalId: string, title: string, time?: string) => void;
  removeGoalSubTask: (goalId: string, subTaskId: string) => void;
  toggleGoalSubTask: (goalId: string, subTaskId: string, date?: string) => void;

  // To-Do items (One-time, non-daily)
  addTodo: (title: string, dueDate?: string, time?: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  clearAllTodos: () => void;
  clearAllHabits: () => void;
  clearAllItems: () => void;
  removeTodoByTitle: (title: string) => void;
  removeHabitByTitle: (title: string) => void;
  removeGoalByTitle: (title: string) => void;
  setTodoNotify: (id: string, mode: NotifyMode) => void;

  // Prayers
  setPrayer: (key: PrayerKey, patch: Partial<Prayer>) => void;
  markPrayer: (key: PrayerKey, date?: string, done?: boolean) => void;
  setChat: (c: ChatMsg[]) => void;

  // Multi-session AI actions
  createChatSession: (title?: string) => string;
  switchChatSession: (id: string) => void;
  deleteChatSession: (id: string) => void;
  addChatMessage: (msg: ChatMsg) => void;
  setAiMemory: (patch: Partial<AiMemory>) => void;

  // Auth & Friend
  setAuthUser: (u: AuthUser | null) => void;
  setUserFriendCode: (code: string) => void;

  // Calendar & Settings
  setHijriOffset: (offset: number) => void;
  setNotificationsEnabled: (enabled: boolean) => void;

  // Home Screen Notifications
  addAppNotification: (
    notifOrType: Omit<AppNotification, "id" | "createdAt" | "read"> | AppNotification["type"],
    titleArg?: string,
    bodyArg?: string
  ) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
}

/** Turning one mode on turns the other off; tapping the active one turns it off. */
export function nextMode(current: NotifyMode, tapped: Exclude<NotifyMode, "off">): NotifyMode {
  return current === tapped ? "off" : tapped;
}

const toggleDate = (arr: string[], d: string, force?: boolean) => {
  const has = arr.includes(d);
  const want = force ?? !has;
  if (want && !has) return [...arr, d];
  if (!want && has) return arr.filter((x) => x !== d);
  return arr;
};

export const useApp = create<State>()(
  persist(
    (set, get) => {
      const initialSessionId = uid();
      return {
        profile: null,
        lang: "bn",
        theme: "midnight",
        timeFormat: "12h",
        remindTone: "gentle_bell",
        aggressiveTone: "pulse_radar",

        items: [],
        goals: [],
        todos: [],
        prayers: [
          { key: "fajr", time: "05:00", notify: "normal", doneDates: [] },
          { key: "dhuhr", time: "13:15", notify: "normal", doneDates: [] },
          { key: "asr", time: "16:30", notify: "normal", doneDates: [] },
          { key: "maghrib", time: "18:00", notify: "normal", doneDates: [] },
          { key: "isha", time: "19:30", notify: "normal", doneDates: [] },
        ],
        chat: [],
        chatSessions: [
          {
            id: initialSessionId,
            title: "প্রথম আলোচনা / New Chat",
            createdAt: today(),
            messages: [],
          },
        ],
        activeSessionId: initialSessionId,
        authUser: null,
        userFriendCode: generateCode(),
        aiMemory: {
          tone: "warm, friendly, human, concise",
          preferences: [],
          learnedNotes: [],
        },
        hijriOffset: 0,
        notificationsEnabled: true,
        earlyCheckWarning: null,
        appNotifications: [
          {
            id: "notif-welcome",
            title: "নূর হ্যাবিটে স্বাগতম! ✨",
            body: "আপনার প্রতিদিনের নামাজ ও লক্ষ্য পূরণে আমরা আপনার সাথে আছি।",
            type: "system",
            createdAt: "আজ",
            read: false,
          },
        ],

        setProfile: (profile) => set({ profile }),
        setLang: (lang) => set({ lang }),
        setTheme: (theme) => set({ theme }),
        setTimeFormat: (timeFormat) => set({ timeFormat }),
        setRemindTone: (remindTone) => set({ remindTone }),
        setAggressiveTone: (aggressiveTone) => set({ aggressiveTone }),
        setEarlyCheckWarning: (earlyCheckWarning) => set({ earlyCheckWarning }),

        // Habit & Generic Items
        addItem: (kind, title, time) =>
          set((s) => ({
            items: [
              ...s.items,
              {
                id: uid(),
                kind,
                title,
                time,
                notify: time.trim() ? "normal" : "off",
                doneDates: [],
                createdAt: today(),
              },
            ],
          })),
        removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
        toggleItem: (id, date = today()) => {
          const s = get();
          const item = s.items.find((i) => i.id === id);
          if (!item) return;
          const isDone = item.doneDates.includes(date);

          if (!isDone) {
            const early = isEarlyCheck(
              item.title,
              item.time,
              isDone,
              date,
              s.lang,
              s.timeFormat
            );
            if (early.isEarly) {
              set({
                earlyCheckWarning: {
                  title: item.title,
                  scheduledTime: early.scheduledTime,
                  message: early.message,
                },
              });
              return;
            }
          }

          set((state) => ({
            items: state.items.map((i) => (i.id === id ? { ...i, doneDates: toggleDate(i.doneDates, date) } : i)),
          }));
        },
        setItemNotify: (id, notify) =>
          set((s) => ({
            items: s.items.map((i) => {
              if (i.id !== id) return i;
              if (!i.time || !i.time.trim()) {
                return { ...i, notify: "off" };
              }
              return { ...i, notify };
            }),
          })),
        setItemTime: (id, time) =>
          set((s) => ({
            items: s.items.map((i) => {
              if (i.id !== id) return i;
              const nextNotify = !time.trim() ? "off" : i.notify;
              return { ...i, time, notify: nextNotify };
            }),
          })),

        // Goals with Daily Tasks
        addGoal: (title, deadline, initialSubTaskTitle) =>
          set((s) => {
            const newGoal: Goal = {
              id: uid(),
              title,
              deadline: deadline || "",
              createdAt: today(),
              subTasks: initialSubTaskTitle
                ? [{ id: uid(), title: initialSubTaskTitle, doneDates: [] }]
                : [],
            };
            return { goals: [newGoal, ...s.goals] };
          }),
        removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
        removeGoalByTitle: (title) =>
          set((s) => ({ goals: s.goals.filter((g) => g.title.trim().toLowerCase() !== title.trim().toLowerCase()) })),
        addGoalSubTask: (goalId, title, time) =>
          set((s) => ({
            goals: s.goals.map((g) =>
              g.id === goalId
                ? {
                    ...g,
                    subTasks: [
                      ...(g.subTasks || []),
                      { id: uid(), title, time: time || "", doneDates: [] },
                    ],
                  }
                : g
            ),
          })),
        removeGoalSubTask: (goalId, subTaskId) =>
          set((s) => ({
            goals: s.goals.map((g) =>
              g.id === goalId
                ? { ...g, subTasks: (g.subTasks || []).filter((st) => st.id !== subTaskId) }
                : g
            ),
          })),
        toggleGoalSubTask: (goalId, subTaskId, date = today()) => {
          const s = get();
          const goal = s.goals.find((g) => g.id === goalId);
          const subTask = goal?.subTasks?.find((st) => st.id === subTaskId);
          const isDone = (subTask?.doneDates || []).includes(date);

          if (subTask && !isDone && subTask.time) {
            const early = isEarlyCheck(
              subTask.title,
              subTask.time,
              isDone,
              date,
              s.lang,
              s.timeFormat
            );
            if (early.isEarly) {
              set({
                earlyCheckWarning: {
                  title: subTask.title,
                  scheduledTime: early.scheduledTime,
                  message: early.message,
                },
              });
              return;
            }
          }

          set((state) => ({
            goals: state.goals.map((g) =>
              g.id === goalId
                ? {
                    ...g,
                    subTasks: (g.subTasks || []).map((st) =>
                      st.id === subTaskId ? { ...st, doneDates: toggleDate(st.doneDates, date) } : st
                    ),
                  }
                : g
            ),
          }));
        },

        // To-Do List (One-time Tasks)
        addTodo: (title, dueDate, time) =>
          set((s) => ({
            todos: [
              {
                id: uid(),
                title,
                dueDate: dueDate || today(),
                time: time || "",
                notify: time && time.trim() ? "normal" : "off",
                completed: false,
                createdAt: today(),
              },
              ...s.todos,
            ],
          })),
        toggleTodo: (id) => {
          const s = get();
          const td = s.todos.find((t) => t.id === id);
          if (!td) return;
          const isDone = td.completed;

          if (!isDone && td.time && td.dueDate === today()) {
            const early = isEarlyCheck(
              td.title,
              td.time,
              isDone,
              today(),
              s.lang,
              s.timeFormat
            );
            if (early.isEarly) {
              set({
                earlyCheckWarning: {
                  title: td.title,
                  scheduledTime: early.scheduledTime,
                  message: early.message,
                },
              });
              return;
            }
          }

          set((state) => ({
            todos: state.todos.map((t) =>
              t.id === id
                ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined }
                : t
            ),
          }));
        },
        removeTodo: (id) => set((s) => ({ todos: s.todos.filter((td) => td.id !== id) })),
        clearAllTodos: () => set({ todos: [] }),
        clearAllHabits: () => set((s) => ({ items: s.items.filter((i) => i.kind !== "habit") })),
        clearAllItems: () => set({ items: [] }),
        removeTodoByTitle: (title) =>
          set((s) => ({
            todos: s.todos.filter((t) => t.title.trim().toLowerCase() !== title.trim().toLowerCase()),
          })),
        removeHabitByTitle: (title) =>
          set((s) => ({
            items: s.items.filter(
              (i) => !(i.kind === "habit" && i.title.trim().toLowerCase() === title.trim().toLowerCase())
            ),
          })),
        setTodoNotify: (id, notify) =>
          set((s) => ({
            todos: s.todos.map((td) => {
              if (td.id !== id) return td;
              if (!td.time || !td.time.trim()) return { ...td, notify: "off" };
              return { ...td, notify };
            }),
          })),

        // Prayers
        setPrayer: (key, patch) =>
          set((s) => ({ prayers: s.prayers.map((p) => (p.key === key ? { ...p, ...patch } : p)) })),
        markPrayer: (key, date = today(), done) => {
          const s = get();
          const prayer = s.prayers.find((p) => p.key === key);
          const isDone = (prayer?.doneDates || []).includes(date);
          const prayerName = s.lang === "bn" ? PRAYER_NAMES_BN[key] || key : key.toUpperCase();

          if (!isDone && (done === undefined || done === true)) {
            const early = isEarlyCheck(
              prayerName,
              prayer?.time,
              isDone,
              date,
              s.lang,
              s.timeFormat
            );
            if (early.isEarly) {
              set({
                earlyCheckWarning: {
                  title: prayerName,
                  scheduledTime: early.scheduledTime,
                  message: early.message,
                },
              });
              return;
            }
          }

          set((state) => ({
            prayers: state.prayers.map((p) =>
              p.key === key ? { ...p, doneDates: toggleDate(p.doneDates, date, done) } : p,
            ),
          }));
        },

        setChat: (chat) => {
          set((s) => {
            const sid = s.activeSessionId;
            const updatedSessions = s.chatSessions.map((sess) =>
              sess.id === sid ? { ...sess, messages: chat } : sess,
            );
            return { chat, chatSessions: updatedSessions };
          });
        },

        createChatSession: (title) => {
          const newId = uid();
          const newSession: ChatSession = {
            id: newId,
            title: title || (get().lang === "bn" ? "নতুন আলোচনা" : "New Chat"),
            createdAt: today(),
            messages: [],
          };
          set((s) => ({
            chatSessions: [newSession, ...s.chatSessions],
            activeSessionId: newId,
            chat: [],
          }));
          return newId;
        },

        switchChatSession: (id) => {
          const target = get().chatSessions.find((s) => s.id === id);
          if (target) {
            set({ activeSessionId: id, chat: target.messages });
          }
        },

        deleteChatSession: (id) => {
          set((s) => {
            const filtered = s.chatSessions.filter((x) => x.id !== id);
            const remaining =
              filtered.length > 0
                ? filtered
                : [
                    {
                      id: uid(),
                      title: s.lang === "bn" ? "নতুন আলোচনা" : "New Chat",
                      createdAt: today(),
                      messages: [],
                    },
                  ];
            const nextActive = remaining[0].id;
            return {
              chatSessions: remaining,
              activeSessionId: nextActive,
              chat: remaining[0].messages,
            };
          });
        },

        addChatMessage: (msg) => {
          set((s) => {
            const nextChat = [...s.chat, msg];
            const sid = s.activeSessionId;
            const updatedSessions = s.chatSessions.map((sess) => {
              if (sess.id === sid) {
                const title =
                  sess.messages.length === 0 && msg.role === "user"
                    ? msg.content.slice(0, 24) + (msg.content.length > 24 ? "..." : "")
                    : sess.title;
                return { ...sess, title, messages: nextChat };
              }
              return sess;
            });
            return { chat: nextChat, chatSessions: updatedSessions };
          });
        },

        setAiMemory: (patch) => set((s) => ({ aiMemory: { ...s.aiMemory, ...patch } })),

        setAuthUser: (authUser) => set({ authUser }),
        setUserFriendCode: (userFriendCode) => set({ userFriendCode }),

        setHijriOffset: (hijriOffset) => set({ hijriOffset }),
        setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),

        addAppNotification: (notifOrType: any, titleArg?: string, bodyArg?: string) => {
          const s = get();
          let notif: Omit<AppNotification, "id" | "createdAt" | "read">;

          if (typeof notifOrType === "string") {
            notif = {
              type: notifOrType as any,
              title: titleArg || "",
              body: bodyArg || "",
            };
          } else {
            notif = notifOrType;
          }

          if (!notif || !notif.title || !notif.title.trim()) return;

          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          const formattedTime = formatAppTime(timeStr, s.timeFormat, s.lang);

          set((state) => ({
            appNotifications: [
              {
                id: uid(),
                ...notif,
                createdAt: formattedTime,
                read: false,
              },
              ...state.appNotifications
                .filter((n) => n && n.title && n.title.trim())
                .slice(0, 30),
            ],
          }));
        },

        markNotificationRead: (id) =>
          set((s) => ({
            appNotifications: s.appNotifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
          })),
        markAllNotificationsRead: () =>
          set((s) => ({
            appNotifications: s.appNotifications.map((n) => ({ ...n, read: true })),
          })),
        clearNotifications: () => set({ appNotifications: [] }),
      };
    },
    {
      name: "deen-habit-store",
      version: 4,
      migrate: (persistedState: any) => {
        if (!persistedState || typeof persistedState !== "object") return persistedState;

        if (!Array.isArray(persistedState.goals)) persistedState.goals = [];
        if (!Array.isArray(persistedState.todos)) persistedState.todos = [];
        if (!Array.isArray(persistedState.items)) persistedState.items = [];
        if (!Array.isArray(persistedState.appNotifications)) persistedState.appNotifications = [];
        if (!Array.isArray(persistedState.chatSessions)) persistedState.chatSessions = [];
        if (!Array.isArray(persistedState.chat)) persistedState.chat = [];

        // Purge corrupted/blank notifications
        persistedState.appNotifications = persistedState.appNotifications.filter(
          (n: any) => n && typeof n.title === "string" && n.title.trim() !== ""
        );

        // Remove sample data from old installs
        persistedState.goals = persistedState.goals.filter(
          (g: any) => g && g.id !== "goal-sample-1" && !g.title?.includes("ক্লায়েন্ট")
        );
        persistedState.todos = persistedState.todos.filter(
          (td: any) => td && td.id !== "todo-sample-1" && !td.title?.includes("দাওয়াত")
        );

        persistedState.goals.forEach((g: any) => {
          if (!g) return;
          if (!Array.isArray(g.subTasks)) g.subTasks = [];
          g.subTasks.forEach((st: any) => {
            if (st && !Array.isArray(st.doneDates)) st.doneDates = [];
          });
        });

        return persistedState;
      },
    }
  )
);
