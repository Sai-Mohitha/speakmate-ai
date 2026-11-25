import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { db, handleFirestoreError, OperationType } from "../firebase";
import type {
  ChatbotMessageRecord,
  MentorshipBooking,
  PracticeSessionRecord,
  UserProfile,
} from "../types";

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
  return cleaned.length > 0 ? cleaned : `id_${Date.now()}`;
}

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return new Date().toISOString();
}

export async function ensureFirestoreUserProfile(
  fbUser: FirebaseUser
): Promise<UserProfile> {
  const uid = fbUser.uid;
  const userPath = `users/${uid}`;
  const userRef = doc(db, "users", uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: uid,
        name: String(data.name || fbUser.displayName || "Learner").slice(0, 100),
        email: String(data.email || fbUser.email || "").slice(0, 200),
        passwordHash: "",
        role: data.role === "Working Professional" ? "Working Professional" : "Student",
        proficiencyLevel:
          data.proficiencyLevel === "Beginner" || data.proficiencyLevel === "Advanced"
            ? data.proficiencyLevel
            : "Intermediate",
        communicationGoals: Array.isArray(data.communicationGoals)
          ? data.communicationGoals.slice(0, 10).map((g) => String(g).slice(0, 120))
          : [],
        preferredMode: data.preferredMode || "Friendly Conversation",
        dailyGoalMinutes:
          typeof data.dailyGoalMinutes === "number" ? data.dailyGoalMinutes : 15,
        preferredAvailability: String(data.preferredAvailability || "Weekday Evenings").slice(
          0,
          80
        ),
        createdAt: timestampToIso(data.createdAt),
        authProvider: "google",
        photoURL: fbUser.photoURL ?? undefined,
      };
    }

    const defaultProfile = {
      uid,
      name: (fbUser.displayName || fbUser.email?.split("@")[0] || "Learner").slice(0, 100),
      email: (fbUser.email || "learner@example.com").slice(0, 200),
      role: "Student" as const,
      proficiencyLevel: "Intermediate" as const,
      communicationGoals: [
        "Speak fluently in job interviews",
        "Improve workplace meeting clarity",
      ],
      preferredMode: "Friendly Conversation" as const,
      dailyGoalMinutes: 15,
      preferredAvailability: "Weekday Evenings",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, defaultProfile);

    return {
      id: uid,
      name: defaultProfile.name,
      email: defaultProfile.email,
      passwordHash: "",
      role: defaultProfile.role,
      proficiencyLevel: defaultProfile.proficiencyLevel,
      communicationGoals: defaultProfile.communicationGoals,
      preferredMode: defaultProfile.preferredMode,
      dailyGoalMinutes: defaultProfile.dailyGoalMinutes,
      preferredAvailability: defaultProfile.preferredAvailability,
      createdAt: new Date().toISOString(),
      authProvider: "google",
      photoURL: fbUser.photoURL ?? undefined,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function updateFirestoreUserProfile(profile: UserProfile): Promise<void> {
  const userPath = `users/${profile.id}`;
  const userRef = doc(db, "users", profile.id);

  try {
    await updateDoc(userRef, {
      name: profile.name.trim().slice(0, 100),
      role: profile.role,
      proficiencyLevel: profile.proficiencyLevel,
      communicationGoals: profile.communicationGoals.slice(0, 10).map((g) => g.slice(0, 120)),
      preferredMode: profile.preferredMode,
      dailyGoalMinutes: Math.max(5, Math.min(180, Math.round(profile.dailyGoalMinutes))),
      preferredAvailability: profile.preferredAvailability.slice(0, 80),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export function subscribePracticeSessions(
  userId: string,
  onData: (sessions: PracticeSessionRecord[]) => void
): () => void {
  const colPath = `users/${userId}/practiceSessions`;
  const q = query(
    collection(db, "users", userId, "practiceSessions"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: PracticeSessionRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          userId: String(d.userId || userId),
          mode: d.mode,
          level: d.level,
          startedAt: String(d.startedAt || new Date().toISOString()),
          endedAt: String(d.endedAt || new Date().toISOString()),
          durationMinutes: Number(d.durationMinutes || 0),
          messageCount: Number(d.messageCount || 0),
          corrections: Array.isArray(d.corrections) ? d.corrections : [],
          vocabularyLearned: Array.isArray(d.vocabularyLearned) ? d.vocabularyLearned : [],
          summary: d.summary,
        };
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  );
}

export async function saveFirestorePracticeSession(
  record: PracticeSessionRecord
): Promise<void> {
  const safeId = sanitizeId(record.id);
  const docPath = `users/${record.userId}/practiceSessions/${safeId}`;
  const docRef = doc(db, "users", record.userId, "practiceSessions", safeId);

  const payload: Record<string, unknown> = {
    id: safeId,
    userId: record.userId,
    mode: record.mode,
    level: record.level,
    startedAt: record.startedAt.slice(0, 64),
    endedAt: record.endedAt.slice(0, 64),
    durationMinutes: Math.max(0, Math.min(600, Math.round(record.durationMinutes))),
    messageCount: Math.max(0, Math.min(500, Math.round(record.messageCount))),
    corrections: record.corrections.slice(0, 50),
    vocabularyLearned: record.vocabularyLearned.slice(0, 50),
    createdAt: serverTimestamp(),
  };

  if (record.summary) {
    payload.summary = record.summary;
  }

  try {
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export function subscribeMentorshipBookings(
  userId: string,
  onData: (bookings: MentorshipBooking[]) => void
): () => void {
  const colPath = `users/${userId}/mentorshipBookings`;
  const q = query(
    collection(db, "users", userId, "mentorshipBookings"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MentorshipBooking[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          userId: String(d.userId || userId),
          coachId: String(d.coachId || ""),
          coachName: String(d.coachName || ""),
          coachExpertise: String(d.coachExpertise || ""),
          preferredDate: String(d.preferredDate || ""),
          preferredTime: String(d.preferredTime || ""),
          sessionPurpose: String(d.sessionPurpose || ""),
          createdAt: timestampToIso(d.createdAt),
          status: "Demo Request Saved",
          isDemoBooking: true,
        };
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  );
}

export async function saveFirestoreMentorshipBooking(
  booking: MentorshipBooking
): Promise<void> {
  const safeId = sanitizeId(booking.id);
  const docPath = `users/${booking.userId}/mentorshipBookings/${safeId}`;
  const docRef = doc(db, "users", booking.userId, "mentorshipBookings", safeId);

  try {
    await setDoc(docRef, {
      id: safeId,
      userId: booking.userId,
      coachId: sanitizeId(booking.coachId).slice(0, 64),
      coachName: booking.coachName.slice(0, 100),
      coachExpertise: booking.coachExpertise.slice(0, 160),
      preferredDate: booking.preferredDate.slice(0, 20),
      preferredTime: booking.preferredTime.slice(0, 30),
      sessionPurpose: booking.sessionPurpose.slice(0, 600),
      status: "Demo Request Saved",
      isDemoBooking: true,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function deleteFirestoreMentorshipBooking(
  userId: string,
  bookingId: string
): Promise<void> {
  const safeId = sanitizeId(bookingId);
  const docPath = `users/${userId}/mentorshipBookings/${safeId}`;
  try {
    await deleteDoc(doc(db, "users", userId, "mentorshipBookings", safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export function subscribeChatMessages(
  userId: string,
  onData: (messages: ChatbotMessageRecord[]) => void
): () => void {
  const colPath = `users/${userId}/chatMessages`;
  const q = query(
    collection(db, "users", userId, "chatMessages"),
    where("userId", "==", userId),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ChatbotMessageRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          userId: String(d.userId || userId),
          role: d.role === "user" ? "user" : "model",
          text: String(d.text || ""),
          persona: String(d.persona || "Career & Interview Advisor"),
          modelUsed: String(d.modelUsed || "gemini-4-hydrogen"),
          sources: Array.isArray(d.sources) ? d.sources : undefined,
          createdAt: timestampToIso(d.createdAt),
        };
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  );
}

export async function saveFirestoreChatMessage(
  msg: ChatbotMessageRecord
): Promise<void> {
  const safeId = sanitizeId(msg.id);
  const docPath = `users/${msg.userId}/chatMessages/${safeId}`;
  const docRef = doc(db, "users", msg.userId, "chatMessages", safeId);

  const payload: Record<string, unknown> = {
    id: safeId,
    userId: msg.userId,
    role: msg.role,
    text: msg.text.slice(0, 8000),
    persona: msg.persona.slice(0, 80),
    modelUsed: msg.modelUsed.slice(0, 80),
    createdAt: serverTimestamp(),
  };

  if (msg.sources && msg.sources.length > 0) {
    payload.sources = msg.sources.slice(0, 15);
  }

  try {
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function deleteFirestoreChatMessage(
  userId: string,
  messageId: string
): Promise<void> {
  const safeId = sanitizeId(messageId);
  const docPath = `users/${userId}/chatMessages/${safeId}`;
  try {
    await deleteDoc(doc(db, "users", userId, "chatMessages", safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}
