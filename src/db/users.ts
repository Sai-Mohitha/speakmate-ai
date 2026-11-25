import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./index.ts";
import {
  chatMessages,
  mentorshipBookings,
  practiceSessions,
  users,
} from "./schema.ts";
import type {
  ChatbotMessageRecord,
  MentorshipBooking,
  PracticeMode,
  PracticeSessionRecord,
  ProficiencyLevel,
  UserProfile,
} from "../types/index.ts";

const DEFAULT_GOALS = [
  "Speak fluently in job interviews",
  "Improve workplace meeting clarity",
];

function mapUserRow(row: typeof users.$inferSelect): UserProfile {
  return {
    id: row.uid,
    name: row.name,
    email: row.email,
    role: row.role === "Working Professional" ? "Working Professional" : "Student",
    proficiencyLevel:
      row.proficiencyLevel === "Beginner" || row.proficiencyLevel === "Advanced"
        ? row.proficiencyLevel
        : "Intermediate",
    communicationGoals: Array.isArray(row.communicationGoals)
      ? row.communicationGoals
      : DEFAULT_GOALS,
    preferredMode: (row.preferredMode as PracticeMode) || "Friendly Conversation",
    dailyGoalMinutes: row.dailyGoalMinutes,
    preferredAvailability: row.preferredAvailability,
    createdAt: row.createdAt.toISOString(),
    authProvider: "google",
    photoURL: row.photoUrl ?? undefined,
  };
}

function mapSessionRow(
  row: typeof practiceSessions.$inferSelect,
  uid: string
): PracticeSessionRecord {
  return {
    id: row.id,
    userId: uid,
    mode: row.mode as PracticeMode,
    level: row.level as ProficiencyLevel,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    durationMinutes: row.durationMinutes,
    messageCount: row.messageCount,
    corrections: Array.isArray(row.corrections) ? row.corrections : [],
    vocabularyLearned: Array.isArray(row.vocabularyLearned)
      ? row.vocabularyLearned
      : [],
    summary: row.summary ?? undefined,
  };
}

function mapBookingRow(
  row: typeof mentorshipBookings.$inferSelect,
  uid: string
): MentorshipBooking {
  return {
    id: row.id,
    userId: uid,
    coachId: row.coachId,
    coachName: row.coachName,
    coachExpertise: row.coachExpertise,
    preferredDate: row.preferredDate,
    preferredTime: row.preferredTime,
    sessionPurpose: row.sessionPurpose,
    createdAt: row.createdAt.toISOString(),
    status: "Demo Request Saved",
    isDemoBooking: true,
  };
}

