import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { AIPracticePage } from "./components/AIPracticePage";
import { AuthPage } from "./components/AuthPage";
import { CoachChatbotPage } from "./components/CoachChatbotPage";
import { CreativeMediaStudioPage } from "./components/CreativeMediaStudioPage";
import { DashboardHome } from "./components/DashboardHome";
import { DashboardLayout } from "./components/DashboardLayout";
import { LandingPage } from "./components/LandingPage";
import { MentorshipPage } from "./components/MentorshipPage";
import { PartnerMatchingPage } from "./components/PartnerMatchingPage";
import { ProfileSettingsPage } from "./components/ProfileSettingsPage";
import { ProgressAnalyticsPage } from "./components/ProgressAnalyticsPage";
import { StageStudio3DPage } from "./components/StageStudio3DPage";
import { auth, signOutFirebase } from "./firebase";
import type {
  AppView,
  ChatbotMessageRecord,
  MentorshipBooking,
  PracticeMode,
  PracticeSessionRecord,
  ProficiencyLevel,
  SpeakingTopic,
  UserProfile,
  VocabularyItem,
} from "./types";
import {
  clearSqlChatHistory,
  deleteSqlMentorshipBooking,
  fetchSqlWorkspace,
  saveSqlChatMessage,
  saveSqlMentorshipBooking,
  saveSqlPracticeSession,
  updateSqlProfile,
} from "./utils/sqlStore";
import {
  clearUserChatMessages,
  clearUserSessions,
  deleteMentorshipBooking,
  getActiveUser,
  loadSavedVocab,
  loadUserBookings,
  loadUserChatMessages,
  loadUserSessions,
  loginOrCreatePreseededDemoAccount,
  saveChatMessage,
  saveMentorshipBooking,
  savePracticeSession,
  seedSampleSessionsForUser,
  setActiveUserId,
  toggleSavedVocab,
  updateUserProfile,
} from "./utils/storage";

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(() => getActiveUser());
  const [view, setView] = useState<AppView>(() => (getActiveUser() ? "dashboard" : "landing"));
  const [authTab, setAuthTab] = useState<"login" | "register">("register");

  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);
  const [bookings, setBookings] = useState<MentorshipBooking[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatbotMessageRecord[]>([]);
  const [savedVocabulary, setSavedVocabulary] = useState<VocabularyItem[]>([]);

  const [practiceLaunchOverride, setPracticeLaunchOverride] = useState<{
    mode?: PracticeMode;
    level?: ProficiencyLevel;
    topic?: SpeakingTopic;
  }>({});

  // Sync Firebase Auth state with Cloud SQL (PostgreSQL) alongside local browser storage
  useEffect(() => {
    let active = true;
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!active) return;
      if (fbUser) {
        try {
          const workspace = await fetchSqlWorkspace();
          if (!active) return;
          setUser(workspace.profile);
          setSessions(workspace.sessions);
          setBookings(workspace.bookings);
          setChatMessages(workspace.chatMessages);
          setSavedVocabulary(loadSavedVocab(workspace.profile.id));
          setView((prev) => (prev === "landing" || prev === "auth" ? "dashboard" : prev));
        } catch (err) {
          console.error("Failed to load user workspace:", err);
          if (!active) return;
          const fallbackProfile: UserProfile = {
            id: fbUser.uid,
            name: fbUser.displayName?.trim() || fbUser.email?.split("@")[0] || "Mohitha",
            email: fbUser.email || "",
            role: "Student",
            proficiencyLevel: "Intermediate",
            communicationGoals: [
              "Speak fluently in job interviews",
              "Expand professional vocabulary",
            ],
            preferredMode: "HR Interview Practice",
            dailyGoalMinutes: 20,
            preferredAvailability: "Weekday Evenings",
            createdAt: new Date().toISOString(),
            authProvider: "google",
            photoURL: fbUser.photoURL ?? undefined,
          };
          setUser(fallbackProfile);
          setSavedVocabulary(loadSavedVocab(fallbackProfile.id));
          setView((prev) => (prev === "landing" || prev === "auth" ? "dashboard" : prev));
        } finally {
          if (active) setAuthReady(true);
        }
      } else {
        const localUser = getActiveUser();
        setUser(localUser);
        if (!localUser) {
          setView((prev) => (prev === "auth" ? "auth" : "landing"));
        }
        setAuthReady(true);
      }
    });

    return () => {
      active = false;
      unsubscribeAuth();
    };
  }, []);

  // Load local browser data for non-Google email workspaces
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setSessions([]);
      setBookings([]);
      setChatMessages([]);
      setSavedVocabulary([]);
      return;
    }

    setSavedVocabulary(loadSavedVocab(user.id));

    if (user.authProvider === "google") {
      return;
    }

    setSessions(loadUserSessions(user.id));
    setBookings(loadUserBookings(user.id));
    setChatMessages(loadUserChatMessages(user.id));
  }, [authReady, user?.id, user?.authProvider]);

  function handleGetStarted(tab: "login" | "register" = "register") {
    setAuthTab(tab);
    setView("auth");
  }

  async function handleLoadSampleWorkspace() {
    const sampleUser = await loginOrCreatePreseededDemoAccount();
    setUser(sampleUser);
    setSessions(loadUserSessions(sampleUser.id));
    setBookings(loadUserBookings(sampleUser.id));
    setChatMessages(loadUserChatMessages(sampleUser.id));
    setSavedVocabulary(loadSavedVocab(sampleUser.id));
    setView("dashboard");
  }

  function handleAuthenticated(loggedInUser: UserProfile) {
    setUser(loggedInUser);
    if (loggedInUser.authProvider !== "google") {
      setSessions(loadUserSessions(loggedInUser.id));
      setBookings(loadUserBookings(loggedInUser.id));
      setChatMessages(loadUserChatMessages(loggedInUser.id));
    }
    setSavedVocabulary(loadSavedVocab(loggedInUser.id));
    setView("dashboard");
  }

  async function handleLogout() {
    if (user?.authProvider === "google") {
      await signOutFirebase().catch(() => {});
    }
    setActiveUserId(null);
    setUser(null);
    setSessions([]);
    setBookings([]);
    setChatMessages([]);
    setSavedVocabulary([]);
    setView("landing");
  }

  async function handleSessionSaved(record: PracticeSessionRecord) {
    if (user?.authProvider === "google") {
      try {
        const saved = await saveSqlPracticeSession(record);
        setSessions((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
      } catch (err) {
        console.error("Failed to persist practice session:", err);
        setSessions((prev) => [record, ...prev.filter((s) => s.id !== record.id)]);
      }
      return;
    }
    const updated = savePracticeSession(record);
    setSessions(updated);
  }

  async function handleSaveBooking(booking: MentorshipBooking) {
    if (user?.authProvider === "google") {
      try {
        const saved = await saveSqlMentorshipBooking(booking);
        setBookings((prev) => [saved, ...prev.filter((b) => b.id !== saved.id)]);
      } catch (err) {
        console.error("Failed to persist booking:", err);
        setBookings((prev) => [booking, ...prev.filter((b) => b.id !== booking.id)]);
      }
      return;
    }
    const updated = saveMentorshipBooking(booking);
    setBookings(updated);
  }

  async function handleDeleteBooking(bookingId: string) {
    if (!user) return;
    if (user.authProvider === "google") {
      try {
        await deleteSqlMentorshipBooking(bookingId);
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      } catch (err) {
        console.error("Failed to delete booking:", err);
      }
      return;
    }
    const updated = deleteMentorshipBooking(user.id, bookingId);
    setBookings(updated);
  }

  async function handleSaveChatMessage(msg: ChatbotMessageRecord) {
    if (user?.authProvider === "google") {
      try {
        const saved = await saveSqlChatMessage(msg);
        setChatMessages((prev) => [...prev.filter((m) => m.id !== saved.id), saved]);
      } catch (err) {
        console.error("Failed to save chat message:", err);
        setChatMessages((prev) => [...prev.filter((m) => m.id !== msg.id), msg]);
      }
      return;
    }
    const updated = saveChatMessage(msg);
    setChatMessages(updated);
  }

  async function handleClearChatHistory() {
    if (!user) return;
    if (user.authProvider === "google") {
      try {
        await clearSqlChatHistory();
        setChatMessages([]);
      } catch (err) {
        console.error("Failed to clear chat history:", err);
      }
      return;
    }
    setChatMessages(clearUserChatMessages(user.id));
  }

  function handleToggleLearnedWord(item: VocabularyItem) {
    if (!user) return;
    const next = toggleSavedVocab(user.id, item);
    setSavedVocabulary(next);
  }

  async function handleUpdateProfile(updatedProfile: UserProfile) {
    if (user?.authProvider === "google") {
      try {
        const saved = await updateSqlProfile(updatedProfile);
        setUser(saved);
      } catch (err) {
        console.error("Failed to update profile:", err);
        setUser(updatedProfile);
      }
      return;
    }
    const saved = updateUserProfile(updatedProfile);
    setUser(saved);
  }

  function handleLoadSampleData() {
    if (!user) return;
    const seeded = seedSampleSessionsForUser(user.id);
    setSessions(seeded);
  }

  function handleResetProgress() {
    if (!user) return;
    clearUserSessions(user.id);
    setSessions([]);
    setSavedVocabulary([]);
  }

  function handleLaunchAIPracticeWithScenario(mode: PracticeMode, level: ProficiencyLevel) {
    setPracticeLaunchOverride({ mode, level });
    setView("ai-practice");
  }

  function handlePracticeTopic(topic: SpeakingTopic) {
    setPracticeLaunchOverride({ topic });
    setView("ai-practice");
  }

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FC] text-[#4B5166]">
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-[#635BDB]" />
          <span>Loading SpeakMate AI workspace...</span>
        </div>
      </div>
    );
  }

  if (!user || view === "landing") {
    if (view === "auth") {
      return (
        <AuthPage
          initialMode={authTab}
          onBackToLanding={() => setView("landing")}
          onAuthenticated={handleAuthenticated}
        />
      );
    }
    return (
      <LandingPage
        onGetStarted={handleGetStarted}
        onLoadSampleWorkspace={() => void handleLoadSampleWorkspace()}
      />
    );
  }

  return (
    <DashboardLayout
      user={user}
      currentView={view}
      onNavigate={(nextView) => {
        if (nextView !== "ai-practice") {
          setPracticeLaunchOverride({});
        }
        setView(nextView);
      }}
      onLogout={() => void handleLogout()}
    >
      {view === "dashboard" && (
        <DashboardHome
          user={user}
          sessions={sessions}
          bookings={bookings}
          savedVocabulary={savedVocabulary}
          onNavigate={setView}
        />
      )}

      {view === "ai-practice" && (
        <AIPracticePage
          user={user}
          initialMode={practiceLaunchOverride.mode}
          initialLevel={practiceLaunchOverride.level}
          initialTopic={practiceLaunchOverride.topic}
          savedVocabulary={savedVocabulary}
          onToggleLearnedWord={handleToggleLearnedWord}
          onSessionSaved={(record) => void handleSessionSaved(record)}
        />
      )}

      {view === "coach-chat" && (
        <CoachChatbotPage
          user={user}
          messages={chatMessages}
          onSaveMessage={handleSaveChatMessage}
          onClearHistory={handleClearChatHistory}
        />
      )}

      {view === "stage-3d" && <StageStudio3DPage />}

      {view === "media-studio" && <CreativeMediaStudioPage />}

      {view === "find-partner" && (
        <PartnerMatchingPage
          user={user}
          onLaunchAIPracticeWithScenario={handleLaunchAIPracticeWithScenario}
        />
      )}

      {view === "mentorship" && (
        <MentorshipPage
          user={user}
          bookings={bookings}
          onSaveBooking={handleSaveBooking}
          onDeleteBooking={handleDeleteBooking}
        />
      )}

      {view === "progress" && (
        <ProgressAnalyticsPage
          sessions={sessions}
          savedVocabulary={savedVocabulary}
          onNavigate={setView}
          onPracticeTopic={handlePracticeTopic}
        />
      )}

      {view === "profile" && (
        <ProfileSettingsPage
          user={user}
          onUpdateProfile={(updated) => void handleUpdateProfile(updated)}
          onLoadSampleData={handleLoadSampleData}
          onResetProgress={handleResetProgress}
          onLogout={() => void handleLogout()}
        />
      )}
    </DashboardLayout>
  );
}
