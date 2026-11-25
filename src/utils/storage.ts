import { createSampleDemoSessions } from "../data/demoData";
import type {
  ChatbotMessageRecord,
  MentorshipBooking,
  PracticeSessionRecord,
  UserProfile,
  VocabularyItem,
} from "../types";

const KEYS = {
  USERS: "speakmate_demo_users_v1",
  ACTIVE_USER_ID: "speakmate_demo_active_user_v1",
  SESSIONS: "speakmate_demo_sessions_v1",
  BOOKINGS: "speakmate_demo_bookings_v1",
  CHAT_MESSAGES: "speakmate_demo_chat_messages_v1",
  SAVED_VOCAB: "speakmate_saved_vocab_v1",
} as const;

export const PRESEEDED_DEMO_EMAIL = "mohitha.student@speakmate.ai";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function hashDemoPassword(password: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const data = new TextEncoder().encode(`speakmate-demo:${password}`);
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return `demo_${Math.abs(hash).toString(16)}`;
}

export function loadAllUsers(): UserProfile[] {
  return safeParse<UserProfile[]>(localStorage.getItem(KEYS.USERS), []);
}

function saveAllUsers(users: UserProfile[]): void {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
}

export function getActiveUser(): UserProfile | null {
  const activeId = localStorage.getItem(KEYS.ACTIVE_USER_ID);
  if (!activeId) return null;
  const users = loadAllUsers();
  return users.find((u) => u.id === activeId) ?? null;
}

export function setActiveUserId(userId: string | null): void {
  if (userId) {
    localStorage.setItem(KEYS.ACTIVE_USER_ID, userId);
  } else {
    localStorage.removeItem(KEYS.ACTIVE_USER_ID);
  }
}

export async function registerDemoUser(params: {
  name: string;
  email: string;
  password: string;
  role: "Student" | "Working Professional";
}): Promise<{ user?: UserProfile; error?: string }> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const users = loadAllUsers();
  if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return { error: "An account with this email already exists in this browser." };
  }

  const passwordHash = await hashDemoPassword(params.password);
  const newUser: UserProfile = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: params.name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: params.role,
    proficiencyLevel: "Intermediate",
    communicationGoals: [
      "Speak fluently in job interviews",
      "Expand professional vocabulary",
      "Reduce recurring grammar mistakes",
    ],
    preferredMode: "HR Interview Practice",
    dailyGoalMinutes: 20,
    preferredAvailability: "Weekday Evenings",
    createdAt: new Date().toISOString(),
  };

  saveAllUsers([...users, newUser]);
  setActiveUserId(newUser.id);
  return { user: newUser };
}

export async function loginDemoUser(
  email: string,
  password: string
): Promise<{ user?: UserProfile; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const users = loadAllUsers();
  const found = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!found) {
    if (normalizedEmail === PRESEEDED_DEMO_EMAIL && password === "demo1234") {
      const demoUser = await loginOrCreatePreseededDemoAccount();
      return { user: demoUser };
    }
    return {
      error: "No account matches this email. Create an account or load the sample learner workspace.",
    };
  }
  const passwordHash = await hashDemoPassword(password);
  if (found.passwordHash !== passwordHash) {
    return { error: "Incorrect password. Please try again." };
  }
  setActiveUserId(found.id);
  return { user: found };
}

export async function loginOrCreatePreseededDemoAccount(): Promise<UserProfile> {
  const users = loadAllUsers();
  const existing = users.find(
    (u) => u.id === "user_demo_mohitha" || u.email === PRESEEDED_DEMO_EMAIL
  );
  if (existing) {
    setActiveUserId(existing.id);
    // Ensure demo student has sample sessions if empty
    const existingSessions = loadUserSessions(existing.id);
    if (existingSessions.length === 0) {
      seedSampleSessionsForUser(existing.id);
    }
    return existing;
  }

  const passwordHash = await hashDemoPassword("demo1234");
  const demoUser: UserProfile = {
    id: "user_demo_mohitha",
    name: "Mohitha",
    email: PRESEEDED_DEMO_EMAIL,
    passwordHash,
    role: "Student",
    proficiencyLevel: "Intermediate",
    communicationGoals: [
      "Speak fluently in job interviews",
      "Expand professional vocabulary",
      "Reduce recurring grammar mistakes",
    ],
    preferredMode: "HR Interview Practice",
    dailyGoalMinutes: 20,
    preferredAvailability: "Weekday Evenings",
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    isPreseededDemo: true,
  };

  saveAllUsers([...users, demoUser]);
  seedSampleSessionsForUser(demoUser.id);
  setActiveUserId(demoUser.id);
  return demoUser;
}

export function seedSampleSessionsForUser(userId: string): PracticeSessionRecord[] {
  const allSessions = safeParse<PracticeSessionRecord[]>(
    localStorage.getItem(KEYS.SESSIONS),
    []
  ).filter((s) => s.userId !== userId);
  const sampleSessions = createSampleDemoSessions(userId);
  const next = [...sampleSessions, ...allSessions];
  localStorage.setItem(KEYS.SESSIONS, JSON.stringify(next));
  return sampleSessions;
}

