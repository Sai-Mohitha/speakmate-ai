import { auth } from "../firebase";
import type {
  ChatbotMessageRecord,
  MentorshipBooking,
  PracticeSessionRecord,
  UserProfile,
} from "../types";

async function getAuthHeaders(): Promise<HeadersInit> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Authentication required.");
  }
  const token = await currentUser.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export interface SqlWorkspacePayload {
  profile: UserProfile;
  sessions: PracticeSessionRecord[];
  bookings: MentorshipBooking[];
  chatMessages: ChatbotMessageRecord[];
}

export async function fetchSqlWorkspace(): Promise<SqlWorkspacePayload> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/db/workspace", { method: "GET", headers });
  if (!res.ok) {
    throw new Error("Failed to load workspace.");
  }
  return (await res.json()) as SqlWorkspacePayload;
}

export async function updateSqlProfile(profile: UserProfile): Promise<UserProfile> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/db/profile", {
    method: "PUT",
    headers,
    body: JSON.stringify({
      name: profile.name,
      role: profile.role,
      proficiencyLevel: profile.proficiencyLevel,
      communicationGoals: profile.communicationGoals,
      preferredMode: profile.preferredMode,
      dailyGoalMinutes: profile.dailyGoalMinutes,
      preferredAvailability: profile.preferredAvailability,
    }),
  });
  if (!res.ok) {
    throw new Error("Failed to update profile.");
  }
  return (await res.json()) as UserProfile;
}

export async function saveSqlPracticeSession(
  record: PracticeSessionRecord
): Promise<PracticeSessionRecord> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/db/sessions", {
    method: "POST",
    headers,
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    throw new Error("Failed to save practice session.");
  }
  return (await res.json()) as PracticeSessionRecord;
}

export async function saveSqlMentorshipBooking(
  booking: MentorshipBooking
): Promise<MentorshipBooking> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/db/bookings", {
    method: "POST",
    headers,
    body: JSON.stringify(booking),
  });
  if (!res.ok) {
    throw new Error("Failed to save mentorship booking.");
  }
  return (await res.json()) as MentorshipBooking;
}

export async function deleteSqlMentorshipBooking(bookingId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/db/bookings/${encodeURIComponent(bookingId)}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    throw new Error("Failed to cancel mentorship booking.");
  }
}

export async function saveSqlChatMessage(
  msg: ChatbotMessageRecord
): Promise<ChatbotMessageRecord> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/db/chat-messages", {
    method: "POST",
    headers,
    body: JSON.stringify(msg),
  });
  if (!res.ok) {
    throw new Error("Failed to save chat message.");
  }
  return (await res.json()) as ChatbotMessageRecord;
}

export async function clearSqlChatHistory(): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/db/chat-messages", {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    throw new Error("Failed to clear chat history.");
  }
}