function mapChatRow(
  row: typeof chatMessages.$inferSelect,
  uid: string
): ChatbotMessageRecord {
  return {
    id: row.id,
    userId: uid,
    role: row.role === "model" ? "model" : "user",
    text: row.text,
    persona: row.persona,
    modelUsed: row.modelUsed,
    sources: Array.isArray(row.sources) ? row.sources : [],
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getOrCreateSqlUser(params: {
  uid: string;
  email: string;
  name?: string;
  photoUrl?: string | null;
}) {
  try {
    const safeName =
      params.name?.trim() ||
      params.email.split("@")[0] ||
      "SpeakMate Learner";

    const [row] = await db
      .insert(users)
      .values({
        uid: params.uid,
        email: params.email,
        name: safeName.slice(0, 100),
        role: "Student",
        proficiencyLevel: "Intermediate",
        communicationGoals: DEFAULT_GOALS,
        preferredMode: "Friendly Conversation",
        dailyGoalMinutes: 15,
        preferredAvailability: "Weekday Evenings",
        photoUrl: params.photoUrl ?? null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: params.email,
          ...(params.photoUrl ? { photoUrl: params.photoUrl } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return row;
  } catch (error) {
    console.error("Failed to upsert SQL user:", error);
    throw new Error("Database operation failed. Please try again later.", {
      cause: error,
    });
  }
}

export async function getUserWorkspaceFromSql(params: {
  uid: string;
  email: string;
  name?: string;
  photoUrl?: string | null;
}): Promise<{
  profile: UserProfile;
  sessions: PracticeSessionRecord[];
  bookings: MentorshipBooking[];
  chatMessages: ChatbotMessageRecord[];
}> {
  try {
    const userRow = await getOrCreateSqlUser(params);

    const [sessionRows, bookingRows, chatRows] = await Promise.all([
      db
        .select()
        .from(practiceSessions)
        .where(eq(practiceSessions.userId, userRow.id))
        .orderBy(desc(practiceSessions.createdAt)),
      db
        .select()
        .from(mentorshipBookings)
        .where(eq(mentorshipBookings.userId, userRow.id))
        .orderBy(desc(mentorshipBookings.createdAt)),
      db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.userId, userRow.id))
        .orderBy(asc(chatMessages.createdAt)),
    ]);

    return {
      profile: mapUserRow(userRow),
      sessions: sessionRows.map((row) => mapSessionRow(row, userRow.uid)),
      bookings: bookingRows.map((row) => mapBookingRow(row, userRow.uid)),
      chatMessages: chatRows.map((row) => mapChatRow(row, userRow.uid)),
    };
  } catch (error) {
    console.error("Failed to load user workspace from SQL:", error);
    throw new Error("Unable to load your account data right now.", {
      cause: error,
    });
  }
}

export async function updateSqlUserProfile(
  uid: string,
  email: string,
  updates: {
    name: string;
    role: "Student" | "Working Professional";
    proficiencyLevel: ProficiencyLevel;
    communicationGoals: string[];
    preferredMode: PracticeMode;
    dailyGoalMinutes: number;
    preferredAvailability: string;
  }
): Promise<UserProfile> {
  try {
    await getOrCreateSqlUser({ uid, email, name: updates.name });

    const [updated] = await db
      .update(users)
      .set({
        name: updates.name,
        role: updates.role,
        proficiencyLevel: updates.proficiencyLevel,
        communicationGoals: updates.communicationGoals,
        preferredMode: updates.preferredMode,
        dailyGoalMinutes: updates.dailyGoalMinutes,
        preferredAvailability: updates.preferredAvailability,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    return mapUserRow(updated);
  } catch (error) {
    console.error("Failed to update SQL user profile:", error);
    throw new Error("Unable to update your profile right now.", {
      cause: error,
    });
  }
}

export async function createSqlPracticeSession(
  uid: string,
  email: string,
  session: PracticeSessionRecord
): Promise<PracticeSessionRecord> {
  try {
    const userRow = await getOrCreateSqlUser({ uid, email });

    const [inserted] = await db
      .insert(practiceSessions)
      .values({
        id: session.id,
        userId: userRow.id,
        mode: session.mode,
        level: session.level,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        durationMinutes: session.durationMinutes,
        messageCount: session.messageCount,
        corrections: session.corrections,
        vocabularyLearned: session.vocabularyLearned,
        summary: session.summary ?? null,
      })
      .onConflictDoNothing({ target: practiceSessions.id })
      .returning();

    if (!inserted) {
      return { ...session, userId: uid };
    }
    return mapSessionRow(inserted, uid);
  } catch (error) {
    console.error("Failed to save practice session to SQL:", error);
    throw new Error("Unable to save your practice session right now.", {
      cause: error,
    });
  }
}

export async function createSqlMentorshipBooking(
  uid: string,
  email: string,
  booking: MentorshipBooking
): Promise<MentorshipBooking> {
  try {
    const userRow = await getOrCreateSqlUser({ uid, email });

    const [inserted] = await db
      .insert(mentorshipBookings)
      .values({
        id: booking.id,
        userId: userRow.id,
        coachId: booking.coachId,
        coachName: booking.coachName,
        coachExpertise: booking.coachExpertise,
        preferredDate: booking.preferredDate,
        preferredTime: booking.preferredTime,
        sessionPurpose: booking.sessionPurpose,
        status: "Demo Request Saved",
        isDemoBooking: true,
      })
      .onConflictDoNothing({ target: mentorshipBookings.id })
      .returning();

    if (!inserted) {
      return { ...booking, userId: uid };
    }
    return mapBookingRow(inserted, uid);
  } catch (error) {
    console.error("Failed to save mentorship booking to SQL:", error);
    throw new Error("Unable to save your booking right now.", {
      cause: error,
    });
  }
}

export async function deleteSqlMentorshipBooking(
  uid: string,
  bookingId: string
): Promise<void> {
  try {
    const [userRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (!userRow) return;

    await db
      .delete(mentorshipBookings)
      .where(
        and(
          eq(mentorshipBookings.id, bookingId),
          eq(mentorshipBookings.userId, userRow.id)
        )
      );
  } catch (error) {
    console.error("Failed to delete mentorship booking from SQL:", error);
    throw new Error("Unable to cancel this session right now.", {
      cause: error,
    });
  }
}

export async function createSqlChatMessage(
  uid: string,
  email: string,
  msg: ChatbotMessageRecord
): Promise<ChatbotMessageRecord> {
  try {
    const userRow = await getOrCreateSqlUser({ uid, email });

    const [inserted] = await db
      .insert(chatMessages)
      .values({
        id: msg.id,
        userId: userRow.id,
        role: msg.role,
        text: msg.text,
        persona: msg.persona,
        modelUsed: msg.modelUsed,
        sources: msg.sources ?? [],
      })
      .onConflictDoNothing({ target: chatMessages.id })
      .returning();

    if (!inserted) {
      return { ...msg, userId: uid };
    }
    return mapChatRow(inserted, uid);
  } catch (error) {
    console.error("Failed to save chat message to SQL:", error);
    throw new Error("Unable to save your chat message right now.", {
      cause: error,
    });
  }
}

export async function clearSqlChatMessages(uid: string): Promise<void> {
  try {
    const [userRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (!userRow) return;

    await db.delete(chatMessages).where(eq(chatMessages.userId, userRow.id));
  } catch (error) {
    console.error("Failed to clear chat messages from SQL:", error);
    throw new Error("Unable to clear chat history right now.", {
      cause: error,
    });
  }
}