export function clearUserSessions(userId: string): PracticeSessionRecord[] {
  const allSessions = safeParse<PracticeSessionRecord[]>(
    localStorage.getItem(KEYS.SESSIONS),
    []
  );
  const next = allSessions.filter((s) => s.userId !== userId);
  localStorage.setItem(KEYS.SESSIONS, JSON.stringify(next));

  const allVocab = safeParse<Record<string, VocabularyItem[]>>(
    localStorage.getItem(KEYS.SAVED_VOCAB),
    {}
  );
  delete allVocab[userId];
  localStorage.setItem(KEYS.SAVED_VOCAB, JSON.stringify(allVocab));
  return [];
}

export function loadSavedVocab(userId: string): VocabularyItem[] {
  const all = safeParse<Record<string, VocabularyItem[]>>(
    localStorage.getItem(KEYS.SAVED_VOCAB),
    {}
  );
  return all[userId] ?? [];
}

export function toggleSavedVocab(userId: string, item: VocabularyItem): VocabularyItem[] {
  const all = safeParse<Record<string, VocabularyItem[]>>(
    localStorage.getItem(KEYS.SAVED_VOCAB),
    {}
  );
  const current = all[userId] ?? [];
  const key = item.word.trim().toLowerCase();
  const exists = current.some((v) => v.word.trim().toLowerCase() === key);
  const nextForUser = exists
    ? current.filter((v) => v.word.trim().toLowerCase() !== key)
    : [{ ...item, learnedAt: item.learnedAt ?? new Date().toISOString() }, ...current];
  all[userId] = nextForUser;
  localStorage.setItem(KEYS.SAVED_VOCAB, JSON.stringify(all));
  return nextForUser;
}

export function updateUserProfile(updated: UserProfile): UserProfile {
  const users = loadAllUsers();
  const nextUsers = users.map((u) => (u.id === updated.id ? updated : u));
  saveAllUsers(nextUsers);
  return updated;
}

export function loadUserSessions(userId: string): PracticeSessionRecord[] {
  const all = safeParse<PracticeSessionRecord[]>(localStorage.getItem(KEYS.SESSIONS), []);
  return all
    .filter((s) => s.userId === userId)
    .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
}

export function savePracticeSession(session: PracticeSessionRecord): PracticeSessionRecord[] {
  const all = safeParse<PracticeSessionRecord[]>(localStorage.getItem(KEYS.SESSIONS), []);
  const next = [session, ...all.filter((s) => s.id !== session.id)];
  localStorage.setItem(KEYS.SESSIONS, JSON.stringify(next));
  return next
    .filter((s) => s.userId === session.userId)
    .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
}

export function loadUserBookings(userId: string): MentorshipBooking[] {
  const all = safeParse<MentorshipBooking[]>(localStorage.getItem(KEYS.BOOKINGS), []);
  return all
    .filter((b) => b.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveMentorshipBooking(booking: MentorshipBooking): MentorshipBooking[] {
  const all = safeParse<MentorshipBooking[]>(localStorage.getItem(KEYS.BOOKINGS), []);
  const next = [booking, ...all];
  localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(next));
  return next
    .filter((b) => b.userId === booking.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function deleteMentorshipBooking(userId: string, bookingId: string): MentorshipBooking[] {
  const all = safeParse<MentorshipBooking[]>(localStorage.getItem(KEYS.BOOKINGS), []);
  const next = all.filter((b) => !(b.userId === userId && b.id === bookingId));
  localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(next));
  return next
    .filter((b) => b.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function loadUserChatMessages(userId: string): ChatbotMessageRecord[] {
  const all = safeParse<ChatbotMessageRecord[]>(localStorage.getItem(KEYS.CHAT_MESSAGES), []);
  return all
    .filter((m) => m.userId === userId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function saveChatMessage(message: ChatbotMessageRecord): ChatbotMessageRecord[] {
  const all = safeParse<ChatbotMessageRecord[]>(localStorage.getItem(KEYS.CHAT_MESSAGES), []);
  const next = [...all, message];
  localStorage.setItem(KEYS.CHAT_MESSAGES, JSON.stringify(next));
  return next
    .filter((m) => m.userId === message.userId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function clearUserChatMessages(userId: string): ChatbotMessageRecord[] {
  const all = safeParse<ChatbotMessageRecord[]>(localStorage.getItem(KEYS.CHAT_MESSAGES), []);
  const next = all.filter((m) => m.userId !== userId);
  localStorage.setItem(KEYS.CHAT_MESSAGES, JSON.stringify(next));
  return [];
}

export interface DerivedUserAnalytics {
  totalSessions: number;
  totalMinutes: number;
  todayMinutes: number;
  streakDays: number;
  grammarAccuracy: number;
  uniqueVocabulary: VocabularyItem[];
  grammarCategoryCounts: { category: string; count: number }[];
  weeklyActivity: { dayLabel: string; dateKey: string; minutes: number; sessions: number }[];
  skillBreakdown: {
    fluency: number;
    grammar: number;
    pronunciation: number;
    vocabulary: number;
  };
  accuracyHistory: { label: string; score: number }[];
}

export function computeUserAnalytics(
  sessions: PracticeSessionRecord[],
  extraSavedVocab: VocabularyItem[] = []
): DerivedUserAnalytics {
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + Math.max(0, s.durationMinutes), 0);

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayMinutes = sessions
    .filter((s) => s.endedAt.slice(0, 10) === todayKey)
    .reduce((sum, s) => sum + Math.max(0, s.durationMinutes), 0);

  // Deduplicate learned vocabulary across sessions + marked-as-learned words
  const vocabMap = new Map<string, VocabularyItem>();
  for (const item of extraSavedVocab) {
    const key = item.word.trim().toLowerCase();
    if (key && !vocabMap.has(key)) {
      vocabMap.set(key, item);
    }
  }
  for (const session of sessions) {
    for (const item of session.vocabularyLearned) {
      const key = item.word.trim().toLowerCase();
      if (key && !vocabMap.has(key)) {
        vocabMap.set(key, {
          ...item,
          learnedAt: session.endedAt,
          mode: session.mode,
          topic: session.topic,
        });
      }
    }
  }

  // Grammar category counts & overall accuracy score
  const grammarMap = new Map<string, number>();
  let totalTurns = 0;
  let totalCorrections = 0;
  for (const session of sessions) {
    totalTurns += Math.max(4, session.messageCount);
    totalCorrections += session.corrections.length;
    for (const corr of session.corrections) {
      const cat = corr.category.trim() || "General Grammar";
      grammarMap.set(cat, (grammarMap.get(cat) ?? 0) + 1);
    }
  }
  const grammarCategoryCounts = Array.from(grammarMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const grammarAccuracy =
    totalSessions === 0
      ? 0
      : Math.max(62, Math.min(98, Math.round(100 - (totalCorrections / Math.max(1, totalTurns)) * 100)));

  // Active streak days
  let streakDays = 0;
  if (sessions.length > 0) {
    const practicedDates = new Set(sessions.map((s) => s.endedAt.slice(0, 10)));
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!practicedDates.has(cursor.toISOString().slice(0, 10))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (practicedDates.has(cursor.toISOString().slice(0, 10))) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // Weekly activity ordered Mon–Sun for the current week
  const orderedLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const currentJsDay = now.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = currentJsDay === 0 ? -6 : 1 - currentJsDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const weeklyActivity: { dayLabel: string; dateKey: string; minutes: number; sessions: number }[] =
    orderedLabels.map((label, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const key = d.toISOString().slice(0, 10);
      const daySessions = sessions.filter((s) => s.endedAt.slice(0, 10) === key);
      return {
        dayLabel: label,
        dateKey: key,
        minutes: daySessions.reduce((sum, s) => sum + Math.max(0, s.durationMinutes), 0),
        sessions: daySessions.length,
      };
    });

  // Fallback to rolling 7 days mapped into Mon-Sun if current week happens to have 0 minutes while sessions exist
  const currentWeekSum = weeklyActivity.reduce((acc, d) => acc + d.minutes, 0);
  if (currentWeekSum === 0 && sessions.length > 0) {
    for (const s of sessions.slice(0, 7)) {
      const dt = new Date(s.endedAt);
      if (!Number.isNaN(dt.getTime())) {
        const jsDay = dt.getDay();
        const monIdx = jsDay === 0 ? 6 : jsDay - 1;
        weeklyActivity[monIdx].minutes += Math.max(0, s.durationMinutes);
        weeklyActivity[monIdx].sessions += 1;
      }
    }
  }

  // Skill breakdown derived from saved sessions & vocabulary
  const uniqueVocabulary = Array.from(vocabMap.values());
  const fluency =
    totalSessions === 0 ? 0 : Math.min(96, 66 + Math.min(20, totalSessions * 3) + Math.min(10, Math.floor(totalMinutes / 15)));
  const grammar = totalSessions === 0 ? 0 : grammarAccuracy;
  const pronunciation =
    totalSessions === 0 ? 0 : Math.min(94, 68 + Math.min(18, streakDays * 3) + Math.min(8, totalSessions));
  const vocabulary =
    totalSessions === 0 && uniqueVocabulary.length === 0
      ? 0
      : Math.min(97, 62 + Math.min(35, uniqueVocabulary.length * 4));

  // Accuracy progression across chronological sessions
  const chronological = [...sessions]
    .sort((a, b) => new Date(a.endedAt).getTime() - new Date(b.endedAt).getTime())
    .slice(-6);

  const accuracyHistory = chronological.map((s, idx) => {
    const turns = Math.max(4, s.messageCount);
    const base = Math.max(66, Math.min(98, Math.round(100 - (s.corrections.length / turns) * 100)));
    const dt = new Date(s.endedAt);
    const label = Number.isNaN(dt.getTime())
      ? `S${idx + 1}`
      : dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return { label, score: base };
  });

  return {
    totalSessions,
    totalMinutes,
    todayMinutes,
    streakDays,
    grammarAccuracy,
    uniqueVocabulary,
    grammarCategoryCounts,
    weeklyActivity,
    skillBreakdown: { fluency, grammar, pronunciation, vocabulary },
    accuracyHistory,
  };
}
